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
    left: '\u2502',
    right: '',
    color: '#414868'
  },
  colors: {
    background: 'transparent',
    primary: '#7aa2f7',
    accent: '#bb9af7',
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    info: '#7dcfff',
    muted: '#565f89',
    dim: '#414868'
  },
  components: {
    model: { fg: '#7aa2f7', bold: true, icon: '[模型]', showIcon: true },
    context: { fg: '#9ece6a', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#9ece6a', bg: '#414868', icon: '', showIcon: false },
    git: { fg: '#7dcfff', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#e0af68', icon: '[费用]', showIcon: true },
    duration: { fg: '#565f89', icon: '[时长]', showIcon: true },
    workspace: { fg: '#bb9af7', icon: '[工作区]', showIcon: true },
    turns: { fg: '#7dcfff', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#bb9af7', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#7dcfff', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#e0af68', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#a855f7', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#565f89', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#bb9af7', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#565f89', icon: '[风格]', showIcon: true },
    separator: { fg: '#414868', dim: true, icon: '', showIcon: false }
  }
};
