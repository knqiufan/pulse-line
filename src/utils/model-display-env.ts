// src/utils/model-display-env.ts

import { loadMergedClaudeEnv, firstNonEmptyEnv } from './claude-settings-env';

/** Env keys scanned (process.env overrides merged Settings env). Highest priority first-ish via list order inside firstNonEmptyEnv. */
const MODEL_DISPLAY_ENV_KEYS = [
  'PULSE_MODEL_DISPLAY',
  'CLAUDE_CODE_MODEL_DISPLAY',
  'CLAUDE_MODEL',
  'ANTHROPIC_MODEL'
];

/**
 * Resolved label for status bar model segment.
 * When any listed env key is set in Claude global/project settings or process env, use it.
 * Otherwise falls back to stdin snapshot from Claude Code.
 */
export function resolveModelDisplayLabel(
  cwd: string,
  stdinDisplayName: string | undefined
): string | null {
  const merged = loadMergedClaudeEnv(cwd);
  const fromEnv = firstNonEmptyEnv(MODEL_DISPLAY_ENV_KEYS, merged)?.trim();

  if (fromEnv) return fromEnv;

  const fromStdin = stdinDisplayName?.trim();
  return fromStdin || null;
}
