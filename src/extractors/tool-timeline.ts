import * as path from 'path';
import type { Theme } from '../types/theme';
import type {
  ToolAnalyticsStats,
  ToolTimelineAgentMeta,
  ToolTimelineEvent,
  ToolTimelineProvider,
  ToolTimelineStats,
  ToolTimelineStatus,
  ToolTimelineTarget
} from '../types/tool-timeline';
import type { Language, ToolTimelineModuleConfig } from '../types/pulse-config';
import type { ContextWindow, CostInfo } from '../types/pulse-input';
import { computeToolAnalyticsStats, readToolTimelineCache } from '../tool-timeline/cache';
import { getLabels } from '../i18n';

interface ClaudeToolHookInput {
  session_id?: string;
  transcript_path?: string | null;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  tool_use_id?: string;
  duration_ms?: number;
  error?: string;
  is_interrupt?: boolean;
  turn_id?: string;
}

interface ClaudeSubagentStopHookInput {
  session_id?: string;
  hook_event_name?: string;
  agent_id?: string;
  agent_type?: string;
  agent_transcript_path?: string;
  last_assistant_message?: string;
}

export interface ToolTimelineSegment {
  text: string;
  fg: string;
}

export interface ToolAnalyticsPanel {
  text: string;
}

export function normalizeClaudeToolHook(input: unknown): ToolTimelineEvent | null {
  if (!input || typeof input !== 'object') return null;
  const hook = input as ClaudeToolHookInput;
  if (
    hook.hook_event_name !== 'PostToolUse' &&
    hook.hook_event_name !== 'PostToolUseFailure'
  ) {
    return null;
  }

  if (!isNonEmptyString(hook.session_id) || !isNonEmptyString(hook.tool_name)) {
    return null;
  }

  const provider: ToolTimelineProvider = 'claude-code';
  const now = new Date();
  const hookDurationMs = normalizeDuration(hook.duration_ms);
  const agentTelemetry = hook.tool_name === 'Agent'
    ? extractAgentTelemetry(hook.tool_input, hook.tool_response)
    : undefined;
  const durationMs = agentTelemetry?.totalDurationMs ?? hookDurationMs;
  const endedAt = now.toISOString();
  const startedAt = durationMs === undefined
    ? undefined
    : new Date(now.getTime() - durationMs).toISOString();
  const responseStatus = statusFromResponse(hook.tool_response);
  const status: ToolTimelineStatus = hook.hook_event_name === 'PostToolUseFailure'
    ? 'failure'
    : responseStatus || 'success';
  const tool = summarizeTool(hook.tool_name, hook.tool_input, hook.cwd);
  const responseSummary = summarizeResponse(hook.tool_name, hook.tool_response);
  const errorSummary = summarizeError(hook.error);
  const tokenUsage = extractTokenUsage(hook.tool_response);
  const summary = agentTelemetry?.agentName || tool.summary;
  const subagentMetrics = agentTelemetry && hasAgentMetrics(agentTelemetry)
    ? {
        totalToolUseCount: agentTelemetry.totalToolUseCount,
        totalTokens: agentTelemetry.totalTokens,
        totalDurationMs: agentTelemetry.totalDurationMs
      }
    : undefined;
  const toolUseId = isNonEmptyString(hook.tool_use_id) ? hook.tool_use_id : undefined;
  const id = toolUseId
    ? `${provider}:${hook.session_id}:${toolUseId}`
    : `${provider}:${hook.session_id}:${stableHash([
      hook.hook_event_name,
      hook.tool_name,
      summary,
      responseSummary || '',
      errorSummary || '',
      endedAt
    ].join('|'))}`;

  return {
    id,
    provider,
    sessionId: hook.session_id,
    turnId: isNonEmptyString(hook.turn_id) ? hook.turn_id : undefined,
    toolUseId,
    transcriptPath: hook.transcript_path ?? null,
    cwd: hook.cwd,
    toolName: hook.tool_name,
    displayName: tool.displayName,
    summary,
    status,
    startedAt,
    endedAt,
    durationMs,
    actorKind: 'main-agent',
    actorName: agentTelemetry?.agentName,
    agentId: agentTelemetry?.agentId,
    subagentType: agentTelemetry?.subagentType,
    tokenUsage,
    subagentMetrics,
    target: tool.target,
    inputSummary: tool.inputSummary,
    responseSummary,
    errorSummary
  };
}

