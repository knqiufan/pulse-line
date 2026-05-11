# Claude Pulse

A customizable status bar plugin for Claude Code. Displays session info at the bottom of your terminal.

[中文版 →](./README.md)

## Installation

```bash
npm install -g claude-pulse
claude-pulse install
```

Restart Claude Code and the status bar appears automatically.

## Usage

All configuration is done via slash commands inside Claude Code — no need to leave the session.

### Switch Theme

```
/claude-pulse:theme <name>
```

Available: `dark` (default), `light`, `cyberpunk`, `forest`, `ocean`.

List all themes:

```
/claude-pulse:themes
```

### Enable / Disable Modules

```
/claude-pulse:enable <module>
/claude-pulse:disable <module>
```

Module IDs:

| ID | Description | Default |
|----|-------------|---------|
| `model` | Current model name | On |
| `context` | Context window usage | On |
| `git` | Git branch | On |
| `accountUsage` | Provider account balances | On |
| `cost` | Session cost (USD) | Off |
| `duration` | Session duration | Off |
| `workspace` | Workspace name | Off |
| `turns` | Conversation turns | Off |
| `cacheRatio` | Cache hit ratio | Off |
| `rateLimits` | API rate limits | Off |
| `weeklyQuota` | Weekly quota | Off |
| `mcpStatus` | MCP server count | Off |
| `thinking` | Thinking mode | Off |
| `outputStyle` | Output style | Off |
| `thirdPartyApi` | Third-party API usage | Off |

Changes take effect immediately on the next status bar render.

### Edit Config

```
/claude-pulse:config
```

Opens `~/.claude/pulse/config.json` in your editor. Changes take effect on save.

### Reload Config

```
/claude-pulse:reload
```

### Debug Mode

```
/claude-pulse:debug on
/claude-pulse:debug off
```

### Install / Uninstall

```
/claude-pulse:install
/claude-pulse:uninstall
```

## Configuration

Config file: `~/.claude/pulse/config.json`. Full example:

```json
{
  "theme": "dark",
  "separator": " │ ",
  "padding": 1,
  "iconSet": "text",
  "schemaVersion": 3,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[M]" },
    "context": { "enabled": true, "order": 2, "showBar": true, "barWidth": 12, "icon": "[C]" },
    "git": { "enabled": true, "order": 3, "showUpstream": false, "icon": "[G]" },
    "cost": { "enabled": false, "order": 4, "icon": "[$]" },
    "duration": { "enabled": false, "order": 5, "icon": "[T]" },
    "workspace": { "enabled": false, "order": 6, "icon": "[W]" },
    "turns": { "enabled": false, "order": 7, "icon": "[N]" },
    "cacheRatio": { "enabled": false, "order": 8, "icon": "[R]" },
    "rateLimits": { "enabled": false, "order": 9, "icon": "[L]", "showCountdown": true },
    "weeklyQuota": { "enabled": false, "order": 10, "icon": "[Q]", "showCountdown": true },
    "accountUsage": { "enabled": true, "order": 11, "icon": "[A]", "providers": ["zhipu", "deepseek"] },
    "mcpStatus": { "enabled": false, "order": 12, "icon": "[P]" },
    "thinking": { "enabled": false, "order": 13, "icon": "[Think]" },
    "outputStyle": { "enabled": false, "order": 14, "icon": "[S]" },
    "thirdPartyApi": { "enabled": false, "order": 15, "icon": "[L]", "providers": [] }
  },
  "advanced": {
    "cacheEnabled": true,
    "cacheTTL": 300,
    "gitTimeout": 200,
    "debugMode": false,
    "customThemePath": null
  }
}
```

### Config Reference

**Global:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | string | `"dark"` | Theme name |
| `separator` | string | `" │ "` | Segment separator |
| `padding` | number | `1` | Spaces on each side of separator |
| `iconSet` | `"text"` \| `"nerd"` | `"text"` | Icon set |

**Common module fields:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable |
| `order` | number | Display order (lower = further left) |
| `icon` | string | Prefix icon (optional) |

**`context` module extras:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showBar` | boolean | true | Show progress bar |
| `barWidth` | number | 12 | Bar width in characters |
| `showTokens` | boolean | false | Show token counts |

**`git` module extras:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showUpstream` | boolean | false | Show ahead/behind counts |

**`accountUsage` module extras:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `providers` | string[] | `["zhipu", "deepseek"]` | Provider list; empty = auto-detect |

**`rateLimits` / `weeklyQuota` extras:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showCountdown` | boolean | true | Show reset countdown |

## Icon Sets

### `text` (default)

ASCII tags: `[M]`, `[C]`, `[G]`, `[$]`, `[A]`. Separator: `│`. No special fonts needed.

### `nerd`

Nerd Font glyphs. Requires a patched Nerd Font installed in your terminal.

```json
{ "iconSet": "nerd" }
```

## Model Name Resolution

The `[M]` segment resolves model names in this order (first non-empty wins):

1. `PULSE_MODEL_DISPLAY` / `CLAUDE_CODE_MODEL_DISPLAY` env vars (explicit override)
2. Tier routing: detects Opus/Sonnet/Haiku in model ID → finds `ANTHROPIC_DEFAULT_*_MODEL` env var
3. Stdin `display_name` / `id` (custom models shown directly)
4. `CLAUDE_MODEL` / `ANTHROPIC_MODEL` env vars (global fallback)

Env merge order (weak→strong; `process.env` always wins):

1. `~/.claude/settings.json`
2. `~/.claude/settings.local.json`
3. `<cwd>/.claude/settings.json`
4. `<cwd>/.claude/settings.local.json`

Third-party gateway example (Zhipu GLM) in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5"
  }
}
```

## Third-Party Account Usage

The `[A]` module queries balances from these providers.

### Zhipu GLM

| Env Variable | Description |
|--------------|-------------|
| `ZHIPU_API_KEY` | Zhipu API key |
| `ZHIPU_BASE_URL` | Custom base URL (optional) |

When `ANTHROPIC_BASE_URL` points to `*.bigmodel.cn`, `ANTHROPIC_AUTH_TOKEN` is used automatically.

Display format: `GLM: ████░░░░░░░░ 35.2% (3h 25m remaining)`

### DeepSeek

| Env Variable | Description |
|--------------|-------------|
| `DEEPSEEK_API_KEY` | DeepSeek API key |

Display format: `DeepSeek: CN¥73.72`

### MiniMax

| Env Variable | Description |
|--------------|-------------|
| `MINIMAX_API_KEY` | MiniMax API key |
| `MINIMAX_GROUP_ID` | Group ID (optional) |

### Auto-Detection

When `accountUsage.providers` is empty, the system auto-detects the provider via `PULSE_PROVIDER` or `ANTHROPIC_BASE_URL` hostname.

### Caching

Account data is cached for 2 minutes and refreshed immediately on session start. Switching providers purges stale cache entries automatically.

## CLI Commands

You can also use the CLI directly in your terminal:

```bash
claude-pulse install              # Install
claude-pulse theme cyberpunk      # Switch theme
claude-pulse enable mcpStatus     # Enable module
claude-pulse disable workspace    # Disable module
claude-pulse config               # Edit config
claude-pulse reload               # Reload config
claude-pulse themes               # List themes
claude-pulse debug on             # Enable debug
```

## Requirements

- Node.js ≥ 18.0.0
- Claude Code

## License

MIT
