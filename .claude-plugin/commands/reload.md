# Reload Configuration

## Command

```
claude-pulse reload
```

## Description

Reload the claude-pulse configuration without restarting Claude Code. This is useful after making changes to `~/.claude/pulse/config.json` to apply changes immediately.

## Usage

```bash
claude-pulse reload
```

## When to Use

- After editing the config file manually
- After enabling/disabling modules with `claude-pulse enable` or `disable`
- After changing the theme
- To verify current configuration status

## Output

Shows current configuration:
- ✅ Configuration reloaded
- Current theme name
- Number of enabled modules

Example:
```
✅ Configuration reloaded
   Theme: cyberpunk
   Modules: 4 enabled
```

## Related Commands

- `claude-pulse config` - Open config file in editor
- `claude-pulse enable <module>` - Enable a specific module
- `claude-pulse disable <module>` - Disable a specific module
- `claude-pulse theme <name>` - Switch theme

## Configuration File Location

```
~/.claude/pulse/config.json
```

## Troubleshooting

If reload fails:
- Ensure config file exists at the expected location
- Check config file is valid JSON
- Verify file permissions allow reading
