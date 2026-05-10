// src/extractors/rate-limits.ts

import type { PulseInput } from '../types/pulse-input';
import type { Theme } from '../types/theme';
import { renderProgressBar } from '../formatters/progress-bar';

export interface RateLimitSegment {
  text: string;
  fg: string;
}

export function extractRateLimits(input: PulseInput, theme: Theme): RateLimitSegment | null {
  if (!input.rate_limits) return null;

  const fiveHour = input.rate_limits.five_hour;
  if (!fiveHour) return null;

  const pct = Math.min(100, (fiveHour.requests_used / fiveHour.requests_limit) * 100);
  const barWidth = 8;
  const bar = renderProgressBar(pct, barWidth);
  const i = theme.components.rateLimit.icon;
  const glyph = theme.components.rateLimit.showIcon !== false && i ? `${i} ` : '';
  const text = `${glyph}${bar} ${pct.toFixed(0)}%`;

  return {
    text,
    fg: theme.components.rateLimit.fg
  };
}

export function extractWeeklyQuota(input: PulseInput, theme: Theme): RateLimitSegment | null {
  if (!input.rate_limits?.seven_day) return null;

  const week = input.rate_limits.seven_day;
  const pct = Math.min(100, (week.requests_used / week.requests_limit) * 100);
  const barWidth = 10;
  const bar = renderProgressBar(pct, barWidth);
  const wi = theme.components.weeklyQuota.icon;
  const wglyph =
    theme.components.weeklyQuota.showIcon !== false && wi ? `${wi} ` : '';
  const text = `${wglyph}${bar} ${pct.toFixed(0)}%`;

  return {
    text,
    fg: theme.components.weeklyQuota.fg
  };
}
