// test/advanced-extractors.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { extractTurns } from '../src/extractors/transcript';
import { extractThinking } from '../src/extractors/thinking';
import { extractMcpStatus } from '../src/extractors/mcp';
import { darkTheme } from '../src/themes/builtin/dark';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

test('extractThinking should detect thinking mode', () => {
  const result = extractThinking({ thinking: { enabled: true } });
  assert.ok(result);
  assert.strictEqual(result.text, '🤔 on');
});

test('extractThinking should return null when not enabled', () => {
  const result = extractThinking({});
  assert.strictEqual(result, null);
});

test('extractMcpStatus should detect MCP servers', () => {
  const result = extractMcpStatus();
  // May or may not find servers, just shouldn't crash
  assert.ok(result === null || typeof result.text === 'string');
});

test('extractTurns should count transcript entries', () => {
  const tmpFile = path.join(os.tmpdir(), 'pulse-test-transcript.jsonl');
  const lines = [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }),
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: 'hello' } }),
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'how are you?' } }),
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: 'fine' } }),
    JSON.stringify({ type: 'system', message: { role: 'system', content: 'notice' } })
  ];
  fs.writeFileSync(tmpFile, lines.join('\n'));

  try {
    const result = extractTurns(tmpFile);
    assert.ok(result);
    assert.strictEqual(result.text, '💬 4 turns');
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('extractTurns should return null for empty transcript', () => {
  const tmpFile = path.join(os.tmpdir(), 'pulse-test-empty.jsonl');
  fs.writeFileSync(tmpFile, '');

  try {
    const result = extractTurns(tmpFile);
    assert.strictEqual(result, null);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('extractTurns should return null for non-existent file', () => {
  const result = extractTurns('/tmp/nonexistent-file-12345.jsonl');
  assert.strictEqual(result, null);
});
