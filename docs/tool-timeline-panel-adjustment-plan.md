# 工具调用统计分析面板调整方案

> 日期：2026-05-15
>
> 目标：将 `toolTimeline` 从“单纯工具时间线”调整为“工具调用统计分析面板”。面板应在 Claude Code 状态栏中独立展示工具调用总览、token、主 agent / 子 agent 工具使用、最耗时工具等指标，并保留最近 5 条调用作为辅助明细。

## 1. 需求重述

当前“只显示最近工具时间线”的价值不足。用户真正想快速知道的是：

- 截至目前一共调用了多少工具。
- 当前一共消耗了多少 token。
- 主 agent 调用了几个工具。
- 子 agent 调用了几个工具，并展示具体子 agent 名称。
- 最耗时的是哪个 tool。
- 最近发生了哪些关键工具调用。
- 不希望主要依赖 `/pulse-line:timeline` 这种会进入 Claude Code 对话上下文的方式查看。
- 该模块仍然不要嵌入普通状态栏片段，而是作为独立多行模块展示。

因此新目标不是“Tool Timeline”，而是“Tool Analytics Panel”。

## 2. 目标展示形态

建议默认展示一个紧凑的分析面板：

```text
[当前模型] deepseek-v4-pro  │  [Git 分支] main  │  [工作区] status-bar-cc  │  [上下文使用率] ██░░░░░░░░░░ 19%  │  [缓存] 37.4K
[MCP] 5 servers  │  [账户] DeepSeek: CN¥60.23  │  [轮次] 61 turns  │  [思考] 开启

═══════════════════════════════════════════════════════════
   TOOL ANALYTICS
═══════════════════════════════════════════════════════════
  Calls: 42  │  Tokens: 128.4K  │  Success: 95%
  Main agent: 31 tools  │  Subagents: 11 tools / 2 agents
  Subagents: Explore 7, Review 4
  Slowest: Bash "npm run test" 9.0s
  Recent:
    [Read]  src/index.ts        45ms   ✓
    [Bash]  npm run build       1.8s   ✓
    [Edit]  src/cli.ts +3-1     220ms  ✓
    [Agent] Explore             7 tools  42.1K tok  18.4s ✓
    [Bash]  npm test            9.0s   ✗
═══════════════════════════════════════════════════════════
```

重点：

- “统计分析”优先。
- 最近 5 条调用只是辅助上下文。
- 子 agent 单独统计，并展示名称。
- token 指标清楚标注来源和语义。

## 3. 官方能力调研结论

### 3.1 statusline 可显示多行分析面板

Claude Code statusline 是本地命令：

- 从 stdin 接收 JSON。
- 向 stdout 输出状态栏文本。
- 支持多行输出。
- 支持 ANSI 颜色。
- 支持 OSC 8 链接。

所以独立多行分析面板可行。

### 3.2 token 数据来源与限制

Claude Code statusline JSON 包含：

- `context_window.total_input_tokens`
- `context_window.total_output_tokens`
- `context_window.current_usage.input_tokens`
- `context_window.current_usage.output_tokens`
- `context_window.current_usage.cache_creation_input_tokens`
- `context_window.current_usage.cache_read_input_tokens`

官方文档说明：从 Claude Code v2.1.132 起，`context_window.total_input_tokens` 和 `total_output_tokens` 表示“当前 context window 中的 token”，不是累计会话总量。旧版本中它们曾是累计会话总量。

因此面板中的 “Tokens” 要明确语义：

```text
Context tokens: 128.4K
```

不要误称为“会话累计 token”，除非我们另行从 hook 或 transcript 聚合。

### 3.3 子 agent 数据来源

Claude Code hooks 文档说明：

- `PostToolUse` 的 `tool_name === 'Agent'` 时，`tool_response` 可包含子 agent telemetry：
  - `status`
  - `agentId`
  - `content`
  - `totalTokens`
  - `totalDurationMs`
  - `totalToolUseCount`
  - `usage`
- `SubagentStop` hook 可获得：
  - `agent_id`
  - `agent_type`
  - `agent_transcript_path`
  - `last_assistant_message`

