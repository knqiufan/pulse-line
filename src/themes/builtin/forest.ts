// src/themes/builtin/forest.ts

import type { Theme } from '../../types/theme';

export const forestTheme: Theme = {
  meta: {
    name: 'Forest',
    author: 'pulse-line',
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
    model: { fg: '#52b788', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#52b788', icon: '[C]', showIcon: true },
    contextBar: { fg: '#52b788', icon: '', showIcon: false, bg: '#74c69d' },
    git: { fg: '#95d5b2', icon: '[G]', showIcon: true },
    cost: { fg: '#e9c46a', icon: '[$]', showIcon: true },
    duration: { fg: '#d8f3dc', icon: '[T]', showIcon: true },
    workspace: { fg: '#b7e4c7', icon: '[W]', showIcon: true },
    turns: { fg: '#95d5b2', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#b7e4c7', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#95d5b2', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#e9c46a', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#e9c46a', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#d8f3dc', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#b7e4c7', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#d8f3dc', icon: '[S]', showIcon: true },
    separator: { fg: '#74c69d', icon: '', showIcon: false, dim: true }
  }
};
