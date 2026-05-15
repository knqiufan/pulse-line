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
  assert.ok(c.modules.toolTimeline);
  assert.strictEqual(c.modules.toolTimeline.enabled, false);
  assert.strictEqual(c.modules.toolTimeline.displayMode, 'analytics-panel');
  assert.strictEqual(c.modules.toolTimeline.maxDisplayEvents, 5);
  assert.strictEqual(c.schemaVersion, 6);
});

test('upgradePulseSchemaIfNeeded skips current schema', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  assert.strictEqual(upgradePulseSchemaIfNeeded(c), false);
});

test('upgradePulseSchemaIfNeeded adds toolTimeline to v4 config', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  delete (c.modules as any).toolTimeline;
  c.schemaVersion = 4;

  assert.strictEqual(upgradePulseSchemaIfNeeded(c), true);
  assert.ok(c.modules.toolTimeline);
  assert.strictEqual(c.modules.toolTimeline.order, 16);
  assert.strictEqual(c.modules.toolTimeline.displayMode, 'analytics-panel');
  assert.strictEqual(c.schemaVersion, 6);
});

test('upgradePulseSchemaIfNeeded does not coerce nerd for v4 config', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  c.iconSet = 'nerd';
  c.schemaVersion = 4;
  delete (c.modules as any).toolTimeline;

  assert.strictEqual(upgradePulseSchemaIfNeeded(c), true);
  assert.strictEqual(c.iconSet, 'nerd');
  assert.ok(c.modules.toolTimeline);
  assert.strictEqual(c.modules.toolTimeline.displayMode, 'analytics-panel');
  assert.strictEqual(c.schemaVersion, 6);
});

test('upgradePulseSchemaIfNeeded fills v5 analytics panel defaults', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  c.schemaVersion = 5;
  delete (c.modules.toolTimeline as any).displayMode;
  delete (c.modules.toolTimeline as any).panelWidth;
  c.modules.toolTimeline.maxDisplayEvents = undefined;

  assert.strictEqual(upgradePulseSchemaIfNeeded(c), true);
  assert.strictEqual(c.modules.toolTimeline.displayMode, 'analytics-panel');
  assert.strictEqual(c.modules.toolTimeline.maxDisplayEvents, 5);
  assert.strictEqual(c.modules.toolTimeline.panelWidth, 59);
  assert.strictEqual(c.schemaVersion, 6);
});
