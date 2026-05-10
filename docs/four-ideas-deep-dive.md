# 四个点子深入调研 + 插件合并可行性分析

> 针对「团队协作墙」「工具时序可视化」「智能建议引擎」「ASCII 宠物」的深度拆解
> 以及「多功能合并到单插件」的技术可行性论证
> 调研日期：2026-05-10

---

## 一、核心问题的答案

### 1.1 能否将所有功能加入 Claude Code 插件机制？

**答案：可以，但有架构选择。**

Claude Code 的插件系统本质上是一个**配置打包器**。一个 `.claude-plugin/plugin.json` 文件可以打包：

- hooks（事件钩子）
- slash commands（斜杠命令）
- skills（技能）
- MCP servers（外部工具）
- **statusline（状态栏命令）** ← 注意：只能有一个

所以你的四个功能可以共存于一个插件中，但需要正确分配到不同的扩展点上。

### 1.2 放在一起加载会是什么效果？

**效果取决于你怎么放：**

#### 方案 A：全部塞进一个 statusline 脚本（不推荐）

```
settings.json
{
  "statusLine": {
    "command": "node ~/.claude/plugins/my-plugin/statusline.js"
  }
}
```

这个 `statusline.js` 需要同时做 4 件事：
- 渲染宠物 ASCII 艺术
- 解析 transcript 生成工具时序
- 运行规则引擎给出建议
- 从共享存储读取团队状态

**后果：**
- 脚本执行时间可能从 50ms 膨胀到 500ms+，触发 Claude Code 的取消机制
- 一个模块出错会导致整个状态栏空白
- 无法单独调试某个功能
- 更新一个功能需要重新部署整个脚本

#### 方案 B：分层架构（推荐）

```
┌─────────────────────────────────────────────────────────┐
│  statusline 命令（单一入口，执行 <100ms）                  │
│  → 读取 stdin JSON                                       │
│  → 调用各模块（并行）                                     │
│  → 合并输出                                               │
├─────────────────────────────────────────────────────────┤
│  模块 A: 基础信息 + ASCII 宠物                            │
│  模块 B: 工具时序（缓存结果，每 30 秒更新一次）            │
│  模块 C: 智能建议（缓存结果，每 10 秒更新一次）            │
│  模块 D: 团队墙（异步推送，不阻塞渲染）                    │
└─────────────────────────────────────────────────────────┘
```

关键技巧：**不是每次 statusline 触发都重新计算所有模块**，而是用缓存 + 后台更新策略。

### 1.3 会不会互相影响？能不能共存？

**共存是没问题的，但需要做好隔离：**

| 风险 | 原因 | 解决方案 |
|------|------|----------|
| 性能竞争 | 多个模块同时读写同一个缓存文件 | 文件锁 / 原子写入 |
| 数据冲突 | 两个模块往同一个 JSON 写字段 | 模块化命名空间 |
| 取消混乱 | 一个模块被 SIGTERM 时其他模块状态不一致 | 每个模块独立处理 SIGTERM |
| 依赖冲突 | 模块 A 需要 jq，模块 B 需要 node | 检测依赖，优雅降级 |

**好消息：** Claude Code 的 300ms 防抖 + 单一执行机制天然防止了并发冲突——同一时间只有一个 statusline 进程在运行。

### 1.4 有没有好的解决方案？

**推荐架构：主从模式 + 缓存层**

```
┌──────────────────────────────────────────────────────────────┐
│  Claude Code                                                 │
│  ├── statusLine → 主脚本（main-statusline.sh）               │
│  │   ├── 读 stdin JSON                                        │
│  │   ├── 读缓存目录（~/.claude/plugin-cache/）               │
│  │   ├── 调用各模块（如果缓存过期则后台更新）                 │
│  │   └── 渲染输出（<50ms）                                    │
│  │                                                           │
│  └── hooks → 后台守护进程（daemon.js）                       │
│      ├── PostToolUse → 更新工具时序缓存                       │
│      ├── SessionEnd → 归档会话数据                            │
│      └── 定时器 → 拉取团队状态（每 30 秒）                    │
└──────────────────────────────────────────────────────────────┘
```

