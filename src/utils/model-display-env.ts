// src/utils/model-display-env.ts

import { loadMergedClaudeEnv, resolveEnvKey, firstNonEmptyEnv } from './claude-settings-env';

/** User override (highest priority). */
const MODEL_EXPLICIT_ENV_KEYS = ['PULSE_MODEL_DISPLAY', 'CLAUDE_CODE_MODEL_DISPLAY'] as const;

/** When tier env is unset, use these before stdin display_name. */
const MODEL_GLOBAL_ENV_KEYS = ['CLAUDE_MODEL', 'ANTHROPIC_MODEL'] as const;

export interface ModelIdentity {
  id?: string;
  display_name?: string;
}

function inferTierEnvKey(id: string | undefined, displayName: string | undefined): string | null {
  const lowId = (id || '').toLowerCase();
  const lowDisp = (displayName || '').toLowerCase();

  if (lowId.includes('opus') || /\bopus\b/.test(lowDisp)) {
    return 'ANTHROPIC_DEFAULT_OPUS_MODEL';
  }
  if (lowId.includes('sonnet') || /\bsonnet\b/.test(lowDisp)) {
    return 'ANTHROPIC_DEFAULT_SONNET_MODEL';
  }
  if (lowId.includes('haiku') || /\bhaiku\b/.test(lowDisp)) {
    return 'ANTHROPIC_DEFAULT_HAIKU_MODEL';
  }
  return null;
}

/**
 * Status bar model label: explicit env, then Claude tier → ANTHROPIC_DEFAULT_* ,
 * then CLAUDE_MODEL / ANTHROPIC_MODEL, then stdin snapshot.
 */
export function resolveModelDisplayLabel(
  cwd: string,
  model: ModelIdentity | undefined
): string | null {
  const merged = loadMergedClaudeEnv(cwd);

  const explicit = firstNonEmptyEnv([...MODEL_EXPLICIT_ENV_KEYS], merged)?.trim();
  if (explicit) return explicit;

  const tierKey = inferTierEnvKey(model?.id, model?.display_name);
  if (tierKey) {
    const routed = resolveEnvKey(tierKey, merged)?.trim();
    if (routed) return routed;
  }

  const global = firstNonEmptyEnv([...MODEL_GLOBAL_ENV_KEYS], merged)?.trim();
  if (global) return global;

  const stdin = model?.display_name?.trim();
  return stdin || null;
}
