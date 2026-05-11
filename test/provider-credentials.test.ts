// test/provider-credentials.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { resolveProviderCredentials } from '../src/utils/provider-credentials';

test('zhipu resolves from ANTHROPIC_* when BASE_URL targets bigmodel.cn', () => {
  const save: Record<string, string | undefined> = {};
  for (const k of ['ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'ZHIPU_API_KEY', 'ZHIPUAI_API_KEY',
    'BIGMODEL_API_KEY', 'PULSE_ZHIPU_API_KEY', 'ANTHROPIC_API_KEY']) {
    save[k] = process.env[k];
    delete process.env[k];
  }
  try {
    const merged: Record<string, string> = {
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'test-bigmodel-token'
    };
    const c = resolveProviderCredentials('zhipu', merged);
    assert.ok(c);
    assert.strictEqual(c!.apiKey, 'test-bigmodel-token');
    assert.strictEqual(c!.baseUrl, 'https://open.bigmodel.cn');
  } finally {
    for (const k of Object.keys(save)) {
      const v = save[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('classic ZHIPU_API_KEY beats Anthropic-compat when both set', () => {
  const save: Record<string, string | undefined> = {};
  for (const k of ['ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'ZHIPU_API_KEY']) {
    save[k] = process.env[k];
    delete process.env[k];
  }
  try {
    const merged: Record<string, string> = {
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'anthropic-route',
      ZHIPU_API_KEY: 'dedicated-key'
    };
    const c = resolveProviderCredentials('zhipu', merged);
    assert.strictEqual(c!.apiKey, 'dedicated-key');
  } finally {
    for (const k of Object.keys(save)) {
      const v = save[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
