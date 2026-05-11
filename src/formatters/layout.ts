// src/formatters/layout.ts

import type { Theme } from '../types/theme';

export interface LayoutSegment {
  text: string;
}

export interface LayoutOptions {
  separator: string;
  padding: number;
  maxPerLine?: number;
}

function colorize(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function renderLine(
  segs: LayoutSegment[],
  sepColor: string,
  paddedSep: string
): string {
  let line = '';
  for (let i = 0; i < segs.length; i++) {
    if (i > 0 && paddedSep.trim() !== '') {
      line += colorize(sepColor, paddedSep);
    }
    line += segs[i].text;
  }
  return line;
}

export function renderLayout(
  segments: LayoutSegment[],
  theme: Theme,
  options: LayoutOptions
): string {
  if (segments.length === 0) return '';

  const sepInner =
    options.separator !== undefined && options.separator !== ''
      ? options.separator
      : theme.separator.left;

  const pad = Math.max(0, options.padding);
  const paddedSep = `${' '.repeat(pad)}${sepInner}${' '.repeat(pad)}`;
  const sepColor = theme.separator.color;
  const maxPerLine = options.maxPerLine || 3;

  const lines: string[] = [];
  for (let i = 0; i < segments.length; i += maxPerLine) {
    const chunk = segments.slice(i, i + maxPerLine);
    lines.push(renderLine(chunk, sepColor, paddedSep));
  }

  return lines.join('\n');
}
