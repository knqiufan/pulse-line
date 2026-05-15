# Pulse Line 工具调用时序可视化与 Codex 支持调研

> 调研日期：2026-05-13
>
> 项目对象：`pulse-line`，当前定位为 Claude Code statusLine 插件。
>
> 结论范围：面向当前仓库的实现分析，不包含实际功能代码落地。

## 1. 执行摘要

这次调研覆盖两个问题：

1. 如何在当前工具栏项目中实现 `docs/four-ideas-deep-dive.md` 2.2 提到的“工具调用时序可视化”。
2. 如何让插件同样支持 OpenAI Codex。

核心结论如下：

- 工具调用时序可视化值得做，且应当作为 Pulse Line 的一个新模块接入现有 `modules` 配置系统。它不应在每次 statusline 渲染时完整解析 transcript，而应通过 hook 预计算缓存，statusline 只读取缓存并渲染。
- 对 Claude Code，最稳妥的数据来源不是只解析 transcript，而是优先使用 `PostToolUse` / `PostToolUseFailure` hook 输入。官方 hook 事件中包含工具名、输入、响应以及 `duration_ms`，天然适合生成工具时间线。`transcript_path` 仍可作为历史回放、冷启动补全、兜底解析来源。
- 对 Codex，当前官方能力与 Claude Code 不对等。Codex 有插件与 hooks，也有 TUI `status_line` 配置，但 `tui.status_line` 是固定内置 item 列表，不是 Claude Code 那种“执行自定义命令、stdin 传 JSON、stdout 即状态栏”的接口。因此，“同样支持 Codex”需要拆成两层：采集/分析层可支持 Codex，TUI 原生状态栏展示无法做到与 Claude Code 完全等价，除非 Codex 后续开放 custom command statusline。
- 推荐路线是先抽象 `ProviderAdapter`，让 Pulse Line 形成 `claude-code` 和 `codex` 两个运行时适配器。Claude Code adapter 负责现有 statusline 渲染；Codex adapter 先提供 hooks 采集、缓存、命令行查看和导出能力，并在 Codex TUI 中最多利用官方内置 `tui.status_line` 展示模型、token、context 等内置项。

## 2. 当前项目现状

### 2.1 现有架构

仓库已经是一个 Node.js/TypeScript CLI：

- `bin/pulse-line.js`：无参数且有 stdin 时进入 statusline 渲染；有参数时进入 CLI。
- `src/index.ts`：读取 Claude Code statusline stdin JSON，加载配置和主题，按模块顺序生成 segments，再用 `renderLayout` 输出。
- `src/types/pulse-input.ts`：定义 Claude Code statusline 输入结构，包括 `cwd`、`session_id`、`transcript_path`、`model`、`workspace`、`cost`、`context_window` 等。
- `src/types/pulse-config.ts`：定义配置和模块开关。当前已有 15 个模块：`model`、`git`、`workspace`、`context`、`cacheRatio`、`mcpStatus`、`accountUsage`、`turns`、`thinking`、`cost`、`duration`、`rateLimits`、`weeklyQuota`、`outputStyle`、`thirdPartyApi`。
- `src/extractors/transcript.ts`：当前只做对话轮次数量统计，读取完整 transcript 并统计 `type === 'user' || type === 'assistant'`。
- `hooks/hooks.json`：目前只有 `SessionStart` hook，用来运行 `scripts/auto-setup.js`，自动写入 Claude Code `settings.json.statusLine`。
- `scripts/auto-setup.js`：如果用户没有配置 `statusLine.command`，写入 `npx -y pulse-line@latest`。

这说明 Pulse Line 已有良好的“模块化渲染层”，但还没有“事件采集层”。工具时序功能正好需要补齐这一层。

### 2.2 现有性能特点

当前 statusline 渲染路径里有几类成本：

- 纯 stdin 字段提取：`model`、`context`、`cost`、`workspace`，成本低。
- 本地命令或文件读取：`git`、`mcpStatus`、`turns`、`duration`，有潜在耗时。
- 异步网络：`accountUsage` 当前会 `await refreshAccountUsage(...)`，超时 2000ms；`thirdPartyApi` 则 fire-and-forget。

工具时序如果直接在 `src/index.ts` 中每次解析 transcript，会放大 statusline 的不稳定性。尤其长会话 JSONL 可能有数千行，完整读取会造成延迟和 IO 抖动。因此这个功能必须走缓存。

