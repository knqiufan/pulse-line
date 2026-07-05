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
  extractThirdPartyApiSync,
  refreshThirdPartyApi,
  THIRD_PARTY_FALLBACK_ICON,
  extractAccountUsageSync,
  refreshAccountUsage,
  extractToolTimeline,
  renderToolAnalyticsPanel,
  extractRules
} from './extractors';
import {
  renderLayout,
  renderSegment
} from './formatters';
import { renderProgressBar } from './formatters/progress-bar';
import { colorize } from './utils/ansi';
import { debug } from './utils/logger';
import { getTerminalWidth } from './utils/terminal-width';
import { getLabel } from './i18n';

interface OrderedSegment {
  order: number;
  text: string;
}

const HTTP_TIMEOUT_MS = 2000;

async function main() {
  try {
    const input = parseStdinSync();
    const config = loadConfig();
    const theme = loadTheme(config.theme, config.iconSet);
    const modules = config.modules;
    const terminalWidth = getTerminalWidth();

    debug('Rendering pulse for session:', input.session_id);

    const segments: OrderedSegment[] = [];
    const panels: OrderedSegment[] = [];

    // Model
    if (modules.model.enabled) {
      const model = extractModel(input, theme, modules.model.icon);
      if (model) {
        segments.push({ order: modules.model.order, text: renderSegment(model) });
      }
    }

    // Context
    if (modules.context.enabled) {
      const ctx = extractContext(input);
      const barWidth = modules.context.barWidth || 12;
      const bar = renderProgressBar(ctx.percentage, barWidth);
      const ctxIcon = modules.context.icon ?? theme.components.context.icon ?? '';
      const tail = `${bar} ${ctx.percentage.toFixed(0)}%`;
      const ctxText = ctxIcon ? `${ctxIcon} ${tail}` : tail;
      segments.push({ order: modules.context.order, text: colorize(theme.colors.success, ctxText) });
    }

    // Account usage: refresh first, then render
    if (modules.accountUsage.enabled) {
      const auIcon = modules.accountUsage.icon ?? theme.components.accountUsage.icon ?? '[A]';

      await refreshAccountUsage(
        modules.accountUsage,
        theme,
        HTTP_TIMEOUT_MS,
        input.cwd,
        auIcon,
        config.language
      );

      const cachedResults = extractAccountUsageSync(modules.accountUsage, input.cwd);

      for (const result of cachedResults) {
        const usageIcon = auIcon || result.icon;
        segments.push({
          order: modules.accountUsage.order,
          text: colorize(
            result.fg,
            usageIcon.length > 0 ? `${usageIcon} ${result.text}` : result.text
          )
        });
      }
    }

    // Git
    if (modules.git.enabled) {
      const gitIcon = modules.git.icon;
      const git = extractGit(input.cwd, input.session_id, theme, gitIcon);
      if (git) {
        segments.push({ order: modules.git.order, text: colorize(git.fg, git.text) });
      }
    }

    // Cost
    if (modules.cost.enabled) {
      const cost = extractCost(input);
      if (cost) {
        const icon = modules.cost.icon ?? theme.components.cost.icon ?? '';
        const line = icon.length > 0 ? `${icon} ${cost.text}` : cost.text;
        segments.push({ order: modules.cost.order, text: colorize(theme.colors.warning, line) });
      }
    }

    // Duration
    if (modules.duration.enabled) {
      const durIcon = modules.duration.icon;
      const duration = extractSessionDuration(
        input.session_id,
        input.transcript_path,
        theme,
        durIcon
      );
      if (duration) {
        segments.push({ order: modules.duration.order, text: colorize(theme.colors.muted, duration.text) });
      }
    }

    // Workspace
    if (modules.workspace.enabled) {
      const ws = extractWorkspace(input);
      const icon = modules.workspace.icon ?? theme.components.workspace.icon ?? '';
      const line = icon.length > 0 ? `${icon} ${ws.text}` : ws.text;
      segments.push({ order: modules.workspace.order, text: colorize(theme.colors.accent, line) });
    }

    // Turns
    if (modules.turns.enabled) {
      const turnsIcon = modules.turns.icon;
      const turns = extractTurns(input.transcript_path, theme, turnsIcon);
      if (turns) {
        segments.push({ order: modules.turns.order, text: colorize(theme.colors.info, turns.text) });
      }
    }

    // Tool timeline
    if (modules.toolTimeline.enabled) {
      const displayMode = modules.toolTimeline.displayMode || 'analytics-panel';
      if (displayMode === 'analytics-panel' || displayMode === 'timeline-panel') {
        const panel = renderToolAnalyticsPanel(
          input.session_id,
          modules.toolTimeline,
          theme,
          config.language,
          {
            contextWindow: input.context_window,
            cost: input.cost,
            terminalWidth
          }
        );
        if (panel) {
          panels.push({
            order: modules.toolTimeline.order,
            text: colorize(theme.colors.info, panel.text)
          });
        }
      } else {
        const timeline = extractToolTimeline(
          input.session_id,
          modules.toolTimeline,
          theme,
          modules.toolTimeline.icon
        );
        if (timeline) {
          segments.push({
            order: modules.toolTimeline.order,
            text: colorize(timeline.fg, timeline.text)
          });
        }
      }
    }

    // Cache ratio
    if (modules.cacheRatio.enabled) {
      const usage = input.context_window.current_usage;
      if (usage && usage.cache_read_input_tokens > 0) {
        const icon = modules.cacheRatio.icon ?? theme.components.cacheRatio.icon ?? '';
        const cached = usage.cache_read_input_tokens;
        const label = cached >= 1_000_000
          ? `${(cached / 1_000_000).toFixed(1)}M`
          : cached >= 1000
            ? `${(cached / 1000).toFixed(1)}K`
            : `${cached}`;
        const line = icon.length > 0 ? `${icon} ${label}` : label;
        segments.push({ order: modules.cacheRatio.order, text: colorize(theme.colors.accent, line) });
      }
    }

    // Rate limits
    if (modules.rateLimits.enabled) {
      const rlIcon = modules.rateLimits.icon;
      const rl = extractRateLimits(input, theme, rlIcon);
      if (rl) {
        segments.push({ order: modules.rateLimits.order, text: colorize(rl.fg, rl.text) });
      }
    }

    // Weekly quota
    if (modules.weeklyQuota.enabled) {
      const wqIcon = modules.weeklyQuota.icon;
      const wq = extractWeeklyQuota(input, theme, wqIcon);
      if (wq) {
        segments.push({ order: modules.weeklyQuota.order, text: colorize(wq.fg, wq.text) });
      }
    }

    // MCP status
    if (modules.mcpStatus.enabled) {
      const mcpIcon = modules.mcpStatus.icon;
      const mcp = extractMcpStatus(theme, mcpIcon, input.cwd);
      if (mcp) {
        segments.push({ order: modules.mcpStatus.order, text: colorize(theme.colors.muted, mcp.text) });
      }
    }

    // Thinking
    if (modules.thinking.enabled) {
      const thinkingIcon = modules.thinking.icon;
      const thinking = extractThinking(input, theme, config.language, thinkingIcon);
      if (thinking) {
        segments.push({ order: modules.thinking.order, text: colorize(theme.colors.accent, thinking.text) });
      }
    }

    // Output style
    if (modules.outputStyle.enabled) {
      const style = extractOutputStyle(input, theme);
      if (style) {
        segments.push({ order: modules.outputStyle.order, text: colorize(theme.colors.muted, style.text) });
      }
    }

    // Rules
    if (modules.rules.enabled) {
      const rules = extractRules(
        input.cwd,
        modules.rules.includePatterns ?? [],
        modules.rules.excludePatterns ?? []
      );
      const icon = modules.rules.icon ?? theme.components.rules.icon ?? '';
      const label = rules.total.toString();
      const line = icon.length > 0 ? `${icon} ${label}` : label;

      const parts: string[] = [];
      if (rules.rulesCount > 0) {
        parts.push(`${getLabel(config.language, 'rulesFiles')}:${rules.rulesCount}`);
      }
      if (rules.skillsCount > 0) {
        parts.push(`${getLabel(config.language, 'rulesSkills')}:${rules.skillsCount}`);
      }
      const suffix = parts.length > 0 ? `  ${parts.join(' ')}` : '';

      segments.push({
        order: modules.rules.order,
        text: colorize(theme.colors.info, line) +
          (suffix ? colorize(theme.colors.muted, suffix) : '')
      });
    }

    // Third-party API usage (refresh cache, then sync render)
    if (modules.thirdPartyApi.enabled) {
      const providers = modules.thirdPartyApi.providers || [];
      if (providers.length > 0) {
        const tpIcon = modules.thirdPartyApi.icon ?? '';

        await refreshThirdPartyApi(
          providers,
          theme,
          HTTP_TIMEOUT_MS,
          input.cwd,
          tpIcon || THIRD_PARTY_FALLBACK_ICON
        );

        const cachedResults = extractThirdPartyApiSync(providers, theme, input.cwd);
        for (const result of cachedResults) {
          const icon = tpIcon || result.icon;
          segments.push({
            order: modules.thirdPartyApi.order,
            text: colorize(
              result.fg,
              icon.length > 0 ? `${icon} ${result.text}` : result.text
            )
          });
        }
      }
    }

    // Sort segments by configured order, then render
    segments.sort((a, b) => a.order - b.order);
    panels.sort((a, b) => a.order - b.order);
    const layoutOpts = {
      separator: config.separator,
      padding: config.padding,
      maxPerLine: config.maxPerLine,
      terminalWidth
    };
    const normalOutput = renderLayout(
      segments.map((s) => ({ text: s.text })),
      theme,
      layoutOpts
    );
    const output = [
      normalOutput,
      ...panels.map((panel) => panel.text)
    ].filter(Boolean).join('\n');
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

main().catch(() => process.exit(0));
