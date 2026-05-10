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
    model: { fg: '#00ffff', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#00ff00', icon: '[C]', showIcon: true },
    contextBar: { fg: '#00ff00', icon: '', showIcon: false, bg: '#444455' },
    git: { fg: '#ff00ff', icon: '[G]', showIcon: true },
    cost: { fg: '#ffff00', icon: '[$]', showIcon: true },
    duration: { fg: '#666699', icon: '[T]', showIcon: true },
    workspace: { fg: '#ff00ff', icon: '[W]', showIcon: true },
    turns: { fg: '#00ffff', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#ff00ff', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#00ffff', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#ffff00', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#ff00ff', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#666699', icon: '[P]', showIcon: true },
    thinking: { fg: '#ff00ff', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#666699', icon: '[S]', showIcon: true },
    separator: { fg: '#ff00ff', icon: '', showIcon: false, dim: true }
  }
};
