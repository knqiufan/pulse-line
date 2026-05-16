// src/themes/icon-sets/nerd.ts
export interface IconSet {
  model: string;
  context: string;
  git: string;
  cost: string;
  duration: string;
  workspace: string;
  turns: string;
  cacheRatio: string;
  rateLimit: string;
  weeklyQuota: string;
  mcpStatus: string;
  thinking: string;
  outputStyle: string;
  accountUsage: string;
  toolTimeline: string;
  rules: string;
}

export const nerdIconSet: IconSet = {
  model: "󰀹",
  context: "󰂅",
  git: "󰂀",
  cost: "󰀪",
  duration: "󰀙",
  workspace: "󰀻",
  turns: "󰀔",
  cacheRatio: "󰃒",
  rateLimit: "󰀋",
  weeklyQuota: "󰀰",
  mcpStatus: "󰃦",
  thinking: "󰂲",
  outputStyle: "󰀺",
  accountUsage: "󰃦",
  toolTimeline: "[Tool]",
  rules: ""
};
