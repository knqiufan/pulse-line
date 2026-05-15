// src/themes/icon-sets/text.ts

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
}

export const textIconSet: IconSet = {
  model: '[M]',
  context: '[C]',
  git: '[G]',
  cost: '[$]',
  duration: '[T]',
  workspace: '[W]',
  turns: '[N]',
  cacheRatio: '[R]',
  rateLimit: '[L]',
  weeklyQuota: '[Q]',
  mcpStatus: '[P]',
  thinking: '[Think]',
  outputStyle: '[S]',
  accountUsage: '[A]',
  toolTimeline: '[Tool]'
};
