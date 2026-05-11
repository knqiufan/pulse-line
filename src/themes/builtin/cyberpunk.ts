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
    left: '\u2502',
    right: '',
    color: '#ff00ff'
  },
  colors: {
    background: 'transparent',
    primary: '#00ffff',
    accent: '#ff00ff',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0080',
    info: '#00ffff',
    muted: '#666699',
    dim: '#444455'
  },
  components: {
    model: { fg: '#00ffff', bold: true, icon: '[模型]', showIcon: true },
    context: { fg: '#00ff00', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#00ff00', icon: '', showIcon: false, bg: '#444455' },
    git: { fg: '#ff00ff', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#ffff00', icon: '[费用]', showIcon: true },
    duration: { fg: '#666699', icon: '[时长]', showIcon: true },
    workspace: { fg: '#ff00ff', icon: '[工作区]', showIcon: true },
    turns: { fg: '#00ffff', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#ff00ff', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#00ffff', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#ffff00', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#ff00ff', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#666699', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#ff00ff', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#666699', icon: '[风格]', showIcon: true },
    separator: { fg: '#ff00ff', icon: '', showIcon: false, dim: true }
  }
};
