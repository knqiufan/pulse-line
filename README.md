# Claude Pulse

Customizable status bar for Claude Code CLI with multiple themes and advanced features.

## Features

**Core Modules (always visible):**
- 🧠 Model indicator (Opus, Sonnet, etc.)
- 📊 Context usage with visual progress bar
- 🌿 Git branch with upstream status
- 💰 Session cost tracking

**Advanced Modules (opt-in):**
- ⏱️ Session duration
- 📁 Workspace name
- 💬 Conversation turns
- 📦 Cache hit ratio
- 🤔 Thinking mode status
- ⚡ Rate limits (Pro/Max subscribers)
- 📅 Weekly quota
- 🔌 MCP server status
- 📝 Output style
- 🔗 Third-party API usage (GLM, DeepSeek, MiniMax, StepFun, Mimo)

**Built-in Themes:**
- 🌑 Deep Dark (default)
- ☀️ Minimal Light
- 🦾 Forest
- 🌊 Ocean
- 🤖 Cyberpunk

## Installation

```bash
npm install -g claude-pulse
claude-pulse install
```

## Usage

Claude Code automatically calls `pulse.command` on events. After installation, the status bar appears automatically.

## Configuration

Edit `~/.claude/pulse/config.json` to customize:

```json
{
  "theme": "dark",
  "separator": " │ ",
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "🧠" },
    "context": {
      "enabled": true,
      "order": 2,
      "showBar": true,
      "barWidth": 12
    },
    "git": {
      "enabled": true,
      "order": 3,
      "showUpstream": false
    },
    "cost": { "enabled": true, "order": 4, "icon": "💰" },
    "rateLimits": { "enabled": false, "order": 9, "icon": "⚡" }
  }
}
```

## Performance

- **P50:** 0.29ms
- **P95:** 0.46ms
- **P99:** <1ms
- **Target:** <80ms ✅

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npx ts-node --project tsconfig.json test/**/*.test.ts

# Run benchmark
node test/benchmark.ts
```

## Architecture

```
src/
├── index.ts           # Main entry point
├── parser/            # stdin JSON parsing
├── extractors/        # Data extraction (git, model, context, etc.)
├── formatters/        # Progress bars, duration, layout
├── themes/            # 5 built-in themes
├── config/            # Configuration loader
└── utils/             # Cache, git, ANSI colors
```

## Zero Dependencies

Production code uses **zero third-party npm packages**. All functionality is implemented with Node.js built-in modules:
- `fs`, `path`, `os` - file operations
- `child_process` - git commands
- `https`, `http` - third-party API queries
- `readline` - transcript parsing

## Cross-Platform

Tested and working on:
- Windows (PowerShell, Git Bash, Windows Terminal)
- macOS (iTerm2, Terminal.app)
- Linux (GNOME Terminal, bash)

## License

MIT
