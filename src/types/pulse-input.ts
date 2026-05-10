// src/types/pulse-input.ts

export interface PulseInput {
  cwd: string;
  session_id: string;
  session_name?: string;
  transcript_path: string;
  model: ModelInfo;
  workspace: WorkspaceInfo;
  version: string;
  output_style: { name: string };
  cost: CostInfo;
  context_window: ContextWindow;
  exceeds_200k_tokens: boolean;
  effort?: { level: string };
  thinking?: { enabled: boolean };
  rate_limits?: RateLimits;
  vim?: { mode: string };
  agent?: { name: string };
  worktree?: WorktreeInfo;
}

export interface ModelInfo {
  id: string;
  display_name: string;
}

export interface ContextWindow {
  total_input_tokens: number;
  total_output_tokens: number;
  context_window_size: number;
  used_percentage: number;
  remaining_percentage: number;
  current_usage?: CurrentUsage;
}

export interface CurrentUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface WorkspaceInfo {
  current_dir: string;
  project_dir?: string;
  project_name?: string;
  read_only: boolean;
}

export interface CostInfo {
  total_cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  current_usage?: CurrentUsage;
}

export interface RateLimits {
  five_hour: {
    requests_used: number;
    requests_limit: number;
    input_tokens_used: number;
    input_tokens_limit: number;
    output_tokens_used: number;
    output_tokens_limit: number;
    resets_at: string;
  };
  seven_day?: {
    requests_used: number;
    requests_limit: number;
    input_tokens_used: number;
    input_tokens_limit: number;
    output_tokens_used: number;
    output_tokens_limit: number;
    resets_at: string;
  };
}

export interface WorktreeInfo {
  worktree_path: string;
  base_path: string;
}
