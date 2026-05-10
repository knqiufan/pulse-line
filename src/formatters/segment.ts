// src/formatters/segment.ts

import { ansiColor, ANSI_RESET, ANSI_BOLD } from '../utils/ansi';

export interface SegmentData {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  icon?: string;
}

export function renderSegment(data: SegmentData): string {
  let ansi = '';

  if (data.fg) {
    ansi += ansiColor(data.fg);
  }

  if (data.bold) ansi += ANSI_BOLD;
  if (data.dim) ansi += '\x1b[2m';

  const text = data.icon ? `${data.icon} ${data.text}` : data.text;
  return `${ansi}${text}${ANSI_RESET}`;
}
