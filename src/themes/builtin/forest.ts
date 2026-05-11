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
    left: '│',
    right: '',
    color: '#74c69d'
  },
  colors: {
    background: 'transparent',
    primary: '#40916c',
    accent: '#b7e4c7',
    success: '#52b788',
    warning: '#e9c46a',
    error: '#e63946',
    info: '#95d5b2',
    muted: '#d8f3dc',
    dim: '#74c69d'
  },
  components: {
    model: { fg: '#52b788', bold: true, icon: '[当前模型]', showIcon: true },
    context: { fg: '#52b788', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#52b788', icon: '', showIcon: false, bg: '#74c69d' },
    git: { fg: '#95d5b2', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#e9c46a', icon: '[费用]', showIcon: true },
    duration: { fg: '#d8f3dc', icon: '[时长]', showIcon: true },
    workspace: { fg: '#b7e4c7', icon: '[工作区]', showIcon: true },
    turns: { fg: '#95d5b2', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#b7e4c7', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#95d5b2', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#e9c46a', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#e9c46a', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#d8f3dc', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#b7e4c7', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#d8f3dc', icon: '[风格]', showIcon: true },
    separator: { fg: '#74c69d', icon: '', showIcon: false, dim: true }
  }
};
