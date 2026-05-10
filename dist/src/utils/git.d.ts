export interface GitInfo {
    branch: string | null;
    ahead: number;
    behind: number;
}
export declare function getGitInfo(cwd: string, timeout?: number): GitInfo;
export declare function isGitRepository(cwd: string): boolean;
