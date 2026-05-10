// src/formatters/progress-bar.ts

export function renderProgressBar(percentage: number, width: number = 12): string {
  const filled = Math.max(0, Math.min(Math.round((percentage / 100) * width), width));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function getProgressColor(percentage: number): string {
  const pct = Math.min(100, Math.max(0, percentage));
  if (pct < 30) return '#9ece6a';
  if (pct < 50) return '#9ece6a';
  if (pct < 70) return '#e0af68';
  if (pct < 90) return '#ff9e64';
  return '#f7768e';
}
