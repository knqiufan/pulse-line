// src/extractors/thinking.ts

import type { Theme } from '../types/theme';
import type { Language } from '../types/pulse-config';
import { getLabel } from '../i18n';

export interface ThinkingSegment {
  text: string;
}

export function extractThinking(
  input: { thinking?: { enabled: boolean } },
  theme: Theme,
  lang: Language = 'en',
  iconOverride?: string
): ThinkingSegment | null {
  if (!input.thinking) return null;
  const ic = iconOverride ?? theme.components.thinking.icon;
  const glyph = theme.components.thinking.showIcon !== false && ic ? `${ic} ` : '';
  const state = input.thinking.enabled
    ? getLabel(lang, 'thinkingOn')
    : getLabel(lang, 'thinkingOff');
  return { text: `${glyph}${state}` };
}
