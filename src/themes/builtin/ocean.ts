// src/themes/builtin/ocean.ts

import type { Theme } from '../../types/theme';

export const oceanTheme: Theme = {
  meta: {
    name: 'Ocean',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Deep ocean blue palette'
  },
  separator: {
    left: '\u2502',
    right: '',
    color: '#0284c7'
  },
  colors: {
    background: 'transparent',
    primary: '#0284c7',
    accent: '#38bdf8',
    success: '#06b6d4',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#0ea5e9',
    muted: '#64748b',
    dim: '#0284c7'
  },
  components: {
    model: { fg: '#0284c7', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#06b6d4', icon: '[C]', showIcon: true },
    contextBar: { fg: '#06b6d4', icon: '', showIcon: false, bg: '#0284c7' },
    git: { fg: '#38bdf8', icon: '[G]', showIcon: true },
    cost: { fg: '#fbbf24', icon: '[$]', showIcon: true },
    duration: { fg: '#64748b', icon: '[T]', showIcon: true },
    workspace: { fg: '#38bdf8', icon: '[W]', showIcon: true },
    turns: { fg: '#38bdf8', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#38bdf8', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#0ea5e9', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#fbbf24', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#38bdf8', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#64748b', icon: '[P]', showIcon: true },
    thinking: { fg: '#38bdf8', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#64748b', icon: '[S]', showIcon: true },
    separator: { fg: '#0284c7', icon: '', showIcon: false, dim: true }
  }
};
