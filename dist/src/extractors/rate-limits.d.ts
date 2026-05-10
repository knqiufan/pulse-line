import type { PulseInput } from '../types/pulse-input';
import type { Theme } from '../types/theme';
export interface RateLimitSegment {
    text: string;
    fg: string;
}
export declare function extractRateLimits(input: PulseInput, theme: Theme): RateLimitSegment | null;
export declare function extractWeeklyQuota(input: PulseInput, theme: Theme): RateLimitSegment | null;
