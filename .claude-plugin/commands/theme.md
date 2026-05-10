# Switch Theme

## Command

```
claude-pulse theme <name>
```

## Description

Switch the visual theme of the claude-pulse status bar. Available themes provide different color palettes and visual styles to match your terminal or personal preference.

## Available Themes

- **dark** (default) - Professional dark theme with blue/green accents
- **light** - Clean light theme for light terminals
- **cyberpunk** - Neon cyberpunk aesthetic with bright colors
- **forest** - Natural forest green palette
- **ocean** - Deep ocean blue palette

## Usage

Switch to a specific theme:

```bash
claude-pulse theme cyberpunk
```

## List Available Themes

To see all available themes with descriptions:

```bash
claude-pulse themes
```

## Configuration

The selected theme is saved to `~/.claude/pulse/config.json`:

```json
{
  "theme": "cyberpunk"
}
```

## Applying Changes

After changing the theme:
1. The change takes effect immediately
2. No need to restart Claude Code
3. The new theme appears on the next status bar render

## Troubleshooting

If you see "❌ Unknown theme":
- Run `claude-pulse themes` to see valid options
- Check for typos in the theme name
- Ensure theme name is lowercase

## Theme Customization

For advanced customization, edit the config file directly:

```bash
claude-pulse config
```

Then modify the `theme` field in the opened editor.
