// test/migrate-config.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { upgradePulseSchemaIfNeeded } from '../src/config/migrate-config';
import { DEFAULT_CONFIG, type PulseConfig } from '../src/types/pulse-config';

test('upgradePulseSchemaIfNeeded coerces nerd to text once for old schema', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  c.iconSet = 'nerd';
  delete c.schemaVersion;

  assert.strictEqual(upgradePulseSchemaIfNeeded(c), true);
  assert.strictEqual(c.iconSet, 'text');
  assert.strictEqual(c.schemaVersion, 3);
});

test('upgradePulseSchemaIfNeeded skips current schema', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  assert.strictEqual(upgradePulseSchemaIfNeeded(c), false);
});
