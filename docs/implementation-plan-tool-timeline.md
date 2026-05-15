# 工具调用时序可视化具体实施方案

> 日期：2026-05-14
>
> 目标：在 Pulse Line 中实现“工具调用时序可视化”，让状态栏显示最近工具调用摘要，并提供 CLI 查看完整时间线。
>
> 适用范围：Claude Code 完整支持；Codex 复用同一数据模型和缓存层，具体接入见 `docs/implementation-plan-codex-support.md`。

## 1. 背景与结论

`docs/four-ideas-deep-dive.md` 2.2 提到通过 `transcript_path` 解析工具调用时序。这个方向可行，但直接在 statusline 渲染路径里解析 transcript 不适合当前项目。Claude Code 官方 statusline 是一个本地命令：它通过 stdin 接收 JSON，stdout 作为状态栏内容；状态栏更新有 300ms debounce，且新的更新会取消仍在运行的旧命令。因此重 IO 和复杂解析不能放进 `src/index.ts` 的热路径。

本方案采用：

```text
Claude Code PostToolUse / PostToolUseFailure hook
  -> pulse-line hook collect-tool-event --provider claude-code
  -> 归一化 ToolTimelineEvent
  -> 原子追加到 ~/.claude/pulse/cache/tool-timeline/<session_id>.json
  -> statusline 仅读缓存并渲染摘要
  -> pulse-line timeline 命令显示完整详情
```

关键设计：

- `PostToolUse` / `PostToolUseFailure` 是首选数据源，因为 hook 输入包含 `tool_name`、`tool_input`、`tool_response` 或 `error`，并且 Claude Code 文档中的 `duration_ms` 可直接用于耗时统计。
- `transcript_path` 只作为兜底和历史导入，不进入每次 statusline 主路径。
- 默认只渲染单段摘要，避免状态栏变成大面板。详细视图放到 CLI。
- 新模块默认关闭，避免升级后改变老用户状态栏。

## 2. 实现目标

### 2.1 MVP 必须完成

1. 记录 Claude Code 每次成功和失败的工具调用。
2. 缓存最近 N 条事件，默认 100 条。
3. 新增 `toolTimeline` 模块，启用后在状态栏显示单段摘要。
4. 新增 CLI：
   - `pulse-line hook collect-tool-event --provider claude-code`
   - `pulse-line timeline`
   - `pulse-line timeline --last <n>`
   - `pulse-line timeline --json`
   - `pulse-line timeline clear`
5. 扩展插件 hooks，让安装插件后能自动采集工具事件。
6. 提供完整单元测试和端到端命令测试。

### 2.2 MVP 不做

- 不默认展示多行大面板。
- 不做图形化 TUI。
- 不依赖 `jq`、`chalk`、`ink` 等额外包。
- 不上传任何 telemetry。
- 不解析完整 transcript 计算耗时。

### 2.3 后续增强

- `compact-list` 多段展示最近 3 到 5 次工具调用。
- 从 transcript tail 冷启动补全无 hook 缓存的会话。
- 与智能建议模块联动，例如检测重复读文件、连续失败命令。
- 按项目、按 session 汇总历史统计。

## 3. 当前代码接入点

当前仓库的相关结构：

```text
src/index.ts                       statusline 主渲染入口
src/cli.ts                         CLI 命令入口
src/types/pulse-config.ts          配置和模块定义
src/config/migrate-config.ts       配置 schema 迁移
src/config/loader.ts               配置加载、缓存、校验
src/themes/index.ts                主题加载与 nerd icon overlay
src/themes/builtin/*.ts            内置主题 component 样式
src/themes/icon-sets/*.ts          icon set 类型与默认值
src/i18n/locales/*.ts              中文/英文标签
src/extractors/index.ts            extractor 导出
hooks/hooks.json                   Claude Code 插件 hook 配置
scripts/auto-setup.js              SessionStart 自动配置 statusLine
test/*.test.ts                     node:test 测试
```