## 3. 官方能力调研

### 3.1 Claude Code statusline 与 hooks

Claude Code 官方 statusline 文档说明：

- 可以在 `settings.json` 中配置 `statusLine`，类型为 `command`。
- statusline 命令通过 stdin 接收 JSON，上下文包含 session、transcript path、cwd、model、workspace、version、cost、context window 等。
- 输出 stdout 的首行或多行作为状态栏内容。

Claude Code hooks 文档说明：

- hooks 是用户自定义 shell 命令，会在特定生命周期事件触发。
- `PostToolUse` 在工具调用成功完成后运行。
- `PostToolUse` 输入包含 `session_id`、`transcript_path`、`cwd`、`hook_event_name`、`tool_name`、`tool_input`、`tool_response`。
- `PostToolUse` 示例中包含 `duration_ms`，这对工具耗时统计非常关键。
- `PostToolUseFailure` 在工具调用失败后运行，输入同样包含 session、transcript、cwd、工具名、工具输入、错误信息、`duration_ms`。

对本项目的含义：

- 2.2 文档里“从 transcript 的 tool_use/tool_result 对计算耗时”的方案可作为兜底，但不应作为首选。
- 更优方案是 hook 事件驱动：工具每完成一次，hook 直接追加一条事件到 Pulse Line 缓存。
- transcript 用于冷启动补全和历史重建，不参与每次 statusline 主路径。

### 3.2 Codex hooks、插件和 TUI status line

OpenAI Codex 官方文档显示：

- Codex 支持配置 hooks。hooks 可以在用户提交 prompt、agent turn 结束、session 结束等事件上运行，并会通过 stdin 传递 JSON。
- Codex 支持插件。插件可以打包命令、子代理、hooks、MCP servers、通知器与技能等目录能力。
- Codex 配置文件中有 `[tui] status_line = [...]`。官方 sample 中展示了 `["model-with-reasoning", "tokens", "context-window"]` 这类内置 item。
- Codex `tui.status_line` 的文档将其描述为 “Status-line contents, as a list of item identifiers”，也就是 item identifier 列表，而不是任意外部 command。

对本项目的含义：

- Codex 可以支持“采集工具事件、生成缓存、CLI 查询、导出报告”。
- Codex 目前不能原生支持 Pulse Line 这种自定义命令输出式状态栏，至少官方文档没有给出等价接口。
- 因此 Codex 支持不应直接承诺“状态栏完全一致”。合理表述是：“Codex 兼容模式支持 hooks 采集和命令行面板；原生 TUI 状态栏仅支持 Codex 内置 items，等待 Codex 开放 custom status line 后可接入完整渲染。”

## 4. 工具调用时序可视化的目标定义

### 4.1 用户价值

这个模块解决三类问题：

- 最近做了什么：快速看到最近 N 次工具调用，例如 `Read`、`Edit`、`Bash`、`Grep`、`MultiEdit`。
- 卡在哪里：发现慢工具、失败工具、长时间运行命令、重复读取/修改同一文件。
- 会话健康度：统计失败率、平均耗时、总耗时、工具分布，辅助判断是否陷入循环或需要人工介入。

### 4.2 MVP 展示形态

Pulse Line 现有渲染是 segment 风格，不适合默认输出十几行大面板。建议 MVP 采用单段摘要：

```text
[工具] 8 calls  avg 320ms  slow: Bash 2.8s  fail 1
```

如果启用详细模式，再输出多行：

```text
[工具] Last 6: Read 45ms OK | Bash 2.8s OK | Edit 180ms OK | Bash 320ms FAIL
[工具] avg 520ms  total 4.2s  fail 25%  slowest Bash npm test
```

推荐默认配置：

- 默认启用摘要模式，不默认启用多行 timeline。
- 最大显示最近 5 到 8 次工具调用。
- 多行详细模式需要用户显式开启，因为 statusline 本质上应保持紧凑。

### 4.3 视觉编码

现有项目同时支持 `text` 和 `nerd` iconSet。timeline 必须遵守 ASCII-safe 默认：

- `OK` / `ERR` 替代 Unicode 勾叉。
- `[工具]` 或 `[Tool]` 作为 text icon。
- 耗时条建议使用已有 `renderProgressBar`，但默认单行摘要可以不显示条形图，避免横向过长。
- 慢工具用主题 `warning` 色，失败工具用 `error` 色，普通摘要用 `info` 或 `muted` 色。