**核心理念：**
- statusline 主脚本只负责**渲染**（读缓存，不走重计算）
- 重计算放在 **hooks 或后台进程**中（不阻塞 Claude Code）
- 模块间通过**缓存文件**通信，不共享内存

---

## 二、四个点子的深度实现拆解

### 2.1 团队协作墙（Team Wall）

#### 场景定义

团队成员各自使用 Claude Code 开发，想知道：
- 谁在做什么（任务上下文）
- 谁的上下文快满了需要 compact
- 有没有人正在修改同一个文件（冲突预警）

#### 技术实现路径

**架构选择：去中心化文件共享（最简单，零依赖）**

```
每个开发者的 Claude Code 实例：
  statusline 脚本
    ├── 读取本地 ~/.claude/team-state.json（自己刚写的最新状态）
    ├── 读取共享目录 ./team-status/（其他成员的状态文件）
    │   ├── alice.json  ← 5 秒前更新
    │   ├── bob.json    ← 12 秒前更新
    │   └── carol.json  ← 3 秒前更新（超时？可能离线了）
    └── 渲染聚合面板

hooks（SessionStart / PostToolUse / SessionEnd）
  ├── 每次事件触发 → 写 ~/.claude/team-state.json
  └── 同时往共享目录同步（git push 或 rsync 或文件共享）
```

**状态文件格式：**
```json
{
  "member": "Alice",
  "session_id": "sess_abc123",
  "model": "Opus",
  "context_pct": 72,
  "git_branch": "feat-auth",
  "current_file": "src/auth/jwt.ts",
  "last_activity": "2026-05-10T15:30:00Z",
  "task_hint": "实现 JWT 刷新逻辑",
  "is_compact_soon": true
}
```

**渲染效果：**
```
═══════════════════════════════════════════════════════════
  👥 TEAM WALL — Alpha Squad (3 online)
═══════════════════════════════════════════════════════════
  Alice  🧠 Opus  ████████░░ 72%  🌿 feat-auth   ⚠️ 即将 compact
  Bob    🧠 Sonnet ██████░░░░ 45%  🌿 fix-bug-42 📝 src/utils/db.ts
  Carol  🧠 Opus  ███░░░░░░░ 23%  🌿 main       💤 idle 8min

  🔔 Alice & Bob 都改过 src/auth/ 目录，注意冲突
═══════════════════════════════════════════════════════════
```

**进阶方案：WebSocket 实时推送**

如果有服务器条件，可以用一个简单的 Node.js WebSocket 服务：

```
开发者 A/B/C 的 statusline → WebSocket 推送状态
                      ↓
              WebSocket 服务器聚合
                      ↓
              所有开发者实时收到更新
```

**数据源：**
- 基础数据：statusline stdin JSON（直接可用）
- 当前文件：`workspace.current_dir` 解析
- 任务提示：从 `transcript_path` 提取最后一条用户消息
- 冲突检测：交叉比对 `current_dir` 字段

**依赖项：**
- 无（去中心化方案）
- 或：Node.js（WebSocket 方案）

**性能考量：**
- 读取 3 个 JSON 文件：<1ms
- 渲染多行面板：<10ms
- 总耗时：<20ms，完全可接受

---

### 2.2 工具调用时序可视化（Tool Timeline）

#### 场景定义

想快速了解 Claude 在过去一段时间做了什么、卡在哪里、哪个工具最慢。

#### 技术实现路径

**核心数据源：`transcript_path`**

Claude Code 的对话记录是 JSONL 格式，每行一条记录：

