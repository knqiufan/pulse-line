// src/extractors/context.ts

import type { PulseInput } from '../types/pulse-input';

export interface ContextSegment {
  percentage: number;
  barText: string;
  tokensText: string;
}

export function extractContext(input: PulseInput): ContextSegment {
  const pct = Math.min(100, Math.max(0, input.context_window.used_percentage));
  const barWidth = 12;

  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;

  const barText = `█`.repeat(filled) + `░`.repeat(empty) + ` ${pct.toFixed(0)}%`;

  const usage = input.context_window.current_usage;
  const tokensText = usage
    ? `(${formatNumber(usage.input_tokens + usage.cache_read_input_tokens)} / ${formatNumber(input.context_window.context_window_size)} tokens)`
    : '';

  return { percentage: pct, barText, tokensText };
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
