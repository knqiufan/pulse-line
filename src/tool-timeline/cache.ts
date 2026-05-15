import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type {
  ToolAnalyticsStats,
  ToolTimelineAgentMeta,
  ToolTimelineCache,
  ToolTimelineEvent,
  ToolTimelineProvider,
  ToolTimelineStats
} from '../types/tool-timeline';

const DEFAULT_MAX_EVENTS = 100;

function getPulseCacheDir(): string {
  const cacheOverride = process.env.PULSE_CACHE_DIR_OVERRIDE;
  if (cacheOverride) return path.resolve(cacheOverride);

  const homeOverride = process.env.PULSE_HOME_OVERRIDE;
  if (homeOverride) return path.join(path.resolve(homeOverride), 'cache');

  return path.join(os.homedir(), '.claude', 'pulse', 'cache');
}

function safeSessionFileName(sessionId: string): string {
  const trimmed = sessionId.trim() || 'unknown-session';
  return trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

export function getToolTimelineDir(
  provider: ToolTimelineProvider = 'claude-code'
): string {
  const dir = path.join(getPulseCacheDir(), 'tool-timeline');
  return provider === 'claude-code' ? dir : path.join(dir, provider);
}

export function getToolTimelineCachePath(
  sessionId: string,
  provider: ToolTimelineProvider = 'claude-code'
): string {
  return path.join(getToolTimelineDir(provider), `${safeSessionFileName(sessionId)}.json`);
}

export function writeJsonAtomic(filePath: string, value: unknown): void {
  const dir = path.dirname(filePath);
  const tmp = `${filePath}.tmp.${process.pid}`;

  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    try {
      fs.renameSync(tmp, filePath);
    } catch {
      try {
        fs.rmSync(filePath, { force: true });
      } catch {
        // Ignore cleanup failure and retry rename below.
      }
      fs.renameSync(tmp, filePath);
    }
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // Ignore temporary file cleanup failure.
    }
    throw err;
  }
}

function isTimelineCache(value: unknown): value is ToolTimelineCache {
  const cache = value as Partial<ToolTimelineCache> | null;
  return !!cache &&
    (cache.version === 1 || cache.version === 2) &&
    typeof cache.sessionId === 'string' &&
    Array.isArray(cache.events);
}

export function readToolTimelineCache(
  sessionId: string,
  provider: ToolTimelineProvider = 'claude-code'
): ToolTimelineCache | null {
  try {
    const cachePath = getToolTimelineCachePath(sessionId, provider);
    if (!fs.existsSync(cachePath)) return null;

    const raw = fs.readFileSync(cachePath, 'utf8').trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isTimelineCache(parsed)) return null;

    const events = parsed.events.filter(isTimelineEvent);
    const agents = normalizeAgentMetaMap(parsed.agents);
    return {
      version: parsed.version === 2 ? 2 : 1,
      provider: parsed.provider || provider,
      sessionId: parsed.sessionId,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      events,
      stats: computeToolTimelineStats(events),
      agents,
      analyticsStats: computeToolAnalyticsStats(events, agents)
    };
  } catch {
    return null;
  }
}

function isTimelineEvent(value: unknown): value is ToolTimelineEvent {
  const event = value as Partial<ToolTimelineEvent> | null;
  return !!event &&
    typeof event.id === 'string' &&
    typeof event.sessionId === 'string' &&
    typeof event.toolName === 'string' &&
    typeof event.displayName === 'string' &&
    typeof event.summary === 'string' &&
    typeof event.endedAt === 'string';
}

function normalizeAgentMetaMap(value: unknown): Record<string, ToolTimelineAgentMeta> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const agents: Record<string, ToolTimelineAgentMeta> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const agent = raw as Partial<ToolTimelineAgentMeta> | null;
    if (!agent || typeof agent.agentId !== 'string' || typeof agent.displayName !== 'string') {
      continue;
    }
    agents[key] = {
      agentId: agent.agentId,
      agentType: typeof agent.agentType === 'string' ? agent.agentType : undefined,
      displayName: agent.displayName,
      transcriptPath: typeof agent.transcriptPath === 'string' ? agent.transcriptPath : undefined,
      lastSeenAt: typeof agent.lastSeenAt === 'string' ? agent.lastSeenAt : new Date().toISOString()
    };
  }

  return Object.keys(agents).length > 0 ? agents : undefined;
}