## 5. 推荐技术方案

### 5.1 总体架构

新增一条事件驱动链路：

```text
Claude Code PostToolUse/PostToolUseFailure hook
        ↓ stdin JSON
pulse-line hook collect-tool-event
        ↓ normalize
~/.claude/pulse/cache/tool-timeline/<session_id>.json
        ↓ read only
statusline src/index.ts timeline module
        ↓
renderLayout 输出
```

关键原则：

- hook 更新缓存，statusline 读取缓存。
- hook 失败不能阻塞 Claude Code 主流程，超时应短，错误静默或写 debug log。
- 缓存按 session 隔离，避免不同会话串数据。
- 缓存文件使用原子写入，避免读到半截 JSON。

### 5.2 数据模型

建议新增类型：

```ts
export interface ToolTimelineEvent {
  id: string;
  provider: 'claude-code' | 'codex';
  sessionId: string;
  transcriptPath?: string;
  cwd?: string;
  toolName: string;
  displayName: string;
  summary: string;
  status: 'success' | 'failure' | 'running' | 'unknown';
  startedAt?: string;
  endedAt: string;
  durationMs?: number;
  input?: unknown;
  responseSummary?: string;
  errorSummary?: string;
  target?: {
    kind: 'file' | 'command' | 'query' | 'url' | 'unknown';
    value: string;
  };
}

export interface ToolTimelineCache {
  version: 1;
  provider: 'claude-code' | 'codex';
  sessionId: string;
  updatedAt: string;
  events: ToolTimelineEvent[];
  stats: {
    total: number;
    success: number;
    failure: number;
    avgDurationMs?: number;
    totalDurationMs?: number;
    slowest?: ToolTimelineEvent;
    byTool: Record<string, number>;
  };
}
```

缓存只保留最近 N 条，例如默认 100 条。statusline 渲染只取最近 5 到 8 条或摘要统计。

### 5.3 hook 输入规范化

Claude Code hook 输入可归一为 `ToolTimelineEvent`：

```ts
function normalizeClaudeHook(input: any): ToolTimelineEvent | null {
  const success = input.hook_event_name === 'PostToolUse';
  const failure = input.hook_event_name === 'PostToolUseFailure';
  if (!success && !failure) return null;

  return {
    id: stableHash([
      input.session_id,
      input.tool_name,
      input.duration_ms,
      input.transcript_path,
      Date.now()
    ].join('|')),
    provider: 'claude-code',
    sessionId: input.session_id,
    transcriptPath: input.transcript_path,
    cwd: input.cwd,
    toolName: input.tool_name,
    displayName: input.tool_name,
    summary: summarizeTool(input.tool_name, input.tool_input),
    status: success ? 'success' : 'failure',
    endedAt: new Date().toISOString(),
    durationMs: typeof input.duration_ms === 'number' ? input.duration_ms : undefined,
    input: input.tool_input,
    responseSummary: success ? summarizeResponse(input.tool_response) : undefined,
    errorSummary: failure ? summarizeError(input.error) : undefined,
    target: extractTarget(input.tool_name, input.tool_input)
  };
}
```

`summarizeTool` 需要按工具类型处理：

- `Bash`：显示命令第一行，最长 40 到 60 字符，去掉换行和控制字符。
- `Read`：显示 `file_path`。
- `Edit` / `MultiEdit` / `Write`：显示目标文件，必要时显示 `+/-` 可选统计。
- `Grep` / `Glob`：显示 pattern 或 glob。
- `WebFetch` / `WebSearch`：显示 URL 或 query。
- 未知工具：显示工具名和 input key 摘要。

### 5.4 transcript 解析兜底

transcript 解析仍有价值，但建议降级为辅助：

- 当 hook 缓存不存在时，尝试解析 `transcript_path` 的尾部若干 KB，而不是完整文件。
- 用于导入历史调用，无法得到精准 `duration_ms` 时标记 `durationMs: undefined`。
- 因为不同版本 transcript schema 可能变化，解析器必须宽容：跳过无法识别行，不让 statusline 抛错。

当前 `src/extractors/transcript.ts` 完整读取文件统计 turns。timeline 不建议复用这种完整读取方式，应新增 tail parser。

