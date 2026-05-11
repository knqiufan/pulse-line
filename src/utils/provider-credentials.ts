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
  zhipu: ['PULSE_ZHIPU_API_KEY', 'ZHIPU_API_KEY', 'ZHIPUAI_API_KEY', 'BIGMODEL_API_KEY'],
  deepseek: ['PULSE_DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEY'],
  minimax: ['PULSE_MINIMAX_API_KEY', 'MINIMAX_API_KEY'],
  stepfun: ['PULSE_STEPFUN_API_KEY', 'STEPFUN_API_KEY', 'STEPFUN_API_TOKEN'],
  xiaomi_mimo: ['PULSE_XIAOMI_MIMO_API_KEY', 'XIAOMI_MIMO_API_KEY', 'MIMO_API_KEY']
};

const BASE_ENV_KEYS: Record<string, string[]> = {
  zhipu: ['PULSE_ZHIPU_BASE_URL', 'ZHIPU_BASE_URL', 'BIGMODEL_BASE_URL'],
  deepseek: ['PULSE_DEEPSEEK_BASE_URL', 'DEEPSEEK_BASE_URL'],
  minimax: ['PULSE_MINIMAX_BASE_URL', 'MINIMAX_BASE_URL'],
  stepfun: ['PULSE_STEPFUN_BASE_URL', 'STEPFUN_BASE_URL'],
  xiaomi_mimo: ['PULSE_XIAOMI_MIMO_BASE_URL', 'XIAOMI_MIMO_BASE_URL']
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

/** Hostname patterns for detecting providers from ANTHROPIC_BASE_URL. */
const ANTHROPIC_HOST_PATTERNS: Record<string, string> = {
  zhipu: 'bigmodel.cn',
  deepseek: 'api.deepseek.com',
  minimax: 'api.minimaxi.com',
};

/**
 * Resolve credentials via ANTHROPIC_* env vars when the base URL matches a known provider.
 * Covers the case where users only configure ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN.
 */
function resolveViaAnthropicEnv(provider: string, merged: MergedEnvMap): ResolvedProviderCred | null {
  const baseRaw = firstNonEmptyEnv(['ANTHROPIC_BASE_URL'], merged);
  if (!baseRaw) return null;

  let host = '';
  try {
    host = new URL(baseRaw).hostname.toLowerCase();
  } catch {
    return null;
  }

  const pattern = ANTHROPIC_HOST_PATTERNS[provider];
  if (!pattern || !host.includes(pattern)) return null;

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

/**
 * Resolve zhipu credentials via PULSE_PROVIDER=zhipu + ANTHROPIC_AUTH_TOKEN.
 * Covers proxy setups where ANTHROPIC_BASE_URL is a local proxy that routes to GLM.
 */
function resolveZhipuViaExplicitProvider(merged: MergedEnvMap): ResolvedProviderCred | null {
  const pulseProvider = firstNonEmptyEnv(['PULSE_PROVIDER'], merged);
  if (pulseProvider?.toLowerCase() !== 'zhipu') return null;

  const apiKey = firstNonEmptyEnv(['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY'], merged);
  if (!apiKey) return null;

  return { apiKey, baseUrl: zhipuBaseFromMerged(merged) };
}

export function resolveProviderCredentials(
  provider: string,
  merged: MergedEnvMap
): ResolvedProviderCred | null {
  if (provider === 'zhipu') {
    return (
      resolveZhipuClassic(merged) ??
      resolveViaAnthropicEnv('zhipu', merged) ??
      resolveZhipuViaExplicitProvider(merged)
    );
  }
  return (
    resolveGeneric(provider, merged) ??
    resolveViaAnthropicEnv(provider, merged)
  );
}

/**
 * Auto-detect active providers from PULSE_PROVIDER env var.
 * Returns provider names to try for account usage queries.
 */
export function detectProvidersFromEnv(merged: MergedEnvMap): string[] {
  const explicit = firstNonEmptyEnv(['PULSE_PROVIDER'], merged);
  if (explicit) {
    return [explicit.toLowerCase()];
  }

  const baseRaw = firstNonEmptyEnv(['ANTHROPIC_BASE_URL'], merged);
  if (baseRaw) {
    try {
      const host = new URL(baseRaw).hostname.toLowerCase();
      for (const [provider, pattern] of Object.entries(ANTHROPIC_HOST_PATTERNS)) {
        if (host.includes(pattern)) return [provider];
      }
    } catch { /* ignore invalid URLs */ }
  }

  return [];
}
