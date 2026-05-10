// src/extractors/output-style.ts

import type { Theme } from '../types/theme';

export interface OutputStyleSegment {
  text: string;
}

export function extractOutputStyle(
  input: { output_style: { name: string } },
  theme: Theme
): OutputStyleSegment | null {
  const name = input.output_style?.name;
  if (!name || name === 'default') return null;
  const ic = theme.components.outputStyle.icon;
  const glyph = theme.components.outputStyle.showIcon !== false && ic ? `${ic} ` : '';
  return { text: `${glyph}${name}` };
}