```jsonl
{"type":"message","role":"user","content":"帮我分析这个 bug"}
{"type":"message","role":"assistant","content":"我来看看..."}
{"type":"tool_use","name":"Bash","input":{"command":"git log"}}
{"type":"tool_result","tool_use_id":"123","content":"commit abc..."}
{"type":"tool_use","name":"Read","input":{"file_path":"src/auth.ts"}}
{"type":"tool_result","tool_use_id":"456","content":"(文件内容)"}
```

**解析策略：**

```
bash 脚本方案（轻量）：
  1. tail -20 transcript.jsonl（取最后 20 条）
  2. grep '"type":"tool_use"' 提取工具调用
  3. 用 jq 提取 name、input、时间戳
  4. 用简单的字符画渲染时间线

Node.js 方案（完整）：
  1. 完整解析 JSONL 所有 tool_use/tool_result 对
  2. 计算持续时间（从 tool_use 到 tool_result 的时间差）
  3. 用 chalk/chart 库渲染条形图
  4. 统计成功率、平均耗时、最慢工具
```

**渲染效果：**

```
═══════════════════════════════════════════════════════════
  🔧 TOOL TIMELINE (Last 12 calls)
═══════════════════════════════════════════════════════════
  [Read]   src/auth/jwt.ts      █░░░░░░░░░  45ms   ✓
  [Bash]   git diff HEAD~3      ███░░░░░░░  320ms  ✓
  [Edit]   src/auth/jwt.ts +3-1 ██░░░░░░░░  180ms  ✓
  [Bash]   npm run test         ██████████  2.8s   ✓
  [Bash]   git status           █░░░░░░░░░  38ms   ✓
  [Edit]   src/auth/jwt.ts +1-0 ██░░░░░░░░  120ms  ✓
  [Bash]   git add .            █░░░░░░░░░  42ms   ✓
  [Bash]   git commit -m "fix"  ███░░░░░░░  890ms  ✓
  ─────────────────────────────────────────────────────────
  📊 Success: 100%  │  Avg: 520ms  │  Total: 4.2s
═══════════════════════════════════════════════════════════
```

**关键指标：**
- 工具类型分布（Read/Bash/Edit 各占多少）
- 最慢的 3 个工具（优化方向）
- 失败率（红色高亮）
- 连续调用同一文件的次数（⚠️ 可能陷入循环）

**缓存策略：**
- 解析 JSONL 是重计算，不应该每次 statusline 触发都做
- 在 `~/.claude/plugin-cache/tool-timeline.json` 中缓存结果
- 只在 PostToolUse hook 触发时更新缓存
- statusline 脚本直接读缓存（<5ms）

**数据源：**
- `transcript_path`（JSONL 文件）

**依赖项：**
- bash + tail + grep + jq（轻量方案）
- 或 Node.js（完整方案，有更好的渲染能力）

**实现复杂度：中**

---

### 2.3 智能建议引擎（Smart Suggestions）

#### 场景定义

Claude Code 有海量状态数据，但不会主动"提醒"你。这个模块让状态栏从**显示器**变成**顾问**。

#### 技术实现路径

**规则引擎 + 轻量 AI 分析**

**第一层：确定性规则（立即可做）**

```
规则库（JSON 定义）：
{
  "rules": [
    {
      "id": "context-warning",
      "condition": "context_window.used_percentage > 75",
      "suggestion": "🔄 上下文偏高，建议执行 /compact",
      "priority": "high"
    },
    {
      "id": "cost-alert",
      "condition": "cost.total_cost_usd > 5.0 && effort.level == 'high'",
      "suggestion": "💰 当前会话花费较高，考虑切换到 Sonnet 或降级 effort",
      "priority": "medium"
    },
    {
      "id": "repeated-read",
      "condition": "同一文件在最近 10 次 tool_use 中被 Read 超过 3 次",
      "suggestion": "📁 频繁读取同一文件，建议用 /add-dir 添加到工作区",
      "priority": "low"
    },
    {
      "id": "idle-warning",
      "condition": "距离上次 tool_use 超过 2 分钟 && 正在等待",
      "suggestion": "⏳ Claude 可能卡住了，检查是否需要介入",
      "priority": "medium"
    },
    {
      "id": "test-missing",
      "condition": "项目中有测试文件但本次会话未执行过测试",
      "suggestion": "🧪 修改了代码但未运行测试，完成后记得验证",
      "priority": "low"
    },
    {
      "id": "git-uncommitted",
      "condition": "git status 有未提交更改 && 距上次 commit 超过 10 分钟",
      "suggestion": "📦 有未提交的更改，考虑阶段性提交",
      "priority": "low"
    }
  ]
}
```

