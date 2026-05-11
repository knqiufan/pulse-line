// src/utils/claude-settings-env.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { debug } from './logger';

export type MergedEnvMap = Record<string, string>;

let _testEnvOverride: MergedEnvMap | null = null;

/** @internal Test hook: force loadMergedClaudeEnv to return a fixed map. */
export function __setTestEnvOverride(map: MergedEnvMap | null) {
  _testEnvOverride = map;
}

function readSettingsEnvFile(filePath: string): MergedEnvMap {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const j = JSON.parse(raw) as { env?: Record<string, unknown> };
    if (!j.env || typeof j.env !== 'object' || Array.isArray(j.env)) return {};
    const out: MergedEnvMap = {};
    for (const [k, v] of Object.entries(j.env)) {
      if (typeof v === 'string' && v.length > 0) out[k] = v;
    }
    return out;
  } catch (e) {
    debug('claude-settings-env: skip', filePath, e);
    return {};
  }
}

function mergeEnvLayers(low: MergedEnvMap, high: MergedEnvMap): MergedEnvMap {
  return { ...low, ...high };
}

/**
 * Merges top-level `env` from Claude Code settings layers (weak → strong).
 * Order: ~/.claude/settings.json → ~/.claude/settings.local.json →
 *        {cwd}/.claude/settings.json → {cwd}/.claude/settings.local.json
 */
export function loadMergedClaudeEnv(cwd: string): MergedEnvMap {
  if (_testEnvOverride !== null) return _testEnvOverride;
  const home = os.homedir();
  const paths = [
    path.join(home, '.claude', 'settings.json'),
    path.join(home, '.claude', 'settings.local.json'),
    path.join(cwd, '.claude', 'settings.json'),
    path.join(cwd, '.claude', 'settings.local.json')
  ];

  let merged: MergedEnvMap = {};
  for (const p of paths) {
    merged = mergeEnvLayers(merged, readSettingsEnvFile(p));
  }
  return merged;
}

export function resolveEnvKey(key: string, merged: MergedEnvMap): string {
  const fromProc = process.env[key];
  if (fromProc !== undefined && fromProc !== '') return fromProc;
  return merged[key] ?? '';
}

export function firstNonEmptyEnv(keys: string[], merged: MergedEnvMap): string {
  for (const k of keys) {
    const v = resolveEnvKey(k, merged);
    if (v) return v;
  }
  return '';
}
