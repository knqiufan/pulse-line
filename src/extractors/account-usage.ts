// src/extractors/account-usage.ts

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { debug } from '../utils/logger';
import { API_KEYS_PATH } from '../utils/constants';
import { loadSessionCache, saveSessionCache } from '../utils/cache';
import type { PulseConfig, AccountUsageModuleConfig } from '../types/pulse-config';

export interface AccountUsageResult {
  provider: string;
  text: string;
  fg: string;
  icon: string;
}

interface ApiKeysConfig {
  providers: {
    zhipu?: { enabled: boolean; apiKey: string; baseUrl: string; planType?: string };
    deepseek?: { enabled: boolean; apiKey: string; baseUrl: string };
    minimax?: { enabled: boolean; apiKey: string; baseUrl: string; groupId?: string };
    stepfun?: { enabled: boolean; apiKey: string; baseUrl: string };
    xiaomi_mimo?: { enabled: boolean; apiKey: string; baseUrl: string };
  };
  cacheTTL: number;
  timeout: number;
}

const NERD_ICON = 'D7'; // nf-md-link
const TEXT_ICON = '[A]';

const BAR_WIDTH = 12;

function formatProgressBar(pct: number): string {
  const clamped = Math.min(100, Math.max(0, pct));
  const filled = Math.round((clamped / 100) * BAR_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function formatDeepSeekUsage(data: any, icon: string): AccountUsageResult {
  const balance = data.balance_infos?.[0];
  if (!balance) throw new Error('No balance info');

  const total = parseFloat(balance.total_balance || '0');
  const text = `DeepSeek: ¥${total.toFixed(2)}`;
  return { provider: 'deepseek', text, fg: '#00d4aa', icon };
}

function formatZhipuUsage(data: any, icon: string): AccountUsageResult {
  const limits = data.data?.limits || [];
  const tokensLimits = limits.filter((l: any) => l.type === 'TOKENS_LIMIT');

  if (tokensLimits.length === 0) throw new Error('No TOKENS_LIMIT found');

  const limit = tokensLimits[0];
  const pct = limit.percentage || 0;
  const totalQuota = limit.limit || 0;
  const usedQuota = limit.used || 0;
  const resetTime = limit.reset_time || '';

  const bar = formatProgressBar(pct);
  let text = `GLM: ${bar} ${pct.toFixed(1)}%`;

  if (resetTime) {
    const resetDate = new Date(resetTime);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    if (diffMs > 0) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      text += ` (${diffHrs}h ${diffMins}m 剩余)`;
    } else {
      text += ' (已重置)';
    }
  }

  return { provider: 'zhipu', text, fg: '#a855f7', icon };
}

function formatMiniMaxUsage(data: any, icon: string): AccountUsageResult {
  // MiniMax returns usage data in a format similar to GLM
  // Actual API format may differ - adjust based on real API response
  const pct = data.percentage || data.quota_percentage || 0;
  const bar = formatProgressBar(pct);

  let text = `MiniMax: ${bar} ${pct.toFixed(1)}%`;

  // Try to extract remaining time if available
  const resetTime = data.reset_time || data.quota_reset_time;
  if (resetTime) {
    const resetDate = new Date(resetTime);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    if (diffMs > 0) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      text += ` (${diffHrs}h ${diffMins}m)`;
    }
  }

  return { provider: 'minimax', text, fg: '#a855f7', icon };
}

function formatStepFunUsage(data: any, icon: string): AccountUsageResult {
  const balance = data.balance || data.total_balance || 0;
  const text = `StepFun: ¥${parseFloat(balance).toFixed(2)}`;
  return { provider: 'stepfun', text, fg: '#00d4aa', icon };
}