**第二层：AI 增强建议（可选，需要 API 调用）**

```
用 transcript 摘要 + 当前状态 → 调用轻量模型（Haiku）→ 生成建议

Prompt 示例：
  "根据以下 Claude Code 会话摘要，给出 1-2 条优化建议：
   - 会话时长: 45 分钟
   - 工具调用: 47 次 Bash, 23 次 Read, 12 次 Edit
   - 当前上下文: 68%
   - 错误: 2 次测试失败
   - 主题: 实现用户认证模块"
```

**渲染效果：**

```
═══════════════════════════════════════════════════════════
  🧠 Opus 78% │ 💡 建议
═══════════════════════════════════════════════════════════
  🔄 上下文偏高（78%），建议执行 /compact
  🧪 有 2 次测试失败未修复
  📁 已连续 8 次 Read src/utils/，建议用 /add-dir
  💰 当前 effort=high，会话已花费 $3.20
═══════════════════════════════════════════════════════════
```

**数据源：**
- stdin JSON（上下文、成本、模型）
- `transcript_path`（解析工具调用历史）
- git status（未提交更改）
- 项目文件结构（测试文件检测）

**依赖项：**
- 无（规则引擎纯本地）
- 可选：Claude API（AI 增强模式）

**性能考量：**
- 规则引擎：O(n) 遍历规则，<5ms
- transcript 解析：用缓存，只在 PostToolUse 更新
- AI 建议：异步调用，结果缓存 60 秒

---

### 2.4 ASCII 动态宠物（Digital Pet）

#### 场景定义

让 Claude Code 有个性、有温度。宠物的状态反映当前会话的健康度。

#### 技术实现路径

**帧动画 + 状态映射**

**宠物状态机：**

```
会话状态 → 宠物行为

idle（无活动 5min+）→ 宠物打瞌睡 / 玩耍
working（正常输出）→ 宠物看着屏幕
thinking（深度思考）→ 宠物思考状
compact（刚 compact）→ 宠物伸懒腰 / 精神焕发
error（工具失败）→ 宠物受惊 / 捂脸
high-context（>75%）→ 宠物胀成气球 / 喘气
warning（额度即将用尽）→ 宠物焦急踱步
```

**ASCII 帧设计（参考 Tamagotchi 风格）：**

```
正常状态：
   /\_/\
  ( ^.^ )
   / >😺

高上下文（紧张）：
   /\_/\
  ( O_O )
   / <😿

compact 后（轻松）：
   /\_/\
  ( ^w^ )
   ~\(^o^)/~

长时间等待（无聊）：
   /\_/\
  ( -.- ) zZZ
   / >💤

错误状态（惊恐）：
   /\_/\
  ( >.< )
   /   🏃💨
```

**动态效果实现：**

```
bash 实现（最简单）：
  - 预定义 4-8 帧 ASCII 图
  - 根据状态选择对应帧
  - 用状态机管理帧切换（每 30 秒换一次 idle 动画）

Node.js 实现（更灵活）：
  - 帧序列 + 插值动画（眨眼、呼吸效果）
  - 根据上下文百分比调整宠物"体型"
  - 支持多个宠物品种（猫/狗/史莱姆/外星人）

高级实现：
  - 用 Unicode Block Elements 做像素级动画
  - 粒子效果（工作时身边飘小星星）
  - 情绪气泡（显示宠物"想法"）
```