export function normalizeClaudeSubagentStopHook(input: unknown): ToolTimelineAgentMeta | null {
  if (!input || typeof input !== 'object') return null;
  const hook = input as ClaudeSubagentStopHookInput;
  if (hook.hook_event_name !== 'SubagentStop') return null;
  if (!isNonEmptyString(hook.agent_id)) return null;

  const agentType = cleanText(hook.agent_type, 80);
  const displayName = agentType || hook.agent_id;

  return {
    agentId: hook.agent_id,
    agentType: agentType || undefined,
    displayName,
    transcriptPath: isNonEmptyString(hook.agent_transcript_path)
      ? hook.agent_transcript_path
      : undefined,
    lastSeenAt: new Date().toISOString()
  };
}

export function summarizeTool(
  toolName: string,
  input: unknown,
  cwd?: string
): {
  displayName: string;
  summary: string;
  target?: ToolTimelineTarget;
  inputSummary?: string;
} {
  const obj = isRecord(input) ? input : {};
  const displayName = getDisplayName(toolName);

  if (toolName === 'Agent') {
    const agentName = cleanText(
      firstStringField(obj, ['subagent_type', 'agent_type', 'description']),
      80
    );
    const summary = agentName || 'Agent';
    return {
      displayName,
      summary,
      target: agentName ? { kind: 'unknown', value: agentName } : undefined,
      inputSummary: summary
    };
  }

  if (toolName === 'Bash') {
    const command = cleanText(stringField(obj, 'command'), 160);
    const firstLine = cleanText(firstLineOf(stringField(obj, 'command')), 80);
    const description = cleanText(stringField(obj, 'description'), 80);
    const summary = description && firstLine
      ? `${description}: ${firstLine}`
      : firstLine || description || 'Bash';
    return {
      displayName,
      summary: cleanText(summary, 80),
      target: command ? { kind: 'command', value: command } : undefined,
      inputSummary: cleanText(summary, 80)
    };
  }

  if (toolName === 'Read') {
    const file = summarizeFilePath(stringField(obj, 'file_path'), cwd);
    return fileSummary(displayName, file, file || 'Read');
  }

  if (toolName === 'Write') {
    const file = summarizeFilePath(stringField(obj, 'file_path'), cwd);
    return fileSummary(displayName, file, `write ${file || 'file'}`);
  }

  if (toolName === 'Edit') {
    const file = summarizeFilePath(stringField(obj, 'file_path'), cwd);
    return fileSummary(displayName, file, `edit ${file || 'file'}`);
  }

  if (toolName === 'MultiEdit') {
    const file = summarizeFilePath(stringField(obj, 'file_path'), cwd);
    const edits = Array.isArray(obj.edits) ? obj.edits.length : 0;
    const summary = `multi-edit ${file || 'file'}${edits > 0 ? ` (${edits})` : ''}`;
    return fileSummary(displayName, file, summary);
  }

  if (toolName === 'Glob') {
    const pattern = cleanText(stringField(obj, 'pattern'), 120);
    const summary = pattern ? `glob ${pattern}` : 'glob';
    return {
      displayName,
      summary: cleanText(summary, 80),
      target: pattern ? { kind: 'query', value: pattern } : undefined,
      inputSummary: cleanText(summary, 80)
    };
  }

  if (toolName === 'Grep') {
    const pattern = cleanText(stringField(obj, 'pattern'), 120);
    const searchPath = cleanText(stringField(obj, 'path'), 80);
    const summary = pattern
      ? `grep ${pattern}${searchPath ? ` in ${searchPath}` : ''}`
      : 'grep';
    return {
      displayName,
      summary: cleanText(summary, 80),
      target: pattern ? { kind: 'query', value: pattern } : undefined,
      inputSummary: cleanText(summary, 80)
    };
  }

  if (toolName === 'WebFetch') {
    const rawUrl = cleanText(stringField(obj, 'url'), 200);
    const label = summarizeUrl(rawUrl);
    const summary = label ? `fetch ${label}` : 'fetch';
    return {
      displayName,
      summary: cleanText(summary, 80),
      target: rawUrl ? { kind: 'url', value: rawUrl } : undefined,
      inputSummary: cleanText(summary, 80)
    };
  }

  if (toolName === 'WebSearch') {
    const query = cleanText(stringField(obj, 'query'), 120);
    const summary = query ? `search ${query}` : 'search';
    return {
      displayName,
      summary: cleanText(summary, 80),
      target: query ? { kind: 'query', value: query } : undefined,
      inputSummary: cleanText(summary, 80)
    };
  }

  if (toolName.startsWith('mcp__')) {
    const value = mcpValue(toolName);
    const summary = `mcp ${value}`;
    return {
      displayName,
      summary: cleanText(summary, 80),
      target: { kind: 'mcp', value },
      inputSummary: cleanText(summary, 80)
    };
  }

  const fallback = firstKnownField(obj);
  const summary = fallback ? `${toolName} ${fallback}` : toolName;
  return {
    displayName,
    summary: cleanText(summary, 80),
    target: fallback ? { kind: 'unknown', value: fallback } : undefined,
    inputSummary: cleanText(summary, 80)
  };
}

