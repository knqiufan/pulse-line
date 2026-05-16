// src/config/migrate-config.ts

import type { PulseConfig } from '../types/pulse-config';
import { DEFAULT_CONFIG } from '../types/pulse-config';

const CURRENT_SCHEMA = 7;

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

  if (v < 5 && !(config.modules as any).toolTimeline) {
    (config.modules as any).toolTimeline = JSON.parse(
      JSON.stringify(DEFAULT_CONFIG.modules.toolTimeline)
    );
  }

  if (v < 6) {
    ensureToolTimelineAnalyticsDefaults(config);
  }

  if (v < 7) {
    if (!(config.modules as any).rules) {
      (config.modules as any).rules = JSON.parse(
        JSON.stringify(DEFAULT_CONFIG.modules.rules)
      );
    }
  }

  config.schemaVersion = CURRENT_SCHEMA;
  return true;
}

function ensureToolTimelineAnalyticsDefaults(config: PulseConfig): void {
  const defaults = DEFAULT_CONFIG.modules.toolTimeline;
  const toolTimeline = (config.modules as any).toolTimeline;
  if (!toolTimeline) {
    (config.modules as any).toolTimeline = JSON.parse(JSON.stringify(defaults));
    return;
  }

  toolTimeline.displayMode = toolTimeline.displayMode ?? defaults.displayMode;
  toolTimeline.maxDisplayEvents = normalizePositiveNumber(
    toolTimeline.maxDisplayEvents,
    defaults.maxDisplayEvents
  );
  toolTimeline.panelWidth = normalizePositiveNumber(
    toolTimeline.panelWidth,
    defaults.panelWidth
  );
  toolTimeline.showRecent = toolTimeline.showRecent ?? defaults.showRecent;
  toolTimeline.showTokenStats = toolTimeline.showTokenStats ?? defaults.showTokenStats;
  toolTimeline.showAgentStats = toolTimeline.showAgentStats ?? defaults.showAgentStats;
  toolTimeline.showSuccessRate = toolTimeline.showSuccessRate ?? defaults.showSuccessRate;
}

function normalizePositiveNumber(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}
