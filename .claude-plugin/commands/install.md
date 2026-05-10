# Install Claude Pulse

## Command

```
claude-pulse install
```

## Description

Install claude-pulse to Claude Code settings. This command:
- Creates the configuration directory at `~/.claude/pulse/`
- Generates default configuration file
- Sets up API keys configuration
- Prepares the plugin for use

## Usage

Simply run the install command with no arguments:

```bash
claude-pulse install
```

## Output

On success, you'll see:
- ✅ Claude Pulse installed successfully!
- 📁 Config directory path
- 📝 Config file location
- Next steps instructions

## Next Steps

After installation:
1. Restart Claude Code
2. The status bar will appear automatically
3. Run `claude-pulse theme <name>` to change theme
4. Edit `~/.claude/pulse/config.json` to customize modules

## Troubleshooting

If installation fails:
- Ensure you have Node.js 18+ installed
- Check that `~/.claude/pulse/` directory is writable
- Review error message for specific details

## Uninstall

To remove claude-pulse, run:
```bash
claude-pulse uninstall
```

This preserves your config files. Delete `~/.claude/pulse/` manually if you want to remove them completely.
