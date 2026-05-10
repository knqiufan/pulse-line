// test/provider-credentials.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { resolveProviderCredentials } from '../src/utils/provider-credentials';

test('zhipu resolves from ANTHROPIC_* when BASE_URL targets bigmodel.cn', () => {
  const merged: Record<string, string> = {
    ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
    ANTHROPIC_AUTH_TOKEN: 'test-bigmodel-token'
  };
  const c = resolveProviderCredentials('zhipu', merged);
  assert.ok(c);
  assert.strictEqual(c!.apiKey, 'test-bigmodel-token');
  assert.strictEqual(c!.baseUrl, 'https://open.bigmodel.cn');
});

test('classic ZHIPU_API_KEY beats Anthropic-compat when both set', () => {
  const merged: Record<string, string> = {
    ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
    ANTHROPIC_AUTH_TOKEN: 'anthropic-route',
    ZHIPU_API_KEY: 'dedicated-key'
  };
  const c = resolveProviderCredentials('zhipu', merged);
  assert.strictEqual(c!.apiKey, 'dedicated-key');
});
