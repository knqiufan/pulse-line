import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  appendToolTimelineEvent,
  clearToolTimelineCache,
  computeToolAnalyticsStats,
  computeToolTimelineStats,
  getToolTimelineCachePath,
  listToolTimelineSessions,
  readToolTimelineCache,
  upsertToolTimelineAgentMeta
} from '../src/tool-timeline/cache';
import type { ToolTimelineEvent } from '../src/types/tool-timeline';

function withTimelineCache<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-timeline-cache-'));
  const prev = process.env.PULSE_CACHE_DIR_OVERRIDE;
  process.env.PULSE_CACHE_DIR_OVERRIDE = dir;
  try {
    return fn(dir);
  } finally {
    if (prev === undefined) delete process.env.PULSE_CACHE_DIR_OVERRIDE;
    else process.env.PULSE_CACHE_DIR_OVERRIDE = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function event(overrides: Partial<ToolTimelineEvent> = {}): ToolTimelineEvent {
  return {
    id: overrides.id || `claude-code:s1:${overrides.toolUseId || Math.random()}`,
    provider: 'claude-code',
    sessionId: 's1',
    toolUseId: overrides.toolUseId,
    toolName: overrides.toolName || 'Bash',
    displayName: overrides.displayName || overrides.toolName || 'Bash',
    summary: overrides.summary || 'npm test',
    status: overrides.status || 'success',
    endedAt: overrides.endedAt || new Date().toISOString(),
    durationMs: overrides.durationMs,
    ...overrides
  };
}

test('readToolTimelineCache returns null when file does not exist', () => {
  withTimelineCache(() => {
    assert.strictEqual(readToolTimelineCache('missing'), null);
  });
});

test('appendToolTimelineEvent creates cache file and stats', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ toolUseId: 'a', durationMs: 100 }));
    appendToolTimelineEvent(event({ toolUseId: 'b', status: 'failure', durationMs: 300 }));

    const cache = readToolTimelineCache('s1');
    assert.ok(cache);
    assert.strictEqual(cache.version, 2);
    assert.strictEqual(cache.events.length, 2);
    assert.strictEqual(cache.stats.total, 2);
    assert.strictEqual(cache.stats.success, 1);
    assert.strictEqual(cache.stats.failure, 1);
    assert.strictEqual(cache.stats.avgDurationMs, 200);
    assert.strictEqual(cache.stats.slowest?.durationMs, 300);
    assert.strictEqual(cache.analyticsStats?.totalToolCalls, 2);
    assert.ok(fs.existsSync(getToolTimelineCachePath('s1')));
  });
});

test('appendToolTimelineEvent keeps only latest maxEvents', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ id: '1', summary: 'one' }), { maxEvents: 2 });
    appendToolTimelineEvent(event({ id: '2', summary: 'two' }), { maxEvents: 2 });
    appendToolTimelineEvent(event({ id: '3', summary: 'three' }), { maxEvents: 2 });

    const cache = readToolTimelineCache('s1');
    assert.ok(cache);
    assert.deepStrictEqual(cache.events.map((e) => e.summary), ['two', 'three']);
  });
});

test('appendToolTimelineEvent deduplicates by toolUseId', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ toolUseId: 'same', summary: 'old' }));
    appendToolTimelineEvent(event({ toolUseId: 'same', summary: 'new' }));

    const cache = readToolTimelineCache('s1');
    assert.ok(cache);
    assert.strictEqual(cache.events.length, 1);
    assert.strictEqual(cache.events[0].summary, 'new');
  });
});

test('corrupt cache is ignored and append rebuilds it', () => {
  withTimelineCache(() => {
    const cachePath = getToolTimelineCachePath('s1');
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, '{not-json');

    assert.strictEqual(readToolTimelineCache('s1'), null);
    appendToolTimelineEvent(event({ summary: 'rebuilt' }));

    const cache = readToolTimelineCache('s1');
    assert.ok(cache);
    assert.strictEqual(cache.events[0].summary, 'rebuilt');
  });
});

test('clearToolTimelineCache removes a session file', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event());
    assert.ok(readToolTimelineCache('s1'));

    clearToolTimelineCache('s1');
    assert.strictEqual(readToolTimelineCache('s1'), null);
  });
});

