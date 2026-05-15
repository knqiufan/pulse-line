import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type {
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
    cache.version === 1 &&
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
    return {
      version: 1,
      provider: parsed.provider || provider,
      sessionId: parsed.sessionId,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      events,
      stats: computeToolTimelineStats(events)
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
    version: 1,
    provider,
    sessionId: event.sessionId,
    updatedAt: new Date().toISOString(),
    events,
    stats: computeToolTimelineStats(events)
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
