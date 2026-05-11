// src/themes/builtin/ocean.ts

import type { Theme } from '../../types/theme';

export const oceanTheme: Theme = {
  meta: {
    name: 'Ocean',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Deep ocean blue palette'
  },
  separator: {
    left: '\u2502',
    right: '',
    color: '#0284c7'
  },
  colors: {
    background: 'transparent',
    primary: '#0284c7',
    accent: '#38bdf8',
    success: '#06b6d4',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#0ea5e9',
    muted: '#64748b',
    dim: '#0284c7'
  },
  components: {
    model: { fg: '#0284c7', bold: true, icon: '[模型]', showIcon: true },
    context: { fg: '#06b6d4', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#06b6d4', icon: '', showIcon: false, bg: '#0284c7' },
    git: { fg: '#38bdf8', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#fbbf24', icon: '[费用]', showIcon: true },
    duration: { fg: '#64748b', icon: '[时长]', showIcon: true },
    workspace: { fg: '#38bdf8', icon: '[工作区]', showIcon: true },
    turns: { fg: '#38bdf8', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#38bdf8', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#0ea5e9', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#fbbf24', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#38bdf8', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#64748b', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#38bdf8', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#64748b', icon: '[风格]', showIcon: true },
    separator: { fg: '#0284c7', icon: '', showIcon: false, dim: true }
  }
};
