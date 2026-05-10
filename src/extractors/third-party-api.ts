// src/extractors/third-party-api.ts

import * as https from 'https';
import { debug } from '../utils/logger';
import { loadMergedClaudeEnv } from '../utils/claude-settings-env';
import { resolveProviderCredentials } from '../utils/provider-credentials';
import { loadSessionCache, saveSessionCache } from '../utils/cache';

interface ApiUsageResult {
  provider: string;
  text: string;
  fg: string;
  icon: string;
}

export type { ApiUsageResult };

const THIRD_PARTY_FALLBACK_ICON = '[L]';

function buildPctBar(pct: number): string {
  const barWidth = 12;
  const filled = Math.round((pct / 100) * barWidth);
  return '█'.repeat(filled) + '░'.repeat(barWidth - filled);
}

export async function extractThirdPartyApi(
  providers: string[],
  theme: { colors?: { accent?: string; info?: string } },
  timeout: number,
  cwd: string
): Promise<ApiUsageResult[]> {
  if (providers.length === 0) return [];

  const merged = loadMergedClaudeEnv(cwd);
  const promises = providers.map((provider) =>
    queryProvider(provider, theme, timeout, merged).catch((err) => {
      debug(`API query failed for ${provider}:`, err);
      return null;
    })
  );

  const settled = await Promise.all(promises);
  const results: ApiUsageResult[] = [];
  for (const result of settled) {
    if (result) results.push(result);
  }
  return results;
}

async function queryProvider(
  provider: string,
  theme: { colors?: { accent?: string; info?: string } },
  timeout: number,
  mergedEnv: Record<string, string>
): Promise<ApiUsageResult | null> {
  const cred = resolveProviderCredentials(provider, mergedEnv);
  if (!cred) return null;

  const cacheKey = `api-${provider}`;
  const cached = loadSessionCache<ApiUsageResult>('global', cacheKey);
  if (cached) {
    return cached;
  }

  let result: ApiUsageResult | null = null;

  switch (provider) {
    case 'zhipu':
      result = await queryZhipu(cred, theme, timeout);
      break;
    case 'deepseek':
      result = await queryDeepSeek(cred, theme, timeout);
      break;
    default:
      result = null;
  }

  if (result) {
    saveSessionCache('global', cacheKey, result, 300000);
  }

  return result;
}

async function queryZhipu(
  cred: { apiKey: string; baseUrl: string },
  theme: { colors?: { accent?: string } },
  timeout: number
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
              icon: THIRD_PARTY_FALLBACK_ICON
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
  cred: { apiKey: string; baseUrl: string },
  theme: { colors?: { info?: string } },
  timeout: number
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
              icon: THIRD_PARTY_FALLBACK_ICON
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
