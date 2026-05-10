import type { PulseInput } from '../types/pulse-input';
export interface ContextSegment {
    percentage: number;
    barText: string;
    tokensText: string;
}
export declare function extractContext(input: PulseInput): ContextSegment;