本功能要新增“事件采集层”，但尽量不重构现有渲染层。

## 4. 数据模型设计

### 4.1 新增文件

新增：

```text
src/types/tool-timeline.ts
```

### 4.2 类型定义

建议直接实现以下类型：

```ts
export type ToolTimelineProvider = 'claude-code' | 'codex';
export type ToolTimelineStatus = 'success' | 'failure' | 'unknown';
export type ToolTimelineTargetKind =
  | 'file'
  | 'command'
  | 'query'
  | 'url'
  | 'mcp'
  | 'unknown';

export interface ToolTimelineTarget {
  kind: ToolTimelineTargetKind;
  value: string;
}

export interface ToolTimelineEvent {
  id: string;
  provider: ToolTimelineProvider;
  sessionId: string;
  turnId?: string;
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
}

export interface ToolTimelineStats {
  total: number;
  success: number;
  failure: number;
  unknown: number;
  avgDurationMs?: number;
  totalDurationMs?: number;
  slowest?: {
    toolName: string;
    summary: string;
    durationMs: number;
  };
  byTool: Record<string, number>;
}

export interface ToolTimelineCache {
  version: 1;
  provider: ToolTimelineProvider;
  sessionId: string;
  updatedAt: string;
  events: ToolTimelineEvent[];
  stats: ToolTimelineStats;
}
```

注意：

- 不要把完整 `tool_input` / `tool_response` 存进 cache，避免泄露大文件内容、命令输出和敏感信息。
- 只保存摘要字段。
- `durationMs` 可选；没有就不参与平均耗时计算。
- `toolUseId` 存在时优先用于去重。

## 5. 归一化与摘要设计

### 5.1 新增文件

新增：

```text
src/extractors/tool-timeline.ts
```

该文件负责两件事：

1. hook 输入归一化。
2. statusline 摘要渲染。

如果文件过大，再拆为：

```text
src/tool-timeline/normalize.ts
src/tool-timeline/cache.ts
src/tool-timeline/render.ts
```

MVP 可先集中在一个 extractor 文件里，但测试必须覆盖关键函数。

### 5.2 Claude hook 输入接口

定义内部输入类型：

```ts
interface ClaudeToolHookInput {
  session_id?: string;
  transcript_path?: string | null;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  tool_use_id?: string;
  duration_ms?: number;
  error?: string;
  is_interrupt?: boolean;
}
```

### 5.3 归一化函数

实现：

```ts
export function normalizeClaudeToolHook(input: unknown): ToolTimelineEvent | null
```

规则：

- 仅接受 `hook_event_name === 'PostToolUse'` 或 `hook_event_name === 'PostToolUseFailure'`。
- 缺少 `session_id` 或 `tool_name` 时返回 `null`。
- `status`：
  - `PostToolUse` -> `success`
  - `PostToolUseFailure` -> `failure`
- `endedAt` 使用当前时间。
- `durationMs` 只接受非负有限数。
- `id` 优先使用 `${provider}:${session_id}:${tool_use_id}`；没有 `tool_use_id` 时使用 hash。

### 5.4 hash 工具

新增小工具，不要引入新依赖：

```ts
function stableHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
```

### 5.5 工具摘要规则

实现：

```ts
export function summarizeTool(toolName: string, input: unknown): {
  displayName: string;
  summary: string;
  target?: ToolTimelineTarget;
  inputSummary?: string;
}
```

规则表：

