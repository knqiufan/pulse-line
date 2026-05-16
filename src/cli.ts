#!/usr/bin/env node

import { Command } from 'commander';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfig,
  saveConfig,
  getConfigPath,
  getPulseDir
} from './config/loader';
import { DEFAULT_CONFIG } from './types/pulse-config';
import { loadTheme, getBuiltinThemeNames } from './themes';
import { removeSessionCacheKey } from './utils/cache';
import { isValidLanguage, getAllLanguages, getLabels } from './i18n';
import {
  appendToolTimelineEvent,
  clearToolTimelineCache,
  computeToolAnalyticsStats,
  computeToolTimelineStats,
  listToolTimelineSessions,
  readToolTimelineCache,
  upsertToolTimelineAgentMeta
} from './tool-timeline/cache';
import { normalizeClaudeSubagentStopHook, normalizeClaudeToolHook } from './extractors/tool-timeline';
import { extractRules } from './extractors/rules';
import type { ToolTimelineProvider, ToolTimelineEvent, ToolTimelineStats } from './types/tool-timeline';

const CONFIG_CACHE_KEY = 'pulse-config-v7';

function saveAndInvalidate(config: import('./types/pulse-config').PulseConfig): void {
  saveConfig(config);
  removeSessionCacheKey('global', CONFIG_CACHE_KEY);
}

function tryInstallPlugin(): boolean {
  try {
    execSync('claude plugin install pulse-line', {
      stdio: 'pipe',
      timeout: 15000
    });
    console.log('[OK] Plugin registered — slash commands (/pulse-line:*) are available');
    return true;
  } catch {
    return false;
  }
}

function readStdinText(): string {
  if (process.stdin.isTTY) return '';
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function readToolTimelineMaxEvents(): number {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return DEFAULT_CONFIG.modules.toolTimeline.maxEvents || 100;
    }
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<import('./types/pulse-config').PulseConfig>;
    const maxEvents = parsed.modules?.toolTimeline?.maxEvents;
    return typeof maxEvents === 'number' && Number.isFinite(maxEvents) && maxEvents > 0
      ? Math.floor(maxEvents)
      : DEFAULT_CONFIG.modules.toolTimeline.maxEvents || 100;
  } catch {
    return DEFAULT_CONFIG.modules.toolTimeline.maxEvents || 100;
  }
}

function isTimelineProvider(value: string): value is ToolTimelineProvider {
  return value === 'claude-code' || value === 'codex';
}