这意味着子 agent 统计可以通过两条路径构建：

1. 主路径：在 `PostToolUse` 里识别 `Agent` 工具调用，并读取 `tool_response.totalToolUseCount`、`totalTokens`、`totalDurationMs`。
2. 辅助路径：增加 `SubagentStop` hook，用 `agent_id -> agent_type` 建立 agent 名称映射。

如果只依赖 `Agent` 工具的 `tool_input`，通常也能拿到 `subagent_type` / `agent_type` / `description` 一类字段，但字段稳定性不如官方明确列出的 `SubagentStop.agent_type`。

### 3.4 方向键选中 + Enter 查看详情

结论：Claude Code statusline 内不可实现。

原因：

- statusline 输出不是可获得键盘焦点的 TUI 组件。
- 官方没有提供 selection、focus、keydown、Enter callback API。
- statusline 命令是短生命周期渲染命令，输出结束后进程退出。
- 方向键和 Enter 属于 Claude Code 主输入区域，statusline 无法接管。

可替代：

- 状态栏面板直接展示核心分析数据。
- `pulse-line timeline --watch` 可作为外部终端 TUI 增强，不消耗对话 token。
- OSC 8 鼠标点击可作为实验增强，但不能满足方向键选择。

## 4. 新产品定义

模块命名可继续叫 `toolTimeline` 以保持配置兼容，但用户可见概念应改为：

```text
工具分析 / Tool Analytics
```

建议在配置中引入：

```ts
displayMode?: 'analytics-panel' | 'timeline-panel' | 'summary' | 'compact-list';
```

默认使用：

```ts
displayMode: 'analytics-panel'
```

## 5. 数据模型调整

当前 `ToolTimelineEvent` 能表达单次工具调用，但不足以表达 agent 维度统计。建议扩展为“事件 + 聚合”的模型。

### 5.1 扩展事件模型

```ts
export type ToolTimelineActorKind = 'main-agent' | 'subagent' | 'unknown';

export interface ToolTimelineEvent {
  id: string;
  provider: ToolTimelineProvider;
  sessionId: string;
  actorKind?: ToolTimelineActorKind;
  actorName?: string;
  agentId?: string;
  subagentType?: string;
  toolUseId?: string;
  transcriptPath?: string | null;
  cwd?: string;
  toolName: string;
  displayName: string;
  summary: string;
  status: ToolTimelineStatus;
  startedAt?: string;
  endedAt: string;
  durationMs?: number;
  target?: ToolTimelineTarget;
  inputSummary?: string;
  responseSummary?: string;
  errorSummary?: string;

  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    totalTokens?: number;
  };

  subagentMetrics?: {
    totalToolUseCount?: number;
    totalTokens?: number;
    totalDurationMs?: number;
  };
}
```

解释：

- 普通工具调用：`actorKind = 'main-agent'`。
- `Agent` 工具调用完成后：作为一条特殊事件，记录子 agent 名称、工具数、token、耗时。
- 如果后续解析子 agent transcript，可把子 agent 内部工具调用也落为单独事件，`actorKind = 'subagent'`。

### 5.2 新增 agent 元数据

```ts
export interface ToolTimelineAgentMeta {
  agentId: string;
  agentType?: string;
  displayName: string;
  transcriptPath?: string;
  lastSeenAt: string;
}
```

来源：

- `SubagentStop.agent_id`
- `SubagentStop.agent_type`
- `SubagentStop.agent_transcript_path`
- `PostToolUse Agent.tool_response.agentId`

### 5.3 扩展统计模型

```ts
export interface ToolAnalyticsStats {
  totalToolCalls: number;
  success: number;
  failure: number;
  unknown: number;
  successRate: number;

  mainAgentToolCalls: number;
  subagentToolCalls: number;
  subagentCount: number;
  bySubagent: Record<string, {
    agentId?: string;
    toolCalls: number;
    tokens?: number;
    durationMs?: number;
  }>;

  contextTokens?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    totalTokens: number;
    source: 'statusline-context-window';
  };

  subagentTokens?: number;
  observedTokens?: number;

  totalDurationMs?: number;
  avgDurationMs?: number;
  slowest?: {
    toolName: string;
    summary: string;
    durationMs: number;
    actorName?: string;
  };

  byTool: Record<string, number>;
}
```