| 工具 | 输入字段 | summary | target |
|------|----------|---------|--------|
| `Bash` | `command`, `description` | 命令第一行，优先 description + `: command` | `{ kind: 'command', value }` |
| `Read` | `file_path` | 文件路径 basename 或相对路径 | `{ kind: 'file', value }` |
| `Write` | `file_path` | `write <file>` | `{ kind: 'file', value }` |
| `Edit` | `file_path` | `edit <file>` | `{ kind: 'file', value }` |
| `MultiEdit` | `file_path`, `edits` | `multi-edit <file> (<n>)` | `{ kind: 'file', value }` |
| `Glob` | `pattern` | `glob <pattern>` | `{ kind: 'query', value }` |
| `Grep` | `pattern`, `path` | `grep <pattern>` | `{ kind: 'query', value }` |
| `WebFetch` | `url` | `fetch <host/path>` | `{ kind: 'url', value }` |
| `WebSearch` | `query` | `search <query>` | `{ kind: 'query', value }` |
| `mcp__*` | 任意 | `mcp server.tool` | `{ kind: 'mcp', value }` |
| 未知 | 任意 | `toolName` + 关键字段摘要 | `unknown` |

约束：

- 摘要必须去掉换行、控制字符和 ANSI escape。
- 默认截断到 80 字符，状态栏渲染再按模块配置截断。
- 文件路径优先显示相对 `cwd` 的路径。新增 helper：

```ts
function relativeToCwd(filePath: string, cwd?: string): string
```

Windows 注意：

- 路径比较时使用 `path.resolve` 和 `path.relative`。
- 如果相对路径以 `..` 开头，则保留原路径或 basename。

### 5.6 响应和错误摘要

实现：

```ts
function summarizeResponse(toolName: string, response: unknown): string | undefined
function summarizeError(error: unknown): string | undefined
```

规则：

- `Bash` response 如果有 `stdout` / `stderr`，只存长度或首行，不存完整输出。
- `Write` / `Edit` 如果 response 有 `success` 或 `filePath`，记录简单结果。
- 错误只保留首行并截断到 120 字符。

## 6. 缓存设计

### 6.1 新增文件

建议新增：

```text
src/tool-timeline/cache.ts
```

如果想控制文件数量，也可以放在 `src/utils/cache.ts`，但独立文件更清晰。

### 6.2 路径

Claude Code 路径：

```text
~/.claude/pulse/cache/tool-timeline/<session_id>.json
```

实现：

```ts
export function getToolTimelineDir(provider: ToolTimelineProvider = 'claude-code'): string
export function getToolTimelineCachePath(sessionId: string, provider?: ToolTimelineProvider): string
```

MVP 仅 `claude-code`，但函数签名保留 provider，便于 Codex 复用。

### 6.3 原子写入

新增：

```ts
function writeJsonAtomic(filePath: string, value: unknown): void
```

实现策略：

1. `mkdirSync(dirname(filePath), { recursive: true })`
2. 写到 `filePath + '.tmp.' + process.pid`
3. `renameSync(tmp, filePath)`
4. 捕获异常并清理 tmp

Windows 上 rename 覆盖可能失败。MVP 处理：

```ts
try {
  fs.renameSync(tmp, filePath);
} catch {
  try { fs.rmSync(filePath, { force: true }); } catch {}
  fs.renameSync(tmp, filePath);
}
```

### 6.4 读写 API

实现：

```ts
export function readToolTimelineCache(
  sessionId: string,
  provider?: ToolTimelineProvider
): ToolTimelineCache | null

export function appendToolTimelineEvent(
  event: ToolTimelineEvent,
  options?: { maxEvents?: number }
): ToolTimelineCache

export function clearToolTimelineCache(
  sessionId?: string,
  provider?: ToolTimelineProvider
): void
```

### 6.5 去重

追加事件时：

- 如果 `toolUseId` 存在，删除旧的同 `toolUseId` 事件后再 append。
- 否则按 `id` 去重。
- 截断最近 `maxEvents` 条，默认 100。

### 6.6 统计

实现：

```ts
export function computeToolTimelineStats(events: ToolTimelineEvent[]): ToolTimelineStats
```

统计规则：

