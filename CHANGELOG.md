# Changelog

All notable changes to claude-pulse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-08

### Added

- Initial release of claude-pulse
- Customizable status bar for Claude Code CLI
- Five built-in themes: Dark, Light, Cyberpunk, Forest, Ocean
- Core modules: model indicator, context usage, git branch, session cost
- Advanced modules: session duration, workspace, turns, cache hit ratio, thinking mode, rate limits, weekly quota, MCP status, output style, third-party API usage
- Interactive CLI commands: install, uninstall, theme, config, reload, enable, disable, debug
- Plugin packaging for Claude Code marketplace
- Cross-platform support (Windows, macOS, Linux)
- Zero third-party dependencies in production (Node.js built-ins only)
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

## [Unreleased]

### Planned

- Additional themes
- More third-party API integrations
- Enhanced customization options
- Plugin marketplace listing
