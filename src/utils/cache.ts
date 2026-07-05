// src/utils/cache.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { debug } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, value: T, ttl: number): void {
    this.cache.set(key, { data: value, timestamp: Date.now() + ttl });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
  }
}

export function getSessionCachePath(sessionId: string): string {
  const homeOverride = process.env.PULSE_HOME_OVERRIDE;
  const cacheDir = homeOverride
    ? path.join(path.resolve(homeOverride), 'cache')
    : path.join(os.homedir(), '.claude', 'pulse', 'cache');
  return path.join(cacheDir, `${sessionId}.json`);
}

export function loadSessionCache<T>(sessionId: string, key: string): T | null {
  try {
    const cachePath = getSessionCachePath(sessionId);
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, 'utf8');
    const cache = JSON.parse(raw);
    if (cache[key] && Date.now() < cache[key].timestamp) {
      return cache[key].data as T;
    }
    return null;
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  const dir = path.dirname(filePath);
  const tmp = `${filePath}.tmp.${process.pid}`;

  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(tmp, JSON.stringify(value));
    try {
      fs.renameSync(tmp, filePath);
    } catch {
      try {
        fs.rmSync(filePath, { force: true });
      } catch {
        // Ignore cleanup failure and retry rename below.
      }
      fs.renameSync(tmp, filePath);
    }
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // Ignore temporary file cleanup failure.
    }
    throw err;
  }
}

export function saveSessionCache<T>(sessionId: string, key: string, value: T, ttl: number): void {
  try {
    const cachePath = getSessionCachePath(sessionId);

    let cache: Record<string, any> = {};
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }

    cache[key] = { data: value, timestamp: Date.now() + ttl };
    writeJsonAtomic(cachePath, cache);
    debug(`Cache saved: ${sessionId}/${key}`);
  } catch (err) {
    debug('Cache write failed:', err);
  }
}

export function removeSessionCacheKey(sessionId: string, key: string): void {
  try {
    const cachePath = getSessionCachePath(sessionId);
    if (!fs.existsSync(cachePath)) return;
    const raw = fs.readFileSync(cachePath, 'utf8');
    const cache = JSON.parse(raw);
    if (!(key in cache)) return;
    delete cache[key];
    writeJsonAtomic(cachePath, cache);
    debug(`Cache key removed: ${sessionId}/${key}`);
  } catch { /* ignore */ }
}