注意 token 字段：

- `contextTokens` 来自 statusline 当前 context window。
- `subagentTokens` 来自 Agent tool_response telemetry。
- `observedTokens` 可定义为当前可观测 token 合计，但必须避免与 context window 重复计算。

MVP 建议只显示：

```text
Context tokens: 128.4K
Subagent tokens: 42.1K
```

不要强行给出“总消耗 token”，因为数据源语义不同。

## 6. 数据采集方案

### 6.1 继续保留 PostToolUse / PostToolUseFailure

普通工具：

- `Bash`
- `Read`
- `Write`
- `Edit`
- `MultiEdit`
- `Grep`
- `Glob`
- `WebFetch`
- `WebSearch`
- `mcp__*`

这些计入：

```text
mainAgentToolCalls += 1
totalToolCalls += 1
```

### 6.2 Agent 工具特殊处理

当 `tool_name === 'Agent'`：

从 `tool_input` 尝试提取：

- `subagent_type`
- `agent_type`
- `description`
- `prompt` 摘要

从 `tool_response` 提取：

- `agentId`
- `totalToolUseCount`
- `totalTokens`
- `totalDurationMs`
- `usage`
- `status`

计数策略：

- `Agent` 工具本身是主 agent 的一次工具调用。
- 子 agent 内部工具数来自 `tool_response.totalToolUseCount`。

推荐统计：

```text
totalToolCalls = mainAgentToolCalls + subagentToolCalls
mainAgentToolCalls 包含 Agent 这次调用本身
subagentToolCalls = sum(Agent.tool_response.totalToolUseCount)
```

示例：

```text
Main agent: 31 tools
Subagents: 11 tools / 2 agents
Total calls: 42
```

这样用户能理解：

- 主 agent 发起了多少工具。
- 子 agent 内部又执行了多少工具。

### 6.3 增加 SubagentStop hook

建议在 `hooks/hooks.json` 增加：

```json
"SubagentStop": [
  {
    "matcher": ".*",
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js\" hook collect-subagent-event --provider claude-code",
        "timeout": 5
      }
    ]
  }
]
```

新增 CLI 内部命令：

```text
pulse-line hook collect-subagent-event --provider claude-code
```

用途：

- 记录 `agent_id -> agent_type`。
- 记录子 agent transcript path。
- 为 Agent tool_response 中只有 `agentId` 而缺少名称的场景补全名称。

### 6.4 statusline token 快照

由于 statusline stdin 才有 `context_window`，hook 事件不一定带 token。

建议在 statusline 渲染时，不写入 cache，直接把当前 `input.context_window` 作为 render 参数传给分析面板：

```ts
renderToolAnalyticsPanel(
  input.session_id,
  modules.toolTimeline,
  theme,
  {
    contextWindow: input.context_window,
    cost: input.cost
  }
)
```

这样可以显示实时 context token，不需要额外 IO。

## 7. 缓存结构调整

当前：

```text
~/.claude/pulse/cache/tool-timeline/<session_id>.json
```

可继续使用，但 cache 内容扩展：

```ts
export interface ToolTimelineCache {
  version: 2;
  provider: ToolTimelineProvider;
  sessionId: string;
  updatedAt: string;
  events: ToolTimelineEvent[];
  agents?: Record<string, ToolTimelineAgentMeta>;
  stats: ToolAnalyticsStats;
}
```

兼容：

- 读取 version 1 cache 时，按旧 `events` 重算基础 stats。
- 新写入使用 version 2。

## 8. 分析面板渲染设计

新增：

```ts
export interface ToolAnalyticsPanel {
  text: string;
}

export function renderToolAnalyticsPanel(
  sessionId: string,
  config: ToolTimelineModuleConfig,
  theme: Theme,
  snapshot?: {
    contextWindow?: ContextWindow;
    cost?: CostInfo;
  }
): ToolAnalyticsPanel | null
```

