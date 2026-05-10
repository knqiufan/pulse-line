"use strict";
// src/extractors/account-usage.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAccountUsageSync = extractAccountUsageSync;
exports.refreshAccountUsage = refreshAccountUsage;
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../utils/constants");
const cache_1 = require("../utils/cache");
const NERD_ICON = 'D7'; // nf-md-link
const TEXT_ICON = '[A]';
const BAR_WIDTH = 12;
function formatProgressBar(pct) {
    const clamped = Math.min(100, Math.max(0, pct));
    const filled = Math.round((clamped / 100) * BAR_WIDTH);
    return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}
function formatDeepSeekUsage(data, icon) {
    const balance = data.balance_infos?.[0];
    if (!balance)
        throw new Error('No balance info');
    const total = parseFloat(balance.total_balance || '0');
    const text = `DeepSeek: ¥${total.toFixed(2)}`;
    return { provider: 'deepseek', text, fg: '#00d4aa', icon };
}
function formatZhipuUsage(data, icon) {
    const limits = data.data?.limits || [];
    const tokensLimits = limits.filter((l) => l.type === 'TOKENS_LIMIT');
    if (tokensLimits.length === 0)
        throw new Error('No TOKENS_LIMIT found');
    const limit = tokensLimits[0];
    const pct = limit.percentage || 0;
    const totalQuota = limit.limit || 0;
    const usedQuota = limit.used || 0;
    const resetTime = limit.reset_time || '';
    const bar = formatProgressBar(pct);
    let text = `GLM: ${bar} ${pct.toFixed(1)}%`;
    if (resetTime) {
        const resetDate = new Date(resetTime);
        const now = new Date();
        const diffMs = resetDate.getTime() - now.getTime();
        if (diffMs > 0) {
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            text += ` (${diffHrs}h ${diffMins}m 剩余)`;
        }
        else {
            text += ' (已重置)';
        }
    }
    return { provider: 'zhipu', text, fg: '#a855f7', icon };
}
function formatMiniMaxUsage(data, icon) {
    // MiniMax returns usage data in a format similar to GLM
    // Actual API format may differ - adjust based on real API response
    const pct = data.percentage || data.quota_percentage || 0;
    const bar = formatProgressBar(pct);
    let text = `MiniMax: ${bar} ${pct.toFixed(1)}%`;
    // Try to extract remaining time if available
    const resetTime = data.reset_time || data.quota_reset_time;
    if (resetTime) {
        const resetDate = new Date(resetTime);
        const now = new Date();
        const diffMs = resetDate.getTime() - now.getTime();
        if (diffMs > 0) {
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            text += ` (${diffHrs}h ${diffMins}m)`;
        }
    }
    return { provider: 'minimax', text, fg: '#a855f7', icon };
}
function formatStepFunUsage(data, icon) {
    const balance = data.balance || data.total_balance || 0;
    const text = `StepFun: ¥${parseFloat(balance).toFixed(2)}`;
    return { provider: 'stepfun', text, fg: '#00d4aa', icon };
}
async function queryZhipu(config, theme, timeout) {
    return new Promise((resolve) => {
        const url = new URL('/api/monitor/usage/quota/limit', config.baseUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.code !== 200) {
                        resolve(null);
                        return;
                    }
                    const result = formatZhipuUsage(json, NERD_ICON);
                    resolve(result);
                }
                catch {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
        req.end();
    });
}
async function queryDeepSeek(config, theme, timeout) {
    return new Promise((resolve) => {
        const url = new URL('/user/balance', config.baseUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const result = formatDeepSeekUsage(json, NERD_ICON);
                    resolve(result);
                }
                catch {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
        req.end();
    });
}
async function queryMiniMax(config, theme, timeout) {
    // TODO: Implement MiniMax API query when verified
    // Expected API: GET /v1/account/usage or similar
    // For now, return null gracefully
    return null;
}
async function queryStepFun(config, theme, timeout) {
    // TODO: Implement StepFun API query when verified
    // Expected API: GET /api/account/usage or similar
    // For now, return null gracefully
    return null;
}
async function queryXiaomiMimo(config, theme, timeout) {
    // TODO: Implement Xiaomi Mimo API query when verified
    // For now, return null gracefully
    return null;
}
async function queryProvider(provider, config, theme, timeout, icon) {
    const cacheKey = `account-usage-${provider}`;
    const cached = (0, cache_1.loadSessionCache)('global', cacheKey);
    if (cached) {
        return cached;
    }
    let result = null;
    switch (provider) {
        case 'zhipu':
            result = await queryZhipu(config, theme, timeout);
            break;
        case 'deepseek':
            result = await queryDeepSeek(config, theme, timeout);
            break;
        case 'minimax':
            result = await queryMiniMax(config, theme, timeout);
            break;
        case 'stepfun':
            result = await queryStepFun(config, theme, timeout);
            break;
        case 'xiaomi_mimo':
            result = await queryXiaomiMimo(config, theme, timeout);
            break;
    }
    if (result) {
        (0, cache_1.saveSessionCache)('global', cacheKey, result, 300000); // 5 min TTL
    }
    return result;
}
function loadApiKeysConfig() {
    try {
        if (!fs.existsSync(constants_1.API_KEYS_PATH))
            return null;
        const raw = fs.readFileSync(constants_1.API_KEYS_PATH, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function extractAccountUsageSync(config, theme) {
    if (!config.enabled)
        return [];
    const apiConfig = loadApiKeysConfig();
    if (!apiConfig)
        return [];
    const providers = config.providers || [];
    if (providers.length === 0)
        return [];
    // Try to get cached results synchronously
    const results = [];
    for (const provider of providers) {
        const cacheKey = `account-usage-${provider}`;
        const cached = (0, cache_1.loadSessionCache)('global', cacheKey);
        if (cached) {
            results.push(cached);
        }
    }
    return results;
}
async function refreshAccountUsage(config, theme, timeout = 2000) {
    if (!config.enabled)
        return;
    const apiConfig = loadApiKeysConfig();
    if (!apiConfig)
        return;
    const providers = config.providers || [];
    if (providers.length === 0)
        return;
    // Fire and forget - results will be cached for next render
    const promises = [];
    for (const provider of providers) {
        const providerConfig = apiConfig.providers[provider];
        if (!providerConfig?.enabled || !providerConfig.apiKey)
            continue;
        promises.push(queryProvider(provider, providerConfig, theme, timeout, NERD_ICON)
            .then(() => {
            (0, logger_1.debug)(`Account usage refreshed for ${provider}`);
        })
            .catch(err => {
            (0, logger_1.debug)(`Account usage refresh failed for ${provider}:`, err);
        }));
    }
    await Promise.all(promises);
}
//# sourceMappingURL=account-usage.js.map