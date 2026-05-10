// src/formatters/separator.ts

import { ansiColor, ANSI_RESET } from '../utils/ansi';

export function renderSeparator(sep: string, fg: string): string {
  if (!sep) return '';
  return ansiColor(fg) + sep + ANSI_RESET;
}
