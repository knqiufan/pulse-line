// src/themes/builtin/dark.ts

import type { Theme } from '../../types/theme';

export const darkTheme: Theme = {
  meta: {
    name: 'Deep Dark',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Professional dark theme'
  },
  separator: {
    left: '│',
    right: '',
    color: '#565f89'
  },
  colors: {
    background: 'transparent',
    primary: '#7aa2f7',
    accent: '#bb9af7',
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    info: '#7dcfff',
    muted: '#a9b1d6',
    dim: '#565f89'
  },
  components: {
    model: { fg: '#7aa2f7', bold: true, icon: '[当前模型]', showIcon: true },
    context: { fg: '#9ece6a', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#9ece6a', bg: '#565f89', icon: '', showIcon: false },
    git: { fg: '#7dcfff', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#e0af68', icon: '[费用]', showIcon: true },
    duration: { fg: '#a9b1d6', icon: '[时长]', showIcon: true },
    workspace: { fg: '#bb9af7', icon: '[工作区]', showIcon: true },
    turns: { fg: '#7dcfff', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#bb9af7', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#7dcfff', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#e0af68', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#f7768e', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#a9b1d6', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#bb9af7', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#a9b1d6', icon: '[风格]', showIcon: true },
    separator: { fg: '#565f89', dim: true, icon: '', showIcon: false }
  }
};
