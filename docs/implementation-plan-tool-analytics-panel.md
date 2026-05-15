# 工具调用统计分析面板具体实施方案

> 日期：2026-05-15
>
> 目标：基于 `docs/tool-timeline-panel-adjustment-plan.md`，把当前 `toolTimeline` 从内联摘要调整为独立的工具调用统计分析面板。面板展示总工具数、当前 context token、主 agent / 子 agent 工具数、子 agent 名称、最耗时 tool、最近 5 条调用，并支持中英文国际化。

## 1. 最终目标

启用 `toolTimeline` 后，状态栏输出应从：

```text
[工具] 3 calls avg 7.3s slow Bash 9.0s
```

调整为独立面板：

```text
[当前模型] deepseek-v4-pro  │  [Git 分支] main  │  [工作区] status-bar-cc  │  [上下文使用率] ██░░░░░░░░░░ 19%  │  [缓存] 37.4K
[MCP] 5 servers  │  [账户] DeepSeek: CN¥60.23  │  [轮次] 61 turns  │  [思考] 开启

═══════════════════════════════════════════════════════════
   工具分析
═══════════════════════════════════════════════════════════
  调用: 42  │  上下文: 128.4K tokens  │  成功: 95%
  主 agent: 31 tools  │  子 agent: 11 tools / 2 agents
  子 agent: Explore 7, Review 4
  最慢: Bash "npm run test" 9.0s
  最近:
    [Read]  src/index.ts        45ms   ✓
    [Bash]  npm run build       1.8s   ✓
    [Edit]  src/cli.ts +3-1     220ms  ✓
    [Agent] Explore             7 tools 42.1K tok 18.4s ✓
    [Bash]  npm test            9.0s   ✗
═══════════════════════════════════════════════════════════
```

英文语言下标题和标签应切换为：

```text
TOOL ANALYTICS
Calls / Context / Success / Main agent / Subagents / Slowest / Recent
```

## 2. 关键原则

- `toolTimeline` 不再进入普通 `segments[]`，不参与 `renderLayout()`。
- 面板作为独立 block append 到普通状态栏之后。
- 面板默认最多显示最近 5 条调用。
- CLI 和 slash command 仅作为调试、导出、清理入口，不作为主查看入口。
- token 语义必须准确：statusline 提供的是当前 context window token，不要称为完整会话累计 token。
- Claude Code statusline 内无法做方向键选择和 Enter 详情，不纳入实现目标。
- 面板文案必须接入项目现有 `language` 配置。

## 3. 当前代码改造点

```text
src/types/tool-timeline.ts          扩展事件、agent meta、analytics stats 类型
src/tool-timeline/cache.ts          cache v2、agent meta 读写、analytics stats
src/extractors/tool-timeline.ts     Agent normalizer、SubagentStop normalizer、analytics panel renderer
src/types/pulse-config.ts           ToolTimelineModuleConfig 扩展、schema v6 默认配置
src/config/migrate-config.ts        schema v5 -> v6 迁移
src/config/loader.ts                CONFIG_CACHE_KEY v6
src/cli.ts                          collect-subagent-event 内部 hook、language mapping
src/index.ts                        独立 panels 输出
src/i18n/locales/zh.ts              工具分析面板中文标签
src/i18n/locales/en.ts              工具分析面板英文标签
hooks/hooks.json                    新增 SubagentStop hook
README.md / README_EN.md            更新用户说明
CHANGELOG.md                        记录变更
test/*.test.ts                      增加/调整测试
```

## 4. 类型设计

### 4.1 修改 `src/types/tool-timeline.ts`

新增：

```ts
export type ToolTimelineActorKind = 'main-agent' | 'subagent' | 'unknown';
```

扩展 `ToolTimelineEvent`：

```ts
actorKind?: ToolTimelineActorKind;
actorName?: string;
agentId?: string;
subagentType?: string;
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
```

新增：

