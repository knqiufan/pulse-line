// src/formatters/layout.ts

import type { Theme } from '../types/theme';

export interface LayoutSegment {
  text: string;
  separator: string;
}

export function renderLayout(segments: LayoutSegment[], theme: Theme): string {
  const sep = theme.separator.left;
  const sepColor = theme.separator.color;

  let result = '';
  for (let i = 0; i < segments.length; i++) {
    if (i > 0 && sep) {
      result += colorize(sepColor, sep);
    }
    result += segments[i].text;
  }
  return result;
}

function colorize(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}
