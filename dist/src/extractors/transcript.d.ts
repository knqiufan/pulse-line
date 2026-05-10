export interface TurnsSegment {
    text: string;
}
export declare function extractTurns(transcriptPath: string): TurnsSegment | null;
