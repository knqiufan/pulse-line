// src/config/migrate-config.ts

import type { PulseConfig } from '../types/pulse-config';

const CURRENT_SCHEMA = 4;

export function upgradePulseSchemaIfNeeded(config: PulseConfig): boolean {
  const v = config.schemaVersion ?? 0;
  if (v >= CURRENT_SCHEMA) return false;

  if (v < 3 && config.iconSet === 'nerd') {
    config.iconSet = 'text';
  }

  if (v < 4) {
    (config as any).language = (config as any).language ?? 'zh';
    if (config.modules.model) {
      config.modules.model.icon = '[当前模型]';
    }
  }

  config.schemaVersion = CURRENT_SCHEMA;
  return true;
}
