export interface SegmentData {
    text: string;
    fg?: string;
    bg?: string;
    bold?: boolean;
    dim?: boolean;
    icon?: string;
}
export declare function renderSegment(data: SegmentData): string;
