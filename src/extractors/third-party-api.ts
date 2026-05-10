// src/extractors/third-party-api.ts

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { debug } from '../utils/logger';
import { API_KEYS_PATH } from '../utils/constants';
import { loadSessionCache, saveSessionCache } from '../utils/cache';

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

interface ApiUsageResult {
  provider: string;
  text: string;
  fg: string;
  icon: string;
}

export type { ApiUsageResult };

const DEFAULT_API_KEYS: ApiKeysConfig = {
  providers: {
    zhipu: { enabled: false, apiKey: '', baseUrl: 'https://open.bigmodel.cn' },
    deepseek: { enabled: false, apiKey: '', baseUrl: 'https://api.deepseek.com' },
    minimax: { enabled: false, apiKey: '', baseUrl: 'https://api.minimaxi.com' },
    stepfun: { enabled: false, apiKey: '', baseUrl: 'https://api.stepfun.com' },
    xiaomi_mimo: { enabled: false, apiKey: '', baseUrl: 'https://api.xiaomi.mimo.com' }
  },
  cacheTTL: 300,
  timeout: 2000
};

export async function extractThirdPartyApi(
  providers: string[],
  theme: any,
  timeout: number = 2000
): Promise<ApiUsageResult[]> {
  const config = loadApiKeysConfig();
  if (!config) return [];

  const results: ApiUsageResult[] = [];
  const promises: Promise<ApiUsageResult | null>[] = [];

  for (const provider of providers) {
    const providerConfig = config.providers[provider as keyof typeof config.providers];
    if (!providerConfig?.enabled || !providerConfig.apiKey) continue;

    promises.push(
      queryProvider(provider, providerConfig, theme, timeout)
        .catch(err => {
          debug(`API query failed for ${provider}:`, err);
          return null;
        })
    );
  }

  const settled = await Promise.all(promises);
  for (const result of settled) {
    if (result) results.push(result);
  }

  return results;
}

async function queryProvider(
  provider: string,
  config: any,
  theme: any,
  timeout: number
): Promise<ApiUsageResult | null> {
  const cacheKey = `api-${provider}`;
  const cached = loadSessionCache<any>('global', cacheKey);
  if (cached && Date.now() < cached.timestamp) {
    return cached.data;
  }

  let result: ApiUsageResult | null = null;

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

async function queryZhipu(config: any, theme: any, timeout: number): Promise<ApiUsageResult | null> {
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

          const limits = json.data?.limits || [];
          const tokensLimits = limits.filter((l: any) => l.type === 'TOKENS_LIMIT');

          if (tokensLimits.length > 0) {
            const limit = tokensLimits[0];
            const pct = limit.percentage || 0;
            const barWidth = 12;
            const filled = Math.round((pct / 100) * barWidth);
            const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

            resolve({
              provider: 'zhipu',
              text: `🇨🇳 GLM: ${bar} ${pct}%`,
              fg: theme.colors.accent,
              icon: '🔗'
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

async function queryDeepSeek(config: any, theme: any, timeout: number): Promise<ApiUsageResult | null> {
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
          const balance = json.balance_infos?.[0];

          if (balance) {
            const total = parseFloat(balance.total_balance || '0');
            resolve({
              provider: 'deepseek',
              text: `🐳 DeepSeek: ¥${total.toFixed(2)}`,
              fg: theme.colors.info,
              icon: '🔗'
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

async function queryMiniMax(config: any, theme: any, timeout: number): Promise<ApiUsageResult | null> {
  // MiniMax API not yet verified - return null gracefully
  return null;
}

async function queryStepFun(config: any, theme: any, timeout: number): Promise<ApiUsageResult | null> {
  // StepFun API not yet verified - return null gracefully
  return null;
}

async function queryXiaomiMimo(config: any, theme: any, timeout: number): Promise<ApiUsageResult | null> {
  // Xiaomi Mimo API not yet verified - return null gracefully
  return null;
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

export function createDefaultApiKeysConfig(): void {
  try {
    const dir = path.dirname(API_KEYS_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(API_KEYS_PATH, JSON.stringify(DEFAULT_API_KEYS, null, 2));
    debug('Default API keys config created at:', API_KEYS_PATH);
  } catch (err) {
    debug('Failed to create API keys config:', err);
  }
}
