export type ToolTimelineProvider = 'claude-code' | 'codex';
export type ToolTimelineStatus = 'success' | 'failure' | 'unknown';
export type ToolTimelineActorKind = 'main-agent' | 'subagent' | 'unknown';
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
  actorKind?: ToolTimelineActorKind;
  actorName?: string;
  agentId?: string;
  subagentType?: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    totalTokens?: number;
  };
  subagentMetrics?: {
    totalToolUseCount?: number;
    totalTokens?: number;
    totalDurationMs?: number;
  };
  target?: ToolTimelineTarget;
  inputSummary?: string;
  responseSummary?: string;
  errorSummary?: string;
}

export interface ToolTimelineAgentMeta {
  agentId: string;
  agentType?: string;
  displayName: string;
  transcriptPath?: string;
  lastSeenAt: string;
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

export interface ToolAnalyticsStats {
  totalToolCalls: number;
  success: number;
  failure: number;
  unknown: number;
  successRate: number;
  mainAgentToolCalls: number;
  subagentToolCalls: number;
  subagentCount: number;
  bySubagent: Record<string, {
    agentId?: string;
    toolCalls: number;
    tokens?: number;
    durationMs?: number;
  }>;
  subagentTokens?: number;
  totalDurationMs?: number;
  avgDurationMs?: number;
  slowest?: {
    toolName: string;
    summary: string;
    durationMs: number;
    actorName?: string;
  };
  byTool: Record<string, number>;
}

export interface ToolTimelineCache {
  version: 1 | 2;
  provider: ToolTimelineProvider;
  sessionId: string;
  updatedAt: string;
  events: ToolTimelineEvent[];
  stats: ToolTimelineStats;
  agents?: Record<string, ToolTimelineAgentMeta>;
  analyticsStats?: ToolAnalyticsStats;
}