**配置化品种：**

```json
{
  "pet": {
    "species": "cat",    // cat / dog / slime / alien / custom
    "animationSpeed": 30, // 帧切换间隔（秒）
    "showMoodBubble": true, // 是否显示情绪气泡
    "size": "small"      // small / medium / large
  }
}
```

**效果：**

```
═══════════════════════════════════════════════════════════
  🧠 Opus 65% │ 🌿 main
═══════════════════════════════════════════════════════════
     /\_/\           💭 "又在写 bug 了..."
    ( ^.^ )
     / > 😺
═══════════════════════════════════════════════════════════
```

**社区参考：**
- GitHub Issue #1507 已有 ASCII pet 概念（codachi）
- 目前的实现较简单，没有帧动画和情绪系统

**依赖项：**
- 无（纯 ASCII + bash）
- 或 Node.js（复杂动画）

**实现复杂度：低 → 中**

---

## 三、架构对比：单体 vs 模块化

### 3.1 单体脚本方案

```
一个 ~/.claude/statusline.sh 做所有事
```

**优点：**
- 简单直接，一个文件搞定
- 无需管理模块间通信
- 部署方便

**缺点：**
- 所有功能耦合，难以独立演进
- 性能无法优化（慢功能拖累快功能）
- 调试困难（不知道哪出问题）
- 不适合团队协作开发

### 3.2 模块化方案（推荐）

```
~/.claude/plugins/my-hud/
├── plugin.json              # 插件元数据
├── main-statusline.sh       # 主入口（<50ms）
├── modules/
│   ├── base.sh              # 基础信息渲染
│   ├── pet.sh               # 宠物模块
│   ├── timeline.sh          # 工具时序（读缓存）
│   ├── suggestions.sh       # 建议引擎（读缓存）
│   └── team-wall.sh         # 团队墙（读共享文件）
├── cache/
│   └── tool-timeline.json   # 由 hooks 更新的缓存
└── hooks.json               # hooks 配置
```

**主脚本（main-statusline.sh）逻辑：**
```bash
#!/usr/bin/env bash
INPUT=$(cat)

# 1. 基础信息（必须快）
BASE=$(bash modules/base.sh "$INPUT")

# 2. 读缓存（不重计算）
TIMELINE=$(cat ~/.claude/plugin-cache/tool-timeline.json 2>/dev/null || echo "")
SUGGESTIONS=$(cat ~/.claude/plugin-cache/suggestions.json 2>/dev/null || echo "")
TEAM=$(cat ~/.claude/plugin-cache/team-wall.json 2>/dev/null || echo "")

# 3. 宠物（轻量，直接渲染）
PET=$(bash modules/pet.sh "$INPUT")

# 4. 合并输出
echo -e "$BASE\n$PET\n$TIMELINE\n$SUGGESTIONS\n$TEAM"
```

**hooks.json（后台更新缓存）：**
```json
{
  "hooks": {
    "PostToolUse": [{
      "command": "node ~/.claude/plugins/my-hud/update-timeline-cache.js",
      "timeout": 5000
    }],
    "SessionStart": [{
      "command": "node ~/.claude/plugins/my-hud/init-cache.js"
    }],
    "SessionEnd": [{
      "command": "node ~/.claude/plugins/my-hud/archive-session.js"
    }]
  }
}
```

**优点：**
- 渲染层和执行层分离
- 每个模块独立开发/调试
- 用户可以按需启用/禁用模块
- 性能可控（缓存策略）

**缺点：**
- 架构稍复杂
- 需要管理缓存一致性

### 3.3 对比总结

| 维度 | 单体 | 模块化 |
|------|------|--------|
| 启动性能 | 取决于最慢模块 | 稳定 <50ms |
| 维护成本 | 随功能增加指数上升 | 线性增长 |
| 模块隔离 | ❌ 互相影响 | ✅ 独立 |
| 调试 | 困难 | 简单 |
| 团队开发 | 不适用 | 适用 |
| 部署 | 简单 | 稍复杂 |
| 用户定制 | 难 | 易（配置开关） |

