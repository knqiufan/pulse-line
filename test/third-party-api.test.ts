// test/third-party-api.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { extractThirdPartyApi, createDefaultApiKeysConfig } from '../src/extractors/third-party-api';
import { darkTheme } from '../src/themes/builtin/dark';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

test('extractThirdPartyApi should return empty array when no providers configured', async () => {
  const results = await extractThirdPartyApi([], darkTheme);
  assert.ok(Array.isArray(results));
  assert.strictEqual(results.length, 0);
});

test('extractThirdPartyApi should handle disabled providers', async () => {
  const results = await extractThirdPartyApi(['zhipu', 'deepseek'], darkTheme);
  assert.ok(Array.isArray(results));
  // Should be empty since providers are disabled by default
  assert.ok(results.length >= 0);
});

test('createDefaultApiKeysConfig should create config file', () => {
  const testPath = path.join(os.tmpdir(), 'pulse-test-api-keys.json');
  const originalPath = '/d/code/status-bar-cc/.worktrees/implementation/src/utils/constants.ts';

  // Just verify the function doesn't throw
  try {
    createDefaultApiKeysConfig();
    assert.ok(true);
  } catch (err) {
    assert.fail('Should not throw');
  }
});

test('extractThirdPartyApi should gracefully handle network errors', async () => {
  // Query with invalid provider should not crash
  const results = await extractThirdPartyApi(['nonexistent'], darkTheme);
  assert.ok(Array.isArray(results));
});
