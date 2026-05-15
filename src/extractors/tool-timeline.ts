import * as path from 'path';
import type { Theme } from '../types/theme';
import type {
  ToolTimelineEvent,
  ToolTimelineProvider,
  ToolTimelineStats,
  ToolTimelineStatus,
  ToolTimelineTarget
} from '../types/tool-timeline';
import type { ToolTimelineModuleConfig } from '../types/pulse-config';
import { readToolTimelineCache } from '../tool-timeline/cache';

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

export interface ToolTimelineSegment {
  text: string;
  fg: string;
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
  const durationMs = normalizeDuration(hook.duration_ms);
  const endedAt = now.toISOString();
  const startedAt = durationMs === undefined
    ? undefined
    : new Date(now.getTime() - durationMs).toISOString();
  const status: ToolTimelineStatus = hook.hook_event_name === 'PostToolUse'
    ? 'success'
    : 'failure';
  const tool = summarizeTool(hook.tool_name, hook.tool_input, hook.cwd);
  const responseSummary = summarizeResponse(hook.tool_name, hook.tool_response);
  const errorSummary = summarizeError(hook.error);
  const toolUseId = isNonEmptyString(hook.tool_use_id) ? hook.tool_use_id : undefined;
  const id = toolUseId
    ? `${provider}:${hook.session_id}:${toolUseId}`
    : `${provider}:${hook.session_id}:${stableHash([
      hook.hook_event_name,
      hook.tool_name,
      tool.summary,
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
    summary: tool.summary,
    status,
    startedAt,
    endedAt,
    durationMs,
    target: tool.target,
    inputSummary: tool.inputSummary,
    responseSummary,
    errorSummary
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