- `avgDurationMs` 只统计有 `durationMs` 的事件。
- `totalDurationMs` 同上。
- `slowest` 只在有 duration 时存在。
- `byTool` 用 `displayName || toolName`。

## 7. 状态栏渲染

### 7.1 配置类型

修改 `src/types/pulse-config.ts`：

```ts
export interface ToolTimelineModuleConfig extends ModuleConfig {
  mode?: 'summary' | 'compact-list';
  maxEvents?: number;
  maxDisplayEvents?: number;
  slowThresholdMs?: number;
  showFailures?: boolean;
  showAverage?: boolean;
  showSlowest?: boolean;
  summaryMaxLength?: number;
}
```

`PulseConfig.modules` 增加：

```ts
toolTimeline: ToolTimelineModuleConfig;
```

`DEFAULT_CONFIG.modules` 增加：

```ts
toolTimeline: {
  enabled: false,
  order: 16,
  icon: '[工具]',
  mode: 'summary',
  maxEvents: 100,
  maxDisplayEvents: 5,
  slowThresholdMs: 3000,
  showFailures: true,
  showAverage: true,
  showSlowest: true,
  summaryMaxLength: 80
}
```

### 7.2 配置迁移

修改 `src/config/migrate-config.ts`：

- `CURRENT_SCHEMA` 从 `4` bump 到 `5`。
- 当 `v < 5` 时，如果没有 `config.modules.toolTimeline`，补默认配置。

注意：

- 老配置没有 `schemaVersion` 时仍要保留既有迁移逻辑。
- `loadConfig()` 会 deep merge 默认配置，理论上会补字段；但显式 migration 能保证已缓存或旧文件都稳定。
- 更新 `CONFIG_CACHE_KEY`，当前在 `src/cli.ts` 和 `src/config/loader.ts` 是 `pulse-config-v4`，需要统一改为 `pulse-config-v5`。

### 7.3 i18n

修改：

```text
src/i18n/locales/zh.ts
src/i18n/locales/en.ts
src/cli.ts 的 moduleKeyMap
```

新增标签：

```ts
// zh
toolTimeline: '工具',

// en
toolTimeline: 'Tools',
```

`language <lang>` 命令的 `moduleKeyMap` 加入：

```ts
toolTimeline: 'toolTimeline'
```

### 7.4 主题类型与 icon sets

修改：

```text
src/types/theme.ts
src/themes/builtin/dark.ts
src/themes/builtin/light.ts
src/themes/builtin/cyberpunk.ts
src/themes/builtin/forest.ts
src/themes/builtin/ocean.ts
src/themes/icon-sets/text.ts
src/themes/icon-sets/nerd.ts
src/themes/index.ts
test/themes.test.ts
```

新增 component：

```ts
toolTimeline: ComponentStyle;
```

建议默认颜色：

- normal: `info`
- warning/slow: 渲染函数里用 `theme.colors.warning`
- error/failure: 渲染函数里用 `theme.colors.error`

内置主题可加：

```ts
toolTimeline: { fg: '#7dcfff', icon: '[Tool]', showIcon: true }
```

`overlayNerdIcons()` 增加：

```ts
theme.components.toolTimeline.icon = n.toolTimeline;
```

Nerd icon 可以先用通用工具图标；如果不确定 glyph，使用 ASCII `[Tool]` 也可以，避免字体问题。

### 7.5 渲染函数

实现：

```ts
export interface ToolTimelineSegment {
  text: string;
  fg: string;
}

export function extractToolTimeline(
  sessionId: string,
  config: ToolTimelineModuleConfig,
  theme: Theme,
  iconOverride?: string
): ToolTimelineSegment | null
```

摘要输出示例：

```text
[工具] 8 calls avg 320ms slow Bash 2.8s fail 1
```

英文可保持简单：

```text
[Tool] 8 calls avg 320ms slow Bash 2.8s fail 1
```

语言问题：