```ts
export interface ToolTimelineAgentMeta {
  agentId: string;
  agentType?: string;
  displayName: string;
  transcriptPath?: string;
  lastSeenAt: string;
}

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
  subagentTokens?: number;
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

扩展 `ToolTimelineCache`：

```ts
version: 1 | 2;
agents?: Record<string, ToolTimelineAgentMeta>;
analyticsStats?: ToolAnalyticsStats;
```

保留 `stats: ToolTimelineStats`，避免 CLI 和已有测试一次性大改。

### TODO

- [x] 增加 `ToolTimelineActorKind`。
- [x] 扩展 `ToolTimelineEvent` 的 actor、agent、token、subagent metrics 字段。
- [x] 新增 `ToolTimelineAgentMeta`。
- [x] 新增 `ToolAnalyticsStats`。
- [x] 让 `ToolTimelineCache.version` 支持 `1 | 2`。
- [x] 保留旧 `ToolTimelineStats`，保证向后兼容。

## 5. 配置设计

### 5.1 修改 `src/types/pulse-config.ts`

扩展：

```ts
export interface ToolTimelineModuleConfig extends ModuleConfig {
  displayMode?: 'analytics-panel' | 'timeline-panel' | 'summary' | 'compact-list';
  mode?: 'summary' | 'compact-list'; // deprecated, 兼容旧配置
  maxEvents?: number;
  maxDisplayEvents?: number;
  panelWidth?: number;
  showRecent?: boolean;
  showTokenStats?: boolean;
  showAgentStats?: boolean;
  showSlowest?: boolean;
  showSuccessRate?: boolean;
  slowThresholdMs?: number;
  showFailures?: boolean;
  showAverage?: boolean;
  showSlowest?: boolean;
  summaryMaxLength?: number;
}
```

注意：如果保留原 `showSlowest` 字段，不要重复声明。最终代码里只保留一次。

默认配置改为：

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
  showFailures: true,
  showAverage: true,
  summaryMaxLength: 80
}
```

### 5.2 修改 schema

`CURRENT_SCHEMA` 从 5 升到 6。

`CONFIG_CACHE_KEY` 从：

```text
pulse-config-v5
```

改为：

```text
pulse-config-v6
```

### TODO

- [x] 扩展 `ToolTimelineModuleConfig`。
- [x] `DEFAULT_CONFIG.schemaVersion` 改为 6。
- [x] `DEFAULT_CONFIG.modules.toolTimeline.displayMode` 默认 `analytics-panel`。
- [x] `DEFAULT_CONFIG.modules.toolTimeline.maxDisplayEvents` 默认 5。
- [x] `DEFAULT_CONFIG.modules.toolTimeline.panelWidth` 默认 59。
- [x] `src/config/migrate-config.ts` 的 `CURRENT_SCHEMA` 改为 6。
- [x] `src/config/loader.ts` cache key 改为 `pulse-config-v6`。
- [x] `src/cli.ts` cache key 改为 `pulse-config-v6`。
- [x] 迁移时保留用户已有 `enabled`、`icon`、`maxEvents`。
- [x] v5 配置迁移时补 `displayMode: 'analytics-panel'`。
- [x] v5 配置迁移时补 `maxDisplayEvents: 5`。

## 6. 国际化设计

### 6.1 修改 locale 文件

修改：

```text
src/i18n/locales/zh.ts
src/i18n/locales/en.ts
```

新增标签：

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

### 6.2 渲染传参

`renderToolAnalyticsPanel()` 传入 language：

```ts
renderToolAnalyticsPanel(
  input.session_id,
  modules.toolTimeline,
  theme,
  config.language,
  {
    contextWindow: input.context_window,
    cost: input.cost
  }
)
```

或传入 labels：

```ts
const labels = getLabels(config.language);
renderToolAnalyticsPanel(..., labels, snapshot)
```

推荐传 `language`，在 renderer 内部调用 `getLabels(language)`，减少 `src/index.ts` 的额外 import。

### TODO

