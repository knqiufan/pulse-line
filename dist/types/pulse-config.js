"use strict";
// src/types/pulse-config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    theme: 'dark',
    separator: ' │ ',
    padding: 1,
    refreshInterval: 5,
    modules: {
        model: { enabled: true, order: 1, icon: '🧠' },
        context: {
            enabled: true,
            order: 2,
            showBar: true,
            showTokens: false,
            barWidth: 12,
            icon: '📊'
        },
        git: {
            enabled: true,
            order: 3,
            showUpstream: false,
            icon: '🌿'
        },
        cost: { enabled: true, order: 4, icon: '💰' },
        duration: { enabled: false, order: 5, icon: '⏱️' },
        workspace: { enabled: false, order: 6, icon: '📁' },
        turns: { enabled: false, order: 7, icon: '💬' },
        cacheRatio: { enabled: false, order: 8, icon: '📦' },
        rateLimits: { enabled: false, order: 9, icon: '⚡', showCountdown: true },
        weeklyQuota: { enabled: false, order: 10, icon: '📅', showCountdown: true },
        mcpStatus: { enabled: false, order: 11, icon: '🔌' },
        thinking: { enabled: false, order: 12, icon: '🤔' },
        outputStyle: { enabled: false, order: 13, icon: '📝' },
        thirdPartyApi: { enabled: false, order: 14, icon: '🔗', providers: [] }
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