可选策略：

- 简单版：`fs.statSync` 获取文件大小，读取最后 256KB，按行解析。
- 精准版：缓存上次 `offset`，hook 或 CLI 增量读取新内容。

MVP 不需要精准版，因为 hook 已能提供事件。

### 5.5 缓存写入策略

当前 `src/utils/cache.ts` 的 `saveSessionCache` 会直接写入整份 JSON。timeline 需要更稳的写法：

- 路径：`~/.claude/pulse/cache/tool-timeline/<sessionId>.json`
- 临时文件：`<sessionId>.json.tmp.<pid>`
- 写入临时文件后 `renameSync` 到正式文件。
- 写入前读取旧 cache，append 新事件，截断最近 N 条。
- 如果 JSON 损坏，重建 cache，不中断 hook。

建议新增：

```ts
export function getToolTimelineCachePath(sessionId: string): string
export function readToolTimelineCache(sessionId: string): ToolTimelineCache | null
export function appendToolTimelineEvent(event: ToolTimelineEvent, maxEvents: number): void
```

Windows 上 `renameSync` 覆盖已存在文件有边界差异，最稳妥是先写临时文件，然后 `copyFileSync`/`renameSync` 组合并捕获异常。由于状态栏是单读多写低并发，MVP 可接受捕获失败后忽略。

### 5.6 渲染策略

新增 extractor：

```text
src/extractors/tool-timeline.ts
```

职责：

- 读取 session cache。
- 计算摘要和最近调用列表。
- 返回一个或多个 `SegmentData` 或纯 text。

为了少改现有 `renderLayout`，MVP 返回单个 segment：

```ts
export interface ToolTimelineSegment {
  text: string;
  fg?: string;
}
```

摘要算法：

```text
last N events
total = events.length
failures = count(status === failure)
avg = avg(durationMs where defined)
slowest = max(durationMs)
tail = compact list of last 3 tool names
```

默认输出示例：

```text
[Tool] 12 calls avg 520ms slow Bash 2.8s fail 1
```

详细输出示例：

```text
[Tool] Read src/a.ts 45ms OK
[Tool] Bash npm test 2.8s OK
[Tool] Edit src/a.ts 180ms OK
```

考虑现有 layout 按 `maxPerLine` 分行，详细模式可以让 extractor 返回多个 ordered segments，但不建议在初版支持真正的大面板。否则会和 `maxPerLine` 逻辑冲突。

## 6. 配置设计

### 6.1 新增模块配置

在 `PulseConfig.modules` 中新增：

```ts
toolTimeline: ToolTimelineModuleConfig;
```

配置类型：

```ts
export interface ToolTimelineModuleConfig extends ModuleConfig {
  mode?: 'summary' | 'compact-list' | 'off';
  maxEvents?: number;
  maxDisplayEvents?: number;
  slowThresholdMs?: number;
  showFailures?: boolean;
  showAverage?: boolean;
  showSlowest?: boolean;
  summaryMaxLength?: number;
}
```

默认值建议：

```ts
toolTimeline: {
  enabled: false,
  order: 16,
  icon: '[Tool]',
  mode: 'summary',
  maxEvents: 100,
  maxDisplayEvents: 5,
  slowThresholdMs: 3000,
  showFailures: true,
  showAverage: true,
  showSlowest: true,
  summaryMaxLength: 72
}
```

为何默认关闭：

- 需要 hook 配置才能产生最佳数据。
- 旧用户升级后不应突然多一段状态栏内容。
- 允许先通过 `/pulse-line:enable toolTimeline` 显式启用。

### 6.2 CLI 命令

建议新增：

```text
pulse-line timeline
pulse-line timeline --last 20
pulse-line timeline --json
pulse-line timeline --session <id>
pulse-line timeline clear
```

这个命令对 Claude Code 和 Codex 都有价值。Codex 由于 TUI statusline 不支持自定义渲染，CLI timeline 会成为首个可用展示面。

### 6.3 hook 命令

新增内部命令：

```text
pulse-line hook collect-tool-event --provider claude-code
pulse-line hook collect-tool-event --provider codex
```

也可以拆成更直观的：

```text
pulse-line hook-claude-tool
pulse-line hook-codex-event
```

推荐前者，因为未来可统一 adapter。

## 7. Claude Code 插件改造方案

### 7.1 hooks.json