export function summarizeResponse(
  toolName: string,
  response: unknown
): string | undefined {
  if (response === undefined || response === null) return undefined;

  if (toolName === 'Agent' && isRecord(response)) {
    const totalToolUseCount = numericField(response, 'totalToolUseCount');
    const totalTokens = numericField(response, 'totalTokens');
    const totalDurationMs = numericField(response, 'totalDurationMs');
    const parts: string[] = [];
    if (totalToolUseCount !== undefined) parts.push(`${totalToolUseCount} tools`);
    if (totalTokens !== undefined) parts.push(`${totalTokens} tokens`);
    if (totalDurationMs !== undefined) parts.push(formatDurationShort(totalDurationMs));
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  if (toolName === 'Bash' && isRecord(response)) {
    const stderr = stringField(response, 'stderr');
    const stdout = stringField(response, 'stdout');
    if (stderr) return `stderr: ${cleanText(firstLineOf(stderr), 120)}`;
    if (stdout) return `stdout: ${cleanText(firstLineOf(stdout), 120)}`;
    return undefined;
  }

  if ((toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') && isRecord(response)) {
    const filePath = stringField(response, 'filePath') || stringField(response, 'file_path');
    if (filePath) return `file: ${cleanText(filePath, 120)}`;
    if (typeof response.success === 'boolean') {
      return response.success ? 'success' : 'not successful';
    }
  }

  if (typeof response === 'string') {
    return cleanText(firstLineOf(response), 120);
  }

  if (isRecord(response)) {
    const message = stringField(response, 'message') ||
      stringField(response, 'summary') ||
      stringField(response, 'error');
    if (message) return cleanText(firstLineOf(message), 120);
  }

  return undefined;
}

export function summarizeError(error: unknown): string | undefined {
  if (error === undefined || error === null) return undefined;
  if (typeof error === 'string') return cleanText(firstLineOf(error), 120);
  if (error instanceof Error) return cleanText(firstLineOf(error.message), 120);
  if (isRecord(error)) {
    const message = stringField(error, 'message') || stringField(error, 'error');
    if (message) return cleanText(firstLineOf(message), 120);
  }
  return cleanText(String(error), 120);
}

export function relativeToCwd(filePath: string, cwd?: string): string {
  const cleanPath = cleanText(filePath, 240);
  if (!cleanPath || !cwd) return cleanPath;

  try {
    const resolvedCwd = path.resolve(cwd);
    const resolvedFile = path.isAbsolute(cleanPath)
      ? path.resolve(cleanPath)
      : path.resolve(resolvedCwd, cleanPath);
    const rel = path.relative(resolvedCwd, resolvedFile);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      return cleanPath;
    }
    return rel;
  } catch {
    return cleanPath;
  }
}

export function extractToolTimeline(
  sessionId: string,
  config: ToolTimelineModuleConfig,
  theme: Theme,
  iconOverride?: string
): ToolTimelineSegment | null {
  if (!sessionId) return null;

  const cache = readToolTimelineCache(sessionId, 'claude-code');
  if (!cache || cache.events.length === 0) return null;

  const stats = cache.stats;
  const latest = cache.events[cache.events.length - 1];
  const maxLength = Math.max(20, config.summaryMaxLength || 80);
  const icon = iconOverride ?? theme.components.toolTimeline.icon ?? '';
  const prefix = icon ? `${icon} ` : '';
  const mode = config.mode || 'summary';

  const text = mode === 'compact-list'
    ? renderCompactList(cache.events, config, prefix, maxLength)
    : renderSummary(stats, config, prefix, maxLength);

  const slowestMs = stats.slowest?.durationMs || 0;
  const slowThresholdMs = config.slowThresholdMs ?? 3000;
  const fg = (latest.status === 'failure' || stats.failure > 0)
    ? theme.colors.error
    : slowestMs >= slowThresholdMs
      ? theme.colors.warning
      : theme.colors.info;

  return { text, fg };
}

export function renderToolAnalyticsPanel(
  sessionId: string,
  config: ToolTimelineModuleConfig,
  theme: Theme,
  language: Language,
  snapshot?: {
    contextWindow?: ContextWindow;
    cost?: CostInfo;
  }
): ToolAnalyticsPanel | null {
  if (!sessionId) return null;

  const cache = readToolTimelineCache(sessionId, 'claude-code');
  if (!cache || cache.events.length === 0) return null;

  const labels = getLabels(language);
  const stats = cache.analyticsStats ?? computeToolAnalyticsStats(cache.events, cache.agents);
  const width = clampNumber(Math.floor(config.panelWidth || 59), 40, 120);
  const border = '\u2550'.repeat(width);
  const divider = '\u2500'.repeat(width);
  const title = centerText(label(labels, 'toolAnalyticsTitle', 'TOOL ANALYTICS'), width);
  const lines = [border, title, border];

  const metricParts = [`${label(labels, 'toolAnalyticsCalls', 'Calls')}: ${stats.totalToolCalls}`];
  const contextTokens = contextTokenCount(snapshot?.contextWindow, snapshot?.cost);
  if (config.showTokenStats !== false && contextTokens !== undefined) {
    metricParts.push(`${label(labels, 'toolAnalyticsContext', 'Context')}: ${formatTokenCount(contextTokens)} ${label(labels, 'toolAnalyticsTokens', 'tok')}`);
  }
  if (config.showSuccessRate !== false) {
    metricParts.push(`${label(labels, 'toolAnalyticsSuccess', 'Success')}: ${stats.successRate}%`);
  }
  lines.push(fitLine(`  ${metricParts.join(`  \u2502  `)}`, width));

  if (config.showAgentStats !== false) {
    lines.push(fitLine(
      `  ${label(labels, 'toolAnalyticsMainAgent', 'Main agent')}: ${stats.mainAgentToolCalls} ${label(labels, 'toolAnalyticsTools', 'tools')}  ` +
      `\u2502  ${label(labels, 'toolAnalyticsSubagents', 'Subagents')}: ${stats.subagentToolCalls} ${label(labels, 'toolAnalyticsTools', 'tools')} / ${stats.subagentCount} ${label(labels, 'toolAnalyticsAgents', 'agents')}`,
      width
    ));

    const subagentLine = renderSubagentList(stats, labels, width);
    if (subagentLine) lines.push(subagentLine);
  }

  if (config.showSlowest !== false && stats.slowest) {
    const slowestSummary = stats.slowest.summary
      ? ` "${truncateText(stats.slowest.summary, 24)}"`
      : '';
    lines.push(fitLine(
      `  ${label(labels, 'toolAnalyticsSlowest', 'Slowest')}: ${stats.slowest.toolName}${slowestSummary} ${formatDurationShort(stats.slowest.durationMs)}`,
      width
    ));
  }

  if (config.showRecent !== false) {
    lines.push(fitLine(`  ${label(labels, 'toolAnalyticsRecent', 'Recent')}:`, width));
    const maxRecent = Math.max(1, Math.min(5, Math.floor(config.maxDisplayEvents || 5)));
    const recent = cache.events.slice(Math.max(0, cache.events.length - maxRecent));
    for (const event of recent) {
      lines.push(renderRecentEventLine(event, labels, width));
    }
  }

  lines.push(divider, border);
  void theme;
  return { text: lines.join('\n') };
}

function renderSummary(
  stats: ToolTimelineStats,
  config: ToolTimelineModuleConfig,
  prefix: string,
  maxLength: number
): string {
  const parts = [`${stats.total} calls`];
  if (config.showAverage !== false && stats.avgDurationMs !== undefined) {
    parts.push(`avg ${formatDurationShort(stats.avgDurationMs)}`);
  }
  if (config.showSlowest !== false && stats.slowest) {
    parts.push(`slow ${stats.slowest.toolName} ${formatDurationShort(stats.slowest.durationMs)}`);
  }
  if (config.showFailures !== false && stats.failure > 0) {
    parts.push(`fail ${stats.failure}`);
  }
  return cleanText(`${prefix}${parts.join(' ')}`, maxLength);
}

function renderCompactList(
  events: ToolTimelineEvent[],
  config: ToolTimelineModuleConfig,
  prefix: string,
  maxLength: number
): string {
  const count = Math.max(1, Math.min(config.maxDisplayEvents || 5, events.length));
  const recent = events.slice(events.length - count);
  const body = recent.map((event) => {
    const marker = event.status === 'failure' ? 'ERR' : 'OK';
    return `${event.displayName} ${marker} ${event.summary}`;
  }).join('; ');
  return cleanText(`${prefix}${body}`, maxLength);
}

function renderSubagentList(
  stats: ToolAnalyticsStats,
  labels: Record<string, string>,
  width: number
): string | null {
  const entries = Object.entries(stats.bySubagent)
    .sort((a, b) => b[1].toolCalls - a[1].toolCalls);
  if (entries.length === 0) return null;

  const unknown = label(labels, 'toolAnalyticsUnknownAgent', 'Unknown agent');
  const body = entries
    .map(([name, entry]) => `${name === 'Unknown agent' ? unknown : name} ${entry.toolCalls}`)
    .join(', ');
  return fitLine(`  ${label(labels, 'toolAnalyticsSubagents', 'Subagents')}: ${body}`, width);
}

function renderRecentEventLine(
  event: ToolTimelineEvent,
  labels: Record<string, string>,
  width: number
): string {
  const tool = `[${truncateText(event.displayName || event.toolName, 8)}]`;
  const toolCell = padRight(tool, 9);
  const status = statusMarker(event.status);

  if (event.toolName === 'Agent' && event.subagentMetrics) {
    const metrics: string[] = [];
    if (event.subagentMetrics.totalToolUseCount !== undefined) {
      metrics.push(`${event.subagentMetrics.totalToolUseCount} ${label(labels, 'toolAnalyticsTools', 'tools')}`);
    }
    if (event.subagentMetrics.totalTokens !== undefined) {
      metrics.push(`${formatTokenCount(event.subagentMetrics.totalTokens)} ${label(labels, 'toolAnalyticsTokens', 'tok')}`);
    }
    const durationMs = event.subagentMetrics.totalDurationMs ?? event.durationMs;
    if (durationMs !== undefined) metrics.push(formatDurationShort(durationMs));
    const tail = ` ${metrics.join(' ')} ${status}`.trimEnd();
    const left = `    ${toolCell} `;
    const summaryWidth = Math.max(8, width - left.length - tail.length - 1);
    return fitLine(
      `${left}${padRight(truncateText(event.actorName || event.summary, summaryWidth), summaryWidth)} ${tail}`,
      width
    );
  }

  const duration = event.durationMs === undefined ? '-' : formatDurationShort(event.durationMs);
  const tail = `${padLeft(duration, 7)}   ${status}`;
  const left = `    ${toolCell} `;
  const summaryWidth = Math.max(8, width - left.length - tail.length);
  return fitLine(
    `${left}${padRight(truncateText(event.summary, summaryWidth), summaryWidth)}${tail}`,
    width
  );
}

function contextTokenCount(contextWindow?: ContextWindow, cost?: CostInfo): number | undefined {
  const currentUsage = contextWindow?.current_usage ?? cost?.current_usage;
  if (currentUsage) {
    return sumNumbers([
      currentUsage.input_tokens,
      currentUsage.output_tokens,
      currentUsage.cache_creation_input_tokens,
      currentUsage.cache_read_input_tokens
    ]);
  }

  if (contextWindow) {
    return sumNumbers([
      contextWindow.total_input_tokens,
      contextWindow.total_output_tokens
    ]);
  }

  return undefined;
}

function sumNumbers(values: Array<number | undefined>): number {
  return values.reduce<number>((sum, value) => (
    typeof value === 'number' && Number.isFinite(value) ? sum + value : sum
  ), 0);
}

function statusMarker(status: ToolTimelineStatus): string {
  if (status === 'success') return '\u2713';
  if (status === 'failure') return '\u2717';
  return '?';
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${trimFixed(value / 1_000_000)}M`;
  if (value >= 1000) return `${trimFixed(value / 1000)}K`;
  return `${Math.round(value)}`;
}

function trimFixed(value: number): string {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

function label(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] || fallback;
}

function centerText(value: string, width: number): string {
  const clean = truncateText(value, width);
  const left = Math.max(0, Math.floor((width - clean.length) / 2));
  return `${' '.repeat(left)}${clean}`;
}

function fitLine(value: string, width: number): string {
  return truncateText(value, width);
}

function truncateText(value: string, maxLength: number): string {
  if (!value) return '';
  const withoutAnsi = value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  const withoutControls = withoutAnsi
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (withoutControls.length <= maxLength) return withoutControls;
  return `${withoutControls.slice(0, Math.max(0, maxLength - 3))}...`;
}

function padRight(value: string, width: number): string {
  return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`;
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : `${' '.repeat(width - value.length)}${value}`;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function stableHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getDisplayName(toolName: string): string {
  return toolName.startsWith('mcp__') ? 'MCP' : toolName;
}

function fileSummary(displayName: string, file: string, summary: string) {
  return {
    displayName,
    summary: cleanText(summary, 80),
    target: file ? { kind: 'file' as const, value: file } : undefined,
    inputSummary: cleanText(summary, 80)
  };
}

function summarizeFilePath(filePath: string, cwd?: string): string {
  const rel = relativeToCwd(filePath, cwd);
  return cleanText(rel || path.basename(filePath || ''), 160);
}

function mcpValue(toolName: string): string {
  const parts = toolName.split('__').filter(Boolean);
  if (parts.length >= 3 && parts[0] === 'mcp') {
    return `${parts[1]}.${parts.slice(2).join('.')}`;
  }
  return toolName.replace(/^mcp__/, '').replace(/__/g, '.');
}

function summarizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    return cleanText(`${url.host}${url.pathname}`, 120);
  } catch {
    return cleanText(rawUrl, 120);
  }
}

