// src/extractors/git.ts

import { getGitInfo, isGitRepository } from '../utils/git';
import { loadSessionCache, saveSessionCache } from '../utils/cache';
import type { Theme } from '../types/theme';

export interface GitSegment {
  text: string;
  fg: string;
}

export function extractGit(cwd: string, sessionId: string, theme: Theme): GitSegment | null {
  if (!isGitRepository(cwd)) return null;

  const cached = loadSessionCache<{ branch: string | null; ahead: number; behind: number }>(sessionId, 'git');
  let gitInfo: { branch: string | null; ahead: number; behind: number };

  if (cached) {
    gitInfo = cached;
  } else {
    gitInfo = getGitInfo(cwd);
    saveSessionCache(sessionId, 'git', gitInfo, 30 * 1000); // 30 sec TTL for branch
  }

  return renderGit(gitInfo, theme);
}

function renderGit(info: { branch: string | null; ahead: number; behind: number }, theme: Theme): GitSegment | null {
  if (!info.branch) return null;

  let text = `🌿 ${info.branch}`;
  if (info.ahead > 0 || info.behind > 0) {
    text += ` ↑${info.ahead} ↓${info.behind}`;
  }

  return {
    text,
    fg: theme.components.git.fg
  };
}
