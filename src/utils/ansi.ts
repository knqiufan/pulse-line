// src/utils/ansi.ts

export function ansiColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function ansiColor256(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

export const ANSI_RESET = '\x1b[0m';
export const ANSI_BOLD = '\x1b[1m';
export const ANSI_DIM = '\x1b[2m';

export function colorize(hex: string, text: string, bold = false, dim = false): string {
  let ansi = ansiColor(hex);
  if (bold) ansi += ANSI_BOLD;
  if (dim) ansi += ANSI_DIM;
  return `${ansi}${text}${ANSI_RESET}`;
}
