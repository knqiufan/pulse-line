// src/utils/fs.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(filePath: string, data: any): boolean {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

export function getHomeDir(): string {
  return os.homedir();
}

export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}
