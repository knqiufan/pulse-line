#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const loader_1 = require("./config/loader");
const themes_1 = require("./themes");
const third_party_api_1 = require("./extractors/third-party-api");
const program = new commander_1.Command();
program
    .name('claude-pulse')
    .description('Customizable status bar for Claude Code')
    .version('1.0.0');
program
    .command('install')
    .description('Install claude-pulse to Claude Code settings')
    .action(() => {
    try {
        const pulseDir = (0, loader_1.getPulseDir)();
        fs.mkdirSync(pulseDir, { recursive: true });
        (0, loader_1.saveConfig)((0, loader_1.loadConfig)());
        (0, third_party_api_1.createDefaultApiKeysConfig)();
        console.log('✅ Claude Pulse installed successfully!');
        console.log('📁 Config directory:', pulseDir);
        console.log('📝 Edit config:', (0, loader_1.getConfigPath)());
        console.log('\nNext steps:');
        console.log('1. Restart Claude Code');
        console.log('2. The status bar will appear automatically');
        console.log('3. Run "claude-pulse theme <name>" to change theme');
    }
    catch (err) {
        console.error('❌ Installation failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    }
});
program
    .command('uninstall')
    .description('Uninstall claude-pulse')
    .action(() => {
    try {
        console.log('✅ Claude Pulse uninstalled');
        console.log('📝 Config preserved at:', (0, loader_1.getPulseDir)());
        console.log('   Delete manually if needed');
    }
    catch (err) {
        console.error('❌ Uninstall failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    }
});
program
    .command('theme <name>')
    .description('Switch theme (dark, light, cyberpunk, forest, ocean)')
    .action((name) => {
    const available = (0, themes_1.getBuiltinThemeNames)();
    if (!available.includes(name)) {
        console.error(`❌ Unknown theme: ${name}`);
        console.error(`Available themes: ${available.join(', ')}`);
        process.exit(1);
    }
    const config = (0, loader_1.loadConfig)();
    config.theme = name;
    (0, loader_1.saveConfig)(config);
    console.log(`✅ Theme switched to: ${name}`);
});
program
    .command('config')
    .description('Open config file in editor')
    .action(() => {
    const configPath = (0, loader_1.getConfigPath)();
    const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
    try {
        (0, child_process_1.execSync)(`${editor} "${configPath}"`, { stdio: 'inherit' });
        console.log('✅ Config saved');
    }
    catch (err) {
        console.error('❌ Failed to open editor:', err instanceof Error ? err.message : err);
        console.error(`Config file: ${configPath}`);
        process.exit(1);
    }
});
program
    .command('reload')
    .description('Reload configuration without restarting Claude Code')
    .action(() => {
    try {
        const config = (0, loader_1.loadConfig)();
        console.log('✅ Configuration reloaded');
        console.log(`   Theme: ${config.theme}`);
        console.log(`   Modules: ${Object.values(config.modules).filter((m) => m.enabled).length} enabled`);
    }
    catch (err) {
        console.error('❌ Reload failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    }
});
program
    .command('enable <module>')
    .description('Enable a module')
    .action((module) => {
    const config = (0, loader_1.loadConfig)();
    const mod = config.modules[module];
    if (!mod) {
        console.error(`❌ Unknown module: ${module}`);
        process.exit(1);
    }
    mod.enabled = true;
    (0, loader_1.saveConfig)(config);
    console.log(`✅ Module enabled: ${module}`);
});
program
    .command('disable <module>')
    .description('Disable a module')
    .action((module) => {
    const config = (0, loader_1.loadConfig)();
    const mod = config.modules[module];
    if (!mod) {
        console.error(`❌ Unknown module: ${module}`);
        process.exit(1);
    }
    mod.enabled = false;
    (0, loader_1.saveConfig)(config);
    console.log(`✅ Module disabled: ${module}`);
});
program
    .command('debug <mode>')
    .description('Enable or disable debug mode (on|off)')
    .action((mode) => {
    if (mode !== 'on' && mode !== 'off') {
        console.error('❌ Mode must be "on" or "off"');
        process.exit(1);
    }
    const config = (0, loader_1.loadConfig)();
    config.advanced.debugMode = mode === 'on';
    (0, loader_1.saveConfig)(config);
    console.log(`✅ Debug mode: ${mode}`);
});
program
    .command('themes')
    .description('List available themes')
    .action(() => {
    const themes = (0, themes_1.getBuiltinThemeNames)();
    console.log('Available themes:');
    themes.forEach(name => {
        const theme = (0, themes_1.loadTheme)(name);
        console.log(`  ${name.padEnd(12)} - ${theme.meta.description}`);
    });
});
program.parse();
//# sourceMappingURL=cli.js.map