export function computeToolTimelineStats(
  events: ToolTimelineEvent[]
): ToolTimelineStats {
  const stats: ToolTimelineStats = {
    total: events.length,
    success: 0,
    failure: 0,
    unknown: 0,
    byTool: {}
  };

  let durationCount = 0;
  let totalDurationMs = 0;
  let slowest: ToolTimelineStats['slowest'];

  for (const event of events) {
    if (event.status === 'success') stats.success += 1;
    else if (event.status === 'failure') stats.failure += 1;
    else stats.unknown += 1;

    const toolKey = event.displayName || event.toolName;
    stats.byTool[toolKey] = (stats.byTool[toolKey] || 0) + 1;

    if (Number.isFinite(event.durationMs)) {
      const durationMs = event.durationMs as number;
      durationCount += 1;
      totalDurationMs += durationMs;
      if (!slowest || durationMs > slowest.durationMs) {
        slowest = {
          toolName: event.displayName || event.toolName,
          summary: event.summary,
          durationMs
        };
      }
    }
  }

  if (durationCount > 0) {
    stats.totalDurationMs = totalDurationMs;
    stats.avgDurationMs = Math.round(totalDurationMs / durationCount);
    stats.slowest = slowest;
  }

  return stats;
}

export function computeToolAnalyticsStats(
  events: ToolTimelineEvent[],
  agents?: Record<string, ToolTimelineAgentMeta>
): ToolAnalyticsStats {
  const stats: ToolAnalyticsStats = {
    totalToolCalls: 0,
    success: 0,
    failure: 0,
    unknown: 0,
    successRate: 0,
    mainAgentToolCalls: 0,
    subagentToolCalls: 0,
    subagentCount: 0,
    bySubagent: {},
    byTool: {}
  };

  let durationCount = 0;
  let totalDurationMs = 0;
  let subagentTokens = 0;
  let subagentTokensSeen = false;
  let slowest: ToolAnalyticsStats['slowest'];

  for (const event of events) {
    if (event.status === 'success') stats.success += 1;
    else if (event.status === 'failure') stats.failure += 1;
    else stats.unknown += 1;

    const toolKey = event.displayName || event.toolName;
    stats.byTool[toolKey] = (stats.byTool[toolKey] || 0) + 1;

    if (event.actorKind === 'subagent') {
      stats.subagentToolCalls += 1;
      addSubagentEntry(stats, subagentNameForEvent(event, agents), event.agentId, 1);
    } else {
      stats.mainAgentToolCalls += 1;
    }

    const metrics = event.subagentMetrics;
    if (metrics) {
      const toolCalls = normalizeCount(metrics.totalToolUseCount);
      const tokens = normalizeCount(metrics.totalTokens);
      const durationMs = normalizeDuration(metrics.totalDurationMs);
      const name = subagentNameForEvent(event, agents);

      if (toolCalls > 0) {
        stats.subagentToolCalls += toolCalls;
      }
      if (tokens > 0) {
        subagentTokens += tokens;
        subagentTokensSeen = true;
      }
      addSubagentEntry(stats, name, event.agentId, toolCalls, tokens, durationMs);
    }

    const durationMs = normalizeDuration(
      event.subagentMetrics?.totalDurationMs ?? event.durationMs
    );
    if (durationMs !== undefined) {
      durationCount += 1;
      totalDurationMs += durationMs;
      if (!slowest || durationMs > slowest.durationMs) {
        slowest = {
          toolName: event.displayName || event.toolName,
          summary: event.summary,
          durationMs,
          actorName: event.actorName
        };
      }
    }
  }

  stats.totalToolCalls = stats.mainAgentToolCalls + stats.subagentToolCalls;
  stats.subagentCount = Object.keys(stats.bySubagent).length;
  stats.successRate = events.length > 0
    ? Math.round((stats.success / events.length) * 100)
    : 0;

  if (subagentTokensSeen) stats.subagentTokens = subagentTokens;
  if (durationCount > 0) {
    stats.totalDurationMs = totalDurationMs;
    stats.avgDurationMs = Math.round(totalDurationMs / durationCount);
    stats.slowest = slowest;
  }

  return stats;
}

