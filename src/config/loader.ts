// src/config/loader.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { debug } from '../utils/logger';
import { loadSessionCache, saveSessionCache } from '../utils/cache';
import type { PulseConfig } from '../types/pulse-config';
import { DEFAULT_CONFIG } from '../types/pulse-config';

export function loadConfig(): PulseConfig {
  const configPath = getConfigPath();
  const cacheKey = 'config';

  const cached = loadSessionCache<PulseConfig>('global', cacheKey);
  if (cached) {
    debug('Config loaded from cache');
    return cached;
  }

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as PulseConfig;

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(raw);
      config = deepMerge(config, userConfig);
      debug('Config loaded from file:', configPath);
    } catch (err) {
      debug('Config load error, using defaults:', err);
    }
  } else {
    // First run - create default config
    saveConfig(config);
    debug('Default config created at:', configPath);
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