function formatDurationCell(ms?: number): string {
  if (ms === undefined) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

function formatTimeCell(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function renderTimelineTable(sessionId: string, events: ToolTimelineEvent[], stats: ToolTimelineStats): void {
  console.log(`Session: ${sessionId}`);
  const avg = stats.avgDurationMs === undefined ? '-' : formatDurationCell(stats.avgDurationMs);
  console.log(`Total: ${stats.total}  Success: ${stats.success}  Failure: ${stats.failure}  Avg: ${avg}`);
  console.log('');
  console.log('Time      Tool        Status   Duration  Summary');
  for (const event of events) {
    const status = event.status === 'failure' ? 'ERR' : event.status === 'success' ? 'OK' : 'UNK';
    const row = [
      formatTimeCell(event.endedAt).padEnd(9),
      event.displayName.slice(0, 10).padEnd(11),
      status.padEnd(8),
      formatDurationCell(event.durationMs).padEnd(9),
      event.summary
    ].join(' ');
    console.log(row);
  }
}

const program = new Command();

program
  .name('pulse-line')
  .description('Customizable status bar for Claude Code')
  .version('1.0.0');

program
  .command('install')
  .description('Install pulse-line to Claude Code settings')
  .action(() => {
    try {
      const pulseDir = getPulseDir();
      fs.mkdirSync(pulseDir, { recursive: true });
      saveConfig(loadConfig());

      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
      let settings: Record<string, unknown> = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }

      const statusLine = settings.statusLine as Record<string, unknown> | undefined;
      const cmd = 'npx -y pulse-line@latest';
      if (statusLine?.command && statusLine.command !== cmd) {
        console.log('[WARN] statusLine.command already set to:', statusLine.command);
        console.log('   To overwrite, manually edit ~/.claude/settings.json');
      } else {
        settings.statusLine = { type: 'command', command: cmd };
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
        console.log('[OK] statusLine.command configured in settings.json');
      }

      console.log('[OK] Config directory:', pulseDir);
      console.log('[OK] Config file:', getConfigPath());

      const hasPlugin = tryInstallPlugin();

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(' Pulse Line installed successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\nNext steps:');
      console.log('  1. Restart Claude Code');
      console.log('  2. The status bar will appear automatically');
      console.log('  3. Run "pulse-line theme <name>" to change theme');
      if (!hasPlugin) {
        console.log('\n💡 Want slash commands like /pulse-line:theme?');
        console.log('   Run the following in Claude Code:');
        console.log('   /plugin marketplace add knqiufan/pulse-line');
        console.log('   /plugin install pulse-line');
      }
    } catch (err) {
      console.error('[ERROR] Installation failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Uninstall pulse-line')
  .action(() => {
    try {
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings: Record<string, unknown> = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const sl = settings.statusLine as Record<string, unknown> | undefined;
        if (sl?.command && String(sl.command).includes('pulse-line')) {
          delete settings.statusLine;
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
          console.log('[OK] Removed statusLine from settings.json');
        }
      }

      console.log('[OK] Pulse Line uninstalled');
      console.log('Config preserved at:', getPulseDir());
      console.log('   Delete manually if needed');
    } catch (err) {
      console.error('[ERROR] Uninstall failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('theme <name>')
  .description('Switch theme (dark, light, cyberpunk, forest, ocean)')
  .action((name: string) => {
    const available = getBuiltinThemeNames();
    if (!available.includes(name)) {
      console.error(`[ERROR] Unknown theme: ${name}`);
      console.error(`Available themes: ${available.join(', ')}`);
      process.exit(1);
    }

    const config = loadConfig();
    config.theme = name;
    saveAndInvalidate(config);
    console.log(`[OK] Theme switched to: ${name}`);
  });

program
  .command('config')
  .description('Open config file in editor')
  .action(() => {
    const configPath = getConfigPath();
    const editor = process.env.EDITOR || process.env.VISUAL || 'vi';

    try {
      execSync(`${editor} "${configPath}"`, { stdio: 'inherit' });
      removeSessionCacheKey('global', CONFIG_CACHE_KEY);
      console.log('[OK] Config saved');
    } catch (err) {
      console.error('[ERROR] Failed to open editor:', err instanceof Error ? err.message : err);
      console.error(`Config file: ${configPath}`);
      process.exit(1);
    }
  });

program
  .command('reload')
  .description('Reload configuration without restarting Claude Code')
  .action(() => {
    try {
      const config = loadConfig();
      console.log('[OK] Configuration reloaded');
      console.log(`   Theme: ${config.theme}`);
      console.log(`   Modules: ${Object.values(config.modules).filter((m: any) => m.enabled).length} enabled`);
    } catch (err) {
      console.error('[ERROR] Reload failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('enable <module>')
  .description('Enable a module')
  .action((module: string) => {
    const config = loadConfig();
    const mod = (config.modules as any)[module];

    if (!mod) {
      console.error(`[ERROR] Unknown module: ${module}`);
      process.exit(1);
    }

    mod.enabled = true;
    saveAndInvalidate(config);
    console.log(`[OK] Module enabled: ${module}`);
  });

program
  .command('disable <module>')
  .description('Disable a module')
  .action((module: string) => {
    const config = loadConfig();
    const mod = (config.modules as any)[module];

    if (!mod) {
      console.error(`[ERROR] Unknown module: ${module}`);
      process.exit(1);
    }

    mod.enabled = false;
    saveAndInvalidate(config);
    console.log(`[OK] Module disabled: ${module}`);
  });

program
  .command('debug <mode>')
  .description('Enable or disable debug mode (on|off)')
  .action((mode: string) => {
    if (mode !== 'on' && mode !== 'off') {
      console.error('[ERROR] Mode must be "on" or "off"');
      process.exit(1);
    }

    const config = loadConfig();
    config.advanced.debugMode = mode === 'on';
    saveAndInvalidate(config);
    console.log(`[OK] Debug mode: ${mode}`);
  });

program
  .command('themes')
  .description('List available themes')
  .action(() => {
    const themes = getBuiltinThemeNames();
    console.log('Available themes:');
    themes.forEach(name => {
      const theme = loadTheme(name, 'text');
      console.log(`  ${name.padEnd(12)} - ${theme.meta.description}`);
    });
  });

const hook = program
  .command('hook')
  .description('Internal hook commands');

hook
  .command('collect-tool-event')
  .description('Collect a tool timeline event from stdin')
  .option('--provider <provider>', 'Runtime provider', 'claude-code')
  .action((options: { provider: string }) => {
    try {
      if (options.provider !== 'claude-code') return;

      const raw = readStdinText().trim();
      if (!raw) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      const event = normalizeClaudeToolHook(parsed);
      if (!event) return;

      appendToolTimelineEvent(event, {
        maxEvents: readToolTimelineMaxEvents()
      });
    } catch {
      // Hooks must not break Claude Code tool execution.
    }
  });

hook
  .command('collect-subagent-event')
  .description('Collect subagent metadata from stdin')
  .option('--provider <provider>', 'Runtime provider', 'claude-code')
  .action((options: { provider: string }) => {
    try {
      if (options.provider !== 'claude-code') return;

      const raw = readStdinText().trim();
      if (!raw) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      const meta = normalizeClaudeSubagentStopHook(parsed);
      if (!meta) return;

      const sessionId = typeof (parsed as { session_id?: unknown }).session_id === 'string'
        ? (parsed as { session_id: string }).session_id
        : '';
      if (!sessionId) return;

      upsertToolTimelineAgentMeta(sessionId, meta, 'claude-code');
    } catch {
      // Hooks must not break Claude Code agent execution.
    }
  });

const timeline = program
  .command('timeline')
  .description('Show recent tool timeline events')
  .option('--session <id>', 'Session id')
  .option('--provider <provider>', 'Runtime provider', 'claude-code')
  .option('--last <n>', 'Number of events to show', '20')
  .option('--json', 'Print JSON');

timeline
  .command('clear')
  .description('Clear tool timeline cache')
  .option('--session <id>', 'Session id')
  .option('--provider <provider>', 'Runtime provider', 'claude-code')
  .action((options: { session?: string; provider: string }) => {
    const provider = isTimelineProvider(options.provider) ? options.provider : 'claude-code';
    clearToolTimelineCache(options.session, provider);
    console.log('[OK] Tool timeline cache cleared');
  });

timeline.action((options: {
  session?: string;
  provider: string;
  last: string;
  json?: boolean;
}) => {
  const provider = isTimelineProvider(options.provider) ? options.provider : 'claude-code';
  const sessionId = options.session ||
    listToolTimelineSessions(provider)[0]?.sessionId;
  const parsedLast = Number.parseInt(options.last, 10);
  const last = Number.isFinite(parsedLast) && parsedLast > 0 ? parsedLast : 20;

  if (!sessionId) {
    if (options.json) {
      console.log(JSON.stringify(null, null, 2));
    } else {
      console.log('No tool timeline cache found');
    }
    return;
  }

  const cache = readToolTimelineCache(sessionId, provider);
  if (!cache) {
    if (options.json) {
      console.log(JSON.stringify(null, null, 2));
    } else {
      console.log(`No tool timeline cache found for session: ${sessionId}`);
    }
    return;
  }

  const events = cache.events.slice(Math.max(0, cache.events.length - last));
  const stats = computeToolTimelineStats(events);
  const analyticsStats = computeToolAnalyticsStats(events, cache.agents);

  if (options.json) {
    console.log(JSON.stringify({ ...cache, events, stats, analyticsStats }, null, 2));
    return;
  }

  renderTimelineTable(cache.sessionId, events, stats);
});

// ── Rules 命令组 ──────────────────────────────────
const rulesCmd = program
  .command('rules')
  .description('Show project rules/config file count and list');

rulesCmd.action(() => {
  const cwd = process.cwd();
  const config = loadConfig();
  const mod = config.modules.rules;
  const result = extractRules(cwd, mod.includePatterns ?? [], mod.excludePatterns ?? []);
  const labels = getLabels(config.language);

  console.log(`${labels.rulesTitle || 'Rules Files'} Summary`);
  console.log(`  ${labels.rulesCategory || 'Rules'}: ${result.rulesCount}`);
  console.log(`  ${labels.skillsCategory || 'Skills'}: ${result.skillsCount}`);
  console.log(`  ${labels.rulesTotal || 'Total'}: ${result.total}`);
});

rulesCmd
  .command('list')
  .description('List all detected rules/config files')
  .action(() => {
    const cwd = process.cwd();
    const config = loadConfig();
    const mod = config.modules.rules;
    const result = extractRules(cwd, mod.includePatterns ?? [], mod.excludePatterns ?? []);

    if (result.total === 0) {
      console.log('No rules/config files found in current project.');
      return;
    }

    const labels = getLabels(config.language);

    if (result.rulesCount > 0) {
      console.log(`=== ${labels.rulesCategory || 'Rules'} (${result.rulesCount}) ===`);
      for (const f of result.files.filter(f => f.category === 'rule')) {
        console.log(`  ${f.relativePath}`);
      }
      console.log('');
    }

    if (result.skillsCount > 0) {
      console.log(`=== ${labels.skillsCategory || 'Skills'} (${result.skillsCount}) ===`);
      for (const f of result.files.filter(f => f.category === 'skill')) {
        console.log(`  ${f.relativePath}`);
      }
      console.log('');
    }

    console.log(`${labels.rulesTotal || 'Total'}: ${result.total}`);
  });

rulesCmd
  .command('pattern')
  .description('Manage custom file patterns (include/exclude)')
  .argument('<action>', 'add | remove | add-exclude | remove-exclude')
  .argument('<glob>', 'File or directory pattern')
  .action((action: string, patternStr: string) => {
    const validActions = ['add', 'remove', 'add-exclude', 'remove-exclude'];
    if (!validActions.includes(action)) {
      console.error(`[ERROR] Action must be one of: ${validActions.join(', ')}`);
      process.exit(1);
    }

    const config = loadConfig();
    const mod = config.modules.rules;

    if (action === 'add' || action === 'remove') {
      const patterns = mod.includePatterns ?? [];
      if (action === 'add') {
        if (patterns.includes(patternStr)) {
          console.log(`Pattern already exists: ${patternStr}`);
          return;
        }
        mod.includePatterns = [...patterns, patternStr];
        saveAndInvalidate(config);
        console.log(`[OK] Include pattern added: ${patternStr}`);
      } else {
        if (!patterns.includes(patternStr)) {
          console.log(`Pattern not found: ${patternStr}`);
          return;
        }
        mod.includePatterns = patterns.filter(p => p !== patternStr);
        saveAndInvalidate(config);
        console.log(`[OK] Include pattern removed: ${patternStr}`);
      }
    } else {
      const patterns = mod.excludePatterns ?? [];
      if (action === 'add-exclude') {
        if (patterns.includes(patternStr)) {
          console.log(`Exclude pattern already exists: ${patternStr}`);
          return;
        }
        mod.excludePatterns = [...patterns, patternStr];
        saveAndInvalidate(config);
        console.log(`[OK] Exclude pattern added: ${patternStr}`);
      } else {
        if (!patterns.includes(patternStr)) {
          console.log(`Exclude pattern not found: ${patternStr}`);
          return;
        }
        mod.excludePatterns = patterns.filter(p => p !== patternStr);
        saveAndInvalidate(config);
        console.log(`[OK] Exclude pattern removed: ${patternStr}`);
      }
    }
  });

program
  .command('language <lang>')
  .description('Switch display language (zh, en)')
  .action((lang: string) => {
    if (!isValidLanguage(lang)) {
      console.error(`[ERROR] Unknown language: ${lang}`);
      console.error(`Available languages: ${getAllLanguages().join(', ')}`);
      process.exit(1);
    }

    const config = loadConfig();
    config.language = lang;
    const labels = getLabels(lang);

    const moduleKeyMap: Record<string, string> = {
      model: 'model',
      context: 'context',
      git: 'git',
      cost: 'cost',
      duration: 'duration',
      workspace: 'workspace',
      turns: 'turns',
      cacheRatio: 'cacheRatio',
      rateLimits: 'rateLimit',
      weeklyQuota: 'weeklyQuota',
      mcpStatus: 'mcpStatus',
      thinking: 'thinking',
      outputStyle: 'outputStyle',
      accountUsage: 'accountUsage',
      thirdPartyApi: 'thirdPartyApi',
      toolTimeline: 'toolTimeline',
      rules: 'rules'
    };

    for (const [modKey, labelKey] of Object.entries(moduleKeyMap)) {
      const mod = (config.modules as any)[modKey];
      if (mod && labels[labelKey]) {
        mod.icon = `[${labels[labelKey]}]`;
      }
    }

    saveAndInvalidate(config);
    console.log(`[OK] Language switched to: ${lang}`);
  });

program
  .command('clear-cache')
  .description('Clear all pulse cache files')
  .action(() => {
    const cacheDir = path.join(getPulseDir(), 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log('[OK] Cache cleared');
    } else {
      console.log('[OK] Cache directory does not exist, nothing to clear');
    }
  });

program.parse();
