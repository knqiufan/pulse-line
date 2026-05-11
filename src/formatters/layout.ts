// src/formatters/layout.ts

import type { Theme } from '../types/theme';

export interface LayoutSegment {
  text: string;
}

export interface LayoutOptions {
  separator: string;
  padding: number;
}

/** Strip ANSI escape sequences to measure visible character width. */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Split a rendered status line into chunks that fit within `maxWidth`.
 * Splits only at separator boundaries so individual segments stay intact.
 */
function wrapLine(line: string, maxWidth: number): string {
  if (maxWidth <= 0) return line;

  const visibleLen = stripAnsi(line).length;
  if (visibleLen <= maxWidth) return line;

  const parts: string[] = [];
  // Split by the separator │ pattern (with surrounding ANSI codes and spaces)
  const sepPattern = /((?:\x1b\[[0-9;]*m)*\s*│\s*(?:\x1b\[[0-9;]*m)*)/g;
  const tokens = line.split(sepPattern);

  let current = '';
  let currentVisible = 0;

  for (const token of tokens) {
    const tokenVisible = stripAnsi(token).length;

    if (currentVisible + tokenVisible > maxWidth && current.length > 0) {
      parts.push(current);
      // Skip leading separator on the new line
      if (/^\s*│\s*$/.test(stripAnsi(token))) {
        current = '';
        currentVisible = 0;
      } else {
        current = token;
        currentVisible = tokenVisible;
      }
    } else {
      current += token;
      currentVisible += tokenVisible;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts.join('\n');
}

export function renderLayout(
  segments: LayoutSegment[],
  theme: Theme,
  options: LayoutOptions
): string {
  const sepInner =
    options.separator !== undefined && options.separator !== ''
      ? options.separator
      : theme.separator.left;

  const pad = Math.max(0, options.padding);
  const paddedSep = `${' '.repeat(pad)}${sepInner}${' '.repeat(pad)}`;
  const sepColor = theme.separator.color;

  let result = '';
  for (let i = 0; i < segments.length; i++) {
    if (i > 0 && paddedSep.trim() !== '') {
      result += colorize(sepColor, paddedSep);
    }
    result += segments[i].text;
  }

  const termWidth =
    process.stdout.columns ||
    (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : 0) ||
    0;
  if (termWidth > 0) {
    result = wrapLine(result, termWidth);
  }

  return result;
}

function colorize(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}
