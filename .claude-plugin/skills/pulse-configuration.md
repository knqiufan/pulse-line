# Pulse Configuration Skill

## Overview

This skill provides guidance for configuring claude-pulse modules and themes to customize the Claude Code status bar according to your workflow needs.

## Configuration File

Location: `~/.claude/pulse/config.json`

Open in editor:
```bash
claude-pulse config
```

## Module Configuration

Each module in the `modules` section has the following properties:

```json
{
  "enabled": true,
  "order": 1,
  "icon": "[M]"
}
```

### Available Modules

#### Core modules

**model** — current model; default tag `[M]`.

**context** — usage bar; default `[C]`.

**git** — branch plus `↑`/`↓`; default `[G]`.

**cost** — USD total; default `[$]`.

#### Advanced (`config.json` keys)

**duration**, **workspace**, **turns**, **cacheRatio**, **thinking**, **rateLimits**, **weeklyQuota**, **mcpStatus**, **outputStyle** — bracket tags `[T]` … `[S]` in defaults (see bundled `pulse-config.ts`).

**accountUsage** — Zhipu / DeepSeek quotas via merged **`settings*.json`** `env` + `process.env`. For Claude Code routed through **`ANTHROPIC_BASE_URL` → `*.bigmodel.cn`**, GLM quotas use **`ANTHROPIC_AUTH_TOKEN`** (Anthropic-compat) when classic `ZHIPU_*` vars are absent.

**thirdPartyApi** — optional HTTP prefetch; rendered usage primarily via **`accountUsage`** cache.

### iconSet

- `"text"` (default): bracket labels + separators safe without Nerd Fonts.
- `"nerd"`: Nerd Font / Powerline symbols; patched terminal font required.

With **`iconSet`: `"text"`**, if your `config.json` still has old Nerd/PUA characters in `modules.*.icon` or `separator`, Pulse **replaces** them with the bundled ASCII defaults so terminals without patched fonts do not show replacement glyphs (tofu).

Config files saved **without** `schemaVersion` run a **one‑time** upgrade first load (`iconSet: nerd → text`, then `schemaVersion: 3` is written). Set `iconSet` to `nerd` again only if your terminal ships a patched Nerd Font.

## Model name on the status bar

The model segment label resolves as follows (**first non-empty wins**):

1. **Explicit overrides:** `PULSE_MODEL_DISPLAY`, `CLAUDE_CODE_MODEL_DISPLAY` (`process.env` and merged Claude `settings*.json`).
2. **Tier routing:** from `model.id` / `model.display_name` pick **Opus / Sonnet / Haiku**, then read **`ANTHROPIC_DEFAULT_OPUS_MODEL`**, **`…_SONNET_MODEL`**, or **`…_HAIKU_MODEL`** respectively (same precedence as overrides).
3. **Global fallback:** `CLAUDE_MODEL`, `ANTHROPIC_MODEL`.
4. **`model.display_name`** from stdin snapshot.

When Claude Code lists “Opus 4.x” but routing uses **`ANTHROPIC_DEFAULT_OPUS_MODEL: glm‑5.x`**, the bar shows **`glm‑5.x`**.

