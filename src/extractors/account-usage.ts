// src/extractors/account-usage.ts

import * as https from 'https';
import { debug } from '../utils/logger';
import { loadMergedClaudeEnv } from '../utils/claude-settings-env';
import { resolveProviderCredentials, detectProvidersFromEnv, type ResolvedProviderCred } from '../utils/provider-credentials';
import { loadSessionCache, saveSessionCache, removeSessionCacheKey } from '../utils/cache';
import type { AccountUsageModuleConfig } from '../types/pulse-config';

export interface AccountUsageResult {
  provider: string;
  text: string;
  fg: string;
  icon: string;
}

const CACHE_TTL = 120_000; // 2 minutes

const BAR_WIDTH = 12;

function formatProgressBar(pct: number): string {
  const clamped = Math.min(100, Math.max(0, pct));
  const filled = Math.round((clamped / 100) * BAR_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

// ── Response formatters ──────────────────────────────────────────

function formatDeepSeekUsage(data: any, icon: string): AccountUsageResult {
  const balance = data.balance_infos?.[0];
  if (!balance) throw new Error('No balance info');

  const total = parseFloat(balance.total_balance || '0');
  const text = `DeepSeek: CN¥${total.toFixed(2)}`;
  return { provider: 'deepseek', text, fg: '#00d4aa', icon };
}

function formatPercentUsage(data: any, provider: string, label: string, icon: string, fg: string): AccountUsageResult {
  const limits = data.data?.limits || [];
  const tokensLimits = limits.filter((l: any) => l.type === 'TOKENS_LIMIT');

  if (tokensLimits.length === 0) throw new Error('No TOKENS_LIMIT found');

  const limit = tokensLimits[0];
  const pct = limit.percentage || 0;

  const resetTime =
    limit.nextResetTime || limit.next_reset_time ||
    limit.reset_time || limit.resetTime || limit.reset_at ||
    limit.expire_time || limit.expireTime || limit.end_time || '';

  debug(`${label} usage: ${pct}%, reset_time="${resetTime}", raw=${JSON.stringify(limit)}`);

  const bar = formatProgressBar(pct);
  let text = `${label}: ${bar} ${pct.toFixed(1)}%`;

  if (resetTime) {
    const resetDate = new Date(resetTime);
    if (!isNaN(resetDate.getTime())) {
      const diffMs = resetDate.getTime() - Date.now();
      if (diffMs > 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        text += ` (${diffHrs}h ${diffMins}m 剩余)`;
      } else {
        text += ' (已重置)';
      }
    }
  }

  return { provider, text, fg, icon };
}

// ── Provider API queries ─────────────────────────────────────────

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
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          debug('Zhipu API response:', JSON.stringify(json).substring(0, 500));
          if (json.code !== 200) { resolve(null); return; }
          resolve(formatPercentUsage(json, 'zhipu', 'GLM', icon, '#a855f7'));
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
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
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          debug('DeepSeek API response:', JSON.stringify(json).substring(0, 300));
          resolve(formatDeepSeekUsage(json, icon));
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function queryMiniMax(
  cred: ResolvedProviderCred,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  return new Promise((resolve) => {
    const url = new URL('/api/monitor/usage/quota/limit', cred.baseUrl);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cred.apiKey}`,
      'Content-Type': 'application/json'
    };
    if (cred.groupId) {
      headers['X-Minimax-Group-Id'] = cred.groupId;
    }

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers,
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          debug('MiniMax API response:', JSON.stringify(json).substring(0, 500));
          if (json.code !== 200) { resolve(null); return; }
          resolve(formatPercentUsage(json, 'minimax', 'MiniMax', icon, '#f97316'));
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function runProviderQuery(
  provider: string,
  cred: ResolvedProviderCred,
  timeout: number,
  icon: string
): Promise<AccountUsageResult | null> {
  switch (provider) {
    case 'zhipu':    return queryZhipu(cred, timeout, icon);
    case 'deepseek': return queryDeepSeek(cred, timeout, icon);
    case 'minimax':  return queryMiniMax(cred, timeout, icon);
    default:         return null;
  }
}

// ── Provider resolution helpers ──────────────────────────────────

/** Determine which providers to query, and which are currently active (have credentials). */
function resolveActiveProviders(
  config: AccountUsageModuleConfig,
  cwd: string
): { allProviders: string[]; activeCreds: Map<string, ResolvedProviderCred>; merged: Record<string, string> } {
  const merged = loadMergedClaudeEnv(cwd);

  let allProviders = config.providers || [];
  if (allProviders.length === 0) {
    allProviders = detectProvidersFromEnv(merged);
  }

  const activeCreds = new Map<string, ResolvedProviderCred>();
  for (const provider of allProviders) {
    const cred = resolveProviderCredentials(provider, merged);
    if (cred) {
      activeCreds.set(provider, cred);
    }
  }

  return { allProviders, activeCreds, merged };
}

function cacheKey(provider: string): string {
  return `account-usage-${provider}`;
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Synchronous render: only show cached data for currently active providers.
 * Inactive providers (no valid credentials) are never displayed, even if
 * their cache entries still exist.
 */
export function extractAccountUsageSync(
  config: AccountUsageModuleConfig,
  cwd: string
): AccountUsageResult[] {
  if (!config.enabled) return [];

  const { activeCreds } = resolveActiveProviders(config, cwd);
  if (activeCreds.size === 0) return [];

  const results: AccountUsageResult[] = [];
  for (const provider of activeCreds.keys()) {
    const cached = loadSessionCache<AccountUsageResult>('global', cacheKey(provider));
    if (cached) {
      debug(`Sync render: using cached ${provider} data`);
      results.push(cached);
    }
  }

  return results;
}

/**
 * Async refresh:
 * 1. Fetch fresh data for active providers (bypass cache) and save.
 * 2. Remove stale cache entries for inactive providers.
 */
export async function refreshAccountUsage(
  config: AccountUsageModuleConfig,
  _theme: unknown,
  timeout: number,
  cwd: string,
  icon: string
): Promise<void> {
  if (!config.enabled) return;

  const { allProviders, activeCreds } = resolveActiveProviders(config, cwd);
  if (activeCreds.size === 0 && allProviders.length === 0) return;

  // Clean up stale cache for inactive providers
  for (const provider of allProviders) {
    if (!activeCreds.has(provider)) {
      removeSessionCacheKey('global', cacheKey(provider));
      debug(`Removed stale cache for inactive provider: ${provider}`);
    }
  }

  // Fetch fresh data for active providers (skip if cache still fresh)
  const promises: Promise<void>[] = [];
  for (const [provider, cred] of activeCreds) {
    const cached = loadSessionCache<AccountUsageResult>('global', cacheKey(provider));
    if (cached) {
      debug(`Cache fresh for ${provider}, skipping API call`);
      continue;
    }

    promises.push(
      runProviderQuery(provider, cred, timeout, icon)
        .then((result) => {
          if (result) {
            saveSessionCache('global', cacheKey(provider), result, CACHE_TTL);
            debug(`Refreshed ${provider}: ${result.text}`);
          } else {
            debug(`No result for ${provider}`);
          }
        })
        .catch((err: unknown) => {
          debug(`Refresh failed for ${provider}:`, err);
        })
    );
  }

  await Promise.all(promises);
}