function extractAgentTelemetry(input: unknown, response: unknown): {
  agentId?: string;
  agentName: string;
  subagentType?: string;
  totalToolUseCount?: number;
  totalTokens?: number;
  totalDurationMs?: number;
} | undefined {
  const inputObj = isRecord(input) ? input : {};
  const responseObj = isRecord(response) ? response : {};
  const agentId = firstStringField(responseObj, ['agentId', 'agent_id', 'id']);
  const subagentType = firstStringField(inputObj, ['subagent_type', 'agent_type']);
  const agentName = cleanText(
    subagentType ||
      stringField(inputObj, 'description') ||
      firstStringField(responseObj, ['agentType', 'agent_type', 'name']) ||
      agentId ||
      'Unknown agent',
    80
  );

  return {
    agentId: agentId || undefined,
    agentName,
    subagentType: subagentType || undefined,
    totalToolUseCount: numericField(responseObj, 'totalToolUseCount') ??
      numericField(responseObj, 'total_tool_use_count') ??
      numericField(responseObj, 'toolUseCount') ??
      numericField(responseObj, 'tool_use_count'),
    totalTokens: numericField(responseObj, 'totalTokens') ??
      numericField(responseObj, 'total_tokens'),
    totalDurationMs: numericField(responseObj, 'totalDurationMs') ??
      numericField(responseObj, 'total_duration_ms')
  };
}

