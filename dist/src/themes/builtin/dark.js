"use strict";
// src/themes/builtin/dark.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.darkTheme = void 0;
exports.darkTheme = {
    meta: {
        name: 'Deep Dark',
        author: 'claude-pulse',
        version: '1.0.0',
        description: 'Professional dark theme'
    },
    separator: {
        left: '',
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
        model: { fg: '#7aa2f7', bold: true, icon: '󰀹', showIcon: true },
        context: { fg: '#9ece6a', icon: '󰂅', showIcon: true },
        contextBar: { fg: '#9ece6a', bg: '#414868', icon: '', showIcon: false },
        git: { fg: '#7dcfff', icon: '󰂀', showIcon: true },
        cost: { fg: '#e0af68', icon: '󰀪', showIcon: true },
        duration: { fg: '#565f89', icon: '󰀙', showIcon: true },
        workspace: { fg: '#bb9af7', icon: '󰀻', showIcon: true },
        turns: { fg: '#7dcfff', icon: '󰀔', showIcon: true },
        cacheRatio: { fg: '#bb9af7', icon: '󰃒', showIcon: true },
        rateLimit: { fg: '#7dcfff', icon: '󰀋', showIcon: true },
        weeklyQuota: { fg: '#e0af68', icon: '󰀰', showIcon: true },
        accountUsage: { fg: '#a855f7', icon: '󰃦', showIcon: true },
        mcpStatus: { fg: '#565f89', icon: '󰃦', showIcon: true },
        thinking: { fg: '#bb9af7', icon: '󰂲', showIcon: true },
        outputStyle: { fg: '#565f89', icon: '󰀺', showIcon: true },
        separator: { fg: '#414868', dim: true, icon: '', showIcon: false }
    }
};
//# sourceMappingURL=dark.js.map