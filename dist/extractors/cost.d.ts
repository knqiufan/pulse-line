import type { PulseInput } from '../types/pulse-input';
export interface CostSegment {
    text: string;
}
export declare function extractCost(input: PulseInput): CostSegment | null;