function addSubagentEntry(
  stats: ToolAnalyticsStats,
  name: string,
  agentId: string | undefined,
  toolCalls: number,
  tokens?: number,
  durationMs?: number
): void {
  const entry = stats.bySubagent[name] ?? {
    agentId,
    toolCalls: 0
  };
  entry.agentId = entry.agentId ?? agentId;
  entry.toolCalls += toolCalls;
  if (tokens !== undefined && tokens > 0) {
    entry.tokens = (entry.tokens || 0) + tokens;
  }
  if (durationMs !== undefined) {
    entry.durationMs = (entry.durationMs || 0) + durationMs;
  }
  stats.bySubagent[name] = entry;
}

function subagentNameForEvent(
  event: ToolTimelineEvent,
  agents?: Record<string, ToolTimelineAgentMeta>
): string {
  if (event.actorName) return event.actorName;
  if (event.subagentType) return event.subagentType;
  if (event.agentId && agents?.[event.agentId]?.displayName) {
    return agents[event.agentId].displayName;
  }
  return event.agentId || 'Unknown agent';
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizeDuration(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function appendToolTimelineEvent(
  event: ToolTimelineEvent,
  options: { maxEvents?: number } = {}
): ToolTimelineCache {
  const maxEvents = Math.max(1, Math.floor(options.maxEvents || DEFAULT_MAX_EVENTS));
  const provider = event.provider;
  const cachePath = getToolTimelineCachePath(event.sessionId, provider);
  const existing = readToolTimelineCache(event.sessionId, provider);

  let events = existing?.events || [];
  if (event.toolUseId) {
    events = events.filter((old) => old.toolUseId !== event.toolUseId);
  } else {
    events = events.filter((old) => old.id !== event.id);
  }

  events.push(event);
  if (events.length > maxEvents) {
    events = events.slice(events.length - maxEvents);
  }

  const cache: ToolTimelineCache = {
    version: 2,
    provider,
    sessionId: event.sessionId,
    updatedAt: new Date().toISOString(),
    events,
    stats: computeToolTimelineStats(events),
    agents: existing?.agents,
    analyticsStats: computeToolAnalyticsStats(events, existing?.agents)
  };

  writeJsonAtomic(cachePath, cache);
  return cache;
}

export function upsertToolTimelineAgentMeta(
  sessionId: string,
  agent: ToolTimelineAgentMeta,
  provider: ToolTimelineProvider = 'claude-code'
): ToolTimelineCache {
  const cachePath = getToolTimelineCachePath(sessionId, provider);
  const existing = readToolTimelineCache(sessionId, provider);
  const events = existing?.events || [];
  const agents = {
    ...(existing?.agents || {}),
    [agent.agentId]: agent
  };

  const cache: ToolTimelineCache = {
    version: 2,
    provider,
    sessionId,
    updatedAt: new Date().toISOString(),
    events,
    stats: computeToolTimelineStats(events),
    agents,
    analyticsStats: computeToolAnalyticsStats(events, agents)
  };

  writeJsonAtomic(cachePath, cache);
  return cache;
}

export function clearToolTimelineCache(
  sessionId?: string,
  provider: ToolTimelineProvider = 'claude-code'
): void {
  try {
    if (sessionId) {
      fs.rmSync(getToolTimelineCachePath(sessionId, provider), { force: true });
      return;
    }

    fs.rmSync(getToolTimelineDir(provider), { recursive: true, force: true });
  } catch {
    // Cache cleanup is best effort.
  }
}

export function listToolTimelineSessions(
  provider: ToolTimelineProvider = 'claude-code'
): Array<{ sessionId: string; path: string; mtimeMs: number }> {
  try {
    const dir = getToolTimelineDir(provider);
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => {
        const filePath = path.join(dir, entry.name);
        const stat = fs.statSync(filePath);
        const sessionId = readSessionIdFromCache(filePath) ||
          path.basename(entry.name, '.json');
        return { sessionId, path: filePath, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
}

function readSessionIdFromCache(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ToolTimelineCache>;
    return typeof parsed.sessionId === 'string' ? parsed.sessionId : null;
  } catch {
    return null;
  }
}
