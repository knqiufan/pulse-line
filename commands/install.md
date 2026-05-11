---
description: Install pulse-line to Claude Code user settings
---

# Install Pulse Line

## Command

```
/pulse-line:install
```

## Description

Initialize pulse-line in your Claude Code user settings. This creates the config directory, saves the default configuration, and configures `statusLine.command` in `~/.claude/settings.json`.

## Instructions

Run the following shell command:

```bash
npx -y pulse-line@latest install
```

Then tell the user to restart Claude Code for the status bar to take effect.
