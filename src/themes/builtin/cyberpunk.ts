// src/themes/builtin/cyberpunk.ts

import type { Theme } from '../../types/theme';

export const cyberpunkTheme: Theme = {
  meta: {
    name: 'Cyberpunk',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Neon cyberpunk aesthetic'
  },
  separator: {
    left: '│',
    right: '',
    color: '#ff79c6'
  },
  colors: {
    background: 'transparent',
    primary: '#00ffff',
    accent: '#ff79c6',
    success: '#50fa7b',
    warning: '#f1fa8c',
    error: '#ff5555',
    info: '#8be9fd',
    muted: '#bd93f9',
    dim: '#6272a4'
  },
  components: {
    model: { fg: '#00ffff', bold: true, icon: '[当前模型]', showIcon: true },
    context: { fg: '#50fa7b', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#50fa7b', icon: '', showIcon: false, bg: '#6272a4' },
    git: { fg: '#8be9fd', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#f1fa8c', icon: '[费用]', showIcon: true },
    duration: { fg: '#bd93f9', icon: '[时长]', showIcon: true },
    workspace: { fg: '#ff79c6', icon: '[工作区]', showIcon: true },
    turns: { fg: '#8be9fd', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#ff79c6', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#8be9fd', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#f1fa8c', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#ff79c6', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#bd93f9', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#ff79c6', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#bd93f9', icon: '[风格]', showIcon: true },
    separator: { fg: '#6272a4', icon: '', showIcon: false, dim: true }
  }
};
