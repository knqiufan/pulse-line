// src/formatters/layout.ts

import type { Theme } from '../types/theme';

export interface LayoutSegment {
  text: string;
}

export interface LayoutOptions {
  separator: string;
  padding: number;
  maxPerLine?: number;
  terminalWidth?: number;
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

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

export function visibleWidth(value: string): number {
  let width = 0;
  const clean = stripAnsi(value);
  for (const char of clean) {
    const codePoint = char.codePointAt(0) || 0;
    if (codePoint === 0) continue;
    if (codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) continue;
    width += isWideCodePoint(codePoint) ? 2 : 1;
  }
  return width;
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    codePoint >= 0x1100 && (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
      (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    )
  );
}

function normalizeTerminalWidth(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const width = Math.floor(value);
  return width > 0 ? width : undefined;
}

function wrapSegments(
  segments: LayoutSegment[],
  paddedSep: string,
  maxPerLine: number,
  terminalWidth?: number
): LayoutSegment[][] {
  const widthLimit = normalizeTerminalWidth(terminalWidth);
  const lines: LayoutSegment[][] = [];
  let current: LayoutSegment[] = [];
  let currentWidth = 0;
  const sepWidth = visibleWidth(paddedSep);

  for (const segment of segments) {
    const segmentWidth = visibleWidth(segment.text);
    const nextWidth = current.length === 0
      ? segmentWidth
      : currentWidth + sepWidth + segmentWidth;
    const exceedsCount = current.length >= maxPerLine;
    const exceedsWidth = widthLimit !== undefined &&
      current.length > 0 &&
      nextWidth > widthLimit;

    if (exceedsCount || exceedsWidth) {
      lines.push(current);
      current = [segment];
      currentWidth = segmentWidth;
      continue;
    }

    current.push(segment);
    currentWidth = nextWidth;
  }

  if (current.length > 0) lines.push(current);
  return lines;
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
  const maxPerLine = options.maxPerLine || 5;

  return wrapSegments(
    segments,
    paddedSep,
    maxPerLine,
    options.terminalWidth
  )
    .map((chunk) => renderLine(chunk, sepColor, paddedSep))
    .join('\n');
}
