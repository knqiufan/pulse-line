"use strict";
// src/types/pulse-config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    theme: 'dark',
    separator: ' │ ',
    padding: 1,
    refreshInterval: 5,
    iconSet: 'nerd',
    modules: {
        model: { enabled: true, order: 1, icon: '🧠' },
        context: {
            enabled: true,
            order: 2,
            showBar: true,
            showTokens: false,
            barWidth: 12,
            icon: '\u{F0085}'
        },
        git: {
            enabled: true,
            order: 3,
            showUpstream: false,
            icon: '\u{F0080}'
        },
        cost: { enabled: true, order: 4, icon: '\u{F002A}' },
        duration: { enabled: false, order: 5, icon: '\u{F0019}' },
        workspace: { enabled: false, order: 6, icon: '\u{F003B}' },
        turns: { enabled: false, order: 7, icon: '\u{F0014}' },
        cacheRatio: { enabled: false, order: 8, icon: '\u{F00D2}' },
        rateLimits: { enabled: false, order: 9, icon: '\u{F000B}', showCountdown: true },
        weeklyQuota: { enabled: false, order: 10, icon: '\u{F0030}', showCountdown: true },
        accountUsage: { enabled: true, order: 11, icon: '\u{F00E6}', providers: ['zhipu', 'deepseek', 'minimax'] },
        mcpStatus: { enabled: false, order: 12, icon: '\u{F00E6}' },
        thinking: { enabled: false, order: 13, icon: '\u{F00B2}' },
        outputStyle: { enabled: false, order: 14, icon: '\u{F003A}' },
        thirdPartyApi: { enabled: false, order: 15, icon: '\u{F00E6}', providers: [] }
    },
    advanced: {
        cacheEnabled: true,
        cacheTTL: 300,
        gitTimeout: 200,
        debugMode: false,
        customThemePath: null
    }
};
//# sourceMappingURL=pulse-config.js.map