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
    left: '',
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
    model: { fg: '#2d6a4f', bold: true, icon: '\󰀹', showIcon: true },
    context: { fg: '#52b788', icon: '\󰂅', showIcon: true },
    contextBar: { fg: '#52b788', icon: '', showIcon: false, bg: '#588157' },
    git: { fg: '#40916c', icon: '\󰂀', showIcon: true },
    cost: { fg: '#e9c46a', icon: '\󰀪', showIcon: true },
    duration: { fg: '#6c757d', icon: '\󰀙', showIcon: true },
    workspace: { fg: '#b7e4c7', icon: '\󰀻', showIcon: true },
    turns: { fg: '#40916c', icon: '\󰀔', showIcon: true },
    cacheRatio: { fg: '#b7e4c7', icon: '\󰃒', showIcon: true },
    rateLimit: { fg: '#40916c', icon: '\󰀋', showIcon: true },
    weeklyQuota: { fg: '#e9c46a', icon: '\󰀰', showIcon: true },
    accountUsage: { fg: '#b7e4c7', icon: '\󰃦', showIcon: true },
    mcpStatus: { fg: '#6c757d', icon: '\󰃦', showIcon: true },
    thinking: { fg: '#b7e4c7', icon: '\󰂲', showIcon: true },
    outputStyle: { fg: '#6c757d', icon: '\󰀺', showIcon: true },
    separator: { fg: '#588157', icon: '', showIcon: false, dim: true }
  }
};
