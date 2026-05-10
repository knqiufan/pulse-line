import type { PulseInput } from '../types/pulse-input';
import type { Theme } from '../types/theme';
export interface ModelSegment {
    text: string;
    fg: string;
    bold: boolean;
    dim: boolean;
}
export declare function extractModel(input: PulseInput, theme: Theme): ModelSegment | null;
