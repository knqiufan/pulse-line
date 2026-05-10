// src/extractors/account-usage.ts

import * as https from 'https';
import { debug } from '../utils/logger';
import { loadMergedClaudeEnv } from '../utils/claude-settings-env';
import { resolveProviderCredentials, type ResolvedProviderCred } from '../utils/provider-credentials';
import { loadSessionCache, saveSessionCache } from '../utils/cache';
import type { AccountUsageModuleConfig } from '../types/pulse-config';

export interface AccountUsageResult {
  provider: string;
  text: string;
  fg: string;
  icon: string;
}

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
  const text = `DeepSeek: CN¥${total.toFixed(2)}`;
  return { provider: 'deepseek', text, fg: '#00d4aa', icon };
}

function formatZhipuUsage(data: any, icon: string): AccountUsageResult {
  const limits = data.data?.limits || [];
  const tokensLimits = limits.filter((l: any) => l.type === 'TOKENS_LIMIT');

  if (tokensLimits.length === 0) throw new Error('No TOKENS_LIMIT found');

  const limit = tokensLimits[0];
  const pct = limit.percentage || 0;
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

async function queryZhipu(
  cred: ResolvedProviderCred,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  return new Promise((resolve) => {
    const url = new URL('/api/monitor/usage/quota/limit', cred.baseUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cred.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 200) {
            resolve(null);
            return;
          }
          resolve(formatZhipuUsage(json, icon));
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

async function queryDeepSeek(
  cred: ResolvedProviderCred,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  return new Promise((resolve) => {
    const url = new URL('/user/balance', cred.baseUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cred.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(formatDeepSeekUsage(json, icon));
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

async function queryMiniMax(): Promise<AccountUsageResult | null> {
  return null;
}

async function queryStepFun(): Promise<AccountUsageResult | null> {
  return null;
}

async function queryXiaomiMimo(): Promise<AccountUsageResult | null> {
  return null;
}

async function runProviderQuery(
  provider: string,
  cred: ResolvedProviderCred,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  switch (provider) {
    case 'zhipu':
      return queryZhipu(cred, timeout, icon);
    case 'deepseek':
      return queryDeepSeek(cred, timeout, icon);
    case 'minimax':
      return queryMiniMax();
    case 'stepfun':
      return queryStepFun();
    case 'xiaomi_mimo':
      return queryXiaomiMimo();
    default:
      return null;
  }
}

async function fetchAndCacheProvider(
  provider: string,
  cred: ResolvedProviderCred,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  const cacheKey = `account-usage-${provider}`;
  const cached = loadSessionCache<AccountUsageResult>('global', cacheKey);
  if (cached) {
    return cached;
  }

  const result = await runProviderQuery(provider, cred, timeout, icon);
  if (result) {
    saveSessionCache('global', cacheKey, result, 300000);
  }
  return result;
}

export function extractAccountUsageSync(config: AccountUsageModuleConfig): AccountUsageResult[] {
  if (!config.enabled) return [];

  const providers = config.providers || [];
  if (providers.length === 0) return [];

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
  _theme: unknown,
  timeout: number,
  cwd: string,
  icon: string
): Promise<void> {
  if (!config.enabled) return;

  const providers = config.providers || [];
  if (providers.length === 0) return;

  const merged = loadMergedClaudeEnv(cwd);
  const promises: Promise<void>[] = [];

  for (const provider of providers) {
    const cred = resolveProviderCredentials(provider, merged);
    if (!cred) continue;

    promises.push(
      fetchAndCacheProvider(provider, cred, timeout, icon)
        .then(() => {
          debug(`Account usage refreshed for ${provider}`);
        })
        .catch((err: unknown) => {
          debug(`Account usage refresh failed for ${provider}:`, err);
        })
        .then(() => undefined)
    );
  }

  await Promise.all(promises);
}
