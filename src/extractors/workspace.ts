// src/extractors/workspace.ts

import * as path from 'path';

export interface WorkspaceSegment {
  text: string;
}

export function extractWorkspace(input: { workspace: { current_dir: string; project_name?: string } }): WorkspaceSegment {
  const name = input.workspace.project_name || path.basename(input.workspace.current_dir);
  return { text: name };
}
