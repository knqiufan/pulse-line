<div align="center">

# Pulse Line

**一个高度可定制的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 状态栏插件**

支持多主题、国际化和实时监控

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/pulse-line.svg)](https://www.npmjs.com/package/pulse-line)

**中文** | [English](README_EN.md)

</div>

---

## 特性

- **15 个模块** — 当前模型、Git 分支、上下文使用率、缓存、MCP 状态、账户用量、轮次、思考模式等
- **5 个内置主题** — Dark、Light、Cyberpunk、Forest、Ocean
- **国际化支持** — 中/英文切换
- **第三方 API 监控** — 智谱 (GLM)、DeepSeek、MiniMax 账户余额和配额
- **可配置布局** — 自定义模块顺序，每行显示数量可配置（默认 5），可自定义分隔符
- **11 个斜杠命令** — 在 Claude Code 中直接管理

## 快速开始

### 方式一：Plugin Marketplace（推荐）

在 Claude Code 中执行：

```
/plugin marketplace add knqiufan/pulse-line
/plugin install pulse-line
```

安装完成后，**重启 Claude Code**，插件会在下次会话启动时自动配置状态栏。

### 方式二：一键命令安装

```bash
npx -y pulse-line@latest install
```

这条命令会自动完成所有配置，执行后重启 Claude Code 即可。

### 方式三：全局安装

```bash
npm install -g pulse-line
pulse-line install
```

> **提示**：也可以直接让 Claude Code 帮你安装——在对话中告诉它"帮我安装 pulse-line 状态栏"，它会自动完成配置。

## 命令一览

### 斜杠命令（Claude Code 内使用）

| 命令 | 说明 |
|------|------|
| `/pulse-line:install` | 初始化配置 |
| `/pulse-line:theme <name>` | 切换主题 |
| `/pulse-line:themes` | 列出可用主题 |
| `/pulse-line:enable <module>` | 启用模块 |
| `/pulse-line:disable <module>` | 禁用模块 |
| `/pulse-line:language <zh\|en>` | 切换显示语言 |
| `/pulse-line:config` | 在编辑器中打开配置 |
| `/pulse-line:reload` | 重新加载配置 |
| `/pulse-line:clear-cache` | 清除缓存 |
| `/pulse-line:debug` | 切换调试模式 |
| `/pulse-line:uninstall` | 卸载配置 |

### CLI 命令（终端中使用）

```bash
pulse-line theme cyberpunk     # 切换主题
pulse-line language zh         # 切换为中文
pulse-line enable thinking     # 启用模块
pulse-line disable cost        # 禁用模块
pulse-line clear-cache         # 清除缓存
```

## 模块列表

| 模块 | ID | 默认状态 | 说明 |
|------|----|----------|------|
| 当前模型 | `model` | ✅ 开启 | 当前 AI 模型名称 |
| Git 分支 | `git` | ✅ 开启 | 分支名及领先/落后数 |
| 工作区 | `workspace` | ✅ 开启 | 当前项目名 |
| 上下文使用率 | `context` | ✅ 开启 | 上下文窗口使用率（含进度条） |
| 缓存 | `cacheRatio` | ✅ 开启 | 缓存 token 数量（K/M 格式） |
| MCP | `mcpStatus` | ✅ 开启 | 活跃 MCP 服务器数量 |
| 账户用量 | `accountUsage` | ✅ 开启 | 第三方 API 配额和余额 |
| 轮次 | `turns` | ✅ 开启 | 对话轮次 |
| 思考模式 | `thinking` | ✅ 开启 | 扩展思考状态 |
| 费用 | `cost` | ❌ 关闭 | 会话费用（美元） |
| 时长 | `duration` | ❌ 关闭 | 会话持续时间 |
| 限速 | `rateLimits` | ❌ 关闭 | Anthropic API 限速（5h 窗口） |
| 配额 | `weeklyQuota` | ❌ 关闭 | Anthropic API 周配额 |
| 输出风格 | `outputStyle` | ❌ 关闭 | 当前输出风格 |
| 第三方 API | `thirdPartyApi` | ❌ 关闭 | 异步 API 供应商查询 |

## 配置

配置文件位于 `~/.claude/pulse/config.json`，可通过 `pulse-line config` 打开编辑。

```json
{
  "theme": "dark",
  "language": "zh",
  "iconSet": "text",
  "separator": " │ ",
  "padding": 1,
  "maxPerLine": 5,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[当前模型]" },
    "git": { "enabled": true, "order": 2, "icon": "[Git 分支]" },
    "workspace": { "enabled": true, "order": 3, "icon": "[工作区]" },
    "context": { "enabled": true, "order": 4, "showBar": true, "barWidth": 12 }
  },
  "advanced": {
    "debugMode": false,
    "cacheEnabled": true,
    "cacheTTL": 300
  }
}
```

### 配置说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `theme` | string | 主题名称 |
| `language` | `"zh"` \| `"en"` | 显示语言 |
| `separator` | string | 模块间的分隔符 |
| `padding` | number (0-10) | 分隔符两侧的空格数 |
| `maxPerLine` | number (1-20) | 每行最多显示的模块数，默认 5 |
| `iconSet` | `"text"` \| `"nerd"` | 图标模式，text 为 ASCII 安全字符 |

## 第三方 API 监控

Pulse Line 支持监控第三方 API 供应商的账户余额和配额：

| 供应商 | 环境变量 | 显示内容 |
|--------|----------|----------|
| 智谱 (GLM) | `ZHIPU_API_KEY`、`ZHIPU_BASE_URL` | 使用率 % 及倒计时 |
| DeepSeek | `DEEPSEEK_API_KEY` | 余额（CNY） |
| MiniMax | `MINIMAX_API_KEY`、`MINIMAX_GROUP_ID` | 使用率 % 及倒计时 |

供应商会从 Claude Code 设置中自动检测，也可手动配置 `accountUsage.providers` 数组。

> **注意**：账户用量数据来源于第三方供应商 API，若官方未提供相关接口则无法显示。显示数据仅供参考，请以供应商官方后台为准。

## 主题预览

| 主题 | 风格描述 |
|------|----------|
| `dark` | 蓝绿色系，专业沉稳 |
| `light` | 明亮清爽，适合浅色终端 |
| `cyberpunk` | 霓虹高对比，赛博朋克风 |
| `forest` | 自然绿色系，大地色调 |
| `ocean` | 深蓝色系，海洋质感 |

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

## 常见问题

<details>
<summary><b>安装后状态栏不显示？</b></summary>

1. 确认 `~/.claude/settings.json` 中包含 `statusLine` 字段
2. 执行 `npx -y pulse-line@latest install` 重新配置
3. 重启 Claude Code

</details>

<details>
<summary><b>图标显示为方块或乱码？</b></summary>

1. 确保 `config.json` 中 `iconSet` 为 `"text"`（默认值）
2. 如果使用了 Nerd Font，可设为 `"nerd"`
3. 执行 `pulse-line reload` 应用变更

</details>

<details>
<summary><b>修改配置后没有生效？</b></summary>

1. 执行 `pulse-line reload`
2. 或重启 Claude Code

</details>

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT](LICENSE)