- MVP 可以不做完整语言分支，只用中性英文 `calls/avg/slow/fail`。
- 如果要做中英切换，给 `extractToolTimeline` 传 `config.language`，但这会扩大改动。建议后续再做。

颜色：

- 如果最近一条失败或 failure > 0：`theme.colors.error`
- 否则如果 slowest >= `slowThresholdMs`：`theme.colors.warning`
- 否则：`theme.colors.info`

### 7.6 接入 `src/index.ts`

修改 import：

```ts
import { extractToolTimeline } from './extractors';
```

在合适位置加入：

```ts
if (modules.toolTimeline.enabled) {
  const timeline = extractToolTimeline(
    input.session_id,
    modules.toolTimeline,
    theme,
    modules.toolTimeline.icon
  );
  if (timeline) {
    segments.push({
      order: modules.toolTimeline.order,
      text: colorize(timeline.fg, timeline.text)
    });
  }
}
```

建议放在 `turns` 之后、`thinking` 之前，或者完全依赖 order。

### 7.7 导出

修改 `src/extractors/index.ts`：

```ts
export { extractToolTimeline, normalizeClaudeToolHook } from './tool-timeline';
export type { ToolTimelineSegment } from './tool-timeline';
```

## 8. CLI 设计

### 8.1 Hook 命令

在 `src/cli.ts` 增加：

```text
pulse-line hook collect-tool-event --provider claude-code
```

行为：

1. 从 stdin 读取完整 JSON。
2. 根据 provider 调用 normalizer。
3. 如果 normalizer 返回 null，退出码 0。
4. 追加 cache。
5. 不向 stdout 打印内容，避免 hook 输出污染。
6. debug 模式下可以写 stderr 或 `debug()`。

实现结构：

```ts
program
  .command('hook')
  .description('Internal hook commands')
  .command('collect-tool-event')
```

Commander 嵌套命令写法较啰嗦，建议：

```ts
const hook = program.command('hook').description('Internal hook commands');

hook
  .command('collect-tool-event')
  .option('--provider <provider>', 'Runtime provider', 'claude-code')
  .action(...)
```

读取 stdin helper：

```ts
function readStdinText(): string {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}
```

### 8.2 Timeline 命令

新增：

```text
pulse-line timeline
pulse-line timeline --last 20
pulse-line timeline --json
pulse-line timeline --session <id>
pulse-line timeline --provider claude-code
pulse-line timeline clear --session <id>
```

MVP 简化：

- `pulse-line timeline`：读取最近修改的 session cache。
- `--session`：读取指定 session。
- `--last`：默认 20。
- `--json`：输出 cache 或截断事件 JSON。
- `clear`：清理 timeline cache。

需要新增 helper：

```ts
export function listToolTimelineSessions(provider?: ToolTimelineProvider): Array<{
  sessionId: string;
  path: string;
  mtimeMs: number;
}>
```

表格输出示例：

```text
Session: abc123
Total: 12  Success: 11  Failure: 1  Avg: 520ms

Time      Tool        Status   Duration  Summary
12:01:04  Read        OK       45ms      src/index.ts
12:01:08  Bash        ERR      2.8s      npm test
12:01:15  Edit        OK       180ms     src/index.ts
```

## 9. Hook 配置

### 9.1 修改 `hooks/hooks.json`

当前文件只有 `SessionStart`。扩展为：

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
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js\" hook collect-tool-event --provider claude-code",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js\" hook collect-tool-event --provider claude-code",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

说明：

- Claude Code 插件 hooks 支持 `${CLAUDE_PLUGIN_ROOT}`。
- `matcher: ".*"` 明确匹配所有工具。
- `timeout` 使用秒；5 秒足够写一个小 JSON 文件。
- hook 命令必须无 stdout。

### 9.2 本地开发注意

本地开发时必须先：

```bash
npm run build
```

否则 `${CLAUDE_PLUGIN_ROOT}/dist/src/cli.js` 不存在。

