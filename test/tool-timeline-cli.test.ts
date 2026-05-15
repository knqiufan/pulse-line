import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { readToolTimelineCache } from '../src/tool-timeline/cache';

function withTimelineCache<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-timeline-cli-'));
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

function runCli(args: string[], input?: string) {
  return spawnSync('node', ['dist/src/cli.js', ...args], {
    cwd: path.resolve(__dirname, '..', '..'),
    input,
    encoding: 'utf8',
    env: { ...process.env }
  });
}

const hookInput = JSON.stringify({
  session_id: 'cli-session',
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  tool_response: { stdout: 'ok' },
  tool_use_id: 'toolu_cli_1',
  duration_ms: 50
});

test('CLI hook collect-tool-event writes cache and prints no stdout', () => {
  withTimelineCache(() => {
    const result = runCli(['hook', 'collect-tool-event', '--provider', 'claude-code'], hookInput);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '');

    const cache = readToolTimelineCache('cli-session');
    assert.ok(cache);
    assert.strictEqual(cache.events.length, 1);
    assert.strictEqual(cache.events[0].summary, 'npm test');
  });
});

test('CLI hook ignores invalid JSON with exit code 0', () => {
  withTimelineCache(() => {
    const result = runCli(['hook', 'collect-tool-event', '--provider', 'claude-code'], '{bad');
    assert.strictEqual(result.status, 0);
    assert.strictEqual(readToolTimelineCache('cli-session'), null);
  });
});

test('CLI timeline supports json, last, and clear', () => {
  withTimelineCache(() => {
    runCli(['hook', 'collect-tool-event', '--provider', 'claude-code'], hookInput);
    runCli(['hook', 'collect-tool-event', '--provider', 'claude-code'], JSON.stringify({
      ...JSON.parse(hookInput),
      tool_use_id: 'toolu_cli_2',
      tool_input: { command: 'npm run build' }
    }));

    const json = runCli(['timeline', '--session', 'cli-session', '--last', '1', '--json']);
    assert.strictEqual(json.status, 0);
    const parsed = JSON.parse(json.stdout);
    assert.strictEqual(parsed.events.length, 1);
    assert.strictEqual(parsed.events[0].summary, 'npm run build');

    const table = runCli(['timeline', '--session', 'cli-session', '--last', '1']);
    assert.strictEqual(table.status, 0);
    assert.ok(table.stdout.includes('Session: cli-session'));
    assert.ok(table.stdout.includes('npm run build'));
    assert.ok(!table.stdout.includes('npm test'));

    const clear = runCli(['timeline', 'clear', '--session', 'cli-session']);
    assert.strictEqual(clear.status, 0);
    assert.strictEqual(readToolTimelineCache('cli-session'), null);
  });
});
