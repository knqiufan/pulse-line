// src/utils/git.ts

import { execSync } from 'child_process';
import { debug } from './logger';

export interface GitInfo {
  branch: string | null;
  ahead: number;
  behind: number;
}

export function getGitInfo(cwd: string, timeout: number = 200): GitInfo {
  try {
    const branch = execSync('git branch --show-current', {
      cwd,
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!branch) {
      return { branch: null, ahead: 0, behind: 0 };
    }

    let ahead = 0;
    let behind = 0;

    try {
      const revList = execSync('git rev-list --left-right --count @{upstream}...HEAD', {
        cwd,
        timeout,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const [behindStr, aheadStr] = revList.trim().split('\t');
      behind = parseInt(behindStr, 10) || 0;
      ahead = parseInt(aheadStr, 10) || 0;
    } catch {
      // No upstream set, ignore
    }

    debug(`Git branch: ${branch}, ahead: ${ahead}, behind: ${behind}`);
    return { branch, ahead, behind };
  } catch (err) {
    debug('Git command failed:', err);
    return { branch: null, ahead: 0, behind: 0 };
  }
}

export function isGitRepository(cwd: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd,
      timeout: 100,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}
