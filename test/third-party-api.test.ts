// test/third-party-api.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import { extractThirdPartyApi } from '../src/extractors/third-party-api';
import { darkTheme } from '../src/themes/builtin/dark';
import { __setTestEnvOverride } from '../src/utils/claude-settings-env';

const TMP_CWD = os.tmpdir();

test('extractThirdPartyApi should return empty array when no providers configured', async () => {
  const results = await extractThirdPartyApi([], darkTheme, 500, TMP_CWD);
  assert.ok(Array.isArray(results));
  assert.strictEqual(results.length, 0);
});

test('extractThirdPartyApi skips providers without keys in env/settings', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-no-keys-'));
  const keys = [
    'ZHIPU_API_KEY', 'ZHIPU_BASE_URL', 'ZHIPUAI_API_KEY', 'BIGMODEL_API_KEY', 'BIGMODEL_BASE_URL',
    'DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL',
    'MINIMAX_API_KEY', 'MINIMAX_GROUP_ID', 'MINIMAX_BASE_URL',
    'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY',
    'PULSE_PROVIDER',
    'PULSE_ZHIPU_API_KEY', 'PULSE_ZHIPU_BASE_URL',
    'PULSE_DEEPSEEK_API_KEY', 'PULSE_DEEPSEEK_BASE_URL'
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  __setTestEnvOverride({});
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
    __setTestEnvOverride(null);
    for (const k of keys) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
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
