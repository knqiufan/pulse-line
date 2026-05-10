# Claude Code 状态栏工作机制 — 完全解析手册

> 本文档深入拆解 Claude Code 状态栏（Status Line）的内部工作原理，
> 从底层机制到数据流，逐层剖析，让读者完全理解这个机制是如何运作的。

---

## 目录

1. [什么是 Claude Code 状态栏](#1-什么是-claude-code-状态栏)
2. [状态栏的完整生命周期](#2-状态栏的完整生命周期)
3. [配置系统深度解析](#3-配置系统深度解析)
4. [数据流全链路拆解](#4-数据流全链路拆解)
5. [触发机制详解](#5-触发机制详解)
6. [stdin JSON 数据结构深度解析](#6-stdin-json-数据结构深度解析)
7. [stdout 输出规范](#7-stdout-输出规范)
8. [防抖与并发控制](#8-防抖与并发控制)
9. [与其他 Claude Code 子系统的关系](#9-与其他-claude-code-子系统的关系)
10. [环境变量与系统交互](#10-环境变量与系统交互)
11. [常见问题与限制](#11-常见问题与限制)
12. [实战：从头模拟一次状态栏更新](#12-实战从头模拟一次状态栏更新)

---

## 1. 什么是 Claude Code 状态栏

### 1.1 定义

Claude Code 状态栏（Status Line）是 Claude Code CLI 在**终端底部**持续显示的一条信息带。它不是 Claude Code 的内置 UI 组件，而是一个**可插拔的输出系统**——用户可以通过配置指定任意命令，Claude Code 会在适当时机执行该命令，并将其输出渲染到终端底部。

### 1.2 核心特征

| 特征 | 说明 |
|------|------|
| **位置** | 终端底部，独立于对话内容区域 |
| **内容** | 由用户配置的命令的 stdout 决定 |
| **更新时机** | 事件驱动（消息输出、compact、权限切换等）+ 可选的定时刷新 |
| **数据来源** | Claude Code 通过 stdin 向命令传递 JSON 格式的会话状态 |
| **渲染责任** | 命令脚本负责输出格式化的文本，Claude Code 负责渲染到终端 |
| **生命周期** | 与 Claude Code 进程绑定，退出后消失 |

### 1.3 为什么这样设计

Claude Code 采用**"命令即插件"**的设计哲学：

```
传统设计：内置状态栏组件 → 有限功能 → 需要修改 Claude Code 源码才能扩展

Claude Code 设计：
  配置一个命令 → 命令接收 JSON → 命令输出任意文本 →  Claude Code 渲染
  ↓
  用户完全控制内容 → 任意编程语言实现 → 零 Claude Code 改动
```

**优势：**
- ✅ **无限扩展**：任何能读写 stdin/stdout 的程序都能作为状态栏
- ✅ **零耦合**：Claude Code 不需要内置任何状态栏逻辑
- ✅ **易于调试**：状态栏脚本可以独立运行和测试
- ✅ **跨平台**：依赖 shell 环境，不依赖 Claude Code 内部实现

---

## 2. 状态栏的完整生命周期

### 2.1 生命周期状态图

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code 启动                          │
│                  (~/.claude/settings.json 被加载)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              检查 statusLine 配置是否存在                     │
│              { "type": "command", "command": "..." }        │
└───────────────┬─────────────┬───────────────────────────────┘
                │ 存在         │ 不存在
                ▼              ▼
         ┌──────────┐    ┌──────────┐
         │  初始化   │    │ 不使用   │
         │ 状态栏   │    │ 状态栏   │
         └────┬─────┘    └────┬─────┘
              │                │
              ▼                ▼
      ┌──────────────┐    ┌──────────┐
      │  等待触发事件 │    │ 正常对话 │
      └──────┬───────┘    └──────────┘
             │
      ┌──────┴───────────────────────────────────┐
      │           事件触发                        │
      │  • 新消息输出                              │
      │  • /compact 完成                          │
      │  • 权限模式切换                            │
      │  • Vim 模式切换                           │
      │  • refreshInterval 定时器（如配置）         │
      └──────┬───────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  防抖检查      │  ← 300ms 窗口
      │  • 有正在执行  │    • 取消旧执行
      │    的脚本？    │    • 等待新触发
      └──────┬───────┘
             │ 无正在执行
             ▼
      ┌──────────────┐
      │  执行命令      │
      │  • fork 子进程 │
      │  • 写入 stdin  │
      │   (JSON 数据) │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │  读取 stdout  │
      │  等待命令完成  │
      │  （无超时限制 │
      │   但可被取消） │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │  渲染到终端   │
      │  底部状态栏   │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │  清空缓存     │
      │  （如 refresh │
      │   Interval）  │
      └──────────────┘
             │
             ▼
        回到"等待触发事件"
```

### 2.2 关键阶段详解

#### 阶段 1：启动时配置加载

```json
// ~/.claude/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/scripts/pulse.sh",
    "padding": 2,
    "refreshInterval": 5,
    "hideVimModeIndicator": false
  }
}
```

**Claude Code 启动时：**
1. 读取 `~/.claude/settings.json`
2. 解析 `statusLine` 对象
3. 验证 `type` 必须为 `"command"`
4. 验证 `command` 为非空字符串
5. 如果配置有效，初始化状态栏系统；否则静默跳过

#### 阶段 2：事件监听

Claude Code 内部注册了多个事件监听器：

```typescript
// 伪代码 — Claude Code 内部实现
const eventSources = {
  onNewAssistantMessage: debounce(triggerStatusLine, 300),
  onCompactComplete: triggerStatusLine,
  onPermissionModeChange: triggerStatusLine,
  onVimModeToggle: triggerStatusLine,
  onRefreshInterval: setInterval(triggerStatusLine, refreshInterval * 1000),
};
```

#### 阶段 3：脚本执行

```typescript
// 伪代码 — Claude Code 内部实现
async function triggerStatusLine() {
  // 1. 如果有正在执行的脚本，取消它
  if (currentExecution) {
    currentExecution.kill();
  }

  // 2. 准备 JSON 数据
  const jsonData = buildStatusLineJSON();

  // 3. fork 子进程
  const child = spawn(command, {
    shell: true,  // 在 shell 中执行，支持 ~ 展开、管道等
    env: { ...process.env, ...extraEnv },
  });

  currentExecution = child;

  // 4. 写入 stdin
  child.stdin.write(jsonData);
  child.stdin.end();

  // 5. 等待完成
  let stdout = '';
  child.stdout.on('data', chunk => stdout += chunk);

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  // 6. 读取 stdout
  const output = stdout.trim();

  // 7. 渲染到状态栏
  renderStatusBar(output);

  currentExecution = null;
}
```

#### 阶段 4：渲染

Claude Code 获取脚本的 stdout 后：
1. 移除首尾空白字符（`trim()`）
2. 按换行符分割成多行
3. 每一行渲染为状态栏的一行
4. 应用 Claude Code 内置的样式（如光标位置、清屏等 ANSI 序列）
5. 显示在终端底部

---

## 3. 配置系统深度解析

### 3.1 配置层级与合并策略

Claude Code 使用**分层配置系统**，类似于 CSS 的层叠：

```
配置来源（优先级从高到低）：
  ① .claude/settings.local.json    → 本地私有，不提交到 git
  ② .claude/settings.json          → 项目级，可团队共享
  ③ ~/.claude/settings.json        → 用户级全局
  ④ Enterprise managed policies    → 企业策略（最高优先级）
```

**合并逻辑：**
```typescript
// 伪代码
function mergeConfigs() {
  const base = load('~/.claude/settings.json');
  const project = load('.claude/settings.json');
  const local = load('.claude/settings.local.json');

  // 深合并，低优先级被高优先级覆盖
  return deepMerge(base, project, local, enterprise);
}
```

### 3.2 statusLine 配置的完整 schema

```typescript
interface StatusLineConfig {
  type: "command";                    // 目前仅支持 "command"
  command: string;                    // shell 命令（支持 ~ 展开）
  padding?: number;                   // 额外水平间距（字符数），默认 0
  refreshInterval?: number;           // 自动刷新间隔（秒），默认 undefined（仅事件触发）
  hideVimModeIndicator?: boolean;     // 是否隐藏内置 vim 指示器，默认 false
}
```

**字段说明：**

#### `command` — 命令执行环境

```bash
# 简单脚本路径
"command": "~/.claude/pulse.sh"

# 带参数的命令
"command": "bash ~/.claude/pulse.sh --theme dark"

# 管道命令
"command": "cat ~/.claude/input.json | node ~/.claude/statusline.js"

# 使用 npx 直接运行（无需全局安装）
"command": "npx claude-statusline-skill"

# 复杂 shell 逻辑
"command": "bash -c 'source ~/.bashrc && ~/.claude/pulse.sh'"
```

**关键点：**
- `command` 在 shell 中执行（通常是 `$SHELL -c "command"`）
- 支持 shell 的所有特性：变量展开、管道、重定向、条件判断等
- `~` 会被展开为 `$HOME`
- Windows 上，如果 `command` 以 `.bat`、`.cmd`、`.ps1` 结尾，会使用对应的解释器

#### `padding` — 水平间距

```json
{ "padding": 0 }   // 无额外间距（紧凑）
{ "padding": 2 }   // 左右各 2 个空格
{ "padding": 5 }   // 左右各 5 个空格
```

效果：
```
padding: 0    🧠 Opus │ ████░░░░ 65% │ 🌿 main
padding: 2      🧠 Opus │ ████░░░░ 65% │ 🌿 main
padding: 5          🧠 Opus │ ████░░░░ 65% │ 🌿 main
```

#### `refreshInterval` — 定时刷新

```json
{ "refreshInterval": 1 }   // 每秒刷新（适合显示实时数据）
{ "refreshInterval": 5 }   // 每 5 秒刷新（默认推荐）
{ "refreshInterval": 30 }  // 每 30 秒刷新（适合不常变的数据）
```

**工作原理：**
- 设置后，Claude Code 会启动一个额外的定时器
- 定时器触发时也会执行 `command`，与事件触发共用同一套逻辑
- 与事件触发共享防抖机制（300ms）

**使用场景：**
- 显示会话倒计时（如速率限制重置时间）
- 实时 Git 状态监控
- 外部 API 数据拉取

**不推荐：**
- `refreshInterval: 1` 会每秒执行脚本，可能影响性能
- 最小值为 1 秒

#### `hideVimModeIndicator`

```json
{ "hideVimModeIndicator": false }  // 显示 Claude Code 内置的 -- INSERT -- 等
{ "hideVimModeIndicator": true }   // 隐藏，由状态栏脚本自己处理
```

**默认行为：**
当 Vim 模式启用时，Claude Code 会在状态栏右侧显示 `-- NORMAL --` 或 `-- INSERT --`。

如果状态栏脚本自己处理 Vim 模式显示，设置此选项避免重复。

### 3.3 配置优先级示例

假设有以下配置：

**~/.claude/settings.json（用户级）：**
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/pulse.sh",
    "padding": 2
  }
}
```

**项目目录/.claude/settings.json（项目级）：**
```json
{
  "statusLine": {
    "command": "~/.claude/project-pulse.sh",
    "refreshInterval": 5
  }
}
```

**实际生效配置：**
```json
{
  "type": "command",          // 来自用户级（项目级未覆盖）
  "command": "~/.claude/project-pulse.sh",  // 来自项目级（覆盖）
  "padding": 2,               // 来自用户级（项目级未覆盖）
  "refreshInterval": 5        // 来自项目级（新增）
}
```

---

## 4. 数据流全链路拆解

### 4.1 从 Claude Code 内部状态到 JSON

Claude Code 维护着会话的完整状态。当状态栏需要更新时，以下过程发生：

```
┌──────────────────────────────────────────────────────────┐
│              Claude Code 内部状态对象                      │
│                                                          │
│  session = {                                              │
│    id: "abc123...",                                       │
│    name: "my-feature",                                    │
│    startTime: Date,                                       │
│    cwd: "/Users/me/projects/my-app",                     │
│    model: { id: "claude-opus-4-7", display_name: "Opus" },│
│    cost: { total_cost_usd: 0.05, ... },                  │
│    contextWindow: { used: 65000, total: 200000, ... },   │
│    gitBranch: "main",                                     │
│    ...                                                    │
│  }                                                        │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ buildStatusLineJSON()
                        ▼
┌──────────────────────────────────────────────────────────┐
│              序列化为 JSON 字符串                          │
│                                                          │
│  {                                                        │
│    "session_id": "abc123...",                            │
│    "model": { "id": "claude-opus-4-7", "display_name": "Opus" },│
│    "context_window": { "used_percentage": 32.5, ... },  │
│    "cost": { "total_cost_usd": 0.05, ... },             │
│    "cwd": "/Users/me/projects/my-app",                  │
│    ...                                                    │
│  }                                                        │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ JSON.stringify(data)
                        │ (格式化，通常不带空格以减小体积)
                        ▼
┌──────────────────────────────────────────────────────────┐
│              JSON 字符串（~1-3KB）                         │
│                                                          │
│  '{"session_id":"abc123...","model":{"id":"claude-opus...'│
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ child.stdin.write(jsonString)
                        │ child.stdin.end()
                        ▼
┌──────────────────────────────────────────────────────────┐
│              子进程 stdin 接收 JSON                        │
│                                                          │
│  #!/usr/bin/env bash                                     │
│  # ~/.claude/pulse.sh                              │
│  INPUT=$(cat)  # 读取 stdin                              │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│              脚本处理并输出到 stdout                       │
│                                                          │
│  MODEL=$(echo "$INPUT" | jq -r '.model.display_name')   │
│  CTX=$(echo "$INPUT" | jq -r '.context_window...')      │
│  echo "🧠 $MODEL │ ████░░░░ $CTX%"                      │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ stdout
                        ▼
┌──────────────────────────────────────────────────────────┐
│              Claude Code 读取 stdout                      │
│                                                          │
│  let output = "";                                        │
│  child.stdout.on("data", chunk => output += chunk);     │
│  child.on("close", () => {                               │
│    output = output.trim();                               │
│    renderStatusBar(output);  // 渲染                      │
│  });                                                     │
└──────────────────────────────────────────────────────────┘
```

### 4.2 JSON 数据的生成时机

状态栏 JSON **不是**每次渲染时实时构建的，而是在**特定事件触发时**构建：

| 事件 | JSON 数据是... |
|------|----------------|
| 新 assistant 消息输出后 | 实时构建（最新的会话状态） |
| `/compact` 完成后 | 实时构建（compact 后的新状态） |
| 权限模式切换 | 实时构建 |
| Vim 模式切换 | 实时构建 |
| `refreshInterval` 定时器 | 实时构建 |

**注意：** `refreshInterval` 与事件触发使用**同一套数据构建逻辑**，不存在"缓存 JSON"的情况。每次触发都是实时数据。

---

## 5. 触发机制详解

### 5.1 事件触发源

Claude Code 内部以下事件会触发状态栏更新：

#### 事件 1：新消息输出

```typescript
// 伪代码
async function onAssistantMessage(message) {
  // 1. 流式输出消息到终端
  await streamMessage(message);

  // 2. 消息输出完成后，触发状态栏更新
  // （不是在流式输出过程中）
  triggerStatusLine();
}
```

**为什么不在流式输出过程中更新？**
- 流式输出是逐 token 进行的，可能持续数秒
- 状态栏更新需要执行外部命令，不应该阻塞或干扰输出
- 等消息完整输出后再更新，确保数据完整

#### 事件 2：/compact 完成

```typescript
async function onCompact() {
  // 1. 压缩会话历史
  const summary = await compactSession();

  // 2. 重新计算上下文使用情况
  recalculateContextWindow();

  // 3. 触发状态栏更新（上下文百分比可能变化很大）
  triggerStatusLine();
}
```

**注意：** `/compact` 后 `context_window.current_usage` 会暂时为 `null`，直到下一次 API 调用。

#### 事件 3：权限模式切换

```typescript
function onPermissionModeChange(newMode) {
  // 1. 更新内部状态
  this.permissionMode = newMode;

  // 2. 触发状态栏更新
  triggerStatusLine();
}
```

**可用的权限模式值：**
- `"default"` — 默认权限
- `"plan"` — 仅计划模式
- `"acceptEdits"` — 接受所有编辑
- `"bypassPermissions"` — 绕过权限（危险）
- `"dontAsk"` — 不询问

#### 事件 4：Vim 模式切换

```typescript
function onVimModeToggle(isVimMode) {
  this.vimMode = isVimMode;
  triggerStatusLine();
}
```

当 Vim 模式启用时，`vim` 字段会出现在 JSON 中：
```json
{ "vim": { "mode": "NORMAL" } }
```

模式值：
- `"NORMAL"` — 普通模式
- `"INSERT"` — 插入模式
- `"VISUAL"` — 可视模式
- `"REPLACE"` — 替换模式

#### 事件 5：refreshInterval 定时器

```typescript
if (config.refreshInterval) {
  setInterval(() => {
    triggerStatusLine();
  }, config.refreshInterval * 1000);
}
```

**注意：** 这个定时器与事件触发**共享同一套防抖机制**。

### 5.2 不触发状态栏更新的操作

以下操作**不会**触发状态栏更新：

| 操作 | 原因 |
|------|------|
| 用户输入消息（prompt 发送前） | 状态栏显示的是**上一个**消息后的状态 |
| 工具执行（Bash、Read、Edit 等） | 工具执行是异步的，执行结果在消息中体现 |
| 子代理（Subagent）运行 | 有独立的 `subagentStatusLine` 系统 |
| 错误/警告 | 通过终端输出显示，不在状态栏 |
| 会话开始（首次） | 首次消息输出后才触发 |

---

## 6. stdin JSON 数据结构深度解析

### 6.1 完整字段说明

以下是 Claude Code 通过 stdin 传递的完整 JSON 结构，附带每个字段的**精确含义、计算方式、和更新时机**。

```json
{
  // ========== 基础信息 ==========
  "cwd": "/Users/me/projects/my-app",
  // ↑ 当前工作目录
  // 来源: process.cwd()
  // 更新时机: 每次触发状态栏时实时获取
  // 注意: 与 workspace.project_dir 可能不同（多目录工作区时）

  "session_id": "abc123def456...",
  // ↑ 当前会话的唯一标识符
  // 来源: 会话启动时生成的 UUID
  // 格式: 32 字符十六进制字符串
  // 不变性: 整个会话期间不变，即使执行 /compact

  "session_name": "my-feature",
  // ↑ 会话名称（可选）
  // 来源: --name 命令行参数 或 /rename 命令设置
  // 不设置时: 此字段不存在（不是 null，是字段缺失）
  // 用途: 多会话时区分

  "transcript_path": "/Users/me/.claude/sessions/abc123.jsonl",
  // ↑ 对话记录文件的完整路径
  // 格式: JSONL（每行一条 JSON 记录）
  // 用途: 可自行解析获取轮次、工具调用等详细信息
  // ⚠️ 注意: 只读路径，不能修改

  // ========== 模型信息 ==========
  "model": {
    "id": "claude-opus-4-7",
    // ↑ 模型的完整 API ID
    // 格式: claude-{family}-{version}[-{variant}]
    // 示例:
    //   claude-opus-4-7          (Opus 最新)
    //   claude-sonnet-4-6        (Sonnet 最新)
    //   claude-haiku-4-5-20251001 (Haiku 指定版本)
    //   claude-3-5-sonnet-latest (3.5 时代)

    "display_name": "Opus"
    // ↑ 简化的显示名称
    // 用途: 状态栏显示（比完整 ID 更易读）
  },

  // ========== 工作区信息 ==========
  "workspace": {
    "current_dir": "/Users/me/projects/my-app/src",
    // ↑ 当前所在的子目录（如使用 /add-dir 添加）
    // 默认: 等于 cwd

    "project_dir": "/Users/me/projects/my-app",
    // ↑ 工作区的根目录
    // 使用 /add-dir 添加多个目录时，project_dir 不变

    "added_dirs": ["/Users/me/projects/other-project"],
    // ↑ 通过 /add-dir 额外添加的目录列表
    // 空数组: 没有额外添加
    // 用途: 跨项目工作时显示

    "git_worktree": "feature-xyz"
    // ↑ Git worktree 名称（可选）
    // 条件: 仅在使用 git worktree 时存在
    // 示例: git worktree add ../feature-x feature-x
  },

  // ========== 版本信息 ==========
  "version": "2.1.126.507",
  // ↑ Claude Code 的版本号
  // 格式: {major}.{minor}.{patch}.{build}
  // 用途: 兼容性检查（JSON 格式可能随版本变化）

  // ========== 输出风格 ==========
  "output_style": { "name": "default" },
  // ↑ 当前的输出风格
  // 可选值:
  //   "default"       — 默认输出
  //   "long"          — 长输出（用于需要详细输出的场景）
  //   "teaching"      — 教学风格（逐步骤解释）
  //   "explain"       — 解释风格
  //   "concise"       — 简洁风格

  // ========== 成本信息 ==========
  "cost": {
    "total_cost_usd": 0.05234,
    // ↑ 当前会话的总成本（美元）
    // 计算: 所有 API 调用的 token 费用总和
    // 精度: 通常 4-5 位小数

    "total_duration_ms": 125000,
    // ↑ 会话总时长（毫秒）
    // 从会话开始到现在的总时间

    "total_api_duration_ms": 8500,
    // ↑ API 调用总耗时（毫秒）
    // 仅统计实际 API 请求时间，不含等待、重试等

    "total_lines_added": 234,
    // ↑ 通过 Edit 工具添加的总行数

    "total_lines_removed": 56
    // ↑ 通过 Edit 工具删除的总行数
  },

  // ========== 上下文窗口 ==========
  "context_window": {
    "total_input_tokens": 82500,
    // ↑ 输入 token 总数（不含缓存读取）
    // 包含: 当前消息 + 历史消息 + 系统提示

    "total_output_tokens": 4200,
    // ↑ 输出 token 总数（assistant 生成的所有 token）

    "context_window_size": 200000,
    // ↑ 上下文窗口总大小（token 数）
    // 不同模型不同:
    //   Opus/Sonnet: 200000
    //   某些扩展上下文模型: 1000000

    "used_percentage": 41.3,
    // ↑ 使用百分比
    // 计算: (total_input_tokens + total_output_tokens) / context_window_size * 100
    // 精确到小数点后一位

    "remaining_percentage": 58.7,
    // ↑ 剩余百分比
    // = 100 - used_percentage

    "current_usage": {
      "input_tokens": 32000,
      // ↑ 当前请求的输入 token 数
      // 注意: 这是"当前"而非"累计"！

      "output_tokens": 2100,
      // ↑ 当前请求的输出 token 数

      "cache_creation_input_tokens": 15000,
      // ↑ 本次请求新创建的缓存 token 数
      // 当历史内容首次被缓存时计入

      "cache_read_input_tokens": 35500
      // ↑ 本次请求从缓存读取的 token 数
      // 比直接输入便宜 10 倍
    }
  },
  // ↑ current_usage 特殊说明:
  //   • 首次 API 调用前: 整个字段为 null
  //   • /compact 后到下次 API 调用前: 为 null
  //   • 正常对话中: 包含当前请求的数据

  "exceeds_200k_tokens": false,
  // ↑ 是否超过 200K token 警告阈值
  // true 时 Claude Code 会发出警告

  // ========== 推理配置 ==========
  "effort": { "level": "high" },
  // ↑ 推理强度级别（可选）
  // 条件: 仅模型支持 reasoning effort 时存在
  // 可选值: "low", "medium", "high", "xhigh", "max"
  // 默认: Opus 为 "high"，Sonnet/Haiku 通常不显示

  "thinking": { "enabled": true },
  // ↑ 思考模式开关（可选）
  // 条件: 当前会话启用了扩展思考
  // 用途: 显示是否在深度思考

  // ========== 速率限制 ==========
  "rate_limits": {
    "five_hour": {
      "used_percentage": 35.2,
      // ↑ 5 小时窗口已使用百分比
      // 条件: 仅 Claude.ai Pro/Max 订阅者
      // 触发: 首次 API 响应后开始出现

      "resets_at": 1738521600
      // ↑ 重置时间戳（Unix epoch，秒）
      // 格式: 转换为日期后就是配额重置时间
    },
    "seven_day": {
      "used_percentage": 62.8,
      "resets_at": 1738857600
    }
  },
  // ↑ rate_limits 特殊说明:
  //   • 免费用户: 字段不存在（不是 null）
  //   • Pro/Max: 首次 API 响应后出现
  //   • 每个窗口可能独立存在或不存在
  //   • 使用前务必用 .five_hour 可选链访问

  // ========== Vim 模式 ==========
  "vim": { "mode": "NORMAL" },
  // ↑ Vim 模式状态（可选）
  // 条件: 仅用户启用了 vim 模式时存在
  // 模式值: NORMAL, INSERT, VISUAL, REPLACE

  // ========== 代理信息 ==========
  "agent": { "name": "security-reviewer" },
  // ↑ 当前运行的子代理名称（可选）
  // 条件: 仅使用 --agent 标志时存在

  // ========== Worktree 信息 ==========
  "worktree": {
    "name": "feature-login",
    // ↑ Worktree 名称

    "path": "/Users/me/projects/my-app-worktrees/feature-login",
    // ↑ Worktree 目录完整路径

    "branch": "feature-login",
    // ↑ Worktree 对应的 Git 分支名

    "original_cwd": "/Users/me/projects/my-app",
    // ↑ 原始工作区路径

    "original_branch": "main"
    // ↑ 原始分支名
  }
}
```

### 6.2 数据计算关系图

```
┌─────────────────────────────────────────────────────────┐
│              上下文窗口使用计算                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  context_window.total_input_tokens                      │
│    = current_usage.input_tokens                         │
│    + current_usage.cache_read_input_tokens              │
│    + current_usage.cache_creation_input_tokens          │
│    + 未缓存的历史消息 token 数                           │
│                                                         │
│  context_window.used_percentage                         │
│    = (total_input_tokens + total_output_tokens)         │
│    / context_window_size * 100                          │
│                                                         │
│  缓存命中率 (可自行计算)                                  │
│    = cache_read_input_tokens / total_input_tokens * 100 │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              成本计算                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Claude Code 根据模型和 token 类型计算:                  │
│                                                         │
│  输入 token (非缓存):  $3 / 1M tokens (Opus 示例)       │
│  输入 token (缓存读):  $0.30 / 1M tokens               │
│  输入 token (缓存写):  $3.75 / 1M tokens               │
│  输出 token:          $15 / 1M tokens                   │
│                                                         │
│  total_cost_usd = Σ(各次调用的 token 费用)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 字段可用性速查表

| 字段路径 | 免费用户 | Pro/Max 用户 | 首次 API 前 | Vim 模式 | Worktree 模式 |
|----------|----------|--------------|-------------|----------|---------------|
| `session_name` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `effort` | ✅（无） | ✅ | ✅ | ✅ | ✅ |
| `rate_limits.*` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `context_window.current_usage` | null | null | null | ✅ | ✅ |
| `vim` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `agent` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `worktree` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `workspace.git_worktree` | ❌ | ❌ | ❌ | ❌ | ✅ |

> ✅ = 始终存在   ❌ = 始终不存在   ⚠️ = 条件性存在

---

## 7. stdout 输出规范

### 7.1 输出格式要求

脚本通过 **stdout** 输出，Claude Code 按以下规则处理：

```typescript
// Claude Code 内部处理逻辑
function renderStatusBar(stdout) {
  // 1. trim() 移除首尾空白
  const trimmed = stdout.trim();

  // 2. 按换行符分割
  const lines = trimmed.split('\n');

  // 3. 渲染每一行
  for (const line of lines) {
    renderLine(line);  // 直接输出，不做额外转义
  }
}
```

### 7.2 输出示例

**单行输出：**
```
🧠 Opus │ ████████░░░░░░░░░░ 65% │ 🌿 main │ 💰 $0.052
```

**多行输出：**
```
🧠 Opus │ ████████░░░░░░░░░░ 65% │ 🌿 main │ 💰 $0.052
📦 78% │ ⏱️ 2h 34m │ ⚡5h: ████░░ 45% [1h 23m]
```

### 7.3 ANSI 转义码支持

Claude Code 支持标准 ANSI 转义序列：

```bash
# 颜色
\033[0;30m  # 黑色
\033[0;31m  # 红色
\033[0;32m  # 绿色
\033[0;33m  # 黄色
\033[0;34m  # 蓝色
\033[0;35m  # 洋红
\033[0;36m  # 青色
\033[0;37m  # 白色

# 样式
\033[1m     # 粗体
\033[2m     # 弱化/暗色
\033[4m     # 下划线
\033[7m     # 反色

# 重置
\033[0m     # 重置所有样式

# 示例输出
echo -e "\033[1;32m✓\033[0m \033[36mSuccess\033[0m"
# 输出: ✓ Success（✓ 为绿色粗体，Success 为青色）
```

**Unicode 块字符：**

```bash
# 进度条字符（注意：这些是多字节 UTF-8 字符）
█  U+2588  全块
▓  U+2593  暗块
▒  U+2592  半暗块
░  U+2591  亮块
▏  U+258F  左八分之一块
▎  U+258E  左四分之一块
▍  U+258D  左八分之三块
▌  U+258C  左半块
▋  U+258B  左八分之五块
▊  U+258A  左八分之六块
▉  U+2589  左八分之七块
```

### 7.4 OSC 8 超链接（可选）

某些终端支持 OSC 8 超链接：

```bash
# 格式: \033]8;;URL\033\\文本\033]8;;\033\\
echo -e "\033]8;;https://github.com\033\\GitHub\033]8;;\033\\"
```

**支持的终端：**
- ✅ iTerm2
- ✅ Kitty
- ✅ WezTerm
- ✅ Windows Terminal
- ❌ macOS Terminal.app
- ❌ VS Code 终端

**环境变量覆盖：**
```bash
# 强制启用超链接（即使终端不支持）
export FORCE_HYPERLINK=1
```

### 7.5 输出限制

| 限制 | 值 | 说明 |
|------|-----|------|
| 最大行数 | 无硬限制 | 但终端高度有限，过多行会滚出可见区域 |
| 每行最大字符数 | 无硬限制 | 超出终端宽度会自动换行或截断 |
| 输出延迟 | 无硬限制 | 但建议 <100ms，否则 Claude Code 会取消执行 |
| 二进制输出 | ❌ | 必须是文本 |

---

## 8. 防抖与并发控制

### 8.1 300ms 防抖机制

```
时间线:

T=0ms:   用户发送消息
T=100ms: Claude 开始输出回复（触发状态栏更新 #1）
T=150ms: Claude 继续输出（触发状态栏更新 #2）← 被防抖捕获
T=200ms: Claude 继续输出（触发状态栏更新 #3）← 被防抖捕获
T=300ms: Claude 输出完成
         ↓
T=400ms: 防抖窗口结束，执行脚本（合并了 #1#2#3 的意图）

如果 T=350ms 时用户执行 /compact:
T=350ms: 新触发到来，取消正在执行的脚本
T=650ms: 防抖窗口结束，执行新脚本（基于 /compact 后的状态）
```

**伪代码实现：**

```typescript
let debounceTimer: NodeJS.Timeout | null = null;
let currentExecution: ChildProcess | null = null;

function triggerStatusLine(data) {
  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // 取消正在执行的脚本
  if (currentExecution) {
    currentExecution.kill('SIGTERM');
    currentExecution = null;
  }

  // 设置新的防抖定时器
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    executeStatusLineCommand(data);
  }, 300);
}
```

### 8.2 并发控制

Claude Code 保证**同时最多只有一个状态栏脚本在运行**：

```
正在运行: script.sh (PID 1234)
    ↓
新触发: 取消 script.sh (PID 1234)
    ↓
正在运行: (无)
    ↓
新触发: 启动 script.sh (PID 1235)
```

**为什么需要这个机制？**
- 防止多个脚本同时输出导致状态栏闪烁
- 防止旧的（过时的）状态覆盖新的状态
- 节省系统资源（不必要的同时执行）

### 8.3 脚本取消信号

当脚本被取消时，Claude Code 发送 `SIGTERM` 信号：

```typescript
currentExecution.kill('SIGTERM');
```

**脚本应该正确处理 SIGTERM：**

```bash
#!/usr/bin/env bash
# ~/.claude/pulse.sh

# 注册信号处理
trap 'exit 0' SIGTERM

# 读取输入
INPUT=$(cat)

# 处理...
# 如果在此过程中收到 SIGTERM，会立即退出（exit 0）

# 输出结果
echo "result"
```

**关键点：**
- 收到 SIGTERM 应该**静默退出**，不输出任何内容
- 不要输出到 stderr（会被 Claude Code 记录）
- 退出码应为 0（表示正常取消）

---

## 9. 与其他 Claude Code 子系统的关系

### 9.1 状态栏 vs Subagent 状态栏

Claude Code 有两个独立的状态栏系统：

```
┌─────────────────────────────────────────────────────────┐
│                      Claude Code 终端                     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │              对话内容区域                            │ │
│  │                                                   │ │
│  │  用户: 帮我分析这个代码...                          │ │
│  │                                                   │ │
│  │  助手: [运行子代理...]                             │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │  Subagent 面板                                │  │ │
│  │  │  ┌─────────────────────────────────────────┐│  │ │
│  │  │  │ security-reviewer  ████████░░  80%     ││  │ │
│  │  │  │ code-analyzer     ██████░░░░  60%     ││  │ │
│  │  │  └─────────────────────────────────────────┘│  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ═══════════════════════════════════════════════════   │  ← 主状态栏
│  🧠 Opus │ ████░░░░ 32% │ 🌿 main │ 💰 $0.05          │
│  ═══════════════════════════════════════════════════   │
└─────────────────────────────────────────────────────────┘
```

**主状态栏（Status Line）：**
- 配置：`settings.json` → `statusLine`
- 触发：消息输出、compact、权限切换等
- 数据：会话级状态
- stdin JSON：完整会话数据

**Subagent 状态栏（Subagent Status Line）：**
- 配置：`settings.json` → `subagentStatusLine`
- 触发：Subagent 面板更新时
- 数据：任务列表状态
- stdin JSON：`{ columns: [...], tasks: [...] }` 格式不同

### 9.2 状态栏 vs Hooks

| | 状态栏 | Hooks |
|--|--------|-------|
| **目的** | 显示信息 | 拦截/增强工具执行 |
| **触发** | 事件驱动 | 工具调用前后、会话生命周期 |
| **数据输入** | stdin JSON | stdin JSON（结构不同） |
| **数据输出** | stdout（文本） | stdout（JSON/exit code）|
| **可视化** | ✅ 渲染到终端 | ❌ 不渲染（仅日志/通知）|
| **可以修改** | ❌ 只读 Claude Code 状态 | ✅ 可以拦截工具调用 |

**关键区别：Hooks 不能修改状态栏。**

虽然 Hooks 可以在 `SessionStart` 时注入 `additionalContext`，但这不会影响状态栏显示。状态栏和 Hooks 是两个完全独立的系统。

### 9.3 状态栏 vs 技能（Skills）

| | 状态栏 | 技能（Skills）|
|--|--------|--------------|
| **类型** | 配置项 | SKILL.md 文件 |
| **生效方式** | 通过 settings.json 配置 | Claude 模型自动发现 |
| **功能** | 显示信息 | 指导 Claude 如何完成任务 |
| **可以修改 UI** | ✅ | ❌ |
| **生命周期** | Claude Code 进程内 | 模型推理时 |

**技能可以间接影响状态栏：**
- 技能可以指导 Claude 生成状态栏脚本
- 技能可以建议用户配置 statusLine
- 但技能本身不能修改状态栏显示

---

## 10. 环境变量与系统交互

### 10.1 可用环境变量

Claude Code 在执行状态栏命令时，传递以下环境变量：

```bash
# 从 Claude Code 进程继承的标准环境变量:
PATH, HOME, USER, SHELL, TERM, ...

# Claude Code 特定变量:
CLAUDE_CODE_VERSION=2.1.126.507
CLAUDE_SESSION_ID=abc123...
CLAUDE_PROJECT_DIR=/Users/me/projects/my-app

# 状态栏特定变量（如设置）:
PULSE_THEME=dark        # 如果用户设置了
PULSE_DEBUG=1           # 如果用户开启了调试
FORCE_HYPERLINK=1            # 如设置了
```

### 10.2 工作目录（CWD）

```typescript
// 状态栏命令的 CWD 是什么？
// 答案: 就是 Claude Code 的 CWD（用户启动 Claude Code 时的目录）
```

```bash
# 如果用户在 /Users/me/projects/my-app 启动 Claude Code:
pwd  # → /Users/me/projects/my-app

# 如果通过 cd 切换后 Claude Code 会话仍在:
# 注意: Claude Code 的 CWD 不会自动更新！
# 需要用户重新启动 Claude Code 或执行特殊命令
```

**重要提示：** 状态栏脚本收到的 `cwd` 字段 JSON 数据中的 `cwd` 才是当前工作目录，而非脚本执行时的 CWD。

### 10.3 文件系统交互

状态栏脚本可以读写文件：

```bash
# ✅ 允许的操作
cat ~/.claude/settings.json          # 读取 Claude Code 配置
echo "cyberpunk" > ~/.claude/theme    # 写入状态栏配置
mkdir -p ~/.claude/pulse/cache   # 创建缓存目录

# ❌ 不建议的操作
rm -rf ~/.claude/settings.json        # 破坏 Claude Code 配置
chmod 777 ~/.claude/.credentials.json # 修改敏感文件权限
```

---

## 11. 常见问题与限制

### 11.1 限制清单

| 限制 | 原因 | 绕开方案 |
|------|------|----------|
| **仅 CLI 模式支持** | VS Code 集成未实现 | 等待官方支持（GitHub #30202） |
| **无官方 SDK** | 纯 stdin/stdout 方案 | 使用第三方库包装（如 ccstatusline） |
| **无法检测 Claude Code 主题** | 无 API 暴露 | 检测终端背景色（不可靠） |
| **无超时机制** | Claude Code 不强制超时 | 脚本内部自行实现超时 |
| **无法修改 Claude Code 行为** | 单向数据流 | 使用 Hooks 系统 |
| **Windows 兼容性** | 路径和 shell 差异 | 使用 Node.js 跨平台方案 |

### 11.2 常见问题 FAQ

**Q: 状态栏不显示？**

排查步骤：
1. 检查 `~/.claude/settings.json` 的 `statusLine` 配置是否正确
2. 检查脚本是否有执行权限：`chmod +x ~/.claude/pulse.sh`
3. 检查脚本能否独立运行：`echo '{}' \| bash ~/.claude/pulse.sh`
4. 检查 Claude Code 是否在 CLI 模式（VS Code 不支持）
5. 重启 Claude Code 或执行 `/clear`

**Q: 状态栏显示乱码？**

可能原因：
- 终端字体不支持某些 Unicode 字符
- 终端编码不是 UTF-8

解决方案：
```bash
# 确保 UTF-8 编码
export LANG=en_US.UTF-8
# 或使用纯 ASCII 替代图标
```

**Q: Git 分支显示 `?` 或不显示？**

可能原因：
- 不在 Git 仓库中
- Git 命令超时（大仓库）
- 缓存过期

解决方案：
- 使用缓存避免重复 git 操作
- 设置合理的超时时间（200ms）

**Q: 如何调试状态栏脚本？**

```bash
# 方法 1: 在脚本开头添加日志
echo "DEBUG: input=$INPUT" >&2  # 输出到 stderr

# 方法 2: 使用环境变量开关
export PULSE_DEBUG=1

# 方法 3: 独立测试
echo '{"model":...}' | node dist/index.js
```

**Q: 可以在脚本中调用 Claude Code 命令吗？**

技术上可以（如 `/compact`），但**强烈不推荐**：
- 会导致无限递归（状态栏触发 → 执行命令 → 再次触发状态栏）
- 消耗 API 配额

---

## 12. 实战：从头模拟一次状态栏更新

让我们完整跟踪一次状态栏更新过程：

### 场景

用户发送消息："帮我分析这个 bug"

### Step 1: Claude Code 内部

```typescript
// Claude Code 内部状态
{
  cwd: "/Users/alice/dev/myapp",
  session_id: "sess_abc123",
  model: { id: "claude-opus-4-7", display_name: "Opus" },
  context_window: {
    used_percentage: 35.2,
    total_input_tokens: 70400,
    total_output_tokens: 0,
    context_window_size: 200000
  },
  cost: { total_cost_usd: 0.0123 },
  // ... 其他字段
}
```

### Step 2: 事件触发

用户消息被发送到 API，Claude Code 开始流式输出回复。

```typescript
// 消息输出完成后
function onMessageComplete() {
  triggerStatusLine();  // ← 触发
}
```

### Step 3: 防抖检查

```
T=0ms:   triggerStatusLine() 被调用
T=0ms:   检查: 有正在执行的脚本吗？ → 没有
T=0ms:   设置 debounceTimer = setTimeout(..., 300)

T=50ms:  用户又发了一条消息（极快）
T=50ms:  触发 triggerStatusLine()
T=50ms:  清除上一个 debounceTimer
T=50ms:  设置新的 debounceTimer = setTimeout(..., 300)

T=300ms: debounceTimer 触发
         ↓
         检查: 有正在执行的脚本吗？ → 没有
         ↓
         执行脚本！
```

### Step 4: 构建 JSON

```typescript
const json = JSON.stringify({
  cwd: "/Users/alice/dev/myapp",
  session_id: "sess_abc123",
  model: { id: "claude-opus-4-7", display_name: "Opus" },
  context_window: {
    used_percentage: 35.2,
    total_input_tokens: 70400,
    total_output_tokens: 0,
    context_window_size: 200000,
    current_usage: {
      input_tokens: 45000,
      output_tokens: 0,
      cache_creation_input_tokens: 12000,
      cache_read_input_tokens: 33000
    }
  },
  cost: { total_cost_usd: 0.0123 },
  workspace: {
    current_dir: "/Users/alice/dev/myapp",
    project_dir: "/Users/alice/dev/myapp",
    added_dirs: []
  },
  // ... 其他字段
}, null, 0);  // 紧凑格式，无空格
```

JSON 长度约 800 字符。

### Step 5: 执行脚本

```typescript
const child = spawn('bash ~/.claude/pulse.sh', {
  shell: true,
  cwd: "/Users/alice/dev/myapp",  // Claude Code 的 CWD
  env: process.env
});

currentExecution = child;
child.stdin.write(json);
child.stdin.end();
```

### Step 6: 脚本处理

```bash
#!/usr/bin/env bash
# ~/.claude/pulse.sh

INPUT=$(cat)  # 从 stdin 读取 JSON

# 用 jq 提取数据
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "?"')
CTX=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0')
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')

# 获取 Git 分支（带缓存）
CACHE="$HOME/.claude/pulse/cache/git-branch"
if [ -f "$CACHE" ] && [ $(($(date +%s) - $(stat -f %m "$CACHE"))) -lt 300 ]; then
  BRANCH=$(cat "$CACHE")
else
  BRANCH=$(git branch --show-current 2>/dev/null || echo "?")
  echo "$BRANCH" > "$CACHE"
fi

# 渲染输出（带 ANSI 颜色）
echo -e "\033[1;34m🧠 $MODEL\033[0m │ \033[0;32m███████░░░ $CTX%\033[0m │ \033[0;36m🌿 $BRANCH\033[0m │ \033[0;33m💰 \$$COST\033[0m"
```

### Step 7: 脚本输出

stdout 内容：
```
[1;34m🧠 Opus[0m │ [0;32m███████░░░ 35.2%[0m │ [0;36m🌿 main[0m │ [0;33m💰 $0.0123[0m
```

### Step 8: Claude Code 渲染

```typescript
child.stdout.on('data', chunk => {
  output += chunk.toString();
});

child.on('close', () => {
  const rendered = output.trim();
  // rendered = 上面的 ANSI 字符串

  // 写入终端状态栏区域
  writeToStatusBarArea(rendered);

  currentExecution = null;
});
```

### Step 9: 终端显示

```
════════════════════════════════════════════════════════════
  🧠 Opus │ ███████░░░ 35.2% │ 🌿 main │ 💰 $0.0123
════════════════════════════════════════════════════════════
```

（实际渲染由终端完成，ANSI 转义码被转换为颜色）

### Step 10: 完成

从用户发送消息到状态栏更新，总耗时约 300ms（防抖）+ 脚本执行时间。

如果脚本执行 < 50ms，用户感知的延迟约 350ms。

---

## 附录：快速参考卡

### A. 配置速查

```json
{
  "statusLine": {
    "type": "command",
    "command": "your-command-here",
    "padding": 0,
    "refreshInterval": null,
    "hideVimModeIndicator": false
  }
}
```

### B. stdin JSON 最小示例

```json
{
  "cwd": "/path/to/cwd",
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": { "id": "claude-opus-4-7", "display_name": "Opus" },
  "workspace": { "current_dir": "/path", "project_dir": "/path", "added_dirs": [] },
  "version": "2.1.0",
  "output_style": { "name": "default" },
  "cost": { "total_cost_usd": 0 },
  "context_window": {
    "total_input_tokens": 0,
    "total_output_tokens": 0,
    "context_window_size": 200000,
    "used_percentage": 0,
    "remaining_percentage": 100
  },
  "exceeds_200k_tokens": false
}
```

### C. 推荐脚本模板

```bash
#!/usr/bin/env bash
# ~/.claude/pulse.sh

# 设置 trap 处理 SIGTERM（被 Claude Code 取消时）
trap 'exit 0' SIGTERM

# 从 stdin 读取 JSON
INPUT=$(cat)

# 提取数据（带默认值）
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "?"')
CTX_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0')
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')

# 输出到 stdout（使用 ANSI 颜色）
echo -e "\033[1;34m$MODEL\033[0m | \033[0;32m${CTX_PCT}%\033[0m | \033[0;33m\$$COST\033[0m"
```

### D. 调试命令

```bash
# 1. 查看当前配置
cat ~/.claude/settings.json | jq '.statusLine'

# 2. 测试脚本（用模拟 JSON）
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":50},"cost":{"total_cost_usd":0.05}}' | \
  bash ~/.claude/pulse.sh

# 3. 查看 Claude Code 版本
claude --version

# 4. 查看是否 CLI 模式
echo $TERM_PROGRAM  # 应该不是 "vscode"

# 5. 查看最近的 transcript
tail -5 ~/.claude/sessions/*.jsonl | jq .
```

---

*文档版本: 1.0.0*
*最后更新: 2026-05-10*
*适用 Claude Code 版本: 2.x*