当前 `hooks/hooks.json` 只有 SessionStart。建议扩展为：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/auto-setup.js\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js\" hook collect-tool-event --provider claude-code"
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js\" hook collect-tool-event --provider claude-code"
          }
        ]
      }
    ]
  }
}
```

需要确认点：

- npm package `files` 已包含 `dist/` 和 `hooks/`，所以发布包里可以引用 `dist/src/cli.js`。
- 本地源码开发时如果未 build，hook 找不到 dist。可在文档中要求 `npm run build`，或 hook 改用 `npx -y pulse-line@latest hook ...`。后者适合发布包，前者适合 plugin root。考虑插件安装场景，引用 `${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js` 更可控。

### 7.2 plugin.json

当前 `.claude-plugin/plugin.json` 只声明 commands 和 skills，没有直接声明 hooks 文件路径。仓库通过 npm `files` 打包 `hooks/`，Claude Code 插件安装时是否自动读取 `hooks/hooks.json` 需要结合现有插件机制验证。当前功能已依赖这个 hook 自动配置，因此扩展同一个 `hooks/hooks.json` 是自然路径。

如插件市场需要显式声明 hooks，应按 Claude Code 最新插件规范调整。这个点在实现前应跑一次本地安装验证。

### 7.3 auto-setup 行为

`scripts/auto-setup.js` 目前只在没有 `settings.statusLine.command` 时写入，不覆盖用户已有 statusLine。这个策略应保持。timeline hook 不依赖 statusLine 被 Pulse Line 占用，理论上即使用户使用别的 statusline，Pulse Line 仍可采集工具事件。

但如果用户想看到 timeline segment，仍需要启用 Pulse Line statusLine。文档可以明确区分：

- “采集”：安装插件即可通过 hooks 采集。
- “显示在状态栏”：需要 `settings.statusLine.command` 指向 Pulse Line。

## 8. Codex 支持方案

### 8.1 支持目标分级

Codex 支持建议分三档表述：

#### L1：CLI 兼容

目标：

- `pulse-line codex install` 初始化 Codex 配置片段或提示用户配置。
- Codex hooks 调用 `pulse-line hook collect-tool-event --provider codex`。
- `pulse-line timeline` 可以查看 Codex 会话工具时序。

优点：

- 不依赖 Codex 自定义 statusline 能力。
- 采集和分析能力可先落地。

限制：

- 不在 Codex TUI 状态栏中显示完整 Pulse Line。

#### L2：Codex TUI 内置 status_line 辅助

目标：

- 自动或文档提示用户在 `~/.codex/config.toml` 中配置：

```toml
[tui]
status_line = ["model-with-reasoning", "tokens", "context-window"]
```

优点：

- 利用 Codex 官方内置状态栏。

限制：

- 只能显示 Codex 支持的 item，不能显示 Pulse Line 自定义 timeline。

#### L3：完整自定义状态栏

目标：

- 等 Codex 支持 command-based statusline 后，复用 Pulse Line 渲染器。

限制：

- 当前官方文档未显示该能力，不应作为近期承诺。

### 8.2 Codex adapter 设计

建议新增抽象：

```ts
export interface RuntimeAdapter {
  id: 'claude-code' | 'codex';
  normalizeHookInput(raw: unknown): ToolTimelineEvent | null;
  getConfigDir(): string;
  getCacheDir(): string;
  supportsCommandStatusLine: boolean;
}
```

Claude Code adapter：

- `getConfigDir()` 返回 `~/.claude/pulse`。
- `supportsCommandStatusLine = true`。
- 输入来自 statusline stdin 和 hook stdin。

Codex adapter：

- `getConfigDir()` 可选两种策略：
  - 共享：继续使用 `~/.claude/pulse`，优点是代码少，缺点是命名不准确。
  - 独立：使用 `~/.codex/pulse`，优点是平台边界清晰。
- 推荐独立：`~/.codex/pulse`。长期更清晰，也避免用户卸载 Claude Code 配置时影响 Codex。
- `supportsCommandStatusLine = false`。
- 输入来自 Codex hooks stdin。由于 Codex hook event schema 与 Claude 不同，adapter 内部做宽容解析。

### 8.3 Codex 插件目录结构

Codex 官方插件可包含 hooks、commands、skills 等目录。建议不要把 Claude Code `.claude-plugin` 与 Codex 插件强行混成同一个 manifest，而是在仓库内提供并行目录：

```text
.claude-plugin/
  plugin.json
hooks/
  hooks.json
codex-plugin/
  plugin.json
  hooks/
    hooks.json
  commands/
    timeline.md
```

如果 Codex 插件规范要求 `.codex-plugin/plugin.json`，则改为：

```text
.codex-plugin/
  plugin.json
codex/
  hooks/
  commands/
```

实现前需要用当前 Codex CLI 验证插件 manifest 的确切目录命名。官方文档确认了 Codex 插件能力，但不同版本可能对本地插件目录名称有约束。

### 8.4 Codex hook 配置示意

伪配置如下，具体 event 名称需以当前 Codex 文档和本地 CLI 为准：

```toml
[[hooks]]
event = "agent-turn-end"
command = "pulse-line hook collect-tool-event --provider codex"
```

由于 Codex hooks 不一定逐工具触发，如果只有 turn-level 事件，Codex adapter 需要从 hook JSON 中提取 turn 内 tool calls，或从 Codex session log 解析。这个点是 Codex 支持的最大不确定性。

推荐实现策略：

1. 先支持 Codex hook stdin 中显式出现的 tool call 信息。
2. 如果没有 tool call 级事件，改为记录 turn summary：本轮工具数量、失败数量、总耗时。
3. 后续再补 Codex session log parser。

### 8.5 Codex 与 Claude Code 输入差异

Claude Code statusline 输入已经在 `PulseInput` 中建模。Codex 没有等价自定义 statusline stdin，所以不能复用 `PulseInput` 作为全局输入模型。

建议新增：

```ts
export interface PulseRuntimeContext {
  provider: 'claude-code' | 'codex';
  cwd?: string;
  sessionId?: string;
  transcriptPath?: string;
  model?: {
    id?: string;
    displayName?: string;
  };
  contextWindow?: {
    usedPercentage?: number;
    remainingPercentage?: number;
    size?: number;
  };
}
```

Claude Code statusline 渲染继续用 `PulseInput`，不要为了 Codex 大改主路径。Codex CLI/report 路径使用 `PulseRuntimeContext` 即可。

## 9. 实施计划

### 阶段 1：Claude Code timeline MVP

目标：在 Pulse Line 状态栏显示工具调用摘要。

改动：

- 新增 `src/types/tool-timeline.ts`。
- 新增 `src/utils/atomic-json.ts` 或在 cache utils 中加入原子 JSON 写入。
- 新增 `src/extractors/tool-timeline.ts`。
- 新增 CLI 子命令 `hook collect-tool-event --provider claude-code`。
- 扩展 `hooks/hooks.json`，加入 `PostToolUse` 和 `PostToolUseFailure`。
- 扩展 `PulseConfig.modules`，加入 `toolTimeline` 默认关闭。
- 扩展 `src/index.ts`，启用模块时读取 cache 并渲染。
- 增加测试：hook normalize、cache append、extractor render、config migration。

验收标准：

- 运行一次工具后，`~/.claude/pulse/cache/tool-timeline/<session>.json` 产生事件。
- 启用 `toolTimeline` 后，statusline 显示摘要。
- hook 输入异常、cache 损坏、transcript 缺失都不会导致 statusline 报错。
- `npm test` 通过。

### 阶段 2：timeline 详细视图与 CLI

目标：让用户可查看最近 N 次工具调用详情。

改动：

- `pulse-line timeline --last 20`
- `pulse-line timeline --json`
- `pulse-line timeline clear`
- 支持 `mode: compact-list`。
- 支持按工具类型统计。

验收标准：

- CLI 能输出表格和 JSON。
- 状态栏默认仍保持紧凑。

### 阶段 3：Codex L1 支持

目标：Codex hooks 能写入 timeline cache，CLI 能查看。

改动：

- 新增 `src/adapters/codex.ts`。
- 新增 Codex 配置/插件安装命令，例如 `pulse-line codex install`。
- 新增 Codex cache root：`~/.codex/pulse/cache`。
- 新增 Codex hook normalize 测试，基于真实 hook sample 校准。

验收标准：

- Codex 环境中触发 hook 后可以生成 timeline cache。
- `pulse-line timeline --provider codex` 可读取并展示。
- 文档明确说明 Codex TUI 原生状态栏限制。

### 阶段 4：Codex L2 文档与内置 status_line 辅助

目标：给 Codex 用户提供可用的 TUI status_line 配置建议。

改动：

- `pulse-line codex status-line preset basic` 输出或写入：

```toml
[tui]
status_line = ["model-with-reasoning", "tokens", "context-window"]
```

- 文档说明这不是 Pulse Line 自定义渲染，只是 Codex 官方内置状态栏项。

验收标准：

- 不破坏用户原有 `~/.codex/config.toml`。
- 写配置前备份或只输出建议，让用户确认。

## 10. 风险与待确认问题

### 10.1 Claude Code 侧风险

- `PostToolUseFailure` 是否在所有用户版本都可用，需要本地验证。若不可用，先只接 `PostToolUse`。
- `duration_ms` 在官方示例中存在，但需要确认实际版本是否总是提供。若缺失，事件仍记录，只是不显示耗时。
- hooks JSON 结构在插件打包中的自动加载行为需验证。当前仓库已有 hooks 目录，但实现 timeline 前应跑插件安装测试。
- statusline 多行输出可能影响终端体验。建议默认摘要模式。

### 10.2 Codex 侧风险

- Codex `tui.status_line` 当前不支持自定义 command，这是最大的展示限制。
- Codex hook event 粒度可能不是 tool-level。如果没有逐工具事件，需要从 turn-level payload 或 session log 中提取。
- Codex 插件 manifest 的本地目录规范需要用当前 Codex CLI 验证。官方文档确认有插件能力，但落地结构应以 CLI 实测为准。
- Codex 配置文件是 TOML，Node 标准库没有 TOML parser。若要自动编辑，需要新增依赖或实现保守文本 patch。推荐初期只输出配置片段，避免破坏用户配置。

## 11. 对 `docs/four-ideas-deep-dive.md` 2.2 的修正建议

原文提出以 `transcript_path` 为核心数据源，通过解析 JSONL 中的 `tool_use/tool_result` 对计算持续时间。这个方向可行，但建议调整为：

1. 首选 `PostToolUse` / `PostToolUseFailure` hooks，因为 hook 输入直接提供工具名、输入、响应、错误与耗时。
2. `transcript_path` 作为兜底和历史导入，不进入 statusline 热路径。
3. 缓存路径使用现有 Pulse Line 目录：`~/.claude/pulse/cache/tool-timeline/<session_id>.json`，不要另建 `~/.claude/plugin-cache`。
4. 展示从单行摘要开始，不默认大面板。
5. 工具时序模块应作为第 16 个模块接入现有 `PulseConfig.modules`，而不是另起 shell 模块体系。

## 12. 推荐最终方案

### 12.1 对工具调用时序

采用“hook 采集 + session cache + statusline 摘要 + CLI 详情”的方案：

```text
PostToolUse / PostToolUseFailure
  -> pulse-line hook collect-tool-event
  -> normalize ToolTimelineEvent
  -> append ~/.claude/pulse/cache/tool-timeline/<session>.json
  -> statusline reads summary
  -> pulse-line timeline reads detail
```

这个方案与当前仓库最契合，改动范围可控，性能风险低。

### 12.2 对 Codex 支持

不要把 Codex 支持定义为“完全复刻 Claude Code statusline”。应定义为：

- 第一阶段支持 Codex hook 采集和 CLI timeline。
- 第二阶段提供 Codex 官方内置 `tui.status_line` 的配置辅助。
- 第三阶段等待 Codex 开放 command statusline 后，复用 Pulse Line 渲染器。

对外文案建议：

```text
Pulse Line supports Claude Code as a full statusline provider.
For Codex, Pulse Line supports hook-based telemetry and CLI timeline reports.
Native Codex TUI statusline rendering is limited to Codex built-in status_line items until Codex exposes custom command statusline support.
```

## 13. 参考资料

- Claude Code Statusline 官方文档：`https://code.claude.com/docs/en/statusline`
- Claude Code Hooks 官方文档：`https://code.claude.com/docs/en/hooks`
- OpenAI Codex Config Reference：`https://developers.openai.com/codex/config-reference`
- OpenAI Codex Sample Config：`https://developers.openai.com/codex/config-sample`
- OpenAI Codex Hooks：`https://developers.openai.com/codex/hooks`
- OpenAI Codex Build a Plugin：`https://developers.openai.com/codex/plugins/build`
