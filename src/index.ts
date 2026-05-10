// src/index.ts

import { parseStdinSync } from './parser/stdin-parser';
import { extractModel } from './extractors/model';
import { extractContext } from './extractors/context';
import { extractCost } from './extractors/cost';
import { extractWorkspace } from './extractors/workspace';
import { getGitInfo, isGitRepository } from './utils/git';
import { loadSessionCache, saveSessionCache } from './utils/cache';
import { loadTheme } from './themes';
import { renderLayout } from './formatters/layout';
import { renderProgressBar } from './formatters/progress-bar';
import { renderSegment } from './formatters/segment';
import { colorize, ansiColor, ANSI_RESET } from './utils/ansi';
import { debug } from './utils/logger';

interface Segment {
  text: string;
  separator: string;
}

function main() {
  try {
    const input = parseStdinSync();
    const theme = loadTheme('dark');

    const segments: Segment[] = [];

    // Model
    const model = extractModel(input, theme);
    if (model) {
      segments.push({
        text: renderSegment(model),
        separator: theme.separator.left
      });
    }

    // Context
    const ctx = extractContext(input);
    const ctxText = `${renderProgressBar(ctx.percentage, 12)} ${ctx.percentage.toFixed(0)}%`;
    segments.push({
      text: colorize(theme.colors.success, ctxText),
      separator: theme.separator.left
    });

    // Git branch
    if (isGitRepository(input.cwd)) {
      const cached = loadSessionCache<{ branch: string | null; ahead: number; behind: number }>(input.session_id, 'git');
      let gitInfo: { branch: string | null; ahead: number; behind: number };

      if (cached) {
        gitInfo = cached;
      } else {
        gitInfo = getGitInfo(input.cwd);
        saveSessionCache(input.session_id, 'git', gitInfo, 5 * 60 * 1000);
      }

      if (gitInfo.branch) {
        let text = `🌿 ${gitInfo.branch}`;
        if (gitInfo.ahead > 0 || gitInfo.behind > 0) {
          text += ` ↑${gitInfo.ahead} ↓${gitInfo.behind}`;
        }
        segments.push({
          text: colorize(theme.components.git.fg, text),
          separator: theme.separator.left
        });
      }
    }

    // Cost
    const cost = extractCost(input);
    if (cost) {
      segments.push({
        text: colorize(theme.colors.warning, `💰 ${cost.text}`),
        separator: ''
      });
    }

    const output = renderLayout(segments, theme);
    console.log(output);

  } catch (err) {
    if (process.env.PULSE_DEBUG) {
      console.error('[pulse] Error:', err);
    }
    process.exit(0);
  }
}

main();
