# Pulse Line

**English** | [中文](#中文)

A highly customizable status bar plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with multi-theme support, i18n, and real-time monitoring.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## Features

- **15 Modules** — Model, Git branch, Context usage, Cache ratio, MCP status, Account usage, Turns, Thinking, and more
- **5 Built-in Themes** — Dark, Light, Cyberpunk, Forest, Ocean
- **i18n Support** — English (default) and Chinese, switchable via `/pulse-line:language`
- **3rd Party API Usage** — Monitor Zhipu (GLM), DeepSeek, MiniMax account balance and quota
- **Configurable Layout** — Custom module order, 3 segments per row, customizable separators
- **Slash Commands** — 11 built-in commands for easy management

## Quick Start

```bash
# Install globally
npm install -g pulse-line

# Initialize config (~/.claude/pulse/config.json)
pulse-line install

# Restart Claude Code
```

## Usage

All commands are available as slash commands within Claude Code:

| Command | Description |
|---------|-------------|
| `/pulse-line:install` | Initialize configuration |
| `/pulse-line:theme <name>` | Switch theme (dark, light, cyberpunk, forest, ocean) |
| `/pulse-line:themes` | List available themes |
| `/pulse-line:enable <module>` | Enable a module |
| `/pulse-line:disable <module>` | Disable a module |
| `/pulse-line:language <zh\|en>` | Switch display language |
| `/pulse-line:config` | Open config in editor |
| `/pulse-line:reload` | Reload configuration |
| `/pulse-line:clear-cache` | Clear all cached data |
| `/pulse-line:debug` | Toggle debug mode |
| `/pulse-line:uninstall` | Remove configuration |

CLI commands are also available outside Claude Code:

```bash
pulse-line enable thinking        # Enable a module
pulse-line disable cost           # Disable a module
pulse-line theme cyberpunk        # Switch theme
pulse-line language zh            # Switch to Chinese
pulse-line clear-cache            # Clear cache
```

## Modules

| Module | ID | Default | Description |
|--------|----|---------|-------------|
| Model | `model` | On | Current AI model name |
| Git Branch | `git` | On | Branch name and ahead/behind count |
| Workspace | `workspace` | On | Current project name |
| Context Usage | `context` | On | Context window usage with progress bar |
| Cache | `cacheRatio` | On | Cached token count (K/M format) |
| MCP | `mcpStatus` | On | Number of active MCP servers |
| Account | `accountUsage` | On | 3rd-party API quota and balance |
| Turns | `turns` | On | Conversation turn count |
| Thinking | `thinking` | On | Extended thinking status |
| Cost | `cost` | Off | Session cost in USD |
| Duration | `duration` | Off | Session duration |
| Rate Limits | `rateLimits` | Off | Anthropic API rate limit (5h window) |
| Weekly Quota | `weeklyQuota` | Off | Anthropic API weekly quota |
| Output Style | `outputStyle` | Off | Current output style |
| Third-party API | `thirdPartyApi` | Off | Async API provider query |

## 3rd Party Account Usage

Pulse Line can monitor account balance and quota for third-party API providers:

| Provider | Env Variables | Display |
|----------|---------------|---------|
| Zhipu (GLM) | `ZHIPU_API_KEY`, `ZHIPU_BASE_URL` | Usage % with countdown |
| DeepSeek | `DEEPSEEK_API_KEY` | Balance in CNY |
| MiniMax | `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID` | Usage % with countdown |

Providers are auto-detected from your Claude Code settings. You can also configure manually:

```bash
pulse-line config  # Edit providers array in accountUsage module
```

## Configuration

Config file: `~/.claude/pulse/config.json`

```json
{
  "theme": "dark",
  "language": "en",
  "iconSet": "text",
  "separator": " │ ",
  "padding": 1,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[Model]" },
    "git": { "enabled": true, "order": 2, "icon": "[Git]" },
    "workspace": { "enabled": true, "order": 3, "icon": "[Workspace]" },
    "context": { "enabled": true, "order": 4, "barWidth": 12 }
  },
  "advanced": {
    "debugMode": false,
    "cacheEnabled": true,
    "cacheTTL": 300
  }
}
```

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

## License

[MIT](LICENSE)

---

<a id="中文"></a>

# 中文

**[English](#pulse-line)** | 中文

一个高度可定制的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 状态栏插件，支持多主题、国际化和实时监控。

## 功能特性

- **15 个模块** — 当前模型、Git 分支、上下文使用率、缓存、MCP 状态、账户用量、轮次、思考模式等
- **5 个内置主题** — Dark、Light、Cyberpunk、Forest、Ocean
- **国际化支持** — 默认英文，中文可通过 `/pulse-line:language zh` 切换
- **第三方 API 用量** — 监控智谱 (GLM)、DeepSeek、MiniMax 账户余额和配额
- **可配置布局** — 自定义模块顺序，每行 3 个指标，可自定义分隔符
- **斜杠命令** — 11 个内置命令，方便管理

## 快速开始

```bash
# 全局安装
npm install -g pulse-line

# 初始化配置 (~/.claude/pulse/config.json)
pulse-line install

# 重启 Claude Code
```

## 使用方法

所有命令均可在 Claude Code 中通过斜杠命令使用：

| 命令 | 说明 |
|------|------|
| `/pulse-line:install` | 初始化配置 |
| `/pulse-line:theme <name>` | 切换主题 (dark, light, cyberpunk, forest, ocean) |
| `/pulse-line:themes` | 列出可用主题 |
| `/pulse-line:enable <module>` | 启用模块 |
| `/pulse-line:disable <module>` | 禁用模块 |
| `/pulse-line:language <zh\|en>` | 切换显示语言 |
| `/pulse-line:config` | 在编辑器中打开配置 |
| `/pulse-line:reload` | 重新加载配置 |
| `/pulse-line:clear-cache` | 清除所有缓存数据 |
| `/pulse-line:debug` | 切换调试模式 |
| `/pulse-line:uninstall` | 移除配置 |

也可以在 Claude Code 外使用 CLI 命令：

```bash
pulse-line enable thinking        # 启用模块
pulse-line disable cost           # 禁用模块
pulse-line theme cyberpunk        # 切换主题
pulse-line language zh            # 切换为中文
pulse-line clear-cache            # 清除缓存
```

## 模块列表

| 模块 | ID | 默认 | 说明 |
|------|----|------|------|
| 当前模型 | `model` | 开启 | 当前 AI 模型名称 |
| Git 分支 | `git` | 开启 | 分支名及领先/落后数 |
| 工作区 | `workspace` | 开启 | 当前项目名 |
| 上下文使用率 | `context` | 开启 | 上下文窗口使用率（含进度条） |
| 缓存 | `cacheRatio` | 开启 | 缓存 token 数量（K/M 格式） |
| MCP | `mcpStatus` | 开启 | 活跃 MCP 服务器数量 |
| 账户 | `accountUsage` | 开启 | 第三方 API 配额和余额 |
| 轮次 | `turns` | 开启 | 对话轮次 |
| 思考 | `thinking` | 开启 | 扩展思考模式状态 |
| 费用 | `cost` | 关闭 | 会话费用（美元） |
| 时长 | `duration` | 关闭 | 会话持续时间 |
| 限速 | `rateLimits` | 关闭 | Anthropic API 限速（5 小时窗口） |
| 配额 | `weeklyQuota` | 关闭 | Anthropic API 周配额 |
| 风格 | `outputStyle` | 关闭 | 当前输出风格 |
| 第三方 API | `thirdPartyApi` | 关闭 | 异步 API 供应商查询 |

## 第三方账户用量

Pulse Line 可以监控第三方 API 供应商的账户余额和配额：

| 供应商 | 环境变量 | 显示内容 |
|--------|----------|----------|
| 智谱 (GLM) | `ZHIPU_API_KEY`、`ZHIPU_BASE_URL` | 使用率百分比及倒计时 |
| DeepSeek | `DEEPSEEK_API_KEY` | 余额（人民币） |
| MiniMax | `MINIMAX_API_KEY`、`MINIMAX_GROUP_ID` | 使用率百分比及倒计时 |

供应商会从 Claude Code 设置中自动检测，也可手动配置：

```bash
pulse-line config  # 编辑 accountUsage 模块的 providers 数组
```

## 配置

配置文件：`~/.claude/pulse/config.json`

```json
{
  "theme": "dark",
  "language": "en",
  "iconSet": "text",
  "separator": " │ ",
  "padding": 1,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[Model]" },
    "git": { "enabled": true, "order": 2, "icon": "[Git]" },
    "workspace": { "enabled": true, "order": 3, "icon": "[Workspace]" },
    "context": { "enabled": true, "order": 4, "barWidth": 12 }
  },
  "advanced": {
    "debugMode": false,
    "cacheEnabled": true,
    "cacheTTL": 300
  }
}
```

## 本地开发

```bash
git clone https://github.com/knqiufan/pulse-line.git
cd pulse-line
npm install
npm run build
npm link

# 在 Claude Code 中作为本地插件加载
claude --plugin-dir /path/to/pulse-line
```

## 系统要求

- Node.js >= 18.0.0
- Claude Code CLI

## 许可证

[MIT](LICENSE)
