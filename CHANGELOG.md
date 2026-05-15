# Changelog

All notable changes to pulse-line will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Tool analytics collection via Claude Code `PostToolUse` / `PostToolUseFailure` / `SubagentStop` hooks
- Independent `toolTimeline` analytics panel with total calls, context tokens, main/subagent counts, slowest tool, and latest 5 calls
- Agent telemetry aggregation for subagent tool count, token count, duration, and display names
- i18n labels for the tool analytics panel
- `pulse-line timeline` CLI for debug table/JSON inspection and cache clearing
- Tests for analytics cache, normalizer, rendering, CLI, index integration, themes, and schema migration

### Planned

- Additional themes
- More third-party API integrations
- Enhanced customization options
- Plugin marketplace listing

## [1.0.2] - 2026-05-13

### Added

- `maxPerLine` configuration to limit how many status segments render per line

### Changed

- NPM package ships `hooks/` and `scripts/` (alongside existing plugin and command assets); README refresh for installation and feature overview

## [1.0.1] - 2026-05-12

### Fixed

- Language switching and cache-clearing command behavior edge cases
- Test runner portability: macOS/Windows/Linux and Node 18/20 CI via `scripts/test.js` (replacing brittle `find` / glob patterns)
- Provider-credentials related tests isolated from local `settings.json`; test glob issues on macOS

### Changed

- Documentation and help text prefer `npx pulse-line …` for consistent invocation
- CI: NPM publish gated on version tags; `package.json` and workflow paths aligned
- Repository hygiene: stop tracking `node_modules`

## [1.0.0] - 2026-05-10

### Added

- Initial release of pulse-line
- Customizable status bar for Claude Code CLI
- Five built-in themes: Dark, Light, Cyberpunk, Forest, Ocean
- Core modules: model indicator, context usage, git branch, session cost
- Advanced modules: session duration, workspace, turns, cache hit ratio, thinking mode, rate limits, weekly quota, MCP status, output style, third-party API usage
- Interactive CLI commands: install, uninstall, theme, config, reload, enable, disable, debug
- Plugin packaging for Claude Code marketplace
- Cross-platform support (Windows, macOS, Linux)
- CLI via Commander.js; core status pipeline oriented around Node.js built-ins
- High performance: P99 < 1ms
- Comprehensive test suite with 48+ test cases
- Three-level caching system for optimal performance
- ANSI color support for terminal rendering
- Modular architecture with clean separation of concerns

### Performance

- P50: 0.29ms
- P95: 0.46ms
- P99: < 1ms
- Target: < 80ms ✅ (80x better than target)

### Documentation

- Comprehensive README with installation and configuration
- Plugin command documentation (install, uninstall, theme, reload)
- Configuration skill guide with examples
- Architecture documentation
- Cross-platform compatibility notes

### Testing

- Parser tests: JSON parsing and validation
- Formatter tests: Progress bars, duration formatting
- Extractor tests: Model, context, cost, workspace
- Git tests: Repository detection and status
- Advanced extractor tests: Turns, thinking, MCP status
- Theme tests: All 5 themes validated
- Third-party API tests: Graceful degradation
- Benchmark tests: Performance validation
