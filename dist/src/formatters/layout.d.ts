import type { Theme } from '../types/theme';
export interface LayoutSegment {
    text: string;
    separator: string;
}
export declare function renderLayout(segments: LayoutSegment[], theme: Theme): string;
