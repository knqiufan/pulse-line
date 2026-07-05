// src/extractors/third-party-api.ts

import * as https from 'https';
import { debug } from '../utils/logger';
import { loadMergedClaudeEnv } from '../utils/claude-settings-env';
import { resolveProviderCredentials, type ResolvedProviderCred } from '../utils/provider-credentials';
import { loadSessionCache, saveSessionCache, removeSessionCacheKey } from '../utils/cache';

interface ApiUsageResult {
  provider: string;
  text: string;
  fg: string;
  icon: string;
}

export type { ApiUsageResult };

export const THIRD_PARTY_FALLBACK_ICON = '[L]';
const CACHE_TTL = 300_000; // 5 minutes
const SUPPORTED_PROVIDERS: ReadonlySet<string> = new Set(['zhipu', 'deepseek']);

function cacheKey(provider: string): string {
  return `api-${provider}`;
}

function buildPctBar(pct: number): string {
  const barWidth = 12;
  const filled = Math.round((pct / 100) * barWidth);
  return '█'.repeat(filled) + '░'.repeat(barWidth - filled);
}

/**
 * Synchronous render: only show cached data for supported providers that currently
 * have credentials. Stale or uncredentialled providers are never displayed.
 */
export function extractThirdPartyApiSync(
  providers: string[],
  theme: { colors?: { accent?: string; info?: string } },
  cwd: string
): ApiUsageResult[] {
  if (providers.length === 0) return [];

  const merged = loadMergedClaudeEnv(cwd);
  const seen = new Set<string>();
  const results: ApiUsageResult[] = [];

  for (const provider of providers) {
    if (seen.has(provider)) continue;
    seen.add(provider);
    if (!SUPPORTED_PROVIDERS.has(provider)) continue;

    const cred = resolveProviderCredentials(provider, merged);
    if (!cred) continue;

    const cached = loadSessionCache<ApiUsageResult>('global', cacheKey(provider));
    if (cached) {
      results.push(cached);
    }
  }

  return results;
}

/**
 * Async refresh:
 * 1. Drop stale cache entries for unsupported providers or providers lacking credentials.
 * 2. Fetch fresh data for active providers whose cache is missing/expired.
 */
export async function refreshThirdPartyApi(
  providers: string[],
  theme: { colors?: { accent?: string; info?: string } },
  timeout: number,
  cwd: string,
  icon: string = THIRD_PARTY_FALLBACK_ICON
): Promise<void> {
  if (providers.length === 0) return;

  const merged = loadMergedClaudeEnv(cwd);
  const seen = new Set<string>();
  const promises: Promise<void>[] = [];

  for (const provider of providers) {
    if (seen.has(provider)) continue;
    seen.add(provider);

    if (!SUPPORTED_PROVIDERS.has(provider)) {
      removeSessionCacheKey('global', cacheKey(provider));
      continue;
    }

    const cred = resolveProviderCredentials(provider, merged);
    if (!cred) {
      removeSessionCacheKey('global', cacheKey(provider));
      debug(`Removed stale cache for inactive provider: ${provider}`);
      continue;
    }

    const cached = loadSessionCache<ApiUsageResult>('global', cacheKey(provider));
    if (cached) {
      debug(`Cache fresh for ${provider}, skipping API call`);
      continue;
    }

    promises.push(
      runProviderQuery(provider, cred, theme, timeout, icon)
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

/**
 * Convenience wrapper: refresh then read cache. Production code should prefer the
 * split refresh + sync pair so the status line renders immediately from cache.
 */
export async function extractThirdPartyApi(
  providers: string[],
  theme: { colors?: { accent?: string; info?: string } },
  timeout: number,
  cwd: string
): Promise<ApiUsageResult[]> {
  await refreshThirdPartyApi(providers, theme, timeout, cwd);
  return extractThirdPartyApiSync(providers, theme, cwd);
}

async function runProviderQuery(
  provider: string,
  cred: ResolvedProviderCred,
  theme: { colors?: { accent?: string; info?: string } },
  timeout: number,
  icon: string
): Promise<ApiUsageResult | null> {
  switch (provider) {
    case 'zhipu':    return queryZhipu(cred, theme, timeout, icon);
    case 'deepseek': return queryDeepSeek(cred, theme, timeout, icon);
    default:         return null;
  }
}

async function queryZhipu(
  cred: ResolvedProviderCred,
  theme: { colors?: { accent?: string } },
  timeout: number,
  icon: string
): Promise<ApiUsageResult | null> {
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

          const limits = json.data?.limits || [];
          const tokensLimits = limits.filter((l: { type?: string }) => l.type === 'TOKENS_LIMIT');

          if (tokensLimits.length > 0) {
            const limit = tokensLimits[0];
            const pct = limit.percentage || 0;
            const bar = buildPctBar(pct);
            resolve({
              provider: 'zhipu',
              text: `GLM: ${bar} ${pct}%`,
              fg: theme.colors?.accent ?? '#bb9af7',
              icon
            });
          } else {
            resolve(null);
          }
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
  theme: { colors?: { info?: string } },
  timeout: number,
  icon: string
): Promise<ApiUsageResult | null> {
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
          const balance = json.balance_infos?.[0];

          if (balance) {
            const total = parseFloat(balance.total_balance || '0');
            resolve({
              provider: 'deepseek',
              text: `DeepSeek: CN¥${total.toFixed(2)}`,
              fg: theme.colors?.info ?? '#7dcfff',
              icon
            });
          } else {
            resolve(null);
          }
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
