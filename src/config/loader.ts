// src/config/loader.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { debug } from '../utils/logger';
import { loadSessionCache, saveSessionCache } from '../utils/cache';
import type { PulseConfig } from '../types/pulse-config';
import { DEFAULT_CONFIG } from '../types/pulse-config';
import { sanitizePulseDisplayConfig } from '../utils/display-sanitize';
import { upgradePulseSchemaIfNeeded } from './migrate-config';

function persistIfMigrated(
  config: PulseConfig,
  configPath: string,
  migrated: boolean
): void {
  if (!migrated || !fs.existsSync(configPath)) return;
  saveConfig(config);
}

export function loadConfig(): PulseConfig {
  const configPath = getConfigPath();
  const cacheKey = 'pulse-config-v4';

  const cached = loadSessionCache<PulseConfig>('global', cacheKey);
  if (cached) {
    const migrated = upgradePulseSchemaIfNeeded(cached);
    sanitizePulseDisplayConfig(cached);
    persistIfMigrated(cached, configPath, migrated);
    saveSessionCache('global', cacheKey, cached, 60 * 1000);
    debug('Config loaded from cache');
    return cached;
  }

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;
  const hadFile = fs.existsSync(configPath);

  if (hadFile) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(raw) as PulseConfig &
        Record<string, unknown>;

      config = deepMerge(config, userConfig);

      const userHasSchema = Object.prototype.hasOwnProperty.call(
        userConfig,
        'schemaVersion'
      );
      if (!userHasSchema) {
        delete config.schemaVersion;
      }

      debug('Config loaded from file:', configPath);
    } catch (err) {
      debug('Config load error, using defaults:', err);
    }
  }

  const migrated = upgradePulseSchemaIfNeeded(config);
  sanitizePulseDisplayConfig(config);

  if (!hadFile) {
    saveConfig(config);
    debug('Default config created at:', configPath);
  } else {
    persistIfMigrated(config, configPath, migrated);
  }

  // Cache config for 1 minute
  saveSessionCache('global', cacheKey, config, 60 * 1000);

  return config;
}

export function saveConfig(config: PulseConfig): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    debug('Config saved to:', configPath);
  } catch (err) {
    debug('Config save failed:', err);
  }
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.claude', 'pulse', 'config.json');
}

export function getPulseDir(): string {
  return path.join(os.homedir(), '.claude', 'pulse');
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function validateConfig(config: PulseConfig): string[] {
  const errors: string[] = [];

  if (!config.theme || typeof config.theme !== 'string') {
    errors.push('theme must be a non-empty string');
  }

  if (config.padding < 0 || config.padding > 10) {
    errors.push('padding must be between 0 and 10');
  }

  if (config.maxPerLine !== undefined) {
    if (!Number.isInteger(config.maxPerLine) || config.maxPerLine < 1 || config.maxPerLine > 20) {
      errors.push('maxPerLine must be an integer between 1 and 20');
    }
  }

  if (config.iconSet !== 'nerd' && config.iconSet !== 'text') {
    errors.push('iconSet must be "nerd" or "text"');
  }

  const orders = Object.values(config.modules)
    .filter((m: any) => m.enabled)
    .map((m: any) => m.order);

  if (new Set(orders).size !== orders.length) {
    errors.push('module orders must be unique');
  }

  return errors;
}