如果希望本地源码未 build 时也能运行，可额外提供 `scripts/pulse-hook.js` wrapper，但 MVP 不做。

## 10. 详细 TODO 计划

### 阶段 A：类型和缓存

- [x] 新增 `src/types/tool-timeline.ts`。
- [x] 新增 `src/tool-timeline/cache.ts`。
- [x] 实现 `getToolTimelineDir()`。
- [x] 实现 `getToolTimelineCachePath()`。
- [x] 实现 `writeJsonAtomic()`。
- [x] 实现 `readToolTimelineCache()`。
- [x] 实现 `computeToolTimelineStats()`。
- [x] 实现 `appendToolTimelineEvent()`。
- [x] 实现 `clearToolTimelineCache()`。
- [x] 实现 `listToolTimelineSessions()`。
- [x] 为 cache 损坏、空文件、目录不存在加防御。

### 阶段 B：Claude hook normalizer

- [x] 新增或扩展 `src/extractors/tool-timeline.ts`。
- [x] 实现 `normalizeClaudeToolHook()`。
- [x] 实现 `summarizeTool()`。
- [x] 实现 `summarizeResponse()`。
- [x] 实现 `summarizeError()`。
- [x] 实现 `relativeToCwd()`。
- [x] 实现控制字符和 ANSI 清理。
- [x] 覆盖 `Bash`、`Read`、`Write`、`Edit`、`MultiEdit`、`Grep`、`Glob`、`WebFetch`、`WebSearch`、MCP、未知工具。

### 阶段 C：状态栏模块

- [x] 在 `src/types/pulse-config.ts` 添加 `ToolTimelineModuleConfig`。
- [x] 在 `PulseConfig.modules` 添加 `toolTimeline`。
- [x] 在 `DEFAULT_CONFIG.modules` 添加默认配置。
- [x] 将 schema 升级到 v5。
- [x] 更新 `CONFIG_CACHE_KEY` 到 `pulse-config-v5`。
- [x] 更新 `src/i18n/locales/zh.ts`。
- [x] 更新 `src/i18n/locales/en.ts`。
- [x] 更新 `src/cli.ts` 的 language module mapping。
- [x] 更新 `src/types/theme.ts`。
- [x] 更新所有内置主题。
- [x] 更新 `src/themes/icon-sets/text.ts`。
- [x] 更新 `src/themes/icon-sets/nerd.ts`。
- [x] 更新 `src/themes/index.ts` 的 `overlayNerdIcons()`。
- [x] 更新 `test/themes.test.ts` required components。
- [x] 实现 `extractToolTimeline()`。
- [x] 在 `src/index.ts` 接入新模块。
- [x] 在 `src/extractors/index.ts` 导出。

### 阶段 D：CLI

- [x] 在 `src/cli.ts` 添加 `hook collect-tool-event`。
- [x] hook 命令支持 `--provider claude-code`。
- [x] hook 命令从 stdin 读取 JSON。
- [x] hook 命令异常时退出 0，避免影响 Claude Code。
- [x] 在 `src/cli.ts` 添加 `timeline` 命令。
- [x] `timeline` 支持 `--session`。
- [x] `timeline` 支持 `--last`。
- [x] `timeline` 支持 `--json`。
- [x] `timeline clear` 支持清理全部或指定 session。
- [x] CLI 输出不包含 ANSI，除非后续新增 `--color`。

### 阶段 E：插件 hook

- [x] 修改 `hooks/hooks.json` 添加 `PostToolUse`。
- [x] 修改 `hooks/hooks.json` 添加 `PostToolUseFailure`。
- [x] 确认 npm `files` 已包含 `dist/`、`hooks/`、`scripts/`。
- [x] 本地运行 `npm run build` 后检查 `dist/src/cli.js` 存在。
- [x] 用手工 stdin 模拟 hook 命令写 cache。

### 阶段 F：文档和命令说明

