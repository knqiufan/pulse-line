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
    model: { fg: '#7aa2f7', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#9ece6a', icon: '[C]', showIcon: true },
    contextBar: { fg: '#9ece6a', bg: '#414868', icon: '', showIcon: false },
    git: { fg: '#7dcfff', icon: '[G]', showIcon: true },
    cost: { fg: '#e0af68', icon: '[$]', showIcon: true },
    duration: { fg: '#565f89', icon: '[T]', showIcon: true },
    workspace: { fg: '#bb9af7', icon: '[W]', showIcon: true },
    turns: { fg: '#7dcfff', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#bb9af7', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#7dcfff', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#e0af68', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#a855f7', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#565f89', icon: '[P]', showIcon: true },
    thinking: { fg: '#bb9af7', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#565f89', icon: '[S]', showIcon: true },
    separator: { fg: '#414868', dim: true, icon: '', showIcon: false }
  }
};
