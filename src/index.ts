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
  refreshAccountUsage,
  createDefaultApiKeysConfig
} from './extractors';
import {
  renderLayout,
  renderSegment,
  renderSeparator
} from './formatters';
import { renderProgressBar } from './formatters/progress-bar';
import { colorize } from './utils/ansi';
import { debug } from './utils/logger';

interface Segment {
  text: string;
  separator: string;
}

function main() {
  try {
    const input = parseStdinSync();
    const config = loadConfig();
    const theme = loadTheme(config.theme);
    const modules = config.modules;

    debug('Rendering pulse for session:', input.session_id);

    const segments: Segment[] = [];

    // Model (always enabled - core feature)
    if (modules.model.enabled) {
      const model = extractModel(input, theme);
      if (model) {
        segments.push({
          text: renderSegment(model),
          separator: theme.separator.left
        });
      }
    }

    // Context
    if (modules.context.enabled) {
      const ctx = extractContext(input);
      const barWidth = modules.context.barWidth || 12;
      const bar = renderProgressBar(ctx.percentage, barWidth);
      const ctxIcon = modules.context.icon || '📊';
      const ctxText = `${ctxIcon} ${bar} ${ctx.percentage.toFixed(0)}%`;
      segments.push({
        text: colorize(theme.colors.success, ctxText),
        separator: theme.separator.left
      });
    }

    // Git
    if (modules.git.enabled) {
      const git = extractGit(input.cwd, input.session_id, theme);
      if (git) {
        segments.push({
          text: colorize(git.fg, git.text),
          separator: theme.separator.left
        });
      }
    }

    // Cost
    if (modules.cost.enabled) {
      const cost = extractCost(input);
      if (cost) {
        const icon = modules.cost.icon || '💰';
        segments.push({
          text: colorize(theme.colors.warning, `${icon} ${cost.text}`),
          separator: ''
        });
      }
    }

    // Duration
    if (modules.duration.enabled) {
      const duration = extractSessionDuration(input.session_id, input.transcript_path);
      if (duration) {
        segments.push({
          text: colorize(theme.colors.muted, duration.text),
          separator: theme.separator.left
        });
      }
    }

    // Workspace
    if (modules.workspace.enabled) {
      const ws = extractWorkspace(input);
      const icon = modules.workspace.icon || '📁';
      segments.push({
        text: colorize(theme.colors.accent, `${icon} ${ws.text}`),
        separator: theme.separator.left
      });
    }

    // Turns
    if (modules.turns.enabled) {
      const turns = extractTurns(input.transcript_path);
      if (turns) {
        const icon = modules.turns.icon || '💬';
        segments.push({
          text: colorize(theme.colors.info, `${icon} ${turns.text}`),
          separator: theme.separator.left
        });
      }
    }

    // Cache ratio
    if (modules.cacheRatio.enabled) {
      const usage = input.context_window.current_usage;
      if (usage && usage.input_tokens > 0) {
        const cachePct = (usage.cache_read_input_tokens / usage.input_tokens) * 100;
        const icon = modules.cacheRatio.icon || '📦';
        segments.push({
          text: colorize(theme.colors.accent, `${icon} ${cachePct.toFixed(0)}%`),
          separator: theme.separator.left
        });
      }
    }

    // Rate limits
    if (modules.rateLimits.enabled) {
      const rl = extractRateLimits(input, theme);
      if (rl) {
        segments.push({
          text: colorize(rl.fg, rl.text),
          separator: theme.separator.left
        });
      }
    }

    // Weekly quota
    if (modules.weeklyQuota.enabled) {
      const wq = extractWeeklyQuota(input, theme);
      if (wq) {
        segments.push({
          text: colorize(wq.fg, wq.text),
          separator: theme.separator.left
        });
      }
    }

    // Account usage (sync render + async refresh)
    if (modules.accountUsage.enabled) {
      const cachedResults = extractAccountUsageSync(modules.accountUsage, theme);
      for (const result of cachedResults) {
        const usageIcon = modules.accountUsage.icon || result.icon;
        segments.push({
          text: colorize(result.fg, `${usageIcon} ${result.text}`),
          separator: theme.separator.left
        });
      }

      // Trigger background refresh
      refreshAccountUsage(modules.accountUsage, theme, config.advanced.cacheTTL)
        .catch((err: Error) => debug('Account usage refresh error:', err));
    }

    // MCP status
    if (modules.mcpStatus.enabled) {
      const mcp = extractMcpStatus();
      if (mcp) {
        segments.push({
          text: colorize(theme.colors.muted, mcp.text),
          separator: theme.separator.left
        });
      }
    }

    // Thinking
    if (modules.thinking.enabled) {
      const thinking = extractThinking(input);
      if (thinking) {
        const icon = modules.thinking.icon || '🤔';
        segments.push({
          text: colorize(theme.colors.accent, `${icon} ${thinking.text}`),
          separator: theme.separator.left
        });
      }
    }

    // Output style
    if (modules.outputStyle.enabled) {
      const style = extractOutputStyle(input);
      if (style) {
        const icon = modules.outputStyle.icon || '📝';
        segments.push({
          text: colorize(theme.colors.muted, `${icon} ${style.text}`),
          separator: theme.separator.left
        });
      }
    }

    // Third-party API usage (async, fire and forget)
    if (modules.thirdPartyApi.enabled) {
      const providers = modules.thirdPartyApi.providers || [];
      if (providers.length > 0) {
        extractThirdPartyApi(providers, theme, config.advanced.cacheTTL)
          .then(results => {
            // Results cached for later renders
            debug(`Third-party API query complete: ${results.length} providers`);
          })
          .catch(err => debug('Third-party API query error:', err));
      }
    }

    const output = renderLayout(segments, theme);
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
