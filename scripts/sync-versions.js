#!/usr/bin/env node
/**
 * Sync version from package.json into plugin metadata files.
 * Run automatically via prepublishOnly to prevent version drift.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;

if (!version || typeof version !== 'string') {
  console.error('[ERROR] package.json is missing a valid version string');
  process.exit(1);
}

const targets = [
  { file: '.claude-plugin/plugin.json', versionPath: ['version'] },
  { file: '.claude-plugin/marketplace.json', versionPath: ['metadata', 'version'] }
];

let changed = 0;
for (const t of targets) {
  const abs = path.join(root, t.file);
  if (!fs.existsSync(abs)) continue;

  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  let cursor = json;
  for (let i = 0; i < t.versionPath.length - 1; i++) {
    cursor = cursor[t.versionPath[i]];
    if (!cursor || typeof cursor !== 'object') {
      console.error(`[ERROR] ${t.file}: missing nested path ${t.versionPath.join('.')}`);
      process.exit(1);
    }
  }
  const lastKey = t.versionPath[t.versionPath.length - 1];
  if (cursor[lastKey] === version) continue;

  cursor[lastKey] = version;
  fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n');
  console.log(`[OK] Synced ${t.file} -> ${version}`);
  changed++;
}

if (changed === 0) {
  console.log(`[OK] All metadata files already at ${version}`);
}