- [x] `zhLabels` 新增工具分析面板标签。
- [x] `enLabels` 新增工具分析面板标签。
- [x] `renderToolAnalyticsPanel()` 接收 `language: Language`。
- [x] 工具分析面板所有固定文案从 labels 获取。
- [x] 工具名 `Bash` / `Read` / `Edit` 不翻译。
- [x] token 单位按 locale 输出 `tokens` 或 `tok`。
- [x] 添加中文面板测试。
- [x] 添加英文面板测试。

## 7. 数据采集实现

### 7.1 Agent 工具归一化

修改：

```text
src/extractors/tool-timeline.ts
```

在 `normalizeClaudeToolHook()` 中：

- 普通工具默认 `actorKind: 'main-agent'`。
- 当 `tool_name === 'Agent'`：
  - `displayName` 用 `Agent`。
  - `actorKind` 仍是 `main-agent`，因为这是主 agent 发起的工具。
  - 从 `tool_input` 读取子 agent 名称候选。
  - 从 `tool_response` 读取 `agentId`、`totalToolUseCount`、`totalTokens`、`totalDurationMs`。
  - `summary` 优先显示子 agent 名称。
  - `durationMs` 优先用 `tool_response.totalDurationMs`，否则用 hook `duration_ms`。
  - `subagentMetrics` 写入 response telemetry。

字段候选：

```ts
const agentName =
  stringField(input, 'subagent_type') ||
  stringField(input, 'agent_type') ||
  stringField(input, 'description') ||
  agentId ||
  'Unknown agent';
```

### 7.2 SubagentStop hook 归一化

新增内部类型：

```ts
interface ClaudeSubagentStopHookInput {
  session_id?: string;
  hook_event_name?: string;
  agent_id?: string;
  agent_type?: string;
  agent_transcript_path?: string;
  last_assistant_message?: string;
}
```

新增函数：

```ts
export function normalizeClaudeSubagentStopHook(input: unknown): ToolTimelineAgentMeta | null
```

规则：

- 仅接受 `hook_event_name === 'SubagentStop'`。
- 缺少 `agent_id` 返回 null。
- `displayName = agent_type || agent_id`。
- `lastSeenAt = new Date().toISOString()`。

### TODO

- [x] 普通工具事件写入 `actorKind: 'main-agent'`。
- [x] Agent 工具提取 `agentId`。
- [x] Agent 工具提取子 agent 名称。
- [x] Agent 工具提取 `totalToolUseCount`。
- [x] Agent 工具提取 `totalTokens`。
- [x] Agent 工具提取 `totalDurationMs`。
- [x] Agent 工具 `durationMs` 优先使用完整子 agent 耗时。
- [x] 新增 `normalizeClaudeSubagentStopHook()`。
- [x] `src/extractors/index.ts` 导出新函数。

## 8. Cache 实现

### 8.1 修改 `src/tool-timeline/cache.ts`

新增：

```ts
export function upsertToolTimelineAgentMeta(
  sessionId: string,
  agent: ToolTimelineAgentMeta,
  provider?: ToolTimelineProvider
): ToolTimelineCache
```

调整 `appendToolTimelineEvent()`：

- 读旧 cache。
- 保留旧 `agents`。
- 写新 cache version 2。
- 写 `stats` 和 `analyticsStats`。

新增：

```ts
export function computeToolAnalyticsStats(
  events: ToolTimelineEvent[],
  agents?: Record<string, ToolTimelineAgentMeta>
): ToolAnalyticsStats
```

### 8.2 统计规则

`mainAgentToolCalls`：

- 普通工具事件计 1。
- `Agent` 工具事件本身计 1。

`subagentToolCalls`：

- 对每个 `Agent` 事件，取 `subagentMetrics.totalToolUseCount || 0`。
- 不要把 `Agent` 工具本身重复计入 subagent。

`totalToolCalls`：

```ts
mainAgentToolCalls + subagentToolCalls
```

