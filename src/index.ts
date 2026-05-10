// src/index.ts

import { parseStdinSync } from './parser/stdin-parser';
import { loadConfig } from './config/loader';
import { loadTheme } from './themes';
import {
  extractModel,
  extractContext,
  extractCost,
  extractWorkspace,
  extractGit,
  extractRateLimits,
  extractWeeklyQuota,
  extractMcpStatus,
  extractSessionDuration,
  extractTurns,
  extractThinking,
  extractOutputStyle,
  extractThirdPartyApi,
  extractAccountUsageSync,
  refreshAccountUsage
} from './extractors';
import {
  renderLayout,
  renderSegment
} from './formatters';
import { renderProgressBar } from './formatters/progress-bar';
import { colorize } from './utils/ansi';
import { debug } from './utils/logger';

interface Segment {
  text: string;
}

const HTTP_TIMEOUT_MS = 2000;

function main() {
  try {
    const input = parseStdinSync();
    const config = loadConfig();
    const theme = loadTheme(config.theme, config.iconSet);
    const modules = config.modules;

    debug('Rendering pulse for session:', input.session_id);

    const segments: Segment[] = [];

    // Model (always enabled - core feature)
    if (modules.model.enabled) {
      const model = extractModel(input, theme);
      if (model) {
        segments.push({
          text: renderSegment(model)
        });
      }
    }

    // Context
    if (modules.context.enabled) {
      const ctx = extractContext(input);
      const barWidth = modules.context.barWidth || 12;
      const bar = renderProgressBar(ctx.percentage, barWidth);
      const ctxIcon =
        modules.context.icon ?? theme.components.context.icon ?? '';
      const tail = `${bar} ${ctx.percentage.toFixed(0)}%`;
      const ctxText = ctxIcon ? `${ctxIcon} ${tail}` : tail;
      segments.push({
        text: colorize(theme.colors.success, ctxText)
      });
    }

    // Git
    if (modules.git.enabled) {
      const git = extractGit(input.cwd, input.session_id, theme);
      if (git) {
        segments.push({
          text: colorize(git.fg, git.text)
        });
      }
    }

    // Cost
    if (modules.cost.enabled) {
      const cost = extractCost(input);
      if (cost) {
        const icon =
          modules.cost.icon ?? theme.components.cost.icon ?? '';
        const line =
          icon.length > 0 ? `${icon} ${cost.text}` : cost.text;
        segments.push({
          text: colorize(theme.colors.warning, line)
        });
      }
    }

    // Duration
    if (modules.duration.enabled) {
      const duration = extractSessionDuration(
        input.session_id,
        input.transcript_path,
        theme
      );
      if (duration) {
        segments.push({
          text: colorize(theme.colors.muted, duration.text)
        });
      }
    }

    // Workspace
    if (modules.workspace.enabled) {
      const ws = extractWorkspace(input);
      const icon =
        modules.workspace.icon ?? theme.components.workspace.icon ?? '';
      const line = icon.length > 0 ? `${icon} ${ws.text}` : ws.text;
      segments.push({
        text: colorize(theme.colors.accent, line)
      });
    }

    // Turns
    if (modules.turns.enabled) {
      const turns = extractTurns(input.transcript_path, theme);
      if (turns) {
        segments.push({
          text: colorize(theme.colors.info, turns.text)
        });
      }
    }

    // Cache ratio
    if (modules.cacheRatio.enabled) {
      const usage = input.context_window.current_usage;
      if (usage && usage.input_tokens > 0) {
        const cachePct =
          (usage.cache_read_input_tokens / usage.input_tokens) * 100;
        const icon =
          modules.cacheRatio.icon ?? theme.components.cacheRatio.icon ?? '';
        const pct = `${cachePct.toFixed(0)}%`;
        const line = icon.length > 0 ? `${icon} ${pct}` : pct;
        segments.push({
          text: colorize(theme.colors.accent, line)
        });
      }
    }

    // Rate limits
    if (modules.rateLimits.enabled) {
      const rl = extractRateLimits(input, theme);
      if (rl) {
        segments.push({
          text: colorize(rl.fg, rl.text)
        });
      }
    }

    // Weekly quota
    if (modules.weeklyQuota.enabled) {
      const wq = extractWeeklyQuota(input, theme);
      if (wq) {
        segments.push({
          text: colorize(wq.fg, wq.text)
        });
      }
    }

    // Account usage (sync render + async refresh)
    if (modules.accountUsage.enabled) {
      const cachedResults = extractAccountUsageSync(modules.accountUsage);
      const auIconFallback =
        modules.accountUsage.icon ?? theme.components.accountUsage.icon ?? '';

      for (const result of cachedResults) {
        const usageIcon = auIconFallback || result.icon;
        segments.push({
          text: colorize(
            result.fg,
            usageIcon.length > 0 ? `${usageIcon} ${result.text}` : result.text
          )
        });
      }

      const refreshIcon =
        modules.accountUsage.icon ?? theme.components.accountUsage.icon ?? '[A]';

      refreshAccountUsage(
        modules.accountUsage,
        theme,
        HTTP_TIMEOUT_MS,
        input.cwd,
        refreshIcon
      ).catch((err: Error) => debug('Account usage refresh error:', err));
    }

    // MCP status
    if (modules.mcpStatus.enabled) {
      const mcp = extractMcpStatus(theme);
      if (mcp) {
        segments.push({
          text: colorize(theme.colors.muted, mcp.text)
        });
      }
    }

    // Thinking
    if (modules.thinking.enabled) {
      const thinking = extractThinking(input, theme);
      if (thinking) {
        segments.push({
          text: colorize(theme.colors.accent, thinking.text)
        });
      }
    }

    // Output style
    if (modules.outputStyle.enabled) {
      const style = extractOutputStyle(input, theme);
      if (style) {
        segments.push({
          text: colorize(theme.colors.muted, style.text)
        });
      }
    }

    // Third-party API usage (async)
    if (modules.thirdPartyApi.enabled) {
      const providers = modules.thirdPartyApi.providers || [];
      if (providers.length > 0) {
        extractThirdPartyApi(providers, theme, HTTP_TIMEOUT_MS, input.cwd)
          .then((results) => {
            debug(`Third-party API query complete: ${results.length} providers`);
          })
          .catch((err) => debug('Third-party API query error:', err));
      }
    }

    const layoutOpts = {
      separator: config.separator,
      padding: config.padding
    };
    const output = renderLayout(segments, theme, layoutOpts);
    console.log(output);

    if (config.advanced.debugMode) {
      debug('Rendering complete');
    }

  } catch (err) {
    if (process.env.PULSE_DEBUG) {
      console.error('[pulse] Error:', err);
    }
    process.exit(0);
  }
}

main();
