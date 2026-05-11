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
import { loadTheme, getBuiltinThemeNames } from './themes';
import { removeSessionCacheKey } from './utils/cache';
import { isValidLanguage, getAllLanguages, getLabels } from './i18n';

const CONFIG_CACHE_KEY = 'pulse-config-v4';

function saveAndInvalidate(config: import('./types/pulse-config').PulseConfig): void {
  saveConfig(config);
  removeSessionCacheKey('global', CONFIG_CACHE_KEY);
}

const program = new Command();

program
  .name('claude-pulse')
  .description('Customizable status bar for Claude Code')
  .version('1.0.0');

program
  .command('install')
  .description('Install claude-pulse to Claude Code settings')
  .action(() => {
    try {
      const pulseDir = getPulseDir();
      fs.mkdirSync(pulseDir, { recursive: true });
      saveConfig(loadConfig());

      console.log('[OK] Claude Pulse installed successfully.');
      console.log('Config directory:', pulseDir);
      console.log('Edit config:', getConfigPath());
      console.log('\nNext steps:');
      console.log('1. Restart Claude Code');
      console.log('2. The status bar will appear automatically');
      console.log('3. Run "claude-pulse theme <name>" to change theme');
    } catch (err) {
      console.error('[ERROR] Installation failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Uninstall claude-pulse')
  .action(() => {
    try {
      console.log('[OK] Claude Pulse uninstalled');
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
      thirdPartyApi: 'thirdPartyApi'
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
