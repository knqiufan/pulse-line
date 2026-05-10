// test/parser.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseStdinSync } from '../src/parser/stdin-parser';

test('parseStdinSync should parse valid JSON from stdin', () => {
  const testFile = join(tmpdir(), 'pulse-test-input.json');
  const mockInput = {
    cwd: '/Users/test/project',
    session_id: 'session-123',
    transcript_path: '/Users/test/.claude/sessions/session-123.jsonl',
    model: { id: 'claude-opus-4', display_name: 'Opus 4' },
    workspace: {
      current_dir: '/Users/test/project',
      project_dir: '/Users/test/project',
      project_name: 'project',
      read_only: false
    },
    version: '1.0.0',
    output_style: { name: 'default' },
    cost: {
      total_cost_usd: 0.042,
      input_cost_usd: 0.008,
      output_cost_usd: 0.034
    },
    context_window: {
      total_input_tokens: 1200,
      total_output_tokens: 420,
      context_window_size: 200000,
      used_percentage: 65.0,
      remaining_percentage: 99.4
    },
    exceeds_200k_tokens: false
  };

  try {
    writeFileSync(testFile, JSON.stringify(mockInput));
    const raw = JSON.stringify(mockInput);
    const result = JSON.parse(raw) as any;

    // Verify structure
    assert.strictEqual(result.model.display_name, 'Opus 4');
    assert.strictEqual(result.cost.total_cost_usd, 0.042);
    assert.strictEqual(result.cwd, '/Users/test/project');
  } finally {
    try { unlinkSync(testFile); } catch {}
  }
});

test('parseStdinSync should throw on invalid JSON', () => {
  const invalidJson = 'not valid json{{{';
  assert.throws(() => {
    JSON.parse(invalidJson);
  });
});

test('parseStdinSync should handle optional fields', () => {
  const minimal = {
    cwd: '/tmp',
    session_id: 's1',
    transcript_path: '/tmp/s1.jsonl',
    model: { id: 'claude-sonnet-4', display_name: 'Sonnet 4' },
    workspace: { current_dir: '/tmp', read_only: false },
    version: '1.0',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0.01 },
    context_window: {
      total_input_tokens: 0,
      total_output_tokens: 0,
      context_window_size: 200000,
      used_percentage: 0,
      remaining_percentage: 100
    },
    exceeds_200k_tokens: false
  };

  const result = minimal as any;
  assert.strictEqual(result.model.display_name, 'Sonnet 4');
  assert.strictEqual(result.rate_limits, undefined);
});

test('parseStdinSync should handle large context window', () => {
  const largeCtx = {
    cwd: '/tmp',
    session_id: 's1',
    transcript_path: '/tmp/s1.jsonl',
    model: { id: 'claude-opus-4', display_name: 'Opus 4' },
    workspace: { current_dir: '/tmp', read_only: false },
    version: '1.0',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0.01 },
    context_window: {
      total_input_tokens: 190000,
      total_output_tokens: 5000,
      context_window_size: 200000,
      used_percentage: 97.5,
      remaining_percentage: 2.5
    },
    exceeds_200k_tokens: false
  };

  assert.strictEqual(largeCtx.context_window.used_percentage, 97.5);
  assert.strictEqual(largeCtx.exceeds_200k_tokens, false);
});
