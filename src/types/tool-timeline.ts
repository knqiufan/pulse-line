export type ToolTimelineProvider = 'claude-code' | 'codex';
export type ToolTimelineStatus = 'success' | 'failure' | 'unknown';
export type ToolTimelineTargetKind =
  | 'file'
  | 'command'
  | 'query'
  | 'url'
  | 'mcp'
  | 'unknown';

export interface ToolTimelineTarget {
  kind: ToolTimelineTargetKind;
  value: string;
}

export interface ToolTimelineEvent {
  id: string;
  provider: ToolTimelineProvider;
  sessionId: string;
  turnId?: string;
  toolUseId?: string;
  transcriptPath?: string | null;
  cwd?: string;
  toolName: string;
  displayName: string;
  summary: string;
  status: ToolTimelineStatus;
  startedAt?: string;
  endedAt: string;
  durationMs?: number;
  target?: ToolTimelineTarget;
  inputSummary?: string;
  responseSummary?: string;
  errorSummary?: string;
}

export interface ToolTimelineStats {
  total: number;
  success: number;
  failure: number;
  unknown: number;
  avgDurationMs?: number;
  totalDurationMs?: number;
  slowest?: {
    toolName: string;
    summary: string;
    durationMs: number;
  };
  byTool: Record<string, number>;
}

export interface ToolTimelineCache {
  version: 1;
  provider: ToolTimelineProvider;
  sessionId: string;
  updatedAt: string;
  events: ToolTimelineEvent[];
  stats: ToolTimelineStats;
}
