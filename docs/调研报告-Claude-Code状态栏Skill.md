# Claude Code 自定义状态栏 Skill 深度调研报告

## 目录
1. [技术架构分析](#1-技术架构分析)
2. [现有实现案例](#2-现有实现案例)
3. [功能规划与设计](#3-功能规划与设计)
4. [主题系统设计](#4-主题系统设计)
5. [技术实现方案](#5-技术实现方案)
6. [插件分发方案](#6-插件分发方案)
7. [性能与优化](#7-性能与优化)
8. [开发路线图](#8-开发路线图)

---

## 1. 技术架构分析

### 1.1 Claude Code 状态栏工作原理

Claude Code 的状态栏（Status Line）是其 CLI 模式的核心特性之一，工作方式如下：

**核心机制：**
- Claude Code 会在特定事件触发时执行一个 shell 命令
- 通过 **stdin** 向脚本传递 JSON 格式的会话数据
- 脚本处理数据后通过 **stdout** 输出格式化文本
- Claude Code 将输出渲染在终端底部状态栏区域

**触发时机：**
- 每次新的 assistant 消息输出后
- `/compact` 命令执行完成后
- 权限模式切换时
- Vim 模式切换时
- 可选：按固定间隔自动刷新（`refreshInterval` 配置）

**防抖机制：**
- 更新被防抖到 300ms
- 快速连续变化会批量处理，脚本只执行一次
- 如果新更新在脚本运行时到达，正在运行的脚本会被取消

**限制：**
- **仅 CLI 模式支持**，VS Code / Desktop 模式暂不支持（GitHub Issue #30202）
- 没有官方 SDK，纯 shell 命令方案

### 1.2 配置方式

在 `~/.claude/settings.json` 中配置：

```json
{
  "pulse": {
    "type": "command",
    "command": "~/.claude/pulse.sh",
    "padding": 0,
    "refreshInterval": 5,
    "hideVimModeIndicator": false
  }
}
```

**配置字段详解：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 固定值 `"command"` |
| `command` | string | 是 | 执行的 shell 命令或脚本路径 |
| `padding` | number | 否 | 额外水平间距（字符数），默认 0 |
| `refreshInterval` | number | 否 | 自动刷新间隔（秒），最小 1。不设置则仅在事件触发时更新 |
| `hideVimModeIndicator` | boolean | 否 | 是否隐藏内置的 `-- INSERT --` 指示器 |

**配置层级（优先级从高到低）：**
1. `.claude/settings.local.json`（本地私有）
2. `.claude/settings.json`（项目级，可共享）
3. `~/.claude/settings.json`（用户级全局）

### 1.3 stdin JSON 数据规范

脚本通过 stdin 接收的完整 JSON 结构：

```json
{
  "cwd": "/current/working/directory",
  "session_id": "abc123...",
  "session_name": "my-session",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": {
    "id": "claude-opus-4-7",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory",
    "added_dirs": [],
    "git_worktree": "feature-xyz"
  },
  "version": "2.1.90",
  "output_style": { "name": "default" },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15500,
    "total_output_tokens": 1200,
    "context_window_size": 200000,
    "used_percentage": 8,
    "remaining_percentage": 92,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    }
  },
  "exceeds_200k_tokens": false,
  "effort": { "level": "high" },
  "thinking": { "enabled": true },
  "rate_limits": {
    "five_hour": { "used_percentage": 23.5, "resets_at": 1738425600 },
    "seven_day": { "used_percentage": 41.2, "resets_at": 1738857600 }
  },
  "vim": { "mode": "NORMAL" },
  "agent": { "name": "security-reviewer" },
  "worktree": {
    "name": "my-feature",
    "path": "/path/to/.claude/worktrees/my-feature",
    "branch": "worktree-my-feature",
    "original_cwd": "/path/to/project",
    "original_branch": "main"
  }
}
```

**字段可用性说明：**

| 字段 | 可用条件 |
|------|----------|
| `session_name` | 仅当通过 `--name` 标志或 `/rename` 设置时存在 |
| `workspace.git_worktree` | 仅在使用 git worktree 时存在 |
| `effort` | 仅模型支持 reasoning effort 参数时存在（如 Opus） |
| `rate_limits` | 仅 Claude.ai Pro/Max 订阅者在首次 API 响应后可用 |
| `context_window.current_usage` | 首次 API 调用前和 `/compact` 后到下次调用前为 null |
| `vim` | 仅启用 vim 模式时存在 |
| `agent` | 仅使用 `--agent` 标志运行时存在 |
| `worktree` | 仅在使用 `--worktree` 标志运行时存在 |

---

## 2. 现有实现案例

### 2.1 主流开源项目对比

| 项目 | 语言 | Stars | 核心特色 | 技术栈 |
|------|------|-------|----------|--------|
| **[ccpulse](https://github.com/sirmalloc/ccpulse)** | TypeScript | ~16.6K | 30+ 可配置组件、TUI 配置界面、主题支持、Powerline 风格 | Node.js |
| **[CCometixLine](https://github.com/Haleclipse/CCometixLine)** | Rust | - | 高性能、交互式 TUI 配置、TOML 主题文件、CLI 补丁增强 | Rust |
| **[ohugonnot/claude-code-pulse](https://github.com/ohugonnot/claude-code-pulse)** | Bash | 增长中 | 实时 API 用量获取、速率限制条、会话/周配额、倒计时 | Bash + jq |
| **[levz0r/claude-code-pulse](https://github.com/levz0r/claude-code-pulse)** | Bash | - | Token 追踪、成本计算、Git 集成、跨平台 | Bash + PowerShell |
| **[chongdashu/cc-pulse](https://github.com/chongdashu/cc-pulse)** | - | - | 交互式安装向导、一键安装 | - |
| **[danielmackay/claude-code-pulse](https://github.com/danielmackay/claude-code-pulse)** | Bash | - | 极简、worktree 感知、仅 60 行 | Bash |
| **[felipeelias/cc-pulse](https://felipeelias.github.io)** | - | - | TOML 配置、内置主题、成本追踪 | - |

### 2.2 共性与差异分析

**所有方案都提供的核心功能：**
- ✅ 模型名称显示
- ✅ 上下文窗口使用百分比
- ✅ Git 分支显示
- ✅ 会话成本追踪
- ✅ 工作区路径显示
- ✅ ANSI 颜色支持

**差异化功能：**
- **ccpulse**: 30+ 组件可自由组合，可视化配置界面
- **CCometixLine**: Rust 高性能，可禁用 Claude Code 低上下文警告，主题 TOML 文件
- **ohugonnot**: 从 Anthropic API 获取精确用量数据（未公开 API）
- **levz0r**: Windows PowerShell 跨平台支持
- **danielmackay**: 极致精简，worktree 感知

**设计模式总结：**

1. **分段式布局**：用分隔符（``、`│`、`·` 等）分隔不同信息块
2. **阈值着色**：绿色（<50%）→ 黄色（50-80%）→ 红色（>80%）
3. **Nerd Font 图标**：视觉识别（需要终端使用 Nerd Font）
4. **缓存机制**：避免重复执行昂贵的 git/API 操作
5. **优雅降级**：数据不可用时静默隐藏而非报错

### 2.3 用户评价与痛点

根据 Medium 对比测试和社区反馈：

**用户最在意的功能（优先级排序）：**
1. 🥇 **上下文使用百分比** — 最常被提及，用户时刻担心超出限制
2. 🥈 **当前模型名称** — 切换模型时需要确认
3. 🥉 **Git 分支** — 多 worktree 工作流刚需
4. **会话成本** — 防止账单意外
5. **速率限制重置倒计时** — 避免任务中突然冷却

**用户痛点：**
- ❌ 状态栏刷新太慢导致输入延迟
- ❌ 大仓库 git 操作卡顿
- ❌ 主题与终端不匹配（亮色终端 + 暗色状态栏）
- ❌ 功能太多导致拥挤
- ❌ 缺少主题切换功能
- ❌ 安装配置复杂

---

## 3. 功能规划与设计

### 3.1 核心功能模块

基于现有方案和用户需求，建议包含以下模块：

#### 3.1.1 基础信息模块（必选）

```
┌─────────────────────────────────────────────────────────────┐
│ 🧠 Opus  │ 📁 ~/project  │ 🌿 main  │ 💰 $0.05  │ ⏱️ 2h 15m │
└─────────────────────────────────────────────────────────────┘
```

| 模块 | 数据来源 | 说明 |
|------|----------|------|
| 模型图标+名称 | `model.display_name` | 简化显示，如 `Opus`、`Sonnet`、`Haiku` |
| 工作区路径 | `cwd` | 显示相对路径或项目名 |
| Git 分支 | `transcript_path` 所在 git repo | 解析 git branch |
| 会话成本 | `cost.total_cost_usd` | 累计美元花费 |
| 会话时长 | 计算 `session_id` 创建时间 | 格式化为 Xh Ym |

#### 3.1.2 上下文窗口模块（必选）

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Context: ████████░░░░░░░░░░ 32% (64K / 200K)          │
└─────────────────────────────────────────────────────────────┘
```

| 模块 | 数据来源 | 说明 |
|------|----------|------|
| 使用百分比 | `context_window.used_percentage` | 带进度条 |
| Token 数量 | `context_window.total_input_tokens` / `total_output_tokens` | 显示已用/总量 |
| 缓存命中率 | `current_usage.cache_read_input_tokens` / `total_input_tokens` | 显示缓存效率 |

**阈值着色：**
- 0-50%: 绿色 (`\033[0;32m`)
- 50-80%: 黄色 (`\033[0;33m`)
- 80-95%: 橙色 (`\033[0;31m`)
- >95%: 红色高亮 (`\033[1;31m`)

#### 3.1.3 速率限制模块（Pro/Max 订阅者）

```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ 5h: ████████████░░░░ 67%  🔄 1h 23m  │ 📅 7d: 45% 🔄 3d 2h │
└─────────────────────────────────────────────────────────────┘
```

| 模块 | 数据来源 | 说明 |
|------|----------|------|
| 5小时配额 | `rate_limits.five_hour` | 进度条 + 重置倒计时 |
| 7天配额 | `rate_limits.seven_day` | 进度条 + 重置倒计时 |

#### 3.1.4 高级功能模块（可选）

| 功能 | 实现方式 | 价值 |
|------|----------|------|
| **对话轮次计数器** | 解析 `transcript_path` 统计 user/assistant 交替次数 | 了解会话深度 |
| **MCP 服务器状态** | 读取 `~/.claude/.mcp.json` + 检查进程 | 显示连接的工具 |
| **Git 上游状态** | `git rev-list --left-right --count` | 显示 ahead/behind 数 |
| **缓存创建/读取比例** | 计算 cache_creation vs cache_read | 优化提示效率 |
| **并发会话指示器** | 检查 `/tmp/claude-sessions/` 或进程名 | 多工作区工作流 |
| **输出风格指示器** | `output_style.name` | 区分默认/长输出/教学风格 |
| **思考模式指示器** | `thinking.enabled` | 显示是否启用扩展思考 |

### 3.2 功能取舍建议

**必选功能（v1.0）：**
- ✅ 模型名称
- ✅ 上下文使用百分比（带进度条）
- ✅ Git 分支
- ✅ 会话成本
- ✅ 会话时长
- ✅ 工作区路径

**可选功能（v1.1+）：**
- ⏸️ 速率限制（Pro/Max 专属，需优雅降级）
- ⏸️ 对话轮次
- ⏸️ Git 上游状态

**暂不推荐：**
- ❌ 实时 API 用量拉取（不稳定、依赖未公开 API）
- ❌ 温度显示（Claude Code 不暴露此参数）
- ❌ 子状态栏（过于复杂）

---

## 4. 主题系统设计

### 4.1 内置主题规划

建议提供 **5 种内置主题**，覆盖主流使用场景：

#### 主题 1: 深邃黑（Dark Professional）

```
背景: 透明（继承终端）
主色调: #1a1b26（深蓝灰）
强调色: #7aa2f7（亮蓝）
成功色: #9ece6a（绿色）
警告色: #e0af68（黄色）
错误色: #f7768e（红色）
信息色: #7dcfff（青色）
分隔符: （Powerline 右三角）
```

**适用场景:** 暗色终端用户，专业开发环境

#### 主题 2: 极简白（Light Minimal）

```
背景: 透明
主色调: #f8f8f2（亮白）
强调色: #6272a4（深蓝灰）
成功色: #50fa7b（绿色）
警告色: #ffb86c（橙色）
错误色: #ff5555（红色）
信息色: #8be9fd（青色）
分隔符: │（竖线）
```

**适用场景:** 亮色终端用户，日间工作

#### 主题 3: 赛博朋克（Cyberpunk Neon）

```
背景: 透明
主色调: #0d1117（近黑）
强调色: #ff00ff（洋红）
成功色: #00ff00（霓虹绿）
警告色: #ffff00（亮黄）
错误色: #ff0080（霓虹粉）
信息色: #00ffff（青色）
特效: 使用闪烁/粗体增强视觉
分隔符: ◆◀▶◆
```

**适用场景:** 个性化需求，夜间编程

#### 主题 4: 森林绿（Forest Natural）

```
背景: 透明
主色调: #1b2a1b（深绿）
强调色: #98c379（嫩绿）
成功色: #a3d9a5（浅绿）
警告色: #d19a66（棕色）
错误色: #e06c75（红棕）
信息色: #56b6c2（青绿）
分隔符: 🍃（树叶 emoji）
```

**适用场景:** 护眼需求，长时间工作

#### 主题 5: 海洋蓝（Ocean Calm）

```
背景: 透明
主色调: #0a192f（深海蓝）
强调色: #64ffda（海沫绿）
成功色: #69f0ae（薄荷绿）
警告色: #ffab40（琥珀）
错误色: #ff5252（珊瑚红）
信息色: #40c4ff（天蓝）
分隔符: 〰（波浪）
```

**适用场景:**  calming 工作环境

### 4.2 主题切换机制

**实现方式：**

```bash
# 主题配置文件位置
~/.claude/pulse/themes/dark.json
~/.claude/pulse/themes/light.json
~/.claude/pulse/themes/cyberpunk.json
~/.claude/pulse/themes/forest.json
~/.claude/pulse/themes/ocean.json

# 当前激活主题记录
~/.claude/pulse/current-theme
```

**切换方式：**

```bash
# 通过环境变量
export PULSE_THEME=cyberpunk

# 通过配置文件
echo "cyberpunk" > ~/.claude/pulse/current-theme

# 通过 Claude Code 命令（插件提供）
/pulse theme cyberpunk
```

**自动主题检测（可选）：**

```bash
# 检测终端背景色
if [ "$COLORFGBG" = "15;0" ] || [ "$TERM_PROGRAM" = "Apple_Terminal" ]; then
  export PULSE_THEME=light
else
  export PULSE_THEME=dark
fi
```

**注意：** 无法可靠检测 Claude Code 的主题设置（dark/light），只能检测终端背景。

### 4.3 主题配置格式

TOML 格式（参考 CCometixLine）：

```toml
[theme]
name = "Deep Dark"
author = "Your Name"
separator = ""

[colors]
background = "transparent"
primary = "#1a1b26"
accent = "#7aa2f7"
success = "#9ece6a"
warning = "#e0af68"
error = "#f7768e"
info = "#7dcfff"
muted = "#565f89"

[components]
model = { fg = "accent", icon = "🧠" }
context = { fg = "success", show_bar = true }
git = { fg = "info", icon = "🌿" }
cost = { fg = "warning", icon = "💰" }
duration = { fg = "muted", icon = "⏱️" }
```

---

## 5. 技术实现方案

### 5.1 推荐技术栈对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Bash + jq** | 零依赖（jq 通常已安装）、简单直接、易调试 | 复杂逻辑难维护、跨平台问题（Windows） | ⭐⭐⭐⭐ |
| **TypeScript/Node.js** | 模块化、跨平台、npm 生态丰富 | 需要 Node.js 环境、启动开销 | ⭐⭐⭐⭐⭐ |
| **Rust** | 极致性能、单一二进制、无依赖 | 编译复杂、开发周期长 | ⭐⭐⭐ |

**推荐选择：TypeScript/Node.js**

理由：
1. 跨平台兼容（Windows/macOS/Linux）
2. 模块化架构便于维护
3. 丰富的 JSON 处理和终端输出库
4. 可打包为 npm 包，易于分发
5. 开发效率高

### 5.2 TypeScript 实现架构

```
pulse-line/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # 入口：读取 stdin JSON，协调各模块
│   ├── parser/
│   │   └── stdin-parser.ts   # 解析 Claude Code 传入的 JSON
│   ├── extractors/
│   │   ├── model.ts          # 提取模型信息
│   │   ├── context.ts        # 提取上下文使用情况
│   │   ├── git.ts            # 提取 Git 分支、状态
│   │   ├── cost.ts           # 提取成本信息
│   │   ├── workspace.ts      # 提取工作区路径
│   │   └── rate-limits.ts    # 提取速率限制
│   ├── formatters/
│   │   ├── progress-bar.ts   # 进度条渲染
│   │   ├── duration.ts       # 时长格式化
│   │   └── separator.ts      # 分隔符渲染
│   ├── themes/
│   │   ├── index.ts          # 主题加载器
│   │   ├── types.ts          # 主题类型定义
│   │   ├── dark.ts           # 深邃黑主题
│   │   ├── light.ts          # 极简白主题
│   │   ├── cyberpunk.ts      # 赛博朋克主题
│   │   ├── forest.ts         # 森林绿主题
│   │   └── ocean.ts          # 海洋蓝主题
│   ├── config/
│   │   └── loader.ts         # 用户配置加载
│   └── utils/
│       ├── cache.ts          # 会话级缓存
│       ├── git.ts            # Git 辅助函数
│       └── colors.ts         # ANSI 颜色工具
├── themes/                   # TOML 主题文件（可选）
│   ├── dark.toml
│   ├── light.toml
│   ├── cyberpunk.toml
│   ├── forest.toml
│   └── ocean.toml
├── bin/
│   └── pulse-line.js  # 可执行入口
└── dist/                     # 编译输出
```

### 5.3 核心代码结构

**入口文件 `src/index.ts`：**

```typescript
#!/usr/bin/env node
import { parseStdin } from './parser/stdin-parser';
import { extractModel } from './extractors/model';
import { extractContext } from './extractors/context';
import { extractGit } from './extractors/git';
import { extractCost } from './extractors/cost';
import { extractWorkspace } from './extractors/workspace';
import { loadTheme, getCurrentTheme } from './themes';
import { formatProgressBar } from './formatters/progress-bar';
import { formatDuration } from './formatters/duration';
import { renderSegment } from './formatters/segment';

// 读取 stdin JSON
const input = await readStdin();
const data = parseStdin(input);

// 加载主题
const theme = loadTheme(process.env.PULSE_THEME || 'dark');

// 构建状态栏各段
const segments = [];

// 1. 模型信息
const model = extractModel(data.model);
segments.push(renderSegment(theme.model, `${model.icon} ${model.name}`));

// 2. 上下文使用（带进度条）
const ctx = extractContext(data.context_window);
const ctxBar = formatProgressBar(ctx.usedPercent, theme.colors);
segments.push(renderSegment(theme.context, `📊 ${ctxBar} ${ctx.usedPercent}%`));

// 3. Git 分支
const git = await extractGit(data.cwd);
if (git.branch) {
  segments.push(renderSegment(theme.git, `${git.icon} ${git.branch}`));
}

// 4. 成本
const cost = extractCost(data.cost);
segments.push(renderSegment(theme.cost, `${cost.icon}$${cost.total.toFixed(2)}`));

// 5. 时长
const duration = formatDuration(data.session_id);
segments.push(renderSegment(theme.duration, `${duration.icon}${duration.text}`));

// 渲染输出
const output = segments.join(theme.separator);
console.log(output);
```

**进度条渲染 `src/formatters/progress-bar.ts`：**

```typescript
export function formatProgressBar(
  percent: number,
  colors: ThemeColors,
  width: number = 12
): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  // 根据百分比选择颜色
  let barColor = colors.success;
  if (percent > 80) barColor = colors.error;
  else if (percent > 50) barColor = colors.warning;

  const filledBlock = `█`.repeat(filled);  // █
  const emptyBlock = `░`.repeat(empty);     // ░

  return `${barColor}${filledBlock}${colors.muted}${emptyBlock}\033[0m`;
}
```

### 5.4 缓存机制

为避免重复执行昂贵操作（git、文件读取），使用会话级缓存：

```typescript
// src/utils/cache.ts
import * as fs from 'fs';
import * as path from 'path';

const CACHE_DIR = path.join(os.homedir(), '.claude', 'pulse', 'cache');

export function getCachePath(sessionId: string): string {
  return path.join(CACHE_DIR, `${sessionId}.json`);
}

export function readCache<T>(sessionId: string, key: string): T | null {
  const cachePath = getCachePath(sessionId);
  if (!fs.existsSync(cachePath)) return null;

  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  const entry = cache[key];

  // 检查 TTL（默认 5 分钟）
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
    return null;
  }

  return entry.value;
}

export function writeCache<T>(
  sessionId: string,
  key: string,
  value: T,
  ttlMs: number = 5 * 60 * 1000
): void {
  const cachePath = getCachePath(sessionId);
  const cache = fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    : {};

  cache[key] = { value, timestamp: Date.now() };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache));
}
```

**缓存策略：**

| 数据类型 | 缓存时长 | 原因 |
|----------|----------|------|
| Git 分支 | 5 分钟 | 分支不会频繁变更 |
| Git upstream | 10 分钟 | 需要网络操作，较慢 |
| 会话开始时间 | 永久 | 不变化 |
| 工作区路径 | 永久 | 不变化 |

### 5.5 跨平台兼容

**Windows 兼容性考虑：**

Claude Code 在 Windows 上运行，状态栏脚本需要兼容：
- Windows Terminal（推荐）
- PowerShell
- Git Bash（已支持 bash 脚本）

**推荐方案：使用 Node.js 跨平台**

```json
// package.json
{
  "bin": {
    "pulse-line": "./bin/pulse-line.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

全局安装后，settings.json 配置：

```json
{
  "pulse": {
    "type": "command",
    "command": "pulse-line"
  }
}
```

Node.js 二进制在 Windows 上同样可用。

### 5.6 降级与容错

```typescript
// 确保单个数据源失败不影响整体渲染
try {
  const git = await extractGit(data.cwd);
  segments.push(renderGitSegment(git));
} catch (e) {
  // 静默跳过，不中断状态栏渲染
}

// 优雅降级显示
function safeRender(value: string | null, fallback: string): string {
  return value || fallback || '';
}
```

---

## 6. 插件分发方案

### 6.1 作为 Claude Code Plugin 分发

**插件目录结构：**

```
pulse-line/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── install.md              # 安装状态栏
│   ├── theme.md                # 切换主题
│   └── uninstall.md            # 卸载状态栏
├── agents/
│   └── pulse-setup.md     # 交互式配置向导
├── skills/
│   └── pulse-config/
│       └── SKILL.md            # 配置指南技能
├── scripts/
│   ├── pulse.js           # 主脚本（编译后）
│   └── setup.sh                # 安装脚本
└── themes/
    ├── dark.toml
    ├── light.toml
    ├── cyberpunk.toml
    ├── forest.toml
    └── ocean.toml
```

**.claude-plugin/plugin.json：**

```json
{
  "name": "pulse-line",
  "version": "1.0.0",
  "description": "Customizable status bar for Claude Code with multiple themes",
  "author": "Your Name",
  "homepage": "https://github.com/yourname/pulse-line",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/pulse-line"
  },
  "keywords": ["pulse", "theme", "ui"],
  "license": "MIT",
  "commands": ["./commands"],
  "agents": ["./agents"],
  "skills": ["./skills"]
}
```

### 6.2 安装命令 `/install`（commands/install.md）

```markdown
---
name: install-pulse
description: Install or update the Claude Code pulse
---

Install the custom pulse for Claude Code.

Steps:
1. Check if Node.js is installed (run `node --version`)
2. Run `npm install -g pulse-line` or copy the script locally
3. Update `~/.claude/settings.json`:
   ```json
   {
     "pulse": {
       "type": "command",
       "command": "pulse-line",
       "refreshInterval": 5
     }
   }
   ```
4. Run `pulse-line --init` to set up themes
5. Inform the user to restart Claude Code or run `/clear`

Verify installation by checking if the status bar appears at the bottom of the terminal.
```

### 6.3 主题切换命令 `/theme`（commands/theme.md）

```markdown
---
name: pulse-theme
description: Switch the pulse theme
---

Switch the pulse theme. Available themes: dark, light, cyberpunk, forest, ocean.

Run:
```bash
# Set theme via environment variable
echo "export PULSE_THEME=cyberpunk" >> ~/.bashrc  # or ~/.zshrc
# Or save to config
echo "cyberpunk" > ~/.claude/pulse/current-theme
```

Then restart Claude Code or run `/clear` to see changes.
```

### 6.4 插件发布流程

1. **本地开发**：创建本地 marketplace
   ```bash
   mkdir -p ~/.claude/marketplaces/my-plugins
   # 创建 index.json 指向本地路径
   ```

2. **安装测试**：`/plugin marketplace add local ~/.claude/marketplaces/my-plugins`

3. **发布到 GitHub**：推送到 GitHub 仓库

4. **公开 marketplace**：
   ```bash
   /plugin marketplace add yourname/pulse-line-marketplace
   /plugin install pulse-line@yourname/pulse-line-marketplace
   ```

5. **团队部署**：添加到项目 `.claude/settings.json`
   ```json
   {
     "extraKnownMarketplaces": {
       "my-team": {
         "source": {
           "source": "github",
           "repo": "yourname/pulse-line-marketplace"
         }
       }
     },
     "plugins": {
       "my-team.pulse-line": {
         "enabled": true
       }
     }
   }
   ```

---

## 7. 性能与优化

### 7.1 性能基准

Claude Code 对状态栏脚本的要求：
- **执行时间**：必须快速，理想 <100ms
- **超时行为**：超时或被取消时静默，不显示错误
- **防抖**：300ms 窗口内多次更新只执行一次

**各操作耗时估算：**

| 操作 | 耗时 | 缓存建议 |
|------|------|----------|
| JSON 解析 | <1ms | 无需缓存 |
| 模型提取 | <1ms | 无需缓存 |
| 上下文计算 | <1ms | 无需缓存 |
| Git 分支 | 10-50ms（本地） | 缓存 5 分钟 |
| Git upstream | 100-500ms（远程） | 缓存 10 分钟 |
| 工作区解析 | <5ms | 缓存 15 分钟 |
| 文件读取（配置） | 1-5ms | 缓存 1 分钟 |
| 进度条渲染 | <1ms | 无需缓存 |

### 7.2 性能优化策略

**1. 缓存层：**

```typescript
// 仅在缓存失效时才执行 git 操作
async function getGitBranch(cwd: string): Promise<string> {
  const cached = readCache(sessionId, 'git-branch');
  if (cached) return cached;

  const branch = await execGit('branch --show-current', cwd);
  writeCache(sessionId, 'git-branch', branch, 5 * 60 * 1000);
  return branch;
}
```

**2. 并行执行：**

```typescript
// 独立数据源并行获取
const [model, context, workspace] = await Promise.all([
  extractModel(data.model),
  extractContext(data.context_window),
  extractWorkspace(data.workspace)
]);

// 可能较慢的操作串行或超时控制
const git = await Promise.race([
  extractGit(data.cwd),
  timeout(200, { branch: '?' })
]);
```

**3. 优雅超时：**

```typescript
async function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(fallback), ms);
  });
}
```

**4. 避免不必要的 I/O：**
- 配置文件只读取一次，缓存在内存
- Git 操作只在缓存失效时执行
- 大文件（如 transcript）不读取，仅使用 JSON 提供的数据

### 7.3 调试与日志

```bash
# 启用调试模式
export PULSE_DEBUG=1

# 输出到日志文件而非终端
export PULSE_LOG=~/.claude/pulse/debug.log

# 测试脚本（传入模拟 JSON）
cat ~/.claude/test-input.json | node dist/index.js
```

---

## 8. 开发路线图

### 8.1 MVP（v0.1.0）—— 最小可用版本

**目标：** 可显示基础信息，单主题，快速可用

**功能清单：**
- [ ] 模型名称显示
- [ ] 上下文使用百分比（带进度条）
- [ ] Git 分支显示
- [ ] 会话成本显示
- [ ] 会话时长显示
- [ ] 工作区路径显示
- [ ] 单一暗色主题

**技术选型：** TypeScript + Node.js

**预计工时：** 1-2 天

### 8.2 v0.2.0 —— 主题系统

**目标：** 5 种内置主题，一键切换

**功能清单：**
- [ ] 深邃黑主题
- [ ] 极简白主题
- [ ] 赛博朋克主题
- [ ] 森林绿主题
- [ ] 海洋蓝主题
- [ ] 主题配置文件（TOML/JSON）
- [ ] 主题切换命令

**预计工时：** 1 天

### 8.3 v0.3.0 —— 优化与插件化

**目标：** 缓存机制、插件结构、配置界面

**功能清单：**
- [ ] 会话级缓存系统
- [ ] 插件目录结构
- [ ] `/install` 安装命令
- [ ] `/theme` 切换命令
- [ ] `/config` 配置命令
- [ ] 跨平台测试（Windows/macOS/Linux）

**预计工时：** 2 天

### 8.4 v1.0.0 —— 正式发布

**目标：** 生产就绪，完整文档

**功能清单：**
- [ ] npm 包发布
- [ ] GitHub 仓库公开
- [ ] README 文档
- [ ] 安装指南
- [ ] 自定义主题教程
- [ ] 故障排除指南
- [ ] GitHub Actions CI/CD

**预计工时：** 1 天

### 8.5 v1.1.0+ —— 高级功能（可选）

- [ ] 速率限制显示（Pro/Max 订阅者）
- [ ] MCP 服务器状态
- [ ] Git upstream 状态
- [ ] 对话轮次统计
- [ ] 缓存命中率
- [ ] 自动主题检测
- [ ] Powerline 风格
- [ ] Nerd Font 图标支持
- [ ] 子状态栏（subagentPulseLine）

---

## 9. 完整实施指南

### 9.1 快速开始（Bash 原型验证）

如果想先快速验证概念，可以用纯 Bash + jq 实现一个原型：

```bash
#!/usr/bin/env bash
# ~/.claude/pulse.sh

# 读取 stdin JSON
INPUT=$(cat)

# 使用 jq 提取字段
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "?"')
CTX_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0')
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')
CWD=$(echo "$INPUT" | jq -r '.cwd | split("/") | last // "?"')

# Git 分支（带缓存）
CACHE_FILE="$HOME/.claude/pulse/.git-branch-cache"
if [ -f "$CACHE_FILE" ] && [ $(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null))) -lt 300 ]; then
  BRANCH=$(cat "$CACHE_FILE")
else
  BRANCH=$(git -C "$(echo "$INPUT" | jq -r '.cwd')" branch --show-current 2>/dev/null || echo "?")
  echo "$BRANCH" > "$CACHE_FILE"
fi

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[1;31m'
CYAN='\033[0;36m'
MUTED='\033[2;37m'
RESET='\033[0m'

# 上下文颜色
if [ "$CTX_PCT" -gt 80 ]; then
  CTX_COLOR=$RED
elif [ "$CTX_PCT" -gt 50 ]; then
  CTX_COLOR=$YELLOW
else
  CTX_COLOR=$GREEN
fi

# 进度条
FILLED=$((CTX_PCT / 10))
EMPTY=$((10 - FILLED))
BAR=$(printf '█%.0s' $(seq 1 $FILLED))$(printf '░%.0s' $(seq 1 $EMPTY))

# 输出
printf "${CYAN}%s${RESET} │ ${CTX_COLOR}%s %3d%%${RESET} │ ${MUTED}%s${RESET} │ ${GREEN}%s${RESET} │ ${YELLOW}$%.4f${RESET}" \
  "$MODEL" "$BAR" "$CTX_PCT" "$BRANCH" "$CWD" "$COST"
```

**配置：**

```json
{
  "pulse": {
    "type": "command",
    "command": "bash ~/.claude/pulse.sh",
    "padding": 0
  }
}
```

**chmod +x ~/.claude/pulse.sh**

### 9.2 TypeScript 项目初始化

```bash
# 创建项目
mkdir pulse-line && cd pulse-line
npm init -y

# 安装依赖
npm install -D typescript @types/node
npm install chalk boxen

# 创建 tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "bin": {
    "pulse-line": "./dist/index.js"
  }
}
EOF

# 创建 bin 入口
mkdir -p src bin
cat > bin/pulse-line.js << 'EOF'
#!/usr/bin/env node
require('../dist/index.js');
EOF
chmod +x bin/pulse-line.js

# 编译
npx tsc
```

### 9.3 本地测试流程

```bash
# 1. 准备测试 JSON
echo '{
  "model": {"id": "claude-opus-4-7", "display_name": "Opus"},
  "context_window": {"used_percentage": 32, "context_window_size": 200000, "total_input_tokens": 64000},
  "cost": {"total_cost_usd": 0.05},
  "cwd": "/Users/me/projects/my-app"
}' > /tmp/test-input.json

# 2. 运行测试
cat /tmp/test-input.json | node dist/index.js

# 3. 在 Claude Code 中测试
# 修改 ~/.claude/settings.json 指向本地脚本
# 重启 Claude Code 或运行 /clear
```

### 9.4 发布为 npm 包

```bash
# 登录 npm
npm login

# 发布
npm publish --access public

# 用户安装
npm install -g pulse-line
```

### 9.5 发布为 Plugin

```bash
# 1. 创建仓库
gh repo create pulse-line --public

# 2. 推送代码
git add . && git commit -m "feat: initial release"
git push -u origin main

# 3. 创建 marketplace 仓库（如需要）
gh repo create claude-plugins-marketplace --public

# 4. 添加 marketplace 索引
# 在 marketplace 仓库创建 index.json
```

---

## 10. 竞品深度分析

### 10.1 ccpulse（TypeScript 方案标杆）

**架构：**
- 基于 `boxen` 库渲染多行状态栏
- 30+ 可配置 widget
- Web 界面配置（`npx ccpulse`）
- 配置文件支持 JSON 和主题预设

**优点：**
- 功能最全面
- 可视化配置降低门槛
- 活跃维护

**缺点：**
- npm 包体积较大
- 配置过于复杂可能吓退新手
- 多行输出占用较多垂直空间

**可借鉴：**
- 配置驱动的架构
- 主题预设系统
- 可视化配置工具

### 10.2 CCometixLine（Rust 高性能方案）

**架构：**
- Rust 编写，预编译二进制
- TOML 主题文件
- 可禁用 Claude Code 的低上下文警告
- 交互式配置界面（`ccline -c`）

**优点：**
- 零启动延迟
- 单一二进制，无需 Node.js
- 主题文件易于编辑

**缺点：**
- 需要下载预编译二进制
- 自定义主题需要学习 TOML 格式
- 修改 Claude Code 行为（打补丁）可能有兼容性问题

**可借鉴：**
- 主题 TOML 格式设计
- 交互式配置体验

### 10.3 ohugonnot/claude-code-pulse（Bash 简洁方案）

**架构：**
- 纯 Bash + jq，无额外依赖
- 从 Anthropic 未公开 API 获取精确用量
- 多行输出：上下文行 + 速率限制行

**优点：**
- 安装简单（复制脚本即可）
- 精确的用量追踪
- Bash 用户友好

**缺点：**
- 依赖未公开 API，可能失效
- 需要 OAuth token，有安全风险
- 仅支持 Unix-like 系统

**可借鉴：**
- 多行布局方式
- 速率限制显示逻辑
- 缓存策略

---

## 11. 风险与注意事项

### 11.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Anthropic 更改 stdin JSON 格式 | 中 | 高 | 版本检测 + 优雅降级 |
| 速率限制 API 废弃 | 高 | 中 | 不依赖未公开 API |
| 状态栏脚本超时 | 中 | 中 | 所有操作设置超时，并行执行 |
| Windows 兼容性问题 | 中 | 中 | 使用 Node.js 跨平台方案 |
| Git 操作在大仓库超时 | 中 | 低 | 缓存 + 超时控制 |

### 11.2 用户体验风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 状态栏占用过多垂直空间 | 中 | 中 | 默认单行，可配置多行 |
| 主题与终端不匹配 | 高 | 低 | 提供亮色/暗色两套基础主题 |
| 配置复杂吓退用户 | 中 | 高 | 提供一键安装脚本 |
| 刷新导致输入延迟 | 低 | 高 | 防抖 + 快速执行 |

### 11.3 安全考虑

- **不存储敏感信息**：不记录或发送 API key、会话内容
- **OAuth token 处理**：如需要用量数据，明确告知用户 token 仅本地使用
- **脚本权限**：状态栏脚本只读取 Claude Code 传入的数据和本地文件

---

## 12. 总结与建议

### 12.1 推荐实施方案

**技术栈：** TypeScript + Node.js
**分发方式：** npm 包 + Claude Code Plugin
**目标用户：** 追求个性化的开发者

### 12.2 核心差异化优势

相比现有方案，建议突出以下特点：

1. **🎨 主题系统**：5 种精心设计的内置主题，一键切换
2. **⚡ 性能优先**：缓存机制确保 <100ms 渲染
3. **🔧 易安装**：`npm install -g` 一键安装，自动配置
4. **🌈 美观设计**：专业 UI 设计，不喧宾夺主
5. **🛡️ 稳定可靠**：不依赖未公开 API，优雅降级

### 12.3 下一步行动

1. **立即执行**：用 Bash 快速原型验证核心功能（30 分钟）
2. **今天完成**：TypeScript MVP 版本（1-2 天）
3. **本周完成**：主题系统 + 插件化（2-3 天）
4. **下周发布**：v1.0.0 正式版（1 天）

### 12.4 参考资源

| 资源 | 链接 |
|------|------|
| 官方状态栏文档 | https://code.claude.com/docs/en/pulse |
| 官方插件文档 | https://docs.anthropic.com/en/docs/claude-code/plugins |
| 官方 Settings 文档 | https://docs.anthropic.com/en/docs/claude-code/settings |
| ccpulse（标杆） | https://github.com/sirmalloc/ccpulse |
| CCometixLine（Rust 方案） | https://github.com/Haleclipse/CCometixLine |
| ohugonnot pulse（Bash 方案） | https://github.com/ohugonnot/claude-code-pulse |
| Claude Code GitHub | https://github.com/anthropics/claude-code |
| 状态栏对比评测（Medium） | https://medium.com/@joe.njenga/i-tested-every-claude-code-pulse-plugin |
| 完美状态栏指南 | https://www.aihero.dev/creating-the-perfect-claude-code-status-line |

---

*报告生成时间：2026-05-10*
*调研工具：Claude Code + 全网搜索*