- [x] 更新 `README.md` 模块数量和模块表。
- [x] 更新 `README_EN.md` 模块数量和模块表。
- [x] 更新配置示例，添加 `toolTimeline`。
- [x] 新增 slash command 文档可选：`commands/timeline.md`。
- [x] 若新增 slash command，更新 `.claude-plugin/plugin.json` commands 列表。
- [x] 更新 `CHANGELOG.md`。

## 11. 测试方案

### 11.1 单元测试文件

新增：

```text
test/tool-timeline-cache.test.ts
test/tool-timeline-normalize.test.ts
test/tool-timeline-render.test.ts
test/tool-timeline-cli.test.ts
```

### 11.2 Cache 测试

覆盖：

- [x] `readToolTimelineCache()` 在文件不存在时返回 null。
- [x] `appendToolTimelineEvent()` 能创建目录和文件。
- [x] 追加 2 条事件后 stats 正确。
- [x] 超过 `maxEvents` 后只保留最近 N 条。
- [x] 同 `toolUseId` 事件去重。
- [x] 损坏 JSON 文件不会抛出，下一次 append 会重建。
- [x] `clearToolTimelineCache(sessionId)` 能删除指定文件。
- [x] `listToolTimelineSessions()` 按 mtime 倒序。

测试要避免写真实 home：

- 推荐让 cache 函数接受可选 `baseDir` 仅用于测试。
- 或使用环境变量 `PULSE_HOME_OVERRIDE` / `PULSE_CACHE_DIR_OVERRIDE`。
- 不建议 monkey patch `os.homedir()`。

### 11.3 Normalizer 测试

覆盖：

- [x] `PostToolUse` Bash 成功。
- [x] `PostToolUseFailure` Bash 失败。
- [x] 缺少 `session_id` 返回 null。
- [x] 缺少 `tool_name` 返回 null。
- [x] `duration_ms` 为负数或 NaN 时忽略。
- [x] `Read` 提取 file target。
- [x] `Edit` 提取 file target。
- [x] `MultiEdit` 显示 edits 数量。
- [x] `Grep` 提取 query target。
- [x] `WebFetch` 提取 URL。
- [x] MCP 工具名 `mcp__fs__read` 显示为 MCP。
- [x] 摘要会截断长命令。
- [x] 摘要会移除换行和 ANSI 控制符。

### 11.4 渲染测试

覆盖：

- [x] 无 cache 返回 null。
- [x] 无事件返回 null。
- [x] 成功事件输出包含 calls。
- [x] 有 avg 时输出 avg。
- [x] 有失败时输出 fail，并使用 error 颜色。
- [x] slowest 超过阈值时使用 warning 颜色。
- [x] `summaryMaxLength` 生效。
- [x] icon override 生效。

### 11.5 CLI 测试

当前测试流程是先 `npm run build`，再 `node --test dist/test/*.test.js`。CLI 测试应使用编译后的 dist：

- [x] 用 `spawnSync('node', ['dist/src/cli.js', 'hook', 'collect-tool-event', '--provider', 'claude-code'], { input })`。
- [x] 验证退出码为 0。
- [x] 验证 cache 文件产生。
- [x] 无效 JSON 时退出码为 0，且不产生文件。
- [x] `timeline --json` 输出合法 JSON。
- [x] `timeline --last 1` 只输出 1 条。
- [x] `timeline clear` 删除 cache。

### 11.6 配置迁移测试

修改 `test/migrate-config.test.ts`：

- [x] 旧 schema 自动补 `toolTimeline`。
- [x] 当前 schema 不重复迁移。
- [x] `schemaVersion` 最终为 5。
- [x] `iconSet: nerd` 旧迁移仍生效。

### 11.7 主题测试

修改 `test/themes.test.ts`：

- [x] required components 增加 `toolTimeline`。
- [x] nerd overlay 后 `toolTimeline.icon` 存在。
- [x] 所有主题都提供 `components.toolTimeline`。

