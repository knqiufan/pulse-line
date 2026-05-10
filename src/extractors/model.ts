// src/extractors/model.ts

import type { PulseInput } from '../types/pulse-input';
import type { Theme } from '../types/theme';
import { resolveModelDisplayLabel } from '../utils/model-display-env';

export interface ModelSegment {
  text: string;
  fg: string;
  bold: boolean;
  dim: boolean;
}

export function extractModel(input: PulseInput, theme: Theme): ModelSegment | null {
  const modelName = resolveModelDisplayLabel(input.cwd, input.model);
  if (!modelName) return null;

  const style = theme.components.model;
  const glyph =
    style.showIcon !== false && style.icon ? `${style.icon} ` : '';

  return {
    text: `${glyph}${modelName}`,
    fg: style.fg,
    bold: style.bold ?? false,
    dim: style.dim ?? false
  };
}
