// src/themes/builtin/light.ts

import type { Theme } from '../../types/theme';

export const lightTheme: Theme = {
  meta: {
    name: 'Minimal Light',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Clean light theme for light terminals'
  },
  separator: {
    left: '\u2502',
    right: '',
    color: '#a1a1aa'
  },
  colors: {
    background: 'transparent',
    primary: '#0369a1',
    accent: '#7c3aed',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#0891b2',
    muted: '#71717a',
    dim: '#a1a1aa'
  },
  components: {
    model: { fg: '#0369a1', bold: true, icon: '[模型]', showIcon: true },
    context: { fg: '#16a34a', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#16a34a', icon: '', showIcon: false, bg: '#e4e4e7' },
    git: { fg: '#0891b2', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#ca8a04', icon: '[费用]', showIcon: true },
    duration: { fg: '#71717a', icon: '[时长]', showIcon: true },
    workspace: { fg: '#7c3aed', icon: '[工作区]', showIcon: true },
    turns: { fg: '#0891b2', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#7c3aed', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#0891b2', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#ca8a04', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#7c3aed', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#71717a', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#7c3aed', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#71717a', icon: '[风格]', showIcon: true },
    separator: { fg: '#a1a1aa', icon: '', showIcon: false, dim: true }
  }
};