---

## 四、插件合并的具体配置方案

### 4.1 单个插件如何整合所有功能

```json
// .claude-plugin/plugin.json
{
  "name": "claude-hud-plus",
  "version": "1.0.0",
  "description": "Enhanced HUD with team wall, tool timeline, smart suggestions, and pet",
  "author": "your-name",
  "homepage": "https://github.com/your-org/claude-hud-plus",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/claude-hud-plus"
  },
  "plugins": {
    "claude-code": {
      "settings": {
        "statusLine": {
          "type": "command",
          "command": "~/.claude/plugins/claude-hud-plus/main-statusline.sh",
          "padding": 2
        }
      },
      "hooks": {
        "PostToolUse": [
          {
            "command": "node ~/.claude/plugins/claude-hud-plus/hooks/update-timeline.js",
            "timeout": 5000
          }
        ],
        "SessionStart": [
          {
            "command": "node ~/.claude/plugins/claude-hud-plus/hooks/init.js"
          }
        ],
        "SessionEnd": [
          {
            "command": "node ~/.claude/plugins/claude-hud-plus/hooks/archive.js"
          }
        ]
      },
      "slashCommands": [
        {
          "name": "hud-toggle",
          "description": "切换 HUD 模块的显示/隐藏"
        },
        {
          "name": "hud-config",
          "description": "配置 HUD 模块（颜色、宠物品种等）"
        }
      ]
    }
  }
}
```

### 4.2 与其他插件共存

**关键问题：settings.json 合并策略**

当多个插件都往 `statusLine` 写配置时：

```
插件 A 配置:
  "statusLine": { "command": "plugin-a.sh" }

插件 B 配置:
  "statusLine": { "command": "plugin-b.sh" }

最终效果：后加载的覆盖先加载的
```

**解决方案：**

**方案 1：共享插件（推荐）**
把你想用的所有功能打包成一个插件，避免配置冲突。

**方案 2：通过 hooks 扩展（不冲突）**
- 只用一个 statusline 插件（如 ccstatusline）
- 你的功能通过 hooks 和 slash commands 提供
- statusline 插件读取你 hooks 产生的缓存数据

**方案 3：主从 statusline**
```
主 statusline（用户配置）: ccstatusline 或 claude-hud
从插件（不配置 statusLine）: 通过 hooks 推送数据
                                ↓
                         主 statusline 读取缓存展示
```

例如：
```
claude-hud（官方插件，提供 statusline）
  ↓ 读取 ~/.claude/plugin-cache/my-timeline.json
  ↓ 渲染到状态栏

你的插件（只提供 hooks）
  PostToolUse → 更新 ~/.claude/plugin-cache/my-timeline.json
```

### 4.3 文件结构规划

```
~/.claude/plugins/claude-hud-plus/
├── plugin.json              # 插件清单
├── README.md
├── main-statusline.sh       # 主入口（<50ms 渲染）
├── config.json              # 用户配置（可编辑）
├── modules/
│   ├── base.sh              # 基础信息模块
│   ├── pet.sh               # 宠物渲染
│   ├── team-wall.sh         # 团队墙渲染
│   ├── suggestions.sh       # 建议渲染
│   └── widgets/             # 可插拔的小组件
│       ├── git-status.sh
│       ├── cost-tracker.sh
│       └── context-bar.sh
├── lib/
│   ├── cache.sh             # 缓存管理
│   ├── render.sh            # 渲染工具
│   └── utils.sh             # 通用工具
├── hooks/
│   ├── update-timeline.js   # PostToolUse 钩子
│   ├── update-suggestions.js # SessionEnd 钩子
│   └── sync-team.js         # 团队状态同步
├── cache/                   # 运行时缓存（自动生成）
│   ├── tool-timeline.json
│   ├── suggestions.json
│   └── team-state.json
└── assets/
    └── pets/                # ASCII 宠物帧定义
        ├── cat-idle.txt
        ├── cat-working.txt
        ├── cat-happy.txt
        └── ...
```

