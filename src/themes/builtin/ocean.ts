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
    model: { fg: '#38bdf8', bold: true, icon: '[当前模型]', showIcon: true },
    context: { fg: '#34d399', icon: '[上下文使用率]', showIcon: true },
    contextBar: { fg: '#34d399', icon: '', showIcon: false, bg: '#7dd3fc' },
    git: { fg: '#67e8f9', icon: '[Git 分支]', showIcon: true },
    cost: { fg: '#fbbf24', icon: '[费用]', showIcon: true },
    duration: { fg: '#e0f2fe', icon: '[时长]', showIcon: true },
    workspace: { fg: '#818cf8', icon: '[工作区]', showIcon: true },
    turns: { fg: '#67e8f9', icon: '[轮次]', showIcon: true },
    cacheRatio: { fg: '#818cf8', icon: '[缓存]', showIcon: true },
    rateLimit: { fg: '#67e8f9', icon: '[限速]', showIcon: true },
    weeklyQuota: { fg: '#fbbf24', icon: '[配额]', showIcon: true },
    accountUsage: { fg: '#fb7185', icon: '[账户]', showIcon: true },
    mcpStatus: { fg: '#e0f2fe', icon: '[MCP]', showIcon: true },
    thinking: { fg: '#818cf8', icon: '[思考]', showIcon: true },
    outputStyle: { fg: '#e0f2fe', icon: '[风格]', showIcon: true },
    separator: { fg: '#7dd3fc', icon: '', showIcon: false, dim: true }
  }
};
