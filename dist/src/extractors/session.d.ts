export interface DurationSegment {
    text: string;
}
export declare function extractSessionDuration(sessionId: string, sessionPath: string): DurationSegment | null;
