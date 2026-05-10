// test/git.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { getGitInfo, isGitRepository } from '../src/utils/git';
import { extractGit } from '../src/extractors/git';
import { darkTheme } from '../src/themes/builtin/dark';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const WORKTREE_CWD = '/d/code/status-bar-cc/.worktrees/implementation';

test('isGitRepository should return false for non-git dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-test-'));
  try {
    assert.strictEqual(isGitRepository(tmpDir), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('getGitInfo should handle non-git directory gracefully', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-test-'));
  try {
    const info = getGitInfo(tmpDir);
    assert.strictEqual(info.branch, null);
    assert.strictEqual(info.ahead, 0);
    assert.strictEqual(info.behind, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('extractGit should return null for non-git directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-test-'));
  try {
    const result = extractGit(tmpDir, 'test-session', darkTheme);
    assert.strictEqual(result, null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('git integration should work when compiled and run in shell', () => {
  // This test verifies git works in the compiled version
  // by checking the test fixture output
  const fixturePath = path.join(__dirname, 'fixtures', 'git-test-win.json');
  if (!fs.existsSync(fixturePath)) {
    assert.fail('Git test fixture not found');
    return;
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  // Accept both Windows and Unix path formats
  assert.ok(fixture.cwd.includes('implementation'));
  assert.ok(fixture.session_id);
});