test('listToolTimelineSessions sorts by mtime descending', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ sessionId: 'older', id: 'older' }));
    const olderPath = getToolTimelineCachePath('older');
    fs.utimesSync(olderPath, new Date(1000), new Date(1000));

    appendToolTimelineEvent(event({ sessionId: 'newer', id: 'newer' }));
    const sessions = listToolTimelineSessions();

    assert.strictEqual(sessions[0].sessionId, 'newer');
    assert.strictEqual(sessions[1].sessionId, 'older');
  });
});

test('computeToolTimelineStats ignores missing durations', () => {
  const stats = computeToolTimelineStats([
    event({ id: '1', durationMs: 100 }),
    event({ id: '2', durationMs: undefined, status: 'unknown' })
  ]);
  assert.strictEqual(stats.total, 2);
  assert.strictEqual(stats.unknown, 1);
  assert.strictEqual(stats.avgDurationMs, 100);
  assert.strictEqual(stats.totalDurationMs, 100);
});

test('computeToolAnalyticsStats aggregates main and subagent calls', () => {
  const stats = computeToolAnalyticsStats([
    event({ id: '1', toolName: 'Read', displayName: 'Read', durationMs: 40 }),
    event({
      id: '2',
      toolName: 'Agent',
      displayName: 'Agent',
      summary: 'Explore',
      actorName: 'Explore',
      agentId: 'agent_1',
      durationMs: 18000,
      subagentMetrics: {
        totalToolUseCount: 7,
        totalTokens: 42100,
        totalDurationMs: 18400
      }
    }),
    event({ id: '3', toolName: 'Bash', displayName: 'Bash', status: 'failure', durationMs: 9000 })
  ]);

  assert.strictEqual(stats.mainAgentToolCalls, 3);
  assert.strictEqual(stats.subagentToolCalls, 7);
  assert.strictEqual(stats.totalToolCalls, 10);
  assert.strictEqual(stats.subagentCount, 1);
  assert.strictEqual(stats.bySubagent.Explore.toolCalls, 7);
  assert.strictEqual(stats.bySubagent.Explore.tokens, 42100);
  assert.strictEqual(stats.subagentTokens, 42100);
  assert.strictEqual(stats.slowest?.toolName, 'Agent');
  assert.strictEqual(stats.slowest?.durationMs, 18400);
  assert.strictEqual(stats.successRate, 67);
});

test('upsertToolTimelineAgentMeta adds and updates agent metadata', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({
      id: 'agent-call',
      toolName: 'Agent',
      displayName: 'Agent',
      agentId: 'agent_1',
      actorName: 'Explore',
      subagentMetrics: { totalToolUseCount: 3 }
    }));

    upsertToolTimelineAgentMeta('s1', {
      agentId: 'agent_1',
      agentType: 'Explore',
      displayName: 'Explore',
      transcriptPath: 'old.jsonl',
      lastSeenAt: '2026-05-15T00:00:00.000Z'
    });
    upsertToolTimelineAgentMeta('s1', {
      agentId: 'agent_1',
      agentType: 'Review',
      displayName: 'Review',
      transcriptPath: 'new.jsonl',
      lastSeenAt: '2026-05-15T00:01:00.000Z'
    });

    const cache = readToolTimelineCache('s1');
    assert.ok(cache);
    assert.strictEqual(cache.version, 2);
    assert.strictEqual(cache.agents?.agent_1.displayName, 'Review');
    assert.strictEqual(cache.agents?.agent_1.transcriptPath, 'new.jsonl');
    assert.strictEqual(cache.analyticsStats?.subagentToolCalls, 3);
  });
});

test('readToolTimelineCache accepts legacy version 1 cache', () => {
  withTimelineCache(() => {
    const cachePath = getToolTimelineCachePath('s1');
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({
      version: 1,
      provider: 'claude-code',
      sessionId: 's1',
      updatedAt: new Date().toISOString(),
      events: [event({ id: 'legacy', durationMs: 100 })],
      stats: { total: 1, success: 1, failure: 0, unknown: 0, byTool: { Bash: 1 } }
    }));

    const cache = readToolTimelineCache('s1');
    assert.ok(cache);
    assert.strictEqual(cache.version, 1);
    assert.strictEqual(cache.events.length, 1);
    assert.strictEqual(cache.analyticsStats?.totalToolCalls, 1);
  });
});