Example in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5",
    "ANTHROPIC_MODEL": "glm-5.1"
  }
}
```

## Theme Configuration

Change theme via CLI:

```bash
claude-pulse theme dark
claude-pulse theme cyberpunk
```

Or edit config file directly:

```json
{
  "theme": "ocean"
}
```

### Theme Characteristics

- **dark** - Blue/green on black, professional
- **light** - Blue/green on white, clean
- **cyberpunk** - Bright neon colors, high contrast
- **forest** - Natural greens, earthy tones
- **ocean** - Deep blues, aquatic feel

## Layout Customization

The `separator` string is drawn between modules. `padding` repeats that many **spaces** on both sides of each separator (after color is applied).

Example default: `"separator": " \u2502 ", "padding": 1` (U+2502 vertical rule with breathing room).

## Example Configurations

### Minimal Setup

```json
{
  "theme": "dark",
  "separator": " │ ",
  "modules": {
    "model": { "enabled": true, "order": 1 },
    "context": { "enabled": true, "order": 2, "showBar": true, "barWidth": 10 },
    "cost": { "enabled": true, "order": 3 }
  }
}
```

### Developer Setup

```json
{
  "theme": "ocean",
  "separator": " │ ",
  "modules": {
    "model": { "enabled": true, "order": 1 },
    "context": { "enabled": true, "order": 2, "showBar": true, "barWidth": 14 },
    "git": { "enabled": true, "order": 3, "showUpstream": true },
    "workspace": { "enabled": true, "order": 4 },
    "cost": { "enabled": true, "order": 5 }
  }
}
```

### Power User Setup

```json
{
  "theme": "cyberpunk",
  "separator": " ║ ",
  "modules": {
    "model": { "enabled": true, "order": 1 },
    "context": { "enabled": true, "order": 2, "showBar": true, "barWidth": 16 },
    "git": { "enabled": true, "order": 3 },
    "workspace": { "enabled": true, "order": 4 },
    "turns": { "enabled": true, "order": 5 },
    "cost": { "enabled": true, "order": 6 },
    "duration": { "enabled": true, "order": 7 },
    "rateLimits": { "enabled": true, "order": 8 },
    "cacheRatio": { "enabled": true, "order": 9 }
  }
}
```

## Enabling/Disabling Modules

Quick CLI commands:

```bash
# Enable a module
claude-pulse enable rateLimits

# Disable a module
claude-pulse disable thinking

# Reload to apply changes
claude-pulse reload
```

## Advanced Options

### Context Module Options

```json
{
  "context": {
    "enabled": true,
    "order": 2,
    "showBar": true,        // Show progress bar
    "barWidth": 12,         // Bar width in characters
    "showTokens": true,     // Show exact token counts
    "thresholds": {
      "low": 50,            // Green below 50%
      "medium": 75,         // Yellow 50-75%
      "high": 90            // Red above 90%
    }
  }
}
```

### Git Module Options

```json
{
  "git": {
    "enabled": true,
    "order": 3,
    "showUpstream": true,   // Show upstream branch status
    "showChanges": true,    // Indicate uncommitted changes
    "cacheDuration": 300    // Cache duration in seconds
  }
}
```

## Performance Tips

1. **Disable unused modules** - Each enabled module adds ~0.1ms
2. **Reduce bar width** - Smaller bars render faster
3. **Use caching** - Default cache settings are optimal
4. **Minimal setup** - 3-4 modules keeps P99 <1ms

## Troubleshooting

### Config Not Applying

1. Run `claude-pulse reload`
2. Restart Claude Code
3. Verify config file is valid JSON

### Module Not Showing

1. Check module is `"enabled": true`
2. Verify `order` is a number (not string)
3. Run `claude-pulse reload`

### Performance Issues

1. Disable advanced modules (thirdPartyApi, rateLimits)
2. Reduce `barWidth` to 8-10
3. Check cache is working (should see instant updates)

### Icons show as `` or boxes

1. Keep **`iconSet`** as **`"text"`** (default) unless the terminal font is Nerd-patched.
2. Remove private-use / Powerline glyphs from `separator` and `modules.*.icon`, or let Pulse reset them automatically in text mode.
3. Run `claude-pulse reload` or restart Claude Code after editing `config.json`.

## Best Practices

1. **Start minimal** - Enable core modules first
2. **Add gradually** - Test each new module
3. **Customize icons** — short ASCII tags (for example `[M]`, `[ctx]`) keep columns aligned without emoji.
4. **Use reload** - No need to restart Claude Code
5. **Check config** - Use `claude-pulse config` to edit

## Related Commands

- `claude-pulse install` - Initial setup
- `claude-pulse uninstall` - Remove plugin
- `claude-pulse theme <name>` - Switch theme
- `claude-pulse enable <module>` - Enable module
- `claude-pulse disable <module>` - Disable module
- `claude-pulse reload` - Apply changes
- `claude-pulse config` - Edit config file
- `claude-pulse themes` - List themes