`bySubagent`：

- 只统计有 `subagentMetrics` 的 Agent 事件。
- key 使用 `actorName || subagentType || agent meta displayName || agentId || labels.unknownAgent`。

`subagentCount`：

- `bySubagent` key 数量，或 agentId 去重数量。

`subagentTokens`：

- sum `subagentMetrics.totalTokens`。

`slowest`：

- 普通工具用 `durationMs`。
- Agent 事件用 `subagentMetrics.totalDurationMs || durationMs`。

`successRate`：

- 基于事件成功率，不用 `subagentToolCalls` 展开计算，因为子 agent 内部成功失败细节不可得。
- 如果 Agent response 有失败状态，则 Agent 事件为 failure。

### TODO

- [x] 新增 `computeToolAnalyticsStats()`。
- [x] 新增 `upsertToolTimelineAgentMeta()`。
- [x] `appendToolTimelineEvent()` 写入 cache version 2。
- [x] `appendToolTimelineEvent()` 保留旧 `agents`。
- [x] `readToolTimelineCache()` 兼容 version 1 和 version 2。
- [x] cache 损坏仍返回 null。
- [x] `clearToolTimelineCache()` 行为不变。

## 9. 面板渲染实现

### 9.1 新增渲染函数

在 `src/extractors/tool-timeline.ts` 新增：

```ts
export interface ToolAnalyticsPanel {
  text: string;
}

export function renderToolAnalyticsPanel(
  sessionId: string,
  config: ToolTimelineModuleConfig,
  theme: Theme,
  language: Language,
  snapshot?: {
    contextWindow?: ContextWindow;
    cost?: CostInfo;
  }
): ToolAnalyticsPanel | null
```

### 9.2 面板格式

默认：

- `panelWidth = 59`
- `maxDisplayEvents = 5`

边框：

```ts
const border = '═'.repeat(panelWidth);
const divider = '─'.repeat(panelWidth);
```

标题居中或固定缩进：

```text
   工具分析
```

### 9.3 context token 计算

从 snapshot：

```ts
const usage = contextWindow.current_usage;
const total =
  usage.input_tokens +
  usage.output_tokens +
  usage.cache_creation_input_tokens +
  usage.cache_read_input_tokens;
```

如果 `current_usage` 不存在，则 fallback：

```ts
contextWindow.total_input_tokens + contextWindow.total_output_tokens
```

显示：

```text
上下文: 128.4K tokens
Context: 128.4K tok
```

### 9.4 最近 5 条格式

```text
    [Bash]  npm run build       1.8s   ✓
```

Agent 行：

```text
    [Agent] Explore             7 tools 42.1K tok 18.4s ✓
```

过长字段截断：

- 工具列固定 8。
- summary 默认 20-24，根据面板宽度计算。
- 截断使用 `...`，避免 Unicode 省略号引起宽度不稳定。

### TODO

- [x] 新增 `ToolAnalyticsPanel` 类型。
- [x] 实现 `renderToolAnalyticsPanel()`。
- [x] 面板读取 cache，无 cache 返回 null。
- [x] 面板最多展示最近 5 条。
- [x] 面板展示 Calls。
- [x] 面板展示 Context tokens。
- [x] 面板展示 Success。
- [x] 面板展示 Main agent。
- [x] 面板展示 Subagents。
- [x] 面板展示具体子 agent 名称。
- [x] 面板展示 Slowest。
- [x] 面板展示 Recent。
- [x] 面板文案使用 i18n labels。
- [x] 长行稳定截断，不撑破面板。
- [x] 保留旧 `extractToolTimeline()`，用于兼容 summary / compact-list。

## 10. `src/index.ts` 接入

### 10.1 新增 panels 输出

当前：

```ts
const segments: OrderedSegment[] = [];
```

改为：

```ts
const segments: OrderedSegment[] = [];
const panels: OrderedSegment[] = [];
```

### 10.2 toolTimeline 分支调整

