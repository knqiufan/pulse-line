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
}

export const textIconSet: IconSet = {
  model: '[模型]',
  context: '[上下文使用率]',
  git: '[Git 分支]',
  cost: '[费用]',
  duration: '[时长]',
  workspace: '[工作区]',
  turns: '[轮次]',
  cacheRatio: '[缓存]',
  rateLimit: '[限速]',
  weeklyQuota: '[配额]',
  mcpStatus: '[MCP]',
  thinking: '[思考]',
  outputStyle: '[风格]',
  accountUsage: '[账户]'
};
