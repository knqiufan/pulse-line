---
description: Install, configure, and troubleshoot pulse-line status bar for Claude Code. Use when the user asks to install pulse-line, set up status bar, configure the status line, or fix display issues.
---

# Pulse Line Setup Guide

## When to Use

- User asks to install or set up pulse-line
- User asks to configure or customize the status bar
- User reports the status bar is not showing
- User wants to change themes, enable/disable modules, or adjust layout

## Installation

Run the following command to install and configure pulse-line:

```bash
npx -y pulse-line@latest install
```

This command will:
1. Create the config directory at `~/.claude/pulse/`
2. Save default configuration to `~/.claude/pulse/config.json`
3. Write `statusLine.command` to `~/.claude/settings.json`

After running, tell the user to **restart Claude Code** for the status bar to appear.

## If Already Installed via Plugin Marketplace

The plugin automatically configures itself on the next session start via a `SessionStart` hook. If the status bar still doesn't appear:

1. Check if `~/.claude/settings.json` contains:
```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y pulse-line@latest"
  }
}
```

2. If missing, run:
```bash
npx -y pulse-line@latest install
```

3. Restart Claude Code.

## Common Customizations

### Switch Theme

```bash
npx -y pulse-line@latest theme <name>
```

Available themes: `dark`, `light`, `cyberpunk`, `forest`, `ocean`

### Switch Language

```bash
npx -y pulse-line@latest language zh
```

### Enable/Disable Modules

```bash
npx -y pulse-line@latest enable <module>
npx -y pulse-line@latest disable <module>
```

Available modules: `model`, `git`, `workspace`, `context`, `cacheRatio`, `mcpStatus`, `accountUsage`, `turns`, `thinking`, `cost`, `duration`, `rateLimits`, `weeklyQuota`, `outputStyle`, `thirdPartyApi`

### Edit Full Configuration

```bash
npx -y pulse-line@latest config
```

Config file location: `~/.claude/pulse/config.json`

## Troubleshooting

### Status bar not showing

1. Verify `~/.claude/settings.json` has the `statusLine` field
2. Run `npx -y pulse-line@latest install` to re-configure
3. Restart Claude Code

### Icons showing as boxes or garbled characters

1. Ensure `iconSet` is set to `"text"` in config (default)
2. Run `npx -y pulse-line@latest reload`

### Configuration not taking effect

1. Run `npx -y pulse-line@latest reload`
2. Or restart Claude Code

## Uninstall

```bash
npx -y pulse-line@latest uninstall
```

This removes the `statusLine` entry from settings.json. Config files are preserved at `~/.claude/pulse/`.
