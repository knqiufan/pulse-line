// test/rules.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractRules } from '../src/extractors/rules';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-rules-'));
}

function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

test('extractRules returns zeros for empty directory', () => {
  const dir = makeTmpDir();
  try {
    const result = extractRules(dir);
    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.rulesCount, 0);
    assert.strictEqual(result.skillsCount, 0);
    assert.strictEqual(result.files.length, 0);
  } finally {
    cleanup(dir);
  }
});

test('extractRules finds CLAUDE.md at root', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Rules');
    const result = extractRules(dir);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.rulesCount, 1);
    assert.strictEqual(result.skillsCount, 0);
    assert.strictEqual(result.files[0].relativePath, 'CLAUDE.md');
  } finally {
    cleanup(dir);
  }
});

test('extractRules finds nested CLAUDE.md', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Root');
    const sub = path.join(dir, 'packages', 'lib');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, 'CLAUDE.md'), '# Lib');

    const result = extractRules(dir);
    assert.strictEqual(result.rulesCount, 2);
    assert.strictEqual(result.total, 2);

    const paths = result.files.map(f => f.relativePath);
    assert.ok(paths.includes('CLAUDE.md'));
    assert.ok(paths.includes(path.join('packages', 'lib', 'CLAUDE.md')));
  } finally {
    cleanup(dir);
  }
});

test('extractRules scans .claude/ directory', () => {
  const dir = makeTmpDir();
  try {
    const claudeDir = path.join(dir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}');
    const agentsDir = path.join(claudeDir, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'reviewer.md'), '# Agent');

    const result = extractRules(dir);
    assert.strictEqual(result.rulesCount, 2);
    assert.strictEqual(result.total, 2);

    const paths = result.files.map(f => f.relativePath);
    assert.ok(paths.includes(path.join('.claude', 'settings.json')));
    assert.ok(paths.includes(path.join('.claude', 'agents', 'reviewer.md')));
  } finally {
    cleanup(dir);
  }
});

test('extractRules scans skills/ directory', () => {
  const dir = makeTmpDir();
  try {
    const skillsDir = path.join(dir, 'skills', 'my-skill');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), '# Skill');

    const result = extractRules(dir);
    assert.strictEqual(result.skillsCount, 1);
    assert.strictEqual(result.rulesCount, 0);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.files[0].category, 'skill');
    assert.strictEqual(result.files[0].relativePath, path.join('skills', 'my-skill', 'SKILL.md'));
  } finally {
    cleanup(dir);
  }
});

test('extractRules combines all categories', () => {
  const dir = makeTmpDir();
  try {
    // CLAUDE.md at root
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Root');

    // .claude/ files
    const claudeDir = path.join(dir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}');

    // skills/ files
    const skillsDir = path.join(dir, 'skills', 'test');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), '# Test');

    const result = extractRules(dir);
    assert.strictEqual(result.rulesCount, 2);  // CLAUDE.md + settings.json
    assert.strictEqual(result.skillsCount, 1);
    assert.strictEqual(result.total, 3);
  } finally {
    cleanup(dir);
  }
});

test('extractRules deduplicates files', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Rules');

    // Call twice with same args — cache returns same result
    const r1 = extractRules(dir);
    const r2 = extractRules(dir);
    assert.strictEqual(r1.total, r2.total);
    assert.strictEqual(r1.files.length, r2.files.length);
  } finally {
    cleanup(dir);
  }
});

test('extractRules excludes default directories', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Root');

    // node_modules with a CLAUDE.md inside should be excluded
    const nm = path.join(dir, 'node_modules', 'pkg');
    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(path.join(nm, 'CLAUDE.md'), '# Should not appear');

    // .git should be excluded
    const git = path.join(dir, '.git');
    fs.mkdirSync(git, { recursive: true });
    fs.writeFileSync(path.join(git, 'config'), '[core]');

    const result = extractRules(dir);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.files[0].relativePath, 'CLAUDE.md');
  } finally {
    cleanup(dir);
  }
});

test('extractRules respects excludePatterns', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Root');
    const vendor = path.join(dir, 'vendor', 'lib');
    fs.mkdirSync(vendor, { recursive: true });
    fs.writeFileSync(path.join(vendor, 'CLAUDE.md'), '# Vendor');

    const result = extractRules(dir, [], ['vendor']);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.files[0].relativePath, 'CLAUDE.md');
  } finally {
    cleanup(dir);
  }
});

test('extractRules respects includePatterns for directories', () => {
  const dir = makeTmpDir();
  try {
    const docs = path.join(dir, 'docs', 'rules');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(docs, 'guide.md'), '# Guide');

    const result = extractRules(dir, ['docs']);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.files[0].relativePath, path.join('docs', 'rules', 'guide.md'));
  } finally {
    cleanup(dir);
  }
});

test('extractRules respects includePatterns for files', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'custom-config.yml'), 'key: value');

    const result = extractRules(dir, ['custom-config.yml']);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.files[0].relativePath, 'custom-config.yml');
  } finally {
    cleanup(dir);
  }
});

test('extractRules cache invalidates when patterns change', () => {
  const dir = makeTmpDir();
  try {
    const docs = path.join(dir, 'docs');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(docs, 'guide.md'), '# Guide');

    const r1 = extractRules(dir, [], []);
    assert.strictEqual(r1.total, 0);

    const r2 = extractRules(dir, ['docs'], []);
    assert.strictEqual(r2.total, 1);
  } finally {
    cleanup(dir);
  }
});
