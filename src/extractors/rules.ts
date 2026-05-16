// src/extractors/rules.ts

import * as fs from 'fs';
import * as path from 'path';
import { loadSessionCache, saveSessionCache } from '../utils/cache';

export interface RulesFileEntry {
  relativePath: string;
  category: 'rule' | 'skill';
}

export interface RulesSegment {
  total: number;
  rulesCount: number;
  skillsCount: number;
  files: RulesFileEntry[];
}

const DEFAULT_EXCLUDES = new Set([
  'node_modules', '.git', 'dist', '.worktrees',
  '.next', '.nuxt', 'coverage', '__pycache__', '.turbo'
]);

/** Directories excluded from CLAUDE.md search but NOT from walkDir */
const CLAUDE_MD_EXCLUDES = new Set([
  ...DEFAULT_EXCLUDES, '.claude', 'skills'
]);

const MAX_DEPTH = 10;
const CACHE_TTL = 60_000;

function buildCacheKey(cwd: string, includes: string[], excludes: string[]): string {
  return `rules-scan:${cwd}::${includes.join(',')}::${excludes.join(',')}`;
}

function shouldExcludeDir(name: string, excludePatterns: string[]): boolean {
  if (DEFAULT_EXCLUDES.has(name)) return true;
  for (const pat of excludePatterns) {
    if (globMatch(name, pat)) return true;
  }
  return false;
}

function globMatch(value: string, pattern: string): boolean {
  const re = '^' + pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.') + '$';
  return new RegExp(re).test(value);
}

function walkDir(
  dir: string,
  cwd: string,
  excludePatterns: string[],
  category: 'rule' | 'skill',
  depth: number = 0
): RulesFileEntry[] {
  if (depth > MAX_DEPTH) return [];
  const results: RulesFileEntry[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldExcludeDir(entry.name, excludePatterns)) continue;
        results.push(...walkDir(path.join(dir, entry.name), cwd, excludePatterns, category, depth + 1));
      } else if (entry.isFile()) {
        results.push({
          relativePath: path.relative(cwd, path.join(dir, entry.name)),
          category
        });
      }
    }
  } catch {
    // Directory doesn't exist or permission denied — skip
  }
  return results;
}

function findClaudeMdFiles(
  dir: string,
  cwd: string,
  excludePatterns: string[],
  depth: number
): RulesFileEntry[] {
  if (depth > MAX_DEPTH) return [];
  const results: RulesFileEntry[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Use broader exclude set to avoid overlap with .claude/ and skills/ scans
        if (CLAUDE_MD_EXCLUDES.has(entry.name) || shouldExcludeDir(entry.name, excludePatterns)) continue;
        results.push(...findClaudeMdFiles(
          path.join(dir, entry.name), cwd, excludePatterns, depth + 1
        ));
      } else if (entry.name === 'CLAUDE.md') {
        results.push({
          relativePath: path.relative(cwd, path.join(dir, entry.name)),
          category: 'rule'
        });
      }
    }
  } catch {
    // skip
  }
  return results;
}

function scanIncludePatterns(
  cwd: string,
  patterns: string[],
  excludePatterns: string[],
  existing: RulesFileEntry[]
): RulesFileEntry[] {
  const results: RulesFileEntry[] = [];
  const existingPaths = new Set(existing.map(f => f.relativePath));

  for (const pattern of patterns) {
    const resolved = path.resolve(cwd, pattern);
    try {
      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        const rel = path.relative(cwd, resolved);
        if (!existingPaths.has(rel)) {
          results.push({ relativePath: rel, category: 'rule' });
        }
      } else if (stat.isDirectory()) {
        const entries = walkDir(resolved, cwd, excludePatterns, 'rule');
        for (const e of entries) {
          if (!existingPaths.has(e.relativePath)) {
            results.push(e);
          }
        }
      }
    } catch {
      // Path doesn't exist — skip
    }
  }
  return results;
}

function dedup(files: RulesFileEntry[]): RulesFileEntry[] {
  const seen = new Set<string>();
  const result: RulesFileEntry[] = [];
  for (const f of files) {
    if (!seen.has(f.relativePath)) {
      seen.add(f.relativePath);
      result.push(f);
    }
  }
  return result;
}

export function extractRules(
  cwd: string,
  includePatterns: string[] = [],
  excludePatterns: string[] = []
): RulesSegment {
  const cacheKey = buildCacheKey(cwd, includePatterns, excludePatterns);
  const cached = loadSessionCache<RulesSegment>('global', cacheKey);
  if (cached) return cached;

  const allFiles: RulesFileEntry[] = [];

  // 1. Scan CLAUDE.md files (recursive, depth-limited)
  allFiles.push(...findClaudeMdFiles(cwd, cwd, excludePatterns, 0));

  // 2. Scan .claude/ directory
  const claudeDir = path.join(cwd, '.claude');
  if (fs.existsSync(claudeDir)) {
    allFiles.push(...walkDir(claudeDir, cwd, excludePatterns, 'rule'));
  }

  // 3. Scan skills/ directory
  const skillsDir = path.join(cwd, 'skills');
  if (fs.existsSync(skillsDir)) {
    allFiles.push(...walkDir(skillsDir, cwd, excludePatterns, 'skill'));
  }

  // 4. User-defined includePatterns
  const extras = scanIncludePatterns(cwd, includePatterns, excludePatterns, allFiles);
  allFiles.push(...extras);

  const files = dedup(allFiles);

  const segment: RulesSegment = {
    total: files.length,
    rulesCount: files.filter(f => f.category === 'rule').length,
    skillsCount: files.filter(f => f.category === 'skill').length,
    files
  };

  saveSessionCache('global', cacheKey, segment, CACHE_TTL);
  return segment;
}
