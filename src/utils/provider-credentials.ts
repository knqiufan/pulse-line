// src/utils/provider-credentials.ts

import type { MergedEnvMap } from './claude-settings-env';
import { firstNonEmptyEnv } from './claude-settings-env';

export interface ResolvedProviderCred {
  apiKey: string;
  baseUrl: string;
  groupId?: string;
}

const DEFAULT_BASE_URL: Record<string, string> = {
  zhipu: 'https://open.bigmodel.cn',
  deepseek: 'https://api.deepseek.com',
  minimax: 'https://api.minimaxi.com',
  stepfun: 'https://api.stepfun.com',
  xiaomi_mimo: 'https://api.xiaomi.mimo.com'
};

const ENV_KEYS: Record<string, string[]> = {
  zhipu: ['ZHIPU_API_KEY', 'ZHIPUAI_API_KEY', 'BIGMODEL_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  minimax: ['MINIMAX_API_KEY'],
  stepfun: ['STEPFUN_API_KEY', 'STEPFUN_API_TOKEN'],
  xiaomi_mimo: ['XIAOMI_MIMO_API_KEY', 'MIMO_API_KEY']
};

const BASE_ENV_KEYS: Record<string, string[]> = {
  zhipu: ['ZHIPU_BASE_URL', 'BIGMODEL_BASE_URL'],
  deepseek: ['DEEPSEEK_BASE_URL'],
  minimax: ['MINIMAX_BASE_URL'],
  stepfun: ['STEPFUN_BASE_URL'],
  xiaomi_mimo: ['XIAOMI_MIMO_BASE_URL']
};

function zhipuBaseFromMerged(merged: MergedEnvMap): string {
  let baseUrl = DEFAULT_BASE_URL.zhipu;
  const custom = firstNonEmptyEnv(BASE_ENV_KEYS.zhipu, merged);
  if (custom) baseUrl = custom.replace(/\/$/, '');
  return baseUrl;
}

function resolveZhipuClassic(merged: MergedEnvMap): ResolvedProviderCred | null {
  const keys = ENV_KEYS.zhipu;
  const apiKey = firstNonEmptyEnv(keys, merged);
  if (!apiKey) return null;
  return { apiKey, baseUrl: zhipuBaseFromMerged(merged) };
}

/**
 * Claude Code + 智谱：仅用 ANTHROPIC_* 走 Anthropic 兼容端点时，用量 API 仍走 open.bigmodel.cn 根域。
 */
function resolveZhipuViaAnthropicEnv(merged: MergedEnvMap): ResolvedProviderCred | null {
  const baseRaw = firstNonEmptyEnv(['ANTHROPIC_BASE_URL'], merged);
  if (!baseRaw) return null;

  let host = '';
  try {
    host = new URL(baseRaw).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host.includes('bigmodel.cn')) return null;

  const apiKey = firstNonEmptyEnv(['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY'], merged);
  if (!apiKey) return null;

  let root = '';
  try {
    const u = new URL(baseRaw);
    root = `${u.protocol}//${u.hostname}`.replace(/\/$/, '');
  } catch {
    return null;
  }

  return { apiKey, baseUrl: root };
}

function resolveGeneric(provider: string, merged: MergedEnvMap): ResolvedProviderCred | null {
  const keys = ENV_KEYS[provider];
  if (!keys) return null;

  const apiKey = firstNonEmptyEnv(keys, merged);
  if (!apiKey) return null;

  let baseUrl = DEFAULT_BASE_URL[provider] ?? '';
  const baseCandidates = BASE_ENV_KEYS[provider];
  if (baseCandidates) {
    const custom = firstNonEmptyEnv(baseCandidates, merged);
    if (custom) baseUrl = custom.replace(/\/$/, '');
  }

  let groupId: string | undefined;
  if (provider === 'minimax') {
    const gid = firstNonEmptyEnv(['MINIMAX_GROUP_ID'], merged);
    if (gid) groupId = gid;
  }

  return { apiKey, baseUrl, groupId };
}

export function resolveProviderCredentials(
  provider: string,
  merged: MergedEnvMap
): ResolvedProviderCred | null {
  if (provider === 'zhipu') {
    return resolveZhipuClassic(merged) ?? resolveZhipuViaAnthropicEnv(merged);
  }
  return resolveGeneric(provider, merged);
}
