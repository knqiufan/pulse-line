// src/themes/builtin/cyberpunk.ts

import type { Theme } from '../../types/theme';

export const cyberpunkTheme: Theme = {
  meta: {
    name: 'Cyberpunk',
    author: 'pulse-line',
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
    model: { fg: '#00ffff', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#50fa7b', icon: '[C]', showIcon: true },
    contextBar: { fg: '#50fa7b', icon: '', showIcon: false, bg: '#6272a4' },
    git: { fg: '#8be9fd', icon: '[G]', showIcon: true },
    cost: { fg: '#f1fa8c', icon: '[$]', showIcon: true },
    duration: { fg: '#bd93f9', icon: '[T]', showIcon: true },
    workspace: { fg: '#ff79c6', icon: '[W]', showIcon: true },
    turns: { fg: '#8be9fd', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#ff79c6', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#8be9fd', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#f1fa8c', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#ff79c6', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#bd93f9', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#ff79c6', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#bd93f9', icon: '[S]', showIcon: true },
    separator: { fg: '#6272a4', icon: '', showIcon: false, dim: true }
  }
};
