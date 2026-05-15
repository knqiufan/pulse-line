import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractToolTimeline } from '../src/extractors/tool-timeline';
import { appendToolTimelineEvent } from '../src/tool-timeline/cache';
import { darkTheme } from '../src/themes/builtin/dark';
import type { ToolTimelineEvent } from '../src/types/tool-timeline';
import type { ToolTimelineModuleConfig } from '../src/types/pulse-config';

function withTimelineCache<T>(fn: () => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-timeline-render-'));
  const prev = process.env.PULSE_CACHE_DIR_OVERRIDE;
  process.env.PULSE_CACHE_DIR_OVERRIDE = dir;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.PULSE_CACHE_DIR_OVERRIDE;
    else process.env.PULSE_CACHE_DIR_OVERRIDE = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function config(overrides: Partial<ToolTimelineModuleConfig> = {}): ToolTimelineModuleConfig {
  return {
    enabled: true,
    order: 16,
    mode: 'summary',
    summaryMaxLength: 80,
    showAverage: true,
    showFailures: true,
    showSlowest: true,
    slowThresholdMs: 3000,
    ...overrides
  };
}

function event(overrides: Partial<ToolTimelineEvent> = {}): ToolTimelineEvent {
  return {
    id: overrides.id || 'id',
    provider: 'claude-code',
    sessionId: 's1',
    toolName: overrides.toolName || 'Bash',
    displayName: overrides.displayName || overrides.toolName || 'Bash',
    summary: overrides.summary || 'npm test',
    status: overrides.status || 'success',
    endedAt: overrides.endedAt || new Date().toISOString(),
    durationMs: overrides.durationMs,
    ...overrides
  };
}

test('extractToolTimeline returns null without cache or events', () => {
  withTimelineCache(() => {
    assert.strictEqual(extractToolTimeline('missing', config(), darkTheme), null);
  });
});

test('extractToolTimeline renders successful summary', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ id: '1', durationMs: 320 }));
    const segment = extractToolTimeline('s1', config(), darkTheme, '[Tool]');

    assert.ok(segment);
    assert.ok(segment.text.includes('[Tool] 1 calls'));
    assert.ok(segment.text.includes('avg 320ms'));
    assert.strictEqual(segment.fg, darkTheme.colors.info);
  });
});

test('extractToolTimeline uses error color and fail count for failures', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ id: '1', status: 'failure', durationMs: 20 }));
    const segment = extractToolTimeline('s1', config(), darkTheme);

    assert.ok(segment);
    assert.ok(segment.text.includes('fail 1'));
    assert.strictEqual(segment.fg, darkTheme.colors.error);
  });
});

test('extractToolTimeline uses warning color for slow calls', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ id: '1', durationMs: 4000 }));
    const segment = extractToolTimeline('s1', config({ slowThresholdMs: 3000 }), darkTheme);

    assert.ok(segment);
    assert.ok(segment.text.includes('slow Bash 4.0s'));
    assert.strictEqual(segment.fg, darkTheme.colors.warning);
  });
});

test('extractToolTimeline honors summaryMaxLength and compact-list mode', () => {
  withTimelineCache(() => {
    appendToolTimelineEvent(event({ id: '1', summary: 'first command' }));
    appendToolTimelineEvent(event({ id: '2', summary: 'second command' }));

    const segment = extractToolTimeline('s1', config({
      mode: 'compact-list',
      maxDisplayEvents: 1,
      summaryMaxLength: 35
    }), darkTheme, '[T]');

    assert.ok(segment);
    assert.ok(segment.text.includes('second command'));
    assert.ok(!segment.text.includes('first command'));
    assert.ok(segment.text.length <= 35);
  });
});