当前将 tool timeline push 到 `segments`。

改为：

```ts
if (modules.toolTimeline.enabled) {
  if ((modules.toolTimeline.displayMode || 'analytics-panel') === 'analytics-panel') {
    const panel = renderToolAnalyticsPanel(
      input.session_id,
      modules.toolTimeline,
      theme,
      config.language,
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
  } else {
    // 可选兼容旧 summary / compact-list，但不要作为默认
  }
}
```

最终输出：

```ts
segments.sort((a, b) => a.order - b.order);
panels.sort((a, b) => a.order - b.order);

const normalOutput = renderLayout(...);
const output = [
  normalOutput,
  ...panels.map((p) => p.text)
].filter(Boolean).join('\n');
console.log(output);
```

### TODO

- [x] import `renderToolAnalyticsPanel`。
- [x] 新增 `panels` 数组。
- [x] `toolTimeline` 默认走 analytics panel。
- [x] 不再把 analytics panel push 到普通 `segments`。
- [x] 最终 output 拼接 normal layout 和 panels。
- [x] debug 行为保持不变。

## 11. CLI 与 hooks

### 11.1 修改 `src/cli.ts`

新增内部命令：

```text
pulse-line hook collect-subagent-event --provider claude-code
```

行为：

- 读 stdin。
- JSON parse 失败退出 0。
- 调用 `normalizeClaudeSubagentStopHook()`。
- 返回 null 则退出 0。
- 调用 `upsertToolTimelineAgentMeta()`。
- 不向 stdout 打印。

### 11.2 修改 `hooks/hooks.json`

新增：

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

### TODO

- [x] `src/cli.ts` import 新 normalizer 和 cache upsert 函数。
- [x] 新增 `hook collect-subagent-event`。
- [x] 命令异常退出码保持 0。
- [x] hook 命令无 stdout。
- [x] 更新 `hooks/hooks.json`。
- [x] 保留现有 `hook collect-tool-event`。
- [x] 保留现有 `timeline` CLI。

## 12. 文档更新

### README

更新：

- 功能描述从“工具时间线”改为“工具分析”。
- 说明默认展示独立面板。
- 说明最近 5 条调用作为辅助信息。
- 说明 token 是当前 context token。
- 说明 slash command / CLI 是调试路径。

### README_EN

同 README。

### CHANGELOG

新增：

- Tool analytics panel.
- Agent / subagent usage stats.
- i18n for analytics panel.

### commands

`commands/timeline.md` 可保留，但描述改为：

- Debug/export tool timeline cache.
- Main analytics appears directly in statusline when enabled.

### TODO

- [x] 更新 `README.md`。
- [x] 更新 `README_EN.md`。
- [x] 更新 `CHANGELOG.md`。
- [x] 更新 `commands/timeline.md` 文案。
- [x] 如新增 `analytics` CLI，再新增 command 文档。

## 13. 测试实施

### 13.1 新增测试文件建议

```text
test/tool-analytics-stats.test.ts
test/tool-analytics-render.test.ts
test/tool-analytics-cli.test.ts
test/tool-analytics-index.test.ts
```

也可以复用现有：

```text
test/tool-timeline-normalize.test.ts
test/tool-timeline-cache.test.ts
test/tool-timeline-render.test.ts
test/tool-timeline-cli.test.ts
```

### 13.2 normalizer 测试 TODO

- [x] 普通 Bash 事件 `actorKind` 是 `main-agent`。
- [x] Agent 事件提取 `agentId`。
- [x] Agent 事件提取 agent 名称。
- [x] Agent 事件提取 `totalToolUseCount`。
- [x] Agent 事件提取 `totalTokens`。
- [x] Agent 事件提取 `totalDurationMs`。
- [x] Agent 事件没有 telemetry 时不抛错。
- [x] SubagentStop 正常生成 `ToolTimelineAgentMeta`。
- [x] SubagentStop 缺少 `agent_id` 返回 null。

### 13.3 cache/stats 测试 TODO

