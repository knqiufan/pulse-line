# Claude Pulse

Customizable status bar for Claude Code CLI with multiple themes and advanced features.

## Features

**Core modules (default on):**

- Model name (Opus, Sonnet, etc.)
- Context usage with Unicode block progress bar
- Git branch and ahead/behind hints
- Session cost (USD)

**Advanced modules (opt-in):**

- Session duration
- Workspace / project folder name
- Conversation turn count
- Cache read ratio
- Thinking mode flag
- API rate limits (Pro/Max)
- Weekly quota bars
- MCP server count
- Output style label
- Account usage queries (see below)

**Themes:** Deep Dark (default), Minimal Light, Forest, Ocean, Cyberpunk.

## Installation

```bash
npm install -g claude-pulse
claude-pulse install
```

## Usage

Claude Code runs your configured `pulse` command on lifecycle events and pipes session JSON on stdin.

## Icons and terminals

Default `iconSet` is **`text`**: bracket tags such as `[M]`, `[G]`, separators use Unicode **BOX DRAWINGS LIGHT VERTICAL** (U+2502, renders like a vertical rule). No Nerd Fonts required.

Optional **`iconSet`: `"nerd"`** substitutes Nerd Font / Powerline glyphs; use only if your terminal uses a patched font, or icons may render as tofu.

Under **`iconSet`: `"text"`**, icons from `~/.claude/pulse/config.json` that contain **private-use-plane** characters (legacy Nerd glyphs) are **automatically reset** to the bundled ASCII defaults (`[M]`, `[C]`, …), so old configs do not keep producing tofu.

## Model name in the status bar

Labels follow this order (**first non-empty wins**):

1. Explicit override: **`PULSE_MODEL_DISPLAY`**, **`CLAUDE_CODE_MODEL_DISPLAY`** (`process.env` or merged Claude **`settings*.json`** `env`)
2. **Tier routing**: infer Opus / Sonnet / Haiku from `model.id` and `display_name`, then pick env:
   - Opus → `ANTHROPIC_DEFAULT_OPUS_MODEL`
   - Sonnet → `ANTHROPIC_DEFAULT_SONNET_MODEL`
   - Haiku → `ANTHROPIC_DEFAULT_HAIKU_MODEL`  
   (Same merge order / `process.env` precedence as below.)
3. Global fallbacks: **`CLAUDE_MODEL`**, **`ANTHROPIC_MODEL`**
4. **`model.display_name`** from Claude Code stdin JSON if nothing matched above

Typical Claude Code setup with a third‑party Anthropic‑compatible gateway (智谱示例): when the IDE shows “Opus 4.7”, Pulse reads **`ANTHROPIC_DEFAULT_OPUS_MODEL`** (e.g. `glm‑5.1`) from `~/.claude/settings.json`.

Example — explicit pin from global settings:

```json
{
  "env": {
    "PULSE_MODEL_DISPLAY": "Sonnet 4.6"
  }
}
```

## Third-party API keys (account usage)

The **`accountUsage`** module resolves credentials from merged Claude settings `env` (no `pulse/api-keys.json`).

| Provider | Environment variables |
|----------|------------------------|
| Zhipu (GLM) | `ZHIPU_API_KEY`, `ZHIPUAI_API_KEY`, or `BIGMODEL_API_KEY`; or **`ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_API_KEY` when `ANTHROPIC_BASE_URL` points at `*.bigmodel.cn`** (Anthropic-compat profile) |
| DeepSeek | `DEEPSEEK_API_KEY` |
| MiniMax | `MINIMAX_API_KEY`; optional `MINIMAX_GROUP_ID` |

Optional base URL overrides: `ZHIPU_BASE_URL`, `BIGMODEL_BASE_URL`, `DEEPSEEK_BASE_URL`, `MINIMAX_BASE_URL`, etc.

Merged `env` layer order (**weak→strong**, each replaces the earlier); **`process.env` overrides when defined**:

1. `~/.claude/settings.json`
2. `~/.claude/settings.local.json`
3. `<cwd>/.claude/settings.json`
4. `<cwd>/.claude/settings.local.json`

Legacy installs that left **`schemaVersion`** out of **`~/.claude/pulse/config.json`** automatically run a one‑time **`iconSet: nerd → text`** upgrade on load (writes `schemaVersion: 3`); you may switch back to `nerd` if your terminal ships a patched Nerd Font.

## Configuration sample

Edit `~/.claude/pulse/config.json`:

```json
{
  "theme": "dark",
  "separator": " \u2502 ",
  "padding": 1,
  "iconSet": "text",
  "schemaVersion": 3,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[M]" },
    "context": {
      "enabled": true,
      "order": 2,
      "showBar": true,
      "barWidth": 12,
      "icon": "[C]"
    },
    "git": {
      "enabled": true,
      "order": 3,
      "showUpstream": false
    },
    "cost": { "enabled": true, "order": 4, "icon": "[$]" },
    "accountUsage": {
      "enabled": true,
      "order": 11,
      "icon": "[A]",
      "providers": ["zhipu", "deepseek"]
    }
  }
}
```

Spacing: each separator is rendered as `repeat(padding) + separator + repeat(padding)` between segments.

## Known limitations

- The **`thirdPartyApi`** module only triggers background fetches today; rendered segments still come from **`accountUsage`** cache for GLM / DeepSeek style usage.
- **MiniMax / StepFun / Xiaomi Mimo** account queries are stubs until endpoints are finalized.

## Performance

- **P50:** 0.29ms
- **P95:** 0.46ms
- **P99:** &lt;1ms
- **Target:** &lt;80ms

## Development

本地在本仓库根目录打开 **Claude Code**，并已提交 `.claude/settings.json`，将状态栏指向 `node bin/claude-pulse.js`。请先在同一目录执行：

```bash
npm install
npm run build
```

然后在本目录启动 Claude Code（若使用 CLI，可附带从本目录加载插件：`claude --plugin-dir .`，以便使用 `.claude-plugin/` 下的命令文档）。

其余常用命令：

```bash
npm test
node test/benchmark.ts
```

## Architecture

```
src/
├── index.ts           # Main stdin driver
├── parser/            # stdin JSON
├── extractors/        # model, git, context, billing helpers
├── formatters/        # layout with separator + padding
├── themes/            # builtins + nerd overlay
├── config/            # config merge
└── utils/             # cache, ansi, Claude settings env merge
```

## Dependencies

The status line **`src/index.ts`** path uses Node.js built-ins only. The **`claude-pulse` CLI** (install/theme/config commands) adds **`commander`**.

## License

MIT
