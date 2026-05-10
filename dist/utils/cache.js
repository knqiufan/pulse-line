"use strict";
// src/utils/cache.ts
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
exports.TTLCache = void 0;
exports.getSessionCachePath = getSessionCachePath;
exports.loadSessionCache = loadSessionCache;
exports.saveSessionCache = saveSessionCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("./logger");
class TTLCache {
    cache = new Map();
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, value, ttl) {
        this.cache.set(key, { data: value, timestamp: Date.now() + ttl });
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.timestamp) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    clear() {
        this.cache.clear();
    }
}
exports.TTLCache = TTLCache;
function getSessionCachePath(sessionId) {
    const cacheDir = path.join(os.homedir(), '.claude', 'pulse', 'cache');
    return path.join(cacheDir, `${sessionId}.json`);
}
function loadSessionCache(sessionId, key) {
    try {
        const cachePath = getSessionCachePath(sessionId);
        if (!fs.existsSync(cachePath))
            return null;
        const raw = fs.readFileSync(cachePath, 'utf8');
        const cache = JSON.parse(raw);
        if (cache[key] && Date.now() < cache[key].timestamp) {
            return cache[key].data;
        }
        return null;
    }
    catch {
        return null;
    }
}
function saveSessionCache(sessionId, key, value, ttl) {
    try {
        const cachePath = getSessionCachePath(sessionId);
        const cacheDir = path.dirname(cachePath);
        fs.mkdirSync(cacheDir, { recursive: true });
        let cache = {};
        if (fs.existsSync(cachePath)) {
            cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        }
        cache[key] = { data: value, timestamp: Date.now() + ttl };
        fs.writeFileSync(cachePath, JSON.stringify(cache));
        (0, logger_1.debug)(`Cache saved: ${sessionId}/${key}`);
    }
    catch (err) {
        (0, logger_1.debug)('Cache write failed:', err);
    }
}
//# sourceMappingURL=cache.js.map