- [x] `computeToolAnalyticsStats()` 统计普通工具总数。
- [x] Agent 工具本身计入 main agent。
- [x] Agent `totalToolUseCount` 计入 subagent tools。
- [x] 总调用数 = main + subagent。
- [x] `bySubagent` 包含具体 agent 名称。
- [x] `subagentTokens` 正确累加。
- [x] `slowest` 可识别普通工具。
- [x] `slowest` 可识别 Agent 聚合耗时。
- [x] `successRate` 正确。
- [x] cache version 1 可读。
- [x] cache version 2 可读。
- [x] `upsertToolTimelineAgentMeta()` 能新增 agent。
- [x] `upsertToolTimelineAgentMeta()` 能更新 agent。

### 13.4 render 测试 TODO

- [x] 中文面板包含 `工具分析`。
- [x] 中文面板包含 `调用`、`上下文`、`成功`、`最慢`、`最近`。
- [x] 英文面板包含 `TOOL ANALYTICS`。
- [x] 英文面板包含 `Calls`、`Context`、`Success`、`Slowest`、`Recent`。
- [x] 面板最多显示 5 条 Recent。
- [x] 面板显示 Main agent 工具数。
- [x] 面板显示 Subagents 工具数和 agent 数。
- [x] 面板显示具体子 agent 名称。
- [x] 面板显示最耗时工具。
- [x] 无 cache 返回 null。
- [x] 空 events 返回 null 或显示空状态，按实现决定并固定测试。

### 13.5 index 集成测试 TODO

- [x] 启用 `toolTimeline` 后输出包含独立边框。
- [x] 输出不包含旧内联 `[工具] 3 calls avg`。
- [x] 普通状态栏仍按 `maxPerLine` 分行。
- [x] 中文配置输出中文面板。
- [x] 英文配置输出英文面板。

### 13.6 CLI 测试 TODO

- [x] `hook collect-subagent-event` 无效 JSON 退出 0。
- [x] `hook collect-subagent-event` 正常写 agent meta。
- [x] 命令无 stdout。
- [x] `timeline --json` 包含 `analyticsStats`。

## 14. 手工验收步骤

### 14.1 模拟普通工具

```powershell
$json = @{
  session_id = "analytics-session"
  hook_event_name = "PostToolUse"
  tool_name = "Bash"
  tool_input = @{ command = "npm test" }
  tool_response = @{ stdout = "ok" }
  tool_use_id = "toolu_bash_1"
  duration_ms = 9000
} | ConvertTo-Json -Depth 10

$json | node dist/src/cli.js hook collect-tool-event --provider claude-code
```

### 14.2 模拟 Agent 工具

```powershell
$json = @{
  session_id = "analytics-session"
  hook_event_name = "PostToolUse"
  tool_name = "Agent"
  tool_input = @{
    subagent_type = "Explore"
    description = "Explore codebase"
  }
  tool_response = @{
    agentId = "agent_explore_1"
    status = "success"
    totalToolUseCount = 7
    totalTokens = 42100
    totalDurationMs = 18400
  }
  tool_use_id = "toolu_agent_1"
  duration_ms = 18500
} | ConvertTo-Json -Depth 10

$json | node dist/src/cli.js hook collect-tool-event --provider claude-code
```

### 14.3 模拟 SubagentStop

```powershell
$json = @{
  session_id = "analytics-session"
  hook_event_name = "SubagentStop"
  agent_id = "agent_explore_1"
  agent_type = "Explore"
  agent_transcript_path = "D:\tmp\agent.jsonl"
} | ConvertTo-Json -Depth 10

$json | node dist/src/cli.js hook collect-subagent-event --provider claude-code
```

### 14.4 模拟 statusline

```powershell
node dist/src/cli.js enable toolTimeline
Get-Content test\fixtures\sample-input.json | node dist/src/index.js
```

预期：

