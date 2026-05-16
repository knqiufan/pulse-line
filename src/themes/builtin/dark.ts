// src/themes/builtin/dark.ts

import type { Theme } from '../../types/theme';

export const darkTheme: Theme = {
  meta: {
    name: 'Deep Dark',
    author: 'pulse-line',
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
    model: { fg: '#7aa2f7', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#9ece6a', icon: '[C]', showIcon: true },
    contextBar: { fg: '#9ece6a', bg: '#565f89', icon: '', showIcon: false },
    git: { fg: '#7dcfff', icon: '[G]', showIcon: true },
    cost: { fg: '#e0af68', icon: '[$]', showIcon: true },
    duration: { fg: '#a9b1d6', icon: '[T]', showIcon: true },
    workspace: { fg: '#bb9af7', icon: '[W]', showIcon: true },
    turns: { fg: '#7dcfff', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#bb9af7', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#7dcfff', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#e0af68', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#f7768e', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#a9b1d6', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#bb9af7', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#a9b1d6', icon: '[S]', showIcon: true },
    toolTimeline: { fg: '#7dcfff', icon: '[Tool]', showIcon: true },
    rules: { fg: '#7dcfff', icon: '[R]', showIcon: true },
    separator: { fg: '#565f89', dim: true, icon: '', showIcon: false }
  }
};