### 8.1 面板布局

默认宽度 59。

```text
═══════════════════════════════════════════════════════════
   TOOL ANALYTICS
═══════════════════════════════════════════════════════════
  Calls: 42  │  Context: 128.4K tok  │  Success: 95%
  Main agent: 31 tools  │  Subagents: 11 tools / 2 agents
  Subagents: Explore 7, Review 4
  Slowest: Bash "npm run test" 9.0s
  Recent:
    [Read]  src/index.ts        45ms   ✓
    [Bash]  npm run build       1.8s   ✓
    [Edit]  src/cli.ts +3-1     220ms  ✓
    [Agent] Explore             7 tools 42.1K tok 18.4s ✓
    [Bash]  npm test            9.0s   ✗
═══════════════════════════════════════════════════════════
```

### 8.2 最近 5 条调用

只展示最近 5 条“顶层可读事件”：

- 普通工具事件。
- Agent 聚合事件。

是否展开子 agent 内部工具：

- MVP 不展开。
- 子 agent 内部工具以 `Agent` 聚合行展示。
- 后续如果解析 `agent_transcript_path`，可支持展开。

### 8.3 指标语义

`Calls`：

```text
mainAgentToolCalls + subagentToolCalls
```

`Context`：

```text
input_tokens + output_tokens + cache_creation_input_tokens + cache_read_input_tokens
```

来源是当前 statusline context window。

`Subagents`：

```text
子 agent 内部工具数 / 子 agent 数量
```

`Slowest`：

- 普通工具用 `durationMs`。
- Agent 聚合事件用 `tool_response.totalDurationMs` 优先。
- 如果 Agent 工具本身也有 `duration_ms`，优先使用 response 的 totalDurationMs，因为它代表子 agent 完整运行耗时。

## 9. 配置调整

建议 schema v6：

```ts
export interface ToolTimelineModuleConfig extends ModuleConfig {
  displayMode?: 'analytics-panel' | 'timeline-panel' | 'summary' | 'compact-list';
  maxEvents?: number;
  maxDisplayEvents?: number; // 默认 5
  panelWidth?: number;
  showRecent?: boolean;
  showTokenStats?: boolean;
  showAgentStats?: boolean;
  showSlowest?: boolean;
  showSuccessRate?: boolean;
  slowThresholdMs?: number;
  summaryMaxLength?: number;
}
```

默认：

```ts
toolTimeline: {
  enabled: false,
  order: 16,
  icon: '[工具]',
  displayMode: 'analytics-panel',
  maxEvents: 100,
  maxDisplayEvents: 5,
  panelWidth: 59,
  showRecent: true,
  showTokenStats: true,
  showAgentStats: true,
  showSlowest: true,
  showSuccessRate: true,
  slowThresholdMs: 3000,
  summaryMaxLength: 80
}
```

## 10. 国际化设计

工具调用统计分析面板必须接入现有 `language` 配置，不应固定只显示英文。

新增 i18n 标签建议：

```ts
// zh
toolAnalyticsTitle: '工具分析',
toolAnalyticsCalls: '调用',
toolAnalyticsContext: '上下文',
toolAnalyticsTokens: 'tokens',
toolAnalyticsSuccess: '成功',
toolAnalyticsMainAgent: '主 agent',
toolAnalyticsSubagents: '子 agent',
toolAnalyticsAgents: 'agents',
toolAnalyticsTools: 'tools',
toolAnalyticsSlowest: '最慢',
toolAnalyticsRecent: '最近',
toolAnalyticsNone: '暂无工具调用',
toolAnalyticsUnknownAgent: '未知 agent',

// en
toolAnalyticsTitle: 'TOOL ANALYTICS',
toolAnalyticsCalls: 'Calls',
toolAnalyticsContext: 'Context',
toolAnalyticsTokens: 'tok',
toolAnalyticsSuccess: 'Success',
toolAnalyticsMainAgent: 'Main agent',
toolAnalyticsSubagents: 'Subagents',
toolAnalyticsAgents: 'agents',
toolAnalyticsTools: 'tools',
toolAnalyticsSlowest: 'Slowest',
toolAnalyticsRecent: 'Recent',
toolAnalyticsNone: 'No tool calls',
toolAnalyticsUnknownAgent: 'Unknown agent',
```

