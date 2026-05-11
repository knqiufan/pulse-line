// src/themes/builtin/forest.ts

import type { Theme } from '../../types/theme';

export const forestTheme: Theme = {
  meta: {
    name: 'Forest',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Natural forest green palette'
  },
  separator: {
    left: '\u2502',
    right: '',
    color: '#588157'
  },
  colors: {
    background: 'transparent',
    primary: '#2d6a4f',
    accent: '#b7e4c7',
    success: '#52b788',
    warning: '#e9c46a',
    error: '#e63946',
    info: '#40916c',
    muted: '#6c757d',
    dim: '#588157'
  },
  components: {
    model: { fg: '#2d6a4f', bold: true, icon: '[模型]', showIcon: true },
    context: { fg: '#52b788', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#52b788', icon: '', showIcon: false, bg: '#588157' },
    git: { fg: '#40916c', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#e9c46a', icon: '[费用]', showIcon: true },
    duration: { fg: '#6c757d', icon: '[时长]', showIcon: true },
    workspace: { fg: '#b7e4c7', icon: '[工作区]', showIcon: true },
    turns: { fg: '#40916c', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#b7e4c7', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#40916c', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#e9c46a', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#b7e4c7', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#6c757d', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#b7e4c7', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#6c757d', icon: '[风格]', showIcon: true },
    separator: { fg: '#588157', icon: '', showIcon: false, dim: true }
  }
};