- 输出普通状态栏后另起面板。
- 面板标题是 `工具分析` 或 `TOOL ANALYTICS`。
- 面板包含 Calls / Context / Main agent / Subagents / Slowest / Recent。
- 最近调用最多 5 条。

## 15. 验收标准

功能：

- [x] `toolTimeline` 不再嵌入普通状态栏。
- [x] 面板独立显示。
- [x] 面板展示总工具调用数。
- [x] 面板展示当前 context token。
- [x] 面板展示主 agent 工具数。
- [x] 面板展示子 agent 工具数、子 agent 数、具体名称。
- [x] 面板展示最耗时工具。
- [x] 面板最多展示最近 5 条调用。
- [x] 面板支持中文和英文。

数据：

- [x] 普通工具计入 main agent。
- [x] Agent 工具本身计入 main agent。
- [x] Agent telemetry 中 `totalToolUseCount` 计入 subagent tools。
- [x] Agent telemetry 中 `totalTokens` 计入 subagent tokens。
- [x] Agent telemetry 中 `totalDurationMs` 参与最慢工具计算。
- [x] statusline context token 不误称为累计 token。

质量：

- [x] `npm run build` 通过。
- [x] `npm test` 通过。
- [x] 新增测试覆盖 normalizer、cache、stats、render、CLI、index、i18n。
- [x] 手工模拟 hook 和 statusline 通过。

## 16. 风险与处理

### 16.1 子 agent 字段不稳定

风险：不同 Claude Code 版本的 `Agent` tool_input 字段名可能不同。

处理：

- 多字段 fallback：`subagent_type`、`agent_type`、`description`、`agentId`。
- `SubagentStop` hook 补充 `agent_id -> agent_type`。
- 缺少名称时显示 i18n 的 unknown agent。

### 16.2 token 语义混淆

风险：context token 与 Agent telemetry token 不是同一层级。

处理：

- 面板显示 `Context` 而不是 `Total tokens`。
- 子 agent token 单独显示或只在 Agent recent 行显示。
- README 明确说明。

### 16.3 面板太高

风险：多行面板占用状态栏空间。

处理：

- 默认 recent 仅 5 条。
- 可配置 `showRecent: false`。
- 可配置 `panelWidth`。

### 16.4 ANSI 影响对齐

风险：逐段加色会破坏宽度计算。

处理：

- MVP 先纯文本面板或按整行加色。
- 截断和 padding 在加 ANSI 前完成。

## 17. 最终 TODO 汇总

### 阶段 A：类型和配置

- [x] 扩展 `src/types/tool-timeline.ts`。
- [x] 扩展 `ToolTimelineModuleConfig`。
- [x] 默认配置改为 analytics panel。
- [x] schema 升级到 v6。
- [x] cache key 升级到 v6。
- [x] migration 测试更新。

### 阶段 B：i18n

- [x] 中文 locale 添加工具分析标签。
- [x] 英文 locale 添加工具分析标签。
- [x] renderer 接入 language/labels。
- [x] i18n 测试覆盖中英文。

### 阶段 C：采集和缓存

- [x] Agent 工具 normalizer。
- [x] SubagentStop normalizer。
- [x] agent meta cache upsert。
- [x] cache version 2。
- [x] analytics stats 计算。

### 阶段 D：渲染和 index 接入

- [x] 实现 `renderToolAnalyticsPanel()`。
- [x] `src/index.ts` 增加 panels 输出。
- [x] tool analytics 不进入普通 segments。
- [x] 最近调用限制 5 条。

### 阶段 E：CLI 和 hooks

- [x] 新增 `hook collect-subagent-event`。
- [x] 更新 `hooks/hooks.json`。
- [x] 保留 timeline CLI。
- [x] CLI 测试更新。

### 阶段 F：文档和验证

- [x] README 更新。
- [x] README_EN 更新。
- [x] CHANGELOG 更新。
- [x] commands 文档更新。
- [x] build 通过。
- [x] test 通过。
- [x] 手工模拟通过。
