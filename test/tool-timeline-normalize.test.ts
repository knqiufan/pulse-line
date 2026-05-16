import { test } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import {
  normalizeClaudeToolHook,
  normalizeClaudeSubagentStopHook,
  relativeToCwd,
  summarizeTool
} from '../src/extractors/tool-timeline';

test('normalizeClaudeToolHook accepts successful Bash hook', () => {
  const event = normalizeClaudeToolHook({
    session_id: 's1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'npm test\nsecond line', description: 'run tests' },
    tool_response: { stdout: 'ok\nnext' },
    tool_use_id: 'toolu_1',
    duration_ms: 1280
  });

  assert.ok(event);
  assert.strictEqual(event.id, 'claude-code:s1:toolu_1');
  assert.strictEqual(event.status, 'success');
  assert.strictEqual(event.displayName, 'Bash');
  assert.strictEqual(event.actorKind, 'main-agent');
  assert.strictEqual(event.summary, 'run tests: npm test');
  assert.strictEqual(event.target?.kind, 'command');
  assert.strictEqual(event.durationMs, 1280);
  assert.strictEqual(event.responseSummary, 'stdout: ok');
});

test('normalizeClaudeToolHook extracts Agent telemetry', () => {
  const event = normalizeClaudeToolHook({
    session_id: 's1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Agent',
    tool_input: {
      subagent_type: 'Explore',
      description: 'Explore codebase'
    },
    tool_response: {
      agentId: 'agent_explore_1',
      status: 'success',
      totalToolUseCount: 7,
      totalTokens: 42100,
      totalDurationMs: 18400
    },
    tool_use_id: 'toolu_agent_1',
    duration_ms: 19000
  });

  assert.ok(event);
  assert.strictEqual(event.displayName, 'Agent');
  assert.strictEqual(event.summary, 'Explore');
  assert.strictEqual(event.actorKind, 'main-agent');
  assert.strictEqual(event.actorName, 'Explore');
  assert.strictEqual(event.agentId, 'agent_explore_1');
  assert.strictEqual(event.subagentType, 'Explore');
  assert.strictEqual(event.subagentMetrics?.totalToolUseCount, 7);
  assert.strictEqual(event.subagentMetrics?.totalTokens, 42100);
  assert.strictEqual(event.subagentMetrics?.totalDurationMs, 18400);
  assert.strictEqual(event.durationMs, 18400);
});

test('normalizeClaudeToolHook handles Agent without telemetry', () => {
  const event = normalizeClaudeToolHook({
    session_id: 's1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Agent',
    tool_input: { description: 'Review changes' },
    tool_response: {},
    duration_ms: 1200
  });

  assert.ok(event);
  assert.strictEqual(event.summary, 'Review changes');
  assert.strictEqual(event.subagentMetrics, undefined);
  assert.strictEqual(event.durationMs, 1200);
});

test('normalizeClaudeSubagentStopHook extracts agent metadata', () => {
  const meta = normalizeClaudeSubagentStopHook({
    session_id: 's1',
    hook_event_name: 'SubagentStop',
    agent_id: 'agent_explore_1',
    agent_type: 'Explore',
    agent_transcript_path: '/tmp/agent.jsonl'
  });

  assert.ok(meta);
  assert.strictEqual(meta.agentId, 'agent_explore_1');
  assert.strictEqual(meta.agentType, 'Explore');
  assert.strictEqual(meta.displayName, 'Explore');
  assert.strictEqual(meta.transcriptPath, '/tmp/agent.jsonl');
});

test('normalizeClaudeSubagentStopHook rejects missing agent id', () => {
  assert.strictEqual(normalizeClaudeSubagentStopHook({
    session_id: 's1',
    hook_event_name: 'SubagentStop'
  }), null);
});

test('normalizeClaudeToolHook accepts failed Bash hook', () => {
  const event = normalizeClaudeToolHook({
    session_id: 's1',
    hook_event_name: 'PostToolUseFailure',
    tool_name: 'Bash',
    tool_input: { command: 'npm test' },
    error: 'failed hard\nsecret line'
  });

  assert.ok(event);
  assert.strictEqual(event.status, 'failure');
  assert.strictEqual(event.errorSummary, 'failed hard');
});

test('normalizeClaudeToolHook rejects missing required fields', () => {
  assert.strictEqual(normalizeClaudeToolHook({
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash'
  }), null);
  assert.strictEqual(normalizeClaudeToolHook({
    hook_event_name: 'PostToolUse',
    session_id: 's1'
  }), null);
  assert.strictEqual(normalizeClaudeToolHook({
    hook_event_name: 'PreToolUse',
    session_id: 's1',
    tool_name: 'Bash'
  }), null);
});

test('normalizeClaudeToolHook ignores invalid duration', () => {
  const event = normalizeClaudeToolHook({
    session_id: 's1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'npm test' },
    duration_ms: -1
  });
  assert.ok(event);
  assert.strictEqual(event.durationMs, undefined);
});

test('summarizeTool extracts file and query targets', () => {
  // Use Unix-style paths that work cross-platform in path.relative
  const read = summarizeTool('Read', { file_path: '/repo/src/index.ts' }, '/repo');
  assert.strictEqual(read.target?.kind, 'file');
  assert.strictEqual(read.summary, path.join('src', 'index.ts'));

  const edit = summarizeTool('Edit', { file_path: '/repo/src/index.ts' }, '/repo');
  assert.strictEqual(edit.summary, `edit ${path.join('src', 'index.ts')}`);

  const multi = summarizeTool('MultiEdit', {
    file_path: '/repo/src/index.ts',
    edits: [{}, {}]
  }, '/repo');
  assert.strictEqual(multi.summary, `multi-edit ${path.join('src', 'index.ts')} (2)`);

  const grep = summarizeTool('Grep', { pattern: 'TODO', path: 'src' });
  assert.strictEqual(grep.target?.kind, 'query');
  assert.ok(grep.summary.includes('grep TODO'));
});

test('summarizeTool extracts web and MCP targets', () => {
  const fetch = summarizeTool('WebFetch', { url: 'https://example.com/docs/page?q=1' });
  assert.strictEqual(fetch.target?.kind, 'url');
  assert.strictEqual(fetch.summary, 'fetch example.com/docs/page');

  const search = summarizeTool('WebSearch', { query: 'claude code hooks' });
  assert.strictEqual(search.summary, 'search claude code hooks');

  const mcp = summarizeTool('mcp__fs__read', {});
  assert.strictEqual(mcp.displayName, 'MCP');
  assert.strictEqual(mcp.summary, 'mcp fs.read');
  assert.strictEqual(mcp.target?.kind, 'mcp');
});

test('summaries remove ANSI, newlines, and truncate long commands', () => {
  const summary = summarizeTool('Bash', {
    command: `\x1b[31m${'a'.repeat(120)}\x1b[0m\nnext`
  });
  assert.ok(!summary.summary.includes('\x1b'));
  assert.ok(!summary.summary.includes('\n'));
  assert.ok(summary.summary.length <= 80);
  assert.ok(summary.summary.endsWith('...'));
});

test('relativeToCwd keeps outside paths unchanged', () => {
  assert.strictEqual(relativeToCwd('/repo/src/index.ts', '/repo'), path.join('src', 'index.ts'));
  assert.strictEqual(relativeToCwd('/other/file.ts', '/repo'), '/other/file.ts');
});
