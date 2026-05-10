// test/third-party-api.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import { extractThirdPartyApi } from '../src/extractors/third-party-api';
import { darkTheme } from '../src/themes/builtin/dark';

const TMP_CWD = os.tmpdir();

test('extractThirdPartyApi should return empty array when no providers configured', async () => {
  const results = await extractThirdPartyApi([], darkTheme, 500, TMP_CWD);
  assert.ok(Array.isArray(results));
  assert.strictEqual(results.length, 0);
});

test('extractThirdPartyApi skips providers without keys in env/settings', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-no-keys-'));
  try {
    const results = await extractThirdPartyApi(
      ['zhipu', 'deepseek'],
      darkTheme,
      500,
      cwd
    );
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 0);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('extractThirdPartyApi should gracefully handle unknown provider ids', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-unknown-prov-'));
  try {
    const results = await extractThirdPartyApi(
      ['nonexistent_provider'],
      darkTheme,
      500,
      cwd
    );
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 0);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