function extractTokenUsage(response: unknown): ToolTimelineEvent['tokenUsage'] | undefined {
  if (!isRecord(response)) return undefined;
  const usage = isRecord(response.usage) ? response.usage : response;
  const tokenUsage = {
    inputTokens: numericField(usage, 'input_tokens') ?? numericField(usage, 'inputTokens'),
    outputTokens: numericField(usage, 'output_tokens') ?? numericField(usage, 'outputTokens'),
    cacheCreationInputTokens: numericField(usage, 'cache_creation_input_tokens') ??
      numericField(usage, 'cacheCreationInputTokens'),
    cacheReadInputTokens: numericField(usage, 'cache_read_input_tokens') ??
      numericField(usage, 'cacheReadInputTokens'),
    totalTokens: numericField(usage, 'total_tokens') ?? numericField(usage, 'totalTokens')
  };

  return Object.values(tokenUsage).some((value) => value !== undefined)
    ? tokenUsage
    : undefined;
}

function hasAgentMetrics(agent: {
  totalToolUseCount?: number;
  totalTokens?: number;
  totalDurationMs?: number;
}): boolean {
  return agent.totalToolUseCount !== undefined ||
    agent.totalTokens !== undefined ||
    agent.totalDurationMs !== undefined;
}

function statusFromResponse(response: unknown): ToolTimelineStatus | undefined {
  if (!isRecord(response)) return undefined;
  const status = firstStringField(response, ['status', 'state']).toLowerCase();
  if (!status) return undefined;
  if (status === 'success' || status === 'ok' || status === 'completed') return 'success';
  if (status === 'failure' || status === 'failed' || status === 'error') return 'failure';
  return 'unknown';
}

function normalizeDuration(durationMs: unknown): number | undefined {
  return typeof durationMs === 'number' &&
    Number.isFinite(durationMs) &&
    durationMs >= 0
    ? durationMs
    : undefined;
}

function firstKnownField(obj: Record<string, unknown>): string {
  const keys = ['command', 'file_path', 'path', 'pattern', 'query', 'url', 'description'];
  for (const key of keys) {
    const value = stringField(obj, key);
    if (value) return cleanText(value, 80);
  }
  return '';
}

function cleanText(value: string | undefined, maxLength: number): string {
  if (!value) return '';
  const withoutAnsi = value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  const withoutControls = withoutAnsi
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutControls.length <= maxLength) return withoutControls;
  return `${withoutControls.slice(0, Math.max(0, maxLength - 3))}...`;
}

function firstLineOf(value: string | undefined): string {
  if (!value) return '';
  return value.split(/\r?\n/, 1)[0];
}

function stringField(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function firstStringField(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = stringField(obj, key);
    if (value) return value;
  }
  return '';
}

function numericField(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatDurationShort(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) {
    return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}
