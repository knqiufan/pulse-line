// src/extractors/thinking.ts

import type { Theme } from '../types/theme';

export interface ThinkingSegment {
  text: string;
}

export function extractThinking(
  input: { thinking?: { enabled: boolean } },
  theme: Theme
): ThinkingSegment | null {
  if (!input.thinking) return null;
  const ic = theme.components.thinking.icon;
  const glyph = theme.components.thinking.showIcon !== false && ic ? `${ic} ` : '';
  const state = input.thinking.enabled ? 'on' : 'off';
  return { text: `${glyph}${state}` };
}
