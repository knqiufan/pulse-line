// src/themes/builtin/ocean.ts

import type { Theme } from '../../types/theme';

export const oceanTheme: Theme = {
  meta: {
    name: 'Ocean',
    author: 'pulse-line',
    version: '1.0.0',
    description: 'Deep ocean blue palette'
  },
  separator: {
    left: '│',
    right: '',
    color: '#38bdf8'
  },
  colors: {
    background: 'transparent',
    primary: '#38bdf8',
    accent: '#818cf8',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#fb7185',
    info: '#67e8f9',
    muted: '#e0f2fe',
    dim: '#7dd3fc'
  },
  components: {
    model: { fg: '#38bdf8', bold: true, icon: '[M]', showIcon: true },
    context: { fg: '#34d399', icon: '[C]', showIcon: true },
    contextBar: { fg: '#34d399', icon: '', showIcon: false, bg: '#7dd3fc' },
    git: { fg: '#67e8f9', icon: '[G]', showIcon: true },
    cost: { fg: '#fbbf24', icon: '[$]', showIcon: true },
    duration: { fg: '#e0f2fe', icon: '[T]', showIcon: true },
    workspace: { fg: '#818cf8', icon: '[W]', showIcon: true },
    turns: { fg: '#67e8f9', icon: '[N]', showIcon: true },
    cacheRatio: { fg: '#818cf8', icon: '[R]', showIcon: true },
    rateLimit: { fg: '#67e8f9', icon: '[L]', showIcon: true },
    weeklyQuota: { fg: '#fbbf24', icon: '[Q]', showIcon: true },
    accountUsage: { fg: '#fb7185', icon: '[A]', showIcon: true },
    mcpStatus: { fg: '#e0f2fe', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#818cf8', icon: '[Think]', showIcon: true },
    outputStyle: { fg: '#e0f2fe', icon: '[S]', showIcon: true },
    separator: { fg: '#7dd3fc', icon: '', showIcon: false, dim: true }
  }
};
