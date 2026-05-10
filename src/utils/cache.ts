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
  const cacheDir = path.join(os.homedir(), '.claude', 'pulse', 'cache');
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

export function saveSessionCache<T>(sessionId: string, key: string, value: T, ttl: number): void {
  try {
    const cachePath = getSessionCachePath(sessionId);
    const cacheDir = path.dirname(cachePath);
    fs.mkdirSync(cacheDir, { recursive: true });

    let cache: Record<string, any> = {};
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }

    cache[key] = { data: value, timestamp: Date.now() + ttl };
    fs.writeFileSync(cachePath, JSON.stringify(cache));
    debug(`Cache saved: ${sessionId}/${key}`);
  } catch (err) {
    debug('Cache write failed:', err);
  }
}