---

## 五、每个点子的技术细节速查

### 5.1 团队协作墙

| 项目 | 内容 |
|------|------|
| **数据源** | stdin JSON + 共享文件目录 |
| **更新触发** | PostToolUse hook（推送到共享位置） |
| **渲染延迟** | 实时（读本地缓存） |
| **核心技术** | JSON 文件同步 / WebSocket |
| **依赖** | 无（文件方案）或 Node.js（WebSocket） |
| **复杂度** | 中 |
| **预计工时** | 2-3 天 |

### 5.2 工具时序可视化

| 项目 | 内容 |
|------|------|
| **数据源** | `transcript_path` (JSONL) |
| **更新触发** | PostToolUse hook（增量更新缓存） |
| **渲染延迟** | <5ms（读缓存） |
| **核心技术** | JSONL 解析 + 时间线渲染 |
| **依赖** | bash+jq 或 Node.js |
| **复杂度** | 中 |
| **预计工时** | 2-3 天 |

### 5.3 智能建议引擎

| 项目 | 内容 |
|------|------|
| **数据源** | stdin JSON + transcript + git status |
| **更新触发** | 每 10 秒 / PostToolUse / SessionEnd |
| **渲染延迟** | <10ms（读缓存） |
| **核心技术** | 规则引擎 + 可选 LLM 分析 |
| **依赖** | 无（规则引擎）或 Claude API（AI 增强） |
| **复杂度** | 中 → 高（含 AI 模式） |
| **预计工时** | 2 天（规则引擎）~ 5 天（完整版） |

### 5.4 ASCII 动态宠物

| 项目 | 内容 |
|------|------|
| **数据源** | stdin JSON（上下文、状态） |
| **更新触发** | 每次 statusline 触发（轻量直接渲染） |
| **渲染延迟** | <5ms（纯文本拼接） |
| **核心技术** | ASCII 帧动画 + 状态机 |
| **依赖** | 无（纯 bash）或 Node.js |
| **复杂度** | 低 → 中 |
| **预计工时** | 1-2 天 |

---

## 六、性能预算

假设四个模块全部启用，单次 statusline 触发的性能分解：

| 模块 | 计算方式 | 耗时估算 |
|------|----------|----------|
| 基础信息 | 直接读 stdin | <5ms |
| 宠物渲染 | ASCII 拼接 | <5ms |
| 工具时序 | 读缓存文件 | <5ms |
| 建议引擎 | 读缓存文件 + 简单规则判断 | <10ms |
| 团队墙 | 读 3 个 JSON 文件 | <5ms |
| 合并输出 | echo + ANSI | <5ms |
| **总计** | | **<35ms** |

加上 Claude Code 的 300ms 防抖，用户感知的延迟约 335ms，完全在可接受范围内。

---

## 七、下一步建议

### 阶段一：MVP 验证（本周）
1. 先做一个「宠物 + 基础信息」的最小版本
   - 验证架构可行性
   - 建立开发工作流
   - 实现缓存机制

### 阶段二：核心功能（下周）
2. 加入「工具时序」模块
   - 实现 JSONL 解析
   - 实现缓存更新 hook
3. 加入「建议引擎」（规则模式）
   - 定义规则库
   - 实现建议渲染

### 阶段三：高级功能（第三周）
4. 实现「团队协作墙」
   - 选择文件共享 vs WebSocket 方案
   - 实现状态同步协议

### 阶段四：打磨（第四周）
5. 配置系统（用户可开关各模块）
6. 文档 + 开源发布

---

*文档版本: 1.0.0 | 最后更新: 2026-05-10*
