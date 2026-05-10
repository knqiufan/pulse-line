// test/display-sanitize.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import {
  containsPrivateUseOrProblematicPlanes,
  sanitizePulseDisplayConfig
} from '../src/utils/display-sanitize';
import type { PulseConfig } from '../src/types/pulse-config';
import { DEFAULT_CONFIG } from '../src/types/pulse-config';

test('containsPrivateUseOrProblematicPlanes detects PUA', () => {
  assert.strictEqual(containsPrivateUseOrProblematicPlanes('[M]'), false);
  assert.strictEqual(
    containsPrivateUseOrProblematicPlanes('\u{e0b0}'),
    true
  );
});

test('sanitizePulseDisplayConfig resets PUA separator', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  c.separator = '\u{e0b0}\u{e0b1}';
  sanitizePulseDisplayConfig(c);
  assert.strictEqual(c.separator, DEFAULT_CONFIG.separator);
});

test('sanitizePulseDisplayConfig replaces non-ascii module icons in text mode', () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  c.iconSet = 'text';
  c.modules.model.icon = '\u{F026}glyph';
  sanitizePulseDisplayConfig(c);
  assert.strictEqual(c.modules.model.icon, DEFAULT_CONFIG.modules.model.icon);
});