### 11.8 手工验收

#### 模拟 hook

PowerShell：

```powershell
$json = @{
  session_id = "test-session"
  transcript_path = "D:\tmp\transcript.jsonl"
  cwd = "D:\code\status-bar-cc"
  hook_event_name = "PostToolUse"
  tool_name = "Bash"
  tool_input = @{ command = "npm test" }
  tool_response = @{ stdout = "ok"; stderr = ""; interrupted = $false }
  tool_use_id = "toolu_test_1"
  duration_ms = 1280
} | ConvertTo-Json -Depth 10

$json | node dist/src/cli.js hook collect-tool-event --provider claude-code
node dist/src/cli.js timeline --session test-session
```

#### 模拟 statusline

准备 input：

```powershell
Get-Content test\fixtures\sample-input.json |
  node dist/src/index.js
```

先启用模块：

```powershell
node dist/src/cli.js enable toolTimeline
```

预期：输出包含 `[工具]` 或 `[Tool]` 摘要。

## 12. 验收标准

功能验收：

- [x] 安装插件后，工具调用会写入 timeline cache。
- [x] `pulse-line enable toolTimeline` 后状态栏显示摘要。
- [x] `pulse-line timeline` 能查看最近工具调用详情。
- [x] 工具失败会记录为 failure。
- [x] 长命令不会撑爆状态栏。
- [x] cache 损坏不影响状态栏显示。

性能验收：

- [x] statusline 读取 timeline cache 的耗时目标 < 5ms。
- [x] hook 采集单次耗时目标 < 30ms。
- [x] 大 cache 截断后不超过默认 100 条。

质量验收：

- [x] `npm run build` 通过。
- [x] `npm test` 通过。
- [x] 新增测试覆盖 normalizer、cache、render、CLI。
- [x] Windows 路径测试至少覆盖一个 case。

## 13. 关键风险与处理

### 13.1 Hook 并发写 cache

Claude Code 文档说明 `PostToolUse` 在并行工具调用时可能并发触发。风险是两个 hook 同时读旧 cache，然后互相覆盖。

MVP 处理：

- 原子写避免半文件。
- 由于单条事件不关键，可接受低概率覆盖。

增强处理：

- 加简单 lock 文件。
- 或每个事件写独立 NDJSON，再由 statusline/CLI 聚合。

若要更稳，推荐事件日志方案：

```text
~/.claude/pulse/cache/tool-timeline/events/<session_id>.jsonl
~/.claude/pulse/cache/tool-timeline/snapshots/<session_id>.json
```

MVP 为简单起见先用单 JSON。

### 13.2 输出过长

必须在两个层面截断：

- `summarizeTool()` 截断单项摘要。
- `extractToolTimeline()` 截断最终 segment。

### 13.3 敏感信息

不要保存完整命令输出、文件内容、WebFetch prompt、MCP 返回体。

### 13.4 旧配置缓存

必须同步更新：

- `CURRENT_SCHEMA`
- `CONFIG_CACHE_KEY`
- migration tests

否则用户启用模块时可能找不到配置字段。

## 14. 推荐编码顺序

最稳顺序：

1. 写 `src/types/tool-timeline.ts`。
2. 写 cache 层和测试。
3. 写 normalizer 和测试。
4. 写 render extractor 和测试。
5. 接配置、schema、theme、i18n。
6. 接 `src/index.ts`。
7. 接 CLI hook 命令。
8. 接 `timeline` CLI。
9. 改 hooks JSON。
10. 跑完整 build/test。
11. 更新 README/CHANGELOG。

## 15. 参考资料

- Claude Code statusline 文档：`https://code.claude.com/docs/en/statusline`
- Claude Code hooks 文档：`https://code.claude.com/docs/en/hooks`
- 已完成调研文档：`docs/tool-timeline-and-codex-support-research.md`
