// src/config/migrate-config.ts

import type { PulseConfig } from '../types/pulse-config';

const CURRENT_SCHEMA = 3;

/**
 * Older installs used Nerd glyphs by default — force text once so common terminals avoid tofu.
 * After this runs, schemaVersion is CURRENT_SCHEMA; users may set iconSet to nerd again deliberately.
 */
export function upgradePulseSchemaIfNeeded(config: PulseConfig): boolean {
  const v = config.schemaVersion ?? 0;
  if (v >= CURRENT_SCHEMA) return false;

  if (config.iconSet === 'nerd') {
    config.iconSet = 'text';
  }
  config.schemaVersion = CURRENT_SCHEMA;
  return true;
}
