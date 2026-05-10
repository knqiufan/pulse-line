"use strict";
// src/config/loader.ts
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
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getConfigPath = getConfigPath;
exports.getPulseDir = getPulseDir;
exports.validateConfig = validateConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("../utils/logger");
const cache_1 = require("../utils/cache");
const pulse_config_1 = require("../types/pulse-config");
function loadConfig() {
    const configPath = getConfigPath();
    const cacheKey = 'config';
    const cached = (0, cache_1.loadSessionCache)('global', cacheKey);
    if (cached) {
        (0, logger_1.debug)('Config loaded from cache');
        return cached;
    }
    let config = JSON.parse(JSON.stringify(pulse_config_1.DEFAULT_CONFIG));
    if (fs.existsSync(configPath)) {
        try {
            const raw = fs.readFileSync(configPath, 'utf8');
            const userConfig = JSON.parse(raw);
            config = deepMerge(config, userConfig);
            (0, logger_1.debug)('Config loaded from file:', configPath);
        }
        catch (err) {
            (0, logger_1.debug)('Config load error, using defaults:', err);
        }
    }
    else {
        // First run - create default config
        saveConfig(config);
        (0, logger_1.debug)('Default config created at:', configPath);
    }
    // Cache config for 1 minute
    (0, cache_1.saveSessionCache)('global', cacheKey, config, 60 * 1000);
    return config;
}
function saveConfig(config) {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    try {
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        (0, logger_1.debug)('Config saved to:', configPath);
    }
    catch (err) {
        (0, logger_1.debug)('Config save failed:', err);
    }
}
function getConfigPath() {
    return path.join(os.homedir(), '.claude', 'pulse', 'config.json');
}
function getPulseDir() {
    return path.join(os.homedir(), '.claude', 'pulse');
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
function validateConfig(config) {
    const errors = [];
    if (!config.theme || typeof config.theme !== 'string') {
        errors.push('theme must be a non-empty string');
    }
    if (config.padding < 0 || config.padding > 10) {
        errors.push('padding must be between 0 and 10');
    }
    if (config.iconSet !== 'nerd' && config.iconSet !== 'text') {
        errors.push('iconSet must be "nerd" or "text"');
    }
    const orders = Object.values(config.modules)
        .filter((m) => m.enabled)
        .map((m) => m.order);
    if (new Set(orders).size !== orders.length) {
        errors.push('module orders must be unique');
    }
    return errors;
}
//# sourceMappingURL=loader.js.map