async function queryZhipu(config: any, theme: any, timeout: number): Promise<AccountUsageResult | null> {
  return new Promise((resolve) => {
    const url = new URL('/api/monitor/usage/quota/limit', config.baseUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 200) {
            resolve(null);
            return;
          }
          const result = formatZhipuUsage(json, NERD_ICON);
          resolve(result);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

async function queryDeepSeek(config: any, theme: any, timeout: number): Promise<AccountUsageResult | null> {
  return new Promise((resolve) => {
    const url = new URL('/user/balance', config.baseUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = formatDeepSeekUsage(json, NERD_ICON);
          resolve(result);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

async function queryMiniMax(config: any, theme: any, timeout: number): Promise<AccountUsageResult | null> {
  // TODO: Implement MiniMax API query when verified
  // Expected API: GET /v1/account/usage or similar
  // For now, return null gracefully
  return null;
}

async function queryStepFun(config: any, theme: any, timeout: number): Promise<AccountUsageResult | null> {
  // TODO: Implement StepFun API query when verified
  // Expected API: GET /api/account/usage or similar
  // For now, return null gracefully
  return null;
}

async function queryXiaomiMimo(config: any, theme: any, timeout: number): Promise<AccountUsageResult | null> {
  // TODO: Implement Xiaomi Mimo API query when verified
  // For now, return null gracefully
  return null;
}

async function queryProvider(
  provider: string,
  config: any,
  theme: any,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  const cacheKey = `account-usage-${provider}`;
  const cached = loadSessionCache<AccountUsageResult>('global', cacheKey);
  if (cached) {
    return cached;
  }

  let result: AccountUsageResult | null = null;

  switch (provider) {
    case 'zhipu':
      result = await queryZhipu(config, theme, timeout);
      break;
    case 'deepseek':
      result = await queryDeepSeek(config, theme, timeout);
      break;
    case 'minimax':
      result = await queryMiniMax(config, theme, timeout);
      break;
    case 'stepfun':
      result = await queryStepFun(config, theme, timeout);
      break;
    case 'xiaomi_mimo':
      result = await queryXiaomiMimo(config, theme, timeout);
      break;
  }

  if (result) {
    saveSessionCache('global', cacheKey, result, 300000); // 5 min TTL
  }

  return result;
}

function loadApiKeysConfig(): ApiKeysConfig | null {
  try {
    if (!fs.existsSync(API_KEYS_PATH)) return null;
    const raw = fs.readFileSync(API_KEYS_PATH, 'utf8');
    return JSON.parse(raw) as ApiKeysConfig;
  } catch {
    return null;
  }
}

export function extractAccountUsageSync(
  config: AccountUsageModuleConfig,
  theme: any
): AccountUsageResult[] {
  if (!config.enabled) return [];

  const apiConfig = loadApiKeysConfig();
  if (!apiConfig) return [];

  const providers = config.providers || [];
  if (providers.length === 0) return [];

  // Try to get cached results synchronously
  const results: AccountUsageResult[] = [];
  for (const provider of providers) {
    const cacheKey = `account-usage-${provider}`;
    const cached = loadSessionCache<AccountUsageResult>('global', cacheKey);
    if (cached) {
      results.push(cached);
    }
  }

  return results;
}

export async function refreshAccountUsage(
  config: AccountUsageModuleConfig,
  theme: any,
  timeout: number = 2000
): Promise<void> {
  if (!config.enabled) return;

  const apiConfig = loadApiKeysConfig();
  if (!apiConfig) return;

  const providers = config.providers || [];
  if (providers.length === 0) return;

  // Fire and forget - results will be cached for next render
  const promises: Promise<void>[] = [];

  for (const provider of providers) {
    const providerConfig = apiConfig.providers[provider as keyof typeof apiConfig.providers];
    if (!providerConfig?.enabled || !providerConfig.apiKey) continue;

    promises.push(
      queryProvider(provider, providerConfig, theme, timeout, NERD_ICON)
        .then(() => {
          debug(`Account usage refreshed for ${provider}`);
        })
        .catch(err => {
          debug(`Account usage refresh failed for ${provider}:`, err);
        })
    );
  }

  await Promise.all(promises);
}
