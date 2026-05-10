"use strict";
// src/extractors/third-party-api.ts
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
exports.extractThirdPartyApi = extractThirdPartyApi;
exports.createDefaultApiKeysConfig = createDefaultApiKeysConfig;
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../utils/constants");
const cache_1 = require("../utils/cache");
const DEFAULT_API_KEYS = {
    providers: {
        zhipu: { enabled: false, apiKey: '', baseUrl: 'https://open.bigmodel.cn' },
        deepseek: { enabled: false, apiKey: '', baseUrl: 'https://api.deepseek.com' },
        minimax: { enabled: false, apiKey: '', baseUrl: 'https://api.minimaxi.com' },
        stepfun: { enabled: false, apiKey: '', baseUrl: 'https://api.stepfun.com' },
        xiaomi_mimo: { enabled: false, apiKey: '', baseUrl: 'https://api.xiaomi.mimo.com' }
    },
    cacheTTL: 300,
    timeout: 2000
};
async function extractThirdPartyApi(providers, theme, timeout = 2000) {
    const config = loadApiKeysConfig();
    if (!config)
        return [];
    const results = [];
    const promises = [];
    for (const provider of providers) {
        const providerConfig = config.providers[provider];
        if (!providerConfig?.enabled || !providerConfig.apiKey)
            continue;
        promises.push(queryProvider(provider, providerConfig, theme, timeout)
            .catch(err => {
            (0, logger_1.debug)(`API query failed for ${provider}:`, err);
            return null;
        }));
    }
    const settled = await Promise.all(promises);
    for (const result of settled) {
        if (result)
            results.push(result);
    }
    return results;
}
async function queryProvider(provider, config, theme, timeout) {
    const cacheKey = `api-${provider}`;
    const cached = (0, cache_1.loadSessionCache)('global', cacheKey);
    if (cached && Date.now() < cached.timestamp) {
        return cached.data;
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
                    const limits = json.data?.limits || [];
                    const tokensLimits = limits.filter((l) => l.type === 'TOKENS_LIMIT');
                    if (tokensLimits.length > 0) {
                        const limit = tokensLimits[0];
                        const pct = limit.percentage || 0;
                        const barWidth = 12;
                        const filled = Math.round((pct / 100) * barWidth);
                        const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
                        resolve({
                            provider: 'zhipu',
                            text: `🇨🇳 GLM: ${bar} ${pct}%`,
                            fg: theme.colors.accent,
                            icon: '🔗'
                        });
                    }
                    else {
                        resolve(null);
                    }
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
                    const balance = json.balance_infos?.[0];
                    if (balance) {
                        const total = parseFloat(balance.total_balance || '0');
                        resolve({
                            provider: 'deepseek',
                            text: `🐳 DeepSeek: ¥${total.toFixed(2)}`,
                            fg: theme.colors.info,
                            icon: '🔗'
                        });
                    }
                    else {
                        resolve(null);
                    }
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
    // MiniMax API not yet verified - return null gracefully
    return null;
}
async function queryStepFun(config, theme, timeout) {
    // StepFun API not yet verified - return null gracefully
    return null;
}
async function queryXiaomiMimo(config, theme, timeout) {
    // Xiaomi Mimo API not yet verified - return null gracefully
    return null;
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
function createDefaultApiKeysConfig() {
    try {
        const dir = path.dirname(constants_1.API_KEYS_PATH);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(constants_1.API_KEYS_PATH, JSON.stringify(DEFAULT_API_KEYS, null, 2));
        (0, logger_1.debug)('Default API keys config created at:', constants_1.API_KEYS_PATH);
    }
    catch (err) {
        (0, logger_1.debug)('Failed to create API keys config:', err);
    }
}
//# sourceMappingURL=third-party-api.js.map