实现要求：

- `renderToolAnalyticsPanel()` 接收 `language` 或 `labels`。
- 面板标题、统计项名称、空状态文案、未知 agent 文案都从 i18n 获取。
- 工具名如 `Bash`、`Read`、`Edit` 保留原名，不翻译，避免与 Claude Code 工具名不一致。
- `tokens` 可在中文下保留英文缩写，因为 token 是技术指标；也可以显示为 `tokens`，不要翻译成“词元”以免影响理解。
- `✓` / `✗` 状态符号不需要国际化。
- 测试必须覆盖中英文面板输出。

中文示例：

```text
═══════════════════════════════════════════════════════════
   工具分析
═══════════════════════════════════════════════════════════
  调用: 42  │  上下文: 128.4K tokens  │  成功: 95%
  主 agent: 31 tools  │  子 agent: 11 tools / 2 agents
  子 agent: Explore 7, Review 4
  最慢: Bash "npm run test" 9.0s
  最近:
    [Read]  src/index.ts        45ms   ✓
═══════════════════════════════════════════════════════════
```

英文示例：

```text
═══════════════════════════════════════════════════════════
   TOOL ANALYTICS
═══════════════════════════════════════════════════════════
  Calls: 42  │  Context: 128.4K tok  │  Success: 95%
  Main agent: 31 tools  │  Subagents: 11 tools / 2 agents
  Subagents: Explore 7, Review 4
  Slowest: Bash "npm run test" 9.0s
  Recent:
    [Read]  src/index.ts        45ms   ✓
═══════════════════════════════════════════════════════════
```

## 11. `src/index.ts` 接入调整

当前错误方向：

```ts
segments.push({ order, text: '[工具] 3 calls avg ...' });
```

新方向：

```ts
const panels: Array<{ order: number; text: string }> = [];

if (modules.toolTimeline.enabled) {
  const panel = renderToolAnalyticsPanel(
    input.session_id,
    modules.toolTimeline,
    theme,
    {
      contextWindow: input.context_window,
      cost: input.cost
    }
  );

  if (panel) {
    panels.push({
      order: modules.toolTimeline.order,
      text: panel.text
    });
  }
}

segments.sort(...);
panels.sort(...);

const normalOutput = renderLayout(...);
const output = [
  normalOutput,
  ...panels.map((p) => p.text)
].filter(Boolean).join('\n');
```

## 12. CLI 与 slash command 的新定位

保留：

```text
pulse-line timeline
pulse-line timeline --json
pulse-line timeline clear
```

但文档中定位为：

- cache 调试。
- JSON 导出。
- 问题排查。

不作为主要查看入口。

可选新增：

```text
pulse-line analytics
pulse-line analytics --watch
```

其中 `--watch` 是外部终端 TUI，可做到方向键选择和 Enter 查看详情，但不在 Claude Code statusline 内。

## 13. 方向键选中 + Enter 查看详情

保持原调研结论：

- Claude Code statusline 内不可实现。
- 不应承诺为验收目标。

如果后续要做交互详情，建议走外部 TUI：

```text
pulse-line analytics --watch
```

该命令可在独立终端里实现：

- 上下方向键移动选择。
- Enter 展开工具详情。
- q 退出。
- 不消耗 Claude Code 对话 token。

## 14. 测试计划

### 14.1 normalizer 测试

- Agent 工具成功事件能提取 `agentId`。
- Agent 工具成功事件能提取 `totalToolUseCount`。
- Agent 工具成功事件能提取 `totalTokens`。
- Agent 工具成功事件能提取 `totalDurationMs`。
- Agent 工具缺少 telemetry 时优雅降级。
- SubagentStop hook 输入能记录 `agent_id -> agent_type`。

