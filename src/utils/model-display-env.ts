// src/utils/model-display-env.ts

import { loadMergedClaudeEnv, resolveEnvKey, firstNonEmptyEnv } from './claude-settings-env';

/** User override (highest priority). */
const MODEL_EXPLICIT_ENV_KEYS = ['PULSE_MODEL_DISPLAY', 'CLAUDE_CODE_MODEL_DISPLAY'] as const;

/** When tier env is unset, use these before stdin display_name. */
const MODEL_GLOBAL_ENV_KEYS = ['CLAUDE_MODEL', 'ANTHROPIC_MODEL', 'ANTHROPIC_REASONING_MODEL'] as const;

export interface ModelIdentity {
  id?: string;
  display_name?: string;
}

function inferTierEnvKey(id: string | undefined, displayName: string | undefined): string | null {
  const lowId = (id || '').toLowerCase();
  const lowDisp = (displayName || '').toLowerCase();

  if (/\bopus\b/.test(lowId) || /\bopus\b/.test(lowDisp)) {
    return 'ANTHROPIC_DEFAULT_OPUS_MODEL';
  }
  if (/\bsonnet\b/.test(lowId) || /\bsonnet\b/.test(lowDisp)) {
    return 'ANTHROPIC_DEFAULT_SONNET_MODEL';
  }
  if (/\bhaiku\b/.test(lowId) || /\bhaiku\b/.test(lowDisp)) {
    return 'ANTHROPIC_DEFAULT_HAIKU_MODEL';
  }
  return null;
}

/**
 * Status bar model label:
 * 1. Explicit env override (PULSE_MODEL_DISPLAY / CLAUDE_CODE_MODEL_DISPLAY)
 * 2. Tier mapping: stdin has "opus"/"sonnet"/"haiku" → ANTHROPIC_DEFAULT_*_MODEL
 * 3. Stdin model name: already a custom model name → use directly
 * 4. Global env fallback: CLAUDE_MODEL / ANTHROPIC_MODEL
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

  const stdinName = model?.display_name?.trim() || model?.id?.trim();

  // When tier was detected but tier env is empty, prefer global env over stdin name.
  const global = firstNonEmptyEnv([...MODEL_GLOBAL_ENV_KEYS], merged)?.trim();
  if (global && tierKey) return global;

  if (stdinName) return stdinName;

  if (global) return global;

  return null;
}
