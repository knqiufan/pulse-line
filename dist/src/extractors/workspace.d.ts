export interface WorkspaceSegment {
    text: string;
}
export declare function extractWorkspace(input: {
    workspace: {
        current_dir: string;
        project_name?: string;
    };
}): WorkspaceSegment;
