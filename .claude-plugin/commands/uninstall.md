# Uninstall Claude Pulse

## Command

```
claude-pulse uninstall
```

## Description

Uninstall claude-pulse from Claude Code. This command removes the plugin registration but **preserves your configuration files** for future reinstallation.

## Usage

```bash
claude-pulse uninstall
```

## What Gets Removed

- Plugin registration from Claude Code
- Status bar functionality

## What Stays

- Configuration directory: `~/.claude/pulse/`
- Config file: `~/.claude/pulse/config.json`
- Cache files: `~/.claude/pulse/cache/`
- API keys: `~/.claude/pulse/api-keys.json`

## Complete Removal

To completely remove all traces of claude-pulse:

```bash
claude-pulse uninstall
rm -rf ~/.claude/pulse/
```

## Reinstallation

To reinstall after uninstalling:

```bash
npm install -g claude-pulse
claude-pulse install
```

Your previous configuration will be automatically detected and used.
