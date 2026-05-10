export interface ThinkingSegment {
    text: string;
}
export declare function extractThinking(input: {
    thinking?: {
        enabled: boolean;
    };
}): ThinkingSegment | null;
