<div align="center">

# Pulse Line

**A highly customizable status bar plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code)**

Multi-theme support, i18n, and real-time monitoring

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/pulse-line.svg)](https://www.npmjs.com/package/pulse-line)

[中文](README.md) | **English**

</div>

---

## Features

- **15 Modules** — Model, Git branch, Context usage, Cache ratio, MCP status, Account usage, Turns, Thinking, and more
- **5 Built-in Themes** — Dark, Light, Cyberpunk, Forest, Ocean
- **i18n Support** — English and Chinese, switchable anytime
- **3rd Party API Monitoring** — Track Zhipu (GLM), DeepSeek, MiniMax account balance and quota
- **Configurable Layout** — Custom module order, configurable segments per row (default 5), customizable separators
- **11 Slash Commands** — Manage everything from within Claude Code

## Quick Start

### Option 1: Plugin Marketplace (Recommended)

In Claude Code, run:

```
/plugin marketplace add knqiufan/pulse-line
/plugin install pulse-line
```

After installation, **restart Claude Code**. The plugin auto-configures the status bar on the next session start.

### Option 2: One-line Install

```bash
npx -y pulse-line@latest install
```

This command handles all configuration automatically. Restart Claude Code afterwards.

### Option 3: Global Install

```bash
npm install -g pulse-line
pulse-line install
```

> **Tip**: You can also ask Claude Code to install it for you — just say "install pulse-line status bar" in your conversation, and it will handle the setup automatically.

## Commands

### Slash Commands (inside Claude Code)

| Command | Description |
|---------|-------------|
| `/pulse-line:install` | Initialize configuration |
| `/pulse-line:theme <name>` | Switch theme |
| `/pulse-line:themes` | List available themes |
| `/pulse-line:enable <module>` | Enable a module |
| `/pulse-line:disable <module>` | Disable a module |
| `/pulse-line:language <zh\|en>` | Switch display language |
| `/pulse-line:config` | Open config in editor |
| `/pulse-line:reload` | Reload configuration |
| `/pulse-line:clear-cache` | Clear all cached data |
| `/pulse-line:debug` | Toggle debug mode |
| `/pulse-line:uninstall` | Remove configuration |

### CLI Commands (in terminal)

```bash
pulse-line theme cyberpunk     # Switch theme
pulse-line language en         # Switch to English
pulse-line enable thinking     # Enable module
pulse-line disable cost        # Disable module
pulse-line clear-cache         # Clear cache
```

## Modules

| Module | ID | Default | Description |
|--------|----|---------|-------------|
| Model | `model` | ✅ On | Current AI model name |
| Git Branch | `git` | ✅ On | Branch name and ahead/behind count |
| Workspace | `workspace` | ✅ On | Current project name |
| Context Usage | `context` | ✅ On | Context window usage with progress bar |
| Cache | `cacheRatio` | ✅ On | Cached token count (K/M format) |
| MCP | `mcpStatus` | ✅ On | Number of active MCP servers |
| Account | `accountUsage` | ✅ On | 3rd-party API quota and balance |
| Turns | `turns` | ✅ On | Conversation turn count |
| Thinking | `thinking` | ✅ On | Extended thinking status |
| Cost | `cost` | ❌ Off | Session cost in USD |
| Duration | `duration` | ❌ Off | Session duration |
| Rate Limits | `rateLimits` | ❌ Off | Anthropic API rate limit (5h window) |
| Weekly Quota | `weeklyQuota` | ❌ Off | Anthropic API weekly quota |
| Output Style | `outputStyle` | ❌ Off | Current output style |
| Third-party API | `thirdPartyApi` | ❌ Off | Async API provider query |

## Configuration

Config file: `~/.claude/pulse/config.json` — open with `pulse-line config`.

```json
{
  "theme": "dark",
  "language": "en",
  "iconSet": "text",
  "separator": " │ ",
  "padding": 1,
  "maxPerLine": 5,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[Model]" },
    "git": { "enabled": true, "order": 2, "icon": "[Git]" },
    "workspace": { "enabled": true, "order": 3, "icon": "[Workspace]" },
    "context": { "enabled": true, "order": 4, "showBar": true, "barWidth": 12 }
  },
  "advanced": {
    "debugMode": false,
    "cacheEnabled": true,
    "cacheTTL": 300
  }
}
```

### Configuration Reference

| Field | Type | Description |
|-------|------|-------------|
| `theme` | string | Theme name |
| `language` | `"zh"` \| `"en"` | Display language |
| `separator` | string | Separator between modules |
| `padding` | number (0-10) | Spaces on each side of the separator |
| `maxPerLine` | number (1-20) | Max modules per row, default 5 |
| `iconSet` | `"text"` \| `"nerd"` | Icon mode; text is ASCII-safe |

## 3rd Party API Monitoring

Pulse Line can monitor account balance and quota for third-party API providers:

| Provider | Env Variables | Display |
|----------|---------------|---------|
| Zhipu (GLM) | `ZHIPU_API_KEY`, `ZHIPU_BASE_URL` | Usage % with countdown |
| DeepSeek | `DEEPSEEK_API_KEY` | Balance in CNY |
| MiniMax | `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID` | Usage % with countdown |

Providers are auto-detected from your Claude Code settings. You can also configure the `accountUsage.providers` array manually.

> **Note**: Account usage data is obtained from third-party provider APIs. If the provider does not expose this information via its API, it cannot be displayed. Data shown is for reference only — always refer to the provider's official dashboard for accurate figures.

## Themes

| Theme | Style |
|-------|-------|
| `dark` | Blue/green on dark, professional |
| `light` | Bright and clean, for light terminals |
| `cyberpunk` | Neon high-contrast, sci-fi vibes |
| `forest` | Natural greens, earthy tones |
| `ocean` | Deep blues, aquatic feel |

## Local Development

```bash
git clone https://github.com/knqiufan/pulse-line.git
cd pulse-line
npm install
npm run build
npm link

# Load as local plugin in Claude Code
claude --plugin-dir /path/to/pulse-line
```

## Requirements

- Node.js >= 18.0.0
- Claude Code CLI

## FAQ

<details>
<summary><b>Status bar not showing after install?</b></summary>

1. Verify `~/.claude/settings.json` contains the `statusLine` field
2. Run `npx -y pulse-line@latest install` to re-configure
3. Restart Claude Code

</details>

<details>
<summary><b>Icons showing as boxes or garbled characters?</b></summary>

1. Ensure `iconSet` is set to `"text"` in config (default)
2. If using Nerd Font, set to `"nerd"`
3. Run `pulse-line reload`

</details>

<details>
<summary><b>Config changes not taking effect?</b></summary>

1. Run `pulse-line reload`
2. Or restart Claude Code

</details>

## Contributing

Issues and Pull Requests are welcome!

## License

[MIT](LICENSE)
