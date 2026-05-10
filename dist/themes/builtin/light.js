"use strict";
// src/themes/builtin/light.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightTheme = void 0;
exports.lightTheme = {
    meta: {
        name: 'Minimal Light',
        author: 'claude-pulse',
        version: '1.0.0',
        description: 'Clean light theme for light terminals'
    },
    separator: {
        left: ' │ ',
        right: '',
        color: '#a1a1aa'
    },
    colors: {
        background: 'transparent',
        primary: '#0369a1',
        accent: '#7c3aed',
        success: '#16a34a',
        warning: '#ca8a04',
        error: '#dc2626',
        info: '#0891b2',
        muted: '#71717a',
        dim: '#a1a1aa'
    },
    components: {
        model: { fg: '#0369a1', bold: true, icon: '🧠', showIcon: true },
        context: { fg: '#16a34a', icon: '📊', showIcon: true },
        contextBar: { fg: '#16a34a', icon: '', showIcon: false, bg: '#e4e4e7' },
        git: { fg: '#0891b2', icon: '🌿', showIcon: true },
        cost: { fg: '#ca8a04', icon: '💰', showIcon: true },
        duration: { fg: '#71717a', icon: '⏱️', showIcon: true },
        workspace: { fg: '#7c3aed', icon: '📁', showIcon: true },
        turns: { fg: '#0891b2', icon: '💬', showIcon: true },
        cacheRatio: { fg: '#7c3aed', icon: '📦', showIcon: true },
        rateLimit: { fg: '#0891b2', icon: '⚡', showIcon: true },
        weeklyQuota: { fg: '#ca8a04', icon: '📅', showIcon: true },
        mcpStatus: { fg: '#71717a', icon: '🔌', showIcon: true },
        thinking: { fg: '#7c3aed', icon: '🤔', showIcon: true },
        outputStyle: { fg: '#71717a', icon: '📝', showIcon: true },
        separator: { fg: '#a1a1aa', icon: '', showIcon: false, dim: true }
    }
};
//# sourceMappingURL=light.js.map