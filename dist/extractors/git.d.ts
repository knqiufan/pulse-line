import type { Theme } from '../types/theme';
export interface GitSegment {
    text: string;
    fg: string;
}
export declare function extractGit(cwd: string, sessionId: string, theme: Theme): GitSegment | null;
