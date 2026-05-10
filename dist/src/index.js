"use strict";
// src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
const stdin_parser_1 = require("./parser/stdin-parser");
const loader_1 = require("./config/loader");
const themes_1 = require("./themes");
const extractors_1 = require("./extractors");
const formatters_1 = require("./formatters");
const progress_bar_1 = require("./formatters/progress-bar");
const ansi_1 = require("./utils/ansi");
const logger_1 = require("./utils/logger");
function main() {
    try {
        const input = (0, stdin_parser_1.parseStdinSync)();
        const config = (0, loader_1.loadConfig)();
        const theme = (0, themes_1.loadTheme)(config.theme);
        const modules = config.modules;
        (0, logger_1.debug)('Rendering pulse for session:', input.session_id);
        const segments = [];
        // Model (always enabled - core feature)
        if (modules.model.enabled) {
            const model = (0, extractors_1.extractModel)(input, theme);
            if (model) {
                segments.push({
                    text: (0, formatters_1.renderSegment)(model),
                    separator: theme.separator.left
                });
            }
        }
        // Context
        if (modules.context.enabled) {
            const ctx = (0, extractors_1.extractContext)(input);
            const barWidth = modules.context.barWidth || 12;
            const bar = (0, progress_bar_1.renderProgressBar)(ctx.percentage, barWidth);
            const ctxIcon = modules.context.icon || '📊';
            const ctxText = `${ctxIcon} ${bar} ${ctx.percentage.toFixed(0)}%`;
            segments.push({
                text: (0, ansi_1.colorize)(theme.colors.success, ctxText),
                separator: theme.separator.left
            });
        }
        // Git
        if (modules.git.enabled) {
            const git = (0, extractors_1.extractGit)(input.cwd, input.session_id, theme);
            if (git) {
                segments.push({
                    text: (0, ansi_1.colorize)(git.fg, git.text),
                    separator: theme.separator.left
                });
            }
        }
        // Cost
        if (modules.cost.enabled) {
            const cost = (0, extractors_1.extractCost)(input);
            if (cost) {
                const icon = modules.cost.icon || '💰';
                segments.push({
                    text: (0, ansi_1.colorize)(theme.colors.warning, `${icon} ${cost.text}`),
                    separator: ''
                });
            }
        }
        // Duration
        if (modules.duration.enabled) {
            const duration = (0, extractors_1.extractSessionDuration)(input.session_id, input.transcript_path);
            if (duration) {
                segments.push({
                    text: (0, ansi_1.colorize)(theme.colors.muted, duration.text),
                    separator: theme.separator.left
                });
            }
        }
        // Workspace
        if (modules.workspace.enabled) {
            const ws = (0, extractors_1.extractWorkspace)(input);
            const icon = modules.workspace.icon || '📁';
            segments.push({
                text: (0, ansi_1.colorize)(theme.colors.accent, `${icon} ${ws.text}`),
                separator: theme.separator.left
            });
        }
        // Turns
        if (modules.turns.enabled) {
            const turns = (0, extractors_1.extractTurns)(input.transcript_path);
            if (turns) {
                const icon = modules.turns.icon || '💬';
                segments.push({
                    text: (0, ansi_1.colorize)(theme.colors.info, `${icon} ${turns.text}`),
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
                    text: (0, ansi_1.colorize)(theme.colors.accent, `${icon} ${cachePct.toFixed(0)}%`),
                    separator: theme.separator.left
                });
            }
        }
        // Rate limits
        if (modules.rateLimits.enabled) {
            const rl = (0, extractors_1.extractRateLimits)(input, theme);
            if (rl) {
                segments.push({
                    text: (0, ansi_1.colorize)(rl.fg, rl.text),
                    separator: theme.separator.left
                });
            }
        }
        // Weekly quota
        if (modules.weeklyQuota.enabled) {
            const wq = (0, extractors_1.extractWeeklyQuota)(input, theme);
            if (wq) {
                segments.push({
                    text: (0, ansi_1.colorize)(wq.fg, wq.text),
                    separator: theme.separator.left
                });
            }
        }
        // Account usage (sync render + async refresh)
        if (modules.accountUsage.enabled) {
            const cachedResults = (0, extractors_1.extractAccountUsageSync)(modules.accountUsage, theme);
            for (const result of cachedResults) {
                const usageIcon = modules.accountUsage.icon || result.icon;
                segments.push({
                    text: (0, ansi_1.colorize)(result.fg, `${usageIcon} ${result.text}`),
                    separator: theme.separator.left
                });
            }
            // Trigger background refresh
            (0, extractors_1.refreshAccountUsage)(modules.accountUsage, theme, config.advanced.cacheTTL)
                .catch((err) => (0, logger_1.debug)('Account usage refresh error:', err));
        }
        // MCP status
        if (modules.mcpStatus.enabled) {
            const mcp = (0, extractors_1.extractMcpStatus)();
            if (mcp) {
                segments.push({
                    text: (0, ansi_1.colorize)(theme.colors.muted, mcp.text),
                    separator: theme.separator.left
                });
            }
        }
        // Thinking
        if (modules.thinking.enabled) {
            const thinking = (0, extractors_1.extractThinking)(input);
            if (thinking) {
                const icon = modules.thinking.icon || '🤔';
                segments.push({
                    text: (0, ansi_1.colorize)(theme.colors.accent, `${icon} ${thinking.text}`),
                    separator: theme.separator.left
                });
            }
        }
        // Output style
        if (modules.outputStyle.enabled) {
            const style = (0, extractors_1.extractOutputStyle)(input);
            if (style) {
                const icon = modules.outputStyle.icon || '📝';
                segments.push({
                    text: (0, ansi_1.colorize)(theme.colors.muted, `${icon} ${style.text}`),
                    separator: theme.separator.left
                });
            }
        }
        // Third-party API usage (async, fire and forget)
        if (modules.thirdPartyApi.enabled) {
            const providers = modules.thirdPartyApi.providers || [];
            if (providers.length > 0) {
                (0, extractors_1.extractThirdPartyApi)(providers, theme, config.advanced.cacheTTL)
                    .then(results => {
                    // Results cached for later renders
                    (0, logger_1.debug)(`Third-party API query complete: ${results.length} providers`);
                })
                    .catch(err => (0, logger_1.debug)('Third-party API query error:', err));
            }
        }
        const output = (0, formatters_1.renderLayout)(segments, theme);
        console.log(output);
        if (config.advanced.debugMode) {
            (0, logger_1.debug)('Rendering complete');
        }
    }
    catch (err) {
        if (process.env.PULSE_DEBUG) {
            console.error('[pulse] Error:', err);
        }
        process.exit(0);
    }
}
main();
//# sourceMappingURL=index.js.map