### 14.2 stats 测试

- 总工具数 = 主 agent 工具数 + 子 agent 工具数。
- Agent 工具本身计入主 agent 工具数。
- 子 agent 工具数来自 `totalToolUseCount`。
- `bySubagent` 按 agent 名称聚合。
- `slowest` 能识别普通工具。
- `slowest` 能识别 Agent 聚合耗时。
- success rate 正确。

### 14.3 render 测试

- 面板包含 `TOOL ANALYTICS`。
- 面板最多展示最近 5 条。
- 面板展示 Calls、Context tokens、Success。
- 面板展示 Main agent / Subagents。
- 面板展示具体子 agent 名称和工具数。
- 面板展示 Slowest。
- 面板中文语言下显示 `工具分析`、`调用`、`最慢`。
- 面板英文语言下显示 `TOOL ANALYTICS`、`Calls`、`Slowest`。
- 无 cache 时返回 null。
- cache 损坏时返回 null。

### 14.4 index 集成测试

- tool analytics 面板不进入普通 `renderLayout()`。
- 输出中不出现旧的 `[工具] 3 calls avg...` 内联摘要。
- 输出中包含独立边框面板。

### 14.5 migration 测试

- schema v5 -> v6 自动补 `displayMode: 'analytics-panel'`。
- `maxDisplayEvents` 默认是 5。
- 用户已有 `enabled`、`icon`、`maxEvents` 保留。

## 15. 验收标准

功能验收：

- [ ] `toolTimeline` 不再嵌入普通状态栏片段。
- [ ] 启用后显示独立 `TOOL ANALYTICS` 面板。
- [ ] 面板展示总工具调用数。
- [ ] 面板展示当前 context token。
- [ ] 面板展示主 agent 工具数。
- [ ] 面板展示子 agent 工具数和子 agent 名称。
- [ ] 面板展示最耗时 tool。
- [ ] 面板最多展示最近 5 条调用。
- [ ] 不依赖 slash command 查看核心信息。
- [ ] 面板文案跟随 `language` 在中英文之间切换。

数据准确性验收：

- [ ] 普通工具调用计入 main agent。
- [ ] Agent 工具本身计入 main agent。
- [ ] Agent response 中的 `totalToolUseCount` 计入 subagent tools。
- [ ] Agent response 中的 `totalTokens` 计入 subagent token telemetry。
- [ ] statusline context token 不误称为累计会话 token。

交互验收：

- [ ] 文档明确说明 Claude Code statusline 内不能方向键选中 + Enter 进入详情。
- [ ] 如做外部 TUI，明确其不在 Claude Code statusline 内。

质量验收：

- [ ] `npm run build` 通过。
- [ ] `npm test` 通过。
- [ ] 新增测试覆盖 Agent telemetry、SubagentStop、analytics stats、panel render。
- [ ] 新增测试覆盖工具分析面板 i18n。

## 16. 实施顺序

1. 将方案和文档语义从 timeline 调整为 analytics。
2. 扩展数据模型，支持 actor、agent、token、subagent metrics。
3. 在 normalizer 中特殊处理 `tool_name === 'Agent'`。
4. 增加 `collect-subagent-event` 内部 hook 命令。
5. 扩展 cache，记录 agent metadata。
6. 实现 `computeToolAnalyticsStats()`。
7. 扩展 i18n 标签并让 `renderToolAnalyticsPanel()` 使用当前语言。
8. 实现 `renderToolAnalyticsPanel()`。
9. 调整 `src/index.ts`，把工具分析作为独立 panel 输出。
10. 更新 README / README_EN / CHANGELOG。
11. 补全测试并跑 build/test。

## 17. 参考资料

- Claude Code statusline 文档：`https://docs.anthropic.com/en/docs/claude-code/statusline`
- Claude Code hooks 文档：`https://docs.anthropic.com/en/docs/claude-code/hooks`
- 现有调研：`docs/four-ideas-deep-dive.md`
- 当前已完成实施计划：`docs/implementation-plan-tool-timeline.md`
