import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { DEFAULT_CONFIG, type PulseConfig } from '../src/types/pulse-config';
import { appendToolTimelineEvent } from '../src/tool-timeline/cache';
import type { ToolTimelineEvent } from '../src/types/tool-timeline';
import { visibleWidth } from '../src/formatters/layout';

function withPulseHome<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-index-'));
  const prevHome = process.env.PULSE_HOME_OVERRIDE;
  process.env.PULSE_HOME_OVERRIDE = dir;
  try {
    return fn(dir);
  } finally {
    if (prevHome === undefined) delete process.env.PULSE_HOME_OVERRIDE;
    else process.env.PULSE_HOME_OVERRIDE = prevHome;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function event(overrides: Partial<ToolTimelineEvent> = {}): ToolTimelineEvent {
  return {
    id: overrides.id || 'id',
    provider: 'claude-code',
    sessionId: 'session-abc123',
    toolName: overrides.toolName || 'Bash',
    displayName: overrides.displayName || overrides.toolName || 'Bash',
    summary: overrides.summary || 'npm test',
    status: overrides.status || 'success',
    endedAt: overrides.endedAt || new Date().toISOString(),
    durationMs: overrides.durationMs,
    ...overrides
  };
}

function writeConfig(dir: string, config: PulseConfig): void {
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
}

function runStatusline(
  dir: string,
  columns?: number
): ReturnType<typeof spawnSync> & { stdout: string; stderr: string } {
  const root = path.resolve(__dirname, '..', '..');
  const input = fs.readFileSync(path.join(root, 'test', 'fixtures', 'sample-input.json'), 'utf8');
  return spawnSync('node', ['dist/src/index.js'], {
    cwd: root,
    input,
    encoding: 'utf8',
    env: {
      ...process.env,
      PULSE_HOME_OVERRIDE: dir,
      ...(columns ? { COLUMNS: String(columns) } : {})
    }
  }) as ReturnType<typeof spawnSync> & { stdout: string; stderr: string };
}

test('statusline renders tool analytics as an independent panel', () => {
  withPulseHome((dir) => {
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
    for (const mod of Object.values(config.modules) as Array<{ enabled: boolean }>) {
      mod.enabled = false;
    }
    config.language = 'en';
    config.modules.model.enabled = true;
    config.modules.toolTimeline.enabled = true;
    config.modules.toolTimeline.displayMode = 'analytics-panel';
    config.modules.toolTimeline.maxDisplayEvents = 5;
    writeConfig(dir, config);

    appendToolTimelineEvent(event({ id: '1', toolName: 'Read', displayName: 'Read', summary: 'src/index.ts', durationMs: 45 }));
    appendToolTimelineEvent(event({
      id: '2',
      toolName: 'Agent',
      displayName: 'Agent',
      summary: 'Explore',
      actorName: 'Explore',
      agentId: 'agent_1',
      durationMs: 18400,
      subagentMetrics: {
        totalToolUseCount: 7,
        totalTokens: 42100,
        totalDurationMs: 18400
      }
    }));

    const result = runStatusline(dir);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.includes('TOOL ANALYTICS'));
    assert.ok(result.stdout.includes('Calls: 9'));
    assert.ok(result.stdout.includes('Main agent: 2 tools'));
    assert.ok(result.stdout.includes('Subagents: 7 tools / 1 agents'));
    assert.ok(!result.stdout.includes('[Tool] 2 calls'));
    assert.ok(result.stdout.indexOf('TOOL ANALYTICS') > result.stdout.indexOf('Opus 4'));
  });
});

test('statusline wraps normal modules and keeps analytics panel visible on narrow terminals', () => {
  withPulseHome((dir) => {
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
    for (const mod of Object.values(config.modules) as Array<{ enabled: boolean }>) {
      mod.enabled = false;
    }
    config.language = 'en';
    config.separator = '|';
    config.padding = 1;
    config.maxPerLine = 5;
    config.modules.model.enabled = true;
    config.modules.workspace.enabled = true;
    config.modules.context.enabled = true;
    config.modules.cacheRatio.enabled = true;
    config.modules.cacheRatio.icon = '[Cache]';
    config.modules.toolTimeline.enabled = true;
    config.modules.toolTimeline.displayMode = 'analytics-panel';
    writeConfig(dir, config);

    appendToolTimelineEvent(event({ id: '1', toolName: 'Bash', displayName: 'Bash', summary: 'npm test', durationMs: 9000 }));

    const result = runStatusline(dir, 50);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.includes('TOOL ANALYTICS'));
    assert.ok(result.stdout.includes('[Cache] 350'));

    const lines = result.stdout.trimEnd().split('\n');
    const panelStart = lines.findIndex((line) => line.includes('TOOL ANALYTICS'));
    assert.ok(panelStart > 0);

    for (const line of lines.slice(0, panelStart - 1)) {
      assert.ok(visibleWidth(line) <= 50, line);
    }
    assert.ok(visibleWidth(lines[panelStart - 1]) <= 50);
  });
});
