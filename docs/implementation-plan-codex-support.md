# Codex 支持具体实施方案

> 日期：2026-05-14
>
> 目标：让 Pulse Line 在 OpenAI Codex 中具备可用的采集、报告和插件分发能力，并在官方能力允许的范围内接入 Codex TUI 状态信息。
>
> 前置依赖：建议先完成 `docs/implementation-plan-tool-timeline.md` 中的数据模型、缓存层和 `timeline` CLI。

## 1. 背景与结论

Pulse Line 当前是 Claude Code statusLine 插件。Claude Code 的状态栏能力是“执行自定义命令，stdin 传 JSON，stdout 显示内容”。Codex 当前官方文档显示：

- Codex 支持 hooks，hook 命令通过 stdin 接收 JSON。
- Codex 支持 `PreToolUse`、`PostToolUse`、`SessionStart`、`UserPromptSubmit`、`Stop` 等 hook 事件。
- Codex `PostToolUse` 支持 `Bash`、`apply_patch` 和 MCP 工具。
- Codex 插件要求 `.codex-plugin/plugin.json`，可包含 `hooks/`、`skills/`、`.mcp.json` 等。
- Codex TUI 有 `tui.status_line`，但类型是 `array<string> | null`，含义是“内置 footer status-line item identifier 列表”，不是任意 command。

所以 Codex 支持不能按 Claude Code 完整复制。推荐分三层：

```text
L1: Codex hooks -> Pulse Line cache -> pulse-line timeline CLI
L2: Codex 插件打包 + Codex 内置 tui.status_line 配置辅助
L3: 如果未来 Codex 开放 command-based status line，再复用 Pulse Line 渲染器
```

本方案目标是完成 L1 和 L2，并为 L3 留接口。

## 2. 支持范围

### 2.1 MVP 必须完成

1. 新增 Codex runtime adapter。
2. Codex `PostToolUse` hook 能调用 Pulse Line，记录工具事件。
3. Codex cache 与 Claude Code cache 隔离。
4. `pulse-line timeline --provider codex` 能查看 Codex 工具时序。
5. 新增 `.codex-plugin/plugin.json` 和 Codex hooks 配置。
6. 新增 `pulse-line codex` 命令组，提供安装检查、配置片段输出和状态说明。
7. 文档明确：Codex TUI 目前不能显示 Pulse Line 自定义状态栏，只能用 Codex 内置 status line items。

### 2.2 MVP 不做

- 不自动改写复杂 TOML 配置。
- 不承诺 Codex TUI 展示完整 Pulse Line。
- 不新增 TOML parser 依赖。
- 不解析 Codex 全量 transcript。
- 不实现云端同步。

### 2.3 后续增强

- 通过 `PreToolUse` + `PostToolUse` 计算 Codex 工具耗时。
- 解析 Codex transcript/session log 补全 duration 和历史事件。
- 自动安全 patch `~/.codex/config.toml`。
- 如果 Codex 开放 custom status command，添加 `pulse-line codex statusline` 渲染入口。

## 3. 官方能力约束

### 3.1 Codex hooks

Codex hook 共同输入字段包括：

- `session_id`
- `transcript_path`
- `cwd`
- `hook_event_name`
- `model`

`PostToolUse` 额外字段包括：

- `turn_id`
- `tool_name`
- `tool_use_id`
- `tool_input`
- `tool_response`

注意：

- Codex `PostToolUse` 文档没有承诺 `duration_ms`。
- Codex `PostToolUse` 对 Bash 非零退出也会运行，所以失败状态需要从 `tool_response` 中推断。
- Codex hook matcher 支持工具名，当前包括 `Bash`、`apply_patch` 和 MCP 工具名。
- Codex hooks 需要 `[features] codex_hooks = true` 或插件 lifecycle 配置被加载。

### 3.2 Codex TUI status_line

Codex `tui.status_line` 是：

```toml
[tui]
status_line = ["model-with-reasoning", "tokens", "context-window"]
```

它不是：

```toml
[tui]
status_line_command = "pulse-line"
```

因此 MVP 不应尝试把现有 `src/index.ts` 直接接到 Codex TUI。

### 3.3 Codex 插件结构

Codex 插件根目录：

```text
plugin-root/
  .codex-plugin/
    plugin.json
  hooks/
    hooks.json
  skills/
  assets/
```

但当前仓库已有 Claude Code 用的 `hooks/hooks.json`。如果在仓库根目录新增 `.codex-plugin/plugin.json`，必须显式指定 Codex hooks 路径，避免 Codex 默认读取当前 Claude Code hooks 配置。

推荐：

```text
.codex-plugin/plugin.json
codex/hooks/hooks.json
codex/README.md
```

`.codex-plugin/plugin.json` 中显式写：

```json
{
  "hooks": "./codex/hooks/hooks.json"
}
```

这样 Codex 不会依赖根目录 `hooks/hooks.json` 的默认发现行为。

## 4. 总体架构

```text
Codex PostToolUse hook
  -> pulse-line hook collect-tool-event --provider codex
  -> CodexAdapter.normalizeHookInput()
  -> ~/.codex/pulse/cache/tool-timeline/<session_id>.json
  -> pulse-line timeline --provider codex

Codex TUI
  -> 仅使用 Codex 内置 [tui].status_line items
```

与 Claude Code 的关系：

```text
共享:
  ToolTimelineEvent
  ToolTimelineCache
  append/read/list/clear cache API
  timeline CLI formatter
  summarizeTool 基础逻辑

分离:
  cache root
  hook normalizer
  plugin manifest
  install/help 文档
  statusline 渲染能力
```

## 5. Runtime Adapter 设计

### 5.1 新增文件

```text
src/adapters/types.ts
src/adapters/claude-code.ts
src/adapters/codex.ts
src/adapters/index.ts
```

也可以放在：

```text
src/runtimes/
```

命名建议用 `adapters`，因为它只适配输入和路径，不承载业务逻辑。

### 5.2 Adapter 接口

```ts
import type {
  ToolTimelineEvent,
  ToolTimelineProvider
} from '../types/tool-timeline';

export interface RuntimeAdapter {
  id: ToolTimelineProvider;
  displayName: string;
  cacheRoot(): string;
  supportsCommandStatusLine: boolean;
  normalizeToolHookInput(input: unknown): ToolTimelineEvent | null;
}
```

### 5.3 Claude adapter

先把已有 `normalizeClaudeToolHook()` 包装进去：

```ts
export const claudeCodeAdapter: RuntimeAdapter = {
  id: 'claude-code',
  displayName: 'Claude Code',
  cacheRoot: () => path.join(os.homedir(), '.claude', 'pulse'),
  supportsCommandStatusLine: true,
  normalizeToolHookInput: normalizeClaudeToolHook
};
```

### 5.4 Codex adapter

新增：

```ts
export const codexAdapter: RuntimeAdapter = {
  id: 'codex',
  displayName: 'Codex',
  cacheRoot: () => path.join(os.homedir(), '.codex', 'pulse'),
  supportsCommandStatusLine: false,
  normalizeToolHookInput: normalizeCodexToolHook
};
```

### 5.5 Adapter 选择

```ts
export function getRuntimeAdapter(provider: string): RuntimeAdapter {
  switch (provider) {
    case 'claude-code': return claudeCodeAdapter;
    case 'codex': return codexAdapter;
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}
```

CLI 对未知 provider：

- 用户命令返回退出码 1。
- hook 内部命令返回退出码 0，但 debug 记录错误，避免影响 agent。

## 6. Codex hook 归一化

### 6.1 输入类型

```ts
interface CodexHookInput {
  session_id?: string;
  transcript_path?: string | null;
  cwd?: string;
  hook_event_name?: string;
  model?: string;
  turn_id?: string;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: unknown;
  tool_response?: unknown;
}
```

### 6.2 Normalizer

新增：

```ts
export function normalizeCodexToolHook(input: unknown): ToolTimelineEvent | null
```

规则：

- 仅接受 `hook_event_name === 'PostToolUse'`。
- 缺少 `session_id` 或 `tool_name` 返回 null。
- `provider = 'codex'`。
- `turnId = input.turn_id`。
- `toolUseId = input.tool_use_id`。
- `durationMs` 默认 undefined，因为 Codex docs 未承诺该字段。
- `status` 通过 `inferCodexToolStatus(toolName, tool_response)` 推断。

### 6.3 状态推断

实现：

```ts
function inferCodexToolStatus(toolName: string, response: unknown): ToolTimelineStatus
```

建议规则：

- 如果 response 有 `exit_code`：
  - `0` -> success
  - 非 0 -> failure
- 如果 response 有 `status`：
  - `success` / `ok` / `completed` -> success
  - `error` / `failed` / `failure` -> failure
- 如果 response 有 `error` 字段 -> failure。
- `apply_patch`：
  - response 字符串或对象里包含 `Success` / `Done` -> success
  - 包含 `Failed` / `Error` -> failure
  - 否则 unknown
- MCP：
  - response 有 `isError: true` -> failure
  - response 有 `error` -> failure
- 兜底 unknown。

为什么不用默认 success：

- Codex 文档说 Bash 非零退出也会触发 `PostToolUse`，所以事件发生不等于成功。

### 6.4 工具摘要复用

`summarizeTool()` 应同时支持 Claude 和 Codex。

Codex 特殊点：

- `apply_patch` 使用 `tool_input.command`。
- `tool_name` 可能是 MCP 名称，例如 `mcp__server__tool`。
- Bash 仍使用 `tool_input.command`。

对 `apply_patch`：

```text
displayName: "Patch"
summary: "apply_patch <first meaningful line>"
target.kind: "command"
```

如果能从 patch 文本中提取文件路径，增强为：

- 找 `*** Update File: <path>`
- 找 `*** Add File: <path>`
- 找 `*** Delete File: <path>`

MVP 可只显示 `apply_patch`。

## 7. Cache root 改造

### 7.1 当前目标

Claude Code：

```text
~/.claude/pulse/cache/tool-timeline/
```

Codex：

```text
~/.codex/pulse/cache/tool-timeline/
```

### 7.2 修改 cache API

`getToolTimelineDir(provider)` 内部不要写死 `.claude`：

```ts
function getPulseRoot(provider: ToolTimelineProvider): string {
  if (process.env.PULSE_HOME_OVERRIDE) return process.env.PULSE_HOME_OVERRIDE;
  if (provider === 'codex') return path.join(os.homedir(), '.codex', 'pulse');
  return path.join(os.homedir(), '.claude', 'pulse');
}
```

测试可使用：

```text
PULSE_HOME_OVERRIDE=<tmp>
```

注意：如果同一次测试同时测 Claude 和 Codex，单个 override 不够。可以更细：

```text
PULSE_CLAUDE_HOME_OVERRIDE
PULSE_CODEX_HOME_OVERRIDE
```

推荐：

- `PULSE_HOME_OVERRIDE` 用于所有 provider 的测试。
- 后续需要隔离时再加 provider-specific override。

## 8. CLI 改造

### 8.1 hook 命令

扩展已有计划中的：

```text
pulse-line hook collect-tool-event --provider codex
```

行为：

- `--provider claude-code` 使用 Claude adapter。
- `--provider codex` 使用 Codex adapter。
- hook 模式下错误不抛到用户，不输出 stdout。

### 8.2 timeline 命令

支持：

```text
pulse-line timeline --provider codex
pulse-line timeline --provider codex --session <id>
pulse-line timeline --provider codex --last 30
pulse-line timeline --provider codex --json
pulse-line timeline clear --provider codex
```

默认 provider：

- 保持 `claude-code`，不破坏既有用户。
- 如果当前环境变量或 cwd 明显在 Codex 中，后续可自动检测，但 MVP 不做。

### 8.3 codex 命令组

新增：

```text
pulse-line codex info
pulse-line codex status-line
pulse-line codex hooks
pulse-line codex install --dry-run
```

MVP 行为：

#### `pulse-line codex info`

输出：

- Codex 支持状态说明。
- cache 目录。
- TUI 状态栏限制。
- 下一步命令。

#### `pulse-line codex status-line`

输出建议配置片段：

```toml
[tui]
status_line = ["model-with-reasoning", "tokens", "context-window"]
```

并明确：

```text
This uses Codex built-in status-line items. It does not render Pulse Line custom segments.
```

#### `pulse-line codex hooks`

输出建议 hook 配置，供用户排查：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "npx -y pulse-line@latest hook collect-tool-event --provider codex",
            "timeout": 5,
            "statusMessage": "Recording Pulse Line timeline"
          }
        ]
      }
    ]
  }
}
```

#### `pulse-line codex install --dry-run`

MVP 只打印将要创建的文件和配置，不写用户 `~/.codex/config.toml`。

后续可加：

```text
pulse-line codex install --write
```

但写 TOML 前应引入可靠 TOML parser 或做非常保守的 append。

## 9. Codex 插件文件

### 9.1 新增 `.codex-plugin/plugin.json`

新增：

```text
.codex-plugin/plugin.json
```

内容建议：

```json
{
  "name": "pulse-line",
  "version": "1.0.0",
  "description": "Pulse Line telemetry and timeline support for Codex",
  "author": {
    "name": "knqiufan",
    "url": "https://github.com/knqiufan"
  },
  "homepage": "https://github.com/knqiufan/pulse-line",
  "repository": "https://github.com/knqiufan/pulse-line",
  "license": "MIT",
  "keywords": ["codex", "hooks", "timeline", "statusline", "pulse-line"],
  "hooks": "./codex/hooks/hooks.json",
  "skills": "./skills/",
  "interface": {
    "displayName": "Pulse Line",
    "shortDescription": "Tool timeline telemetry and CLI reports for Codex.",
    "longDescription": "Records Codex tool calls through hooks and exposes timeline reports through the pulse-line CLI. Codex TUI custom statusline rendering is not available yet.",
    "developerName": "knqiufan",
    "category": "Productivity",
    "capabilities": ["Read", "Write"]
  }
}
```

注意：

- `hooks` 必须显式指向 `./codex/hooks/hooks.json`。
- 不要让 Codex 误读根目录 `hooks/hooks.json`，那个文件面向 Claude Code。

### 9.2 新增 Codex hooks

新增：

```text
codex/hooks/hooks.json
```

内容：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "npx -y pulse-line@latest hook collect-tool-event --provider codex",
            "timeout": 5,
            "statusMessage": "Recording Pulse Line timeline"
          }
        ]
      }
    ]
  }
}
```

为什么使用 `npx -y pulse-line@latest`：

- 当前官方 Codex docs 没有在 hooks 文档中明确一个等价 `${CODEX_PLUGIN_ROOT}` 的变量。
- hook 命令运行在 session cwd，不能用相对路径指向插件根。
- `npx -y` 对发布插件可用，但需要网络或本地 npm cache。

后续优化：

- 如果实测 Codex 插件提供稳定 plugin root 变量，再改为 `node "<plugin-root>/dist/src/cli.js"`。
- 或在插件安装流程中生成绝对路径 hook。

### 9.3 package.json files

修改 `package.json` 的 `files`：

```json
"files": [
  "dist/",
  "bin/",
  "commands/",
  "hooks/",
  "codex/",
  "scripts/",
  ".claude-plugin/",
  ".codex-plugin/",
  "skills/"
]
```

注意当前工作区已有 `package.json` 修改，编码前先看 diff，避免覆盖用户改动。

### 9.4 README

更新 `README.md` / `README_EN.md`：

- 功能描述中说明 Claude Code 是完整 statusline 支持。
- Codex 是 hook telemetry + CLI timeline 支持。
- 添加 Codex 安装和限制章节。

## 10. Codex 配置辅助

### 10.1 不直接编辑 TOML 的原因

Codex 配置是 TOML。Node 标准库没有 TOML parser。手写字符串 patch 容易破坏用户配置，尤其已有 `[tui]` 或 `status_line` 时。

MVP 策略：

- `pulse-line codex status-line` 只输出配置片段。
- `pulse-line codex install --dry-run` 只打印建议。
- 不自动写 `~/.codex/config.toml`。

### 10.2 后续自动写入策略

如果后续要做 `--write`：

选项 A：引入 TOML parser。

- 优点：正确。
- 缺点：新增依赖，需要审查包体积和维护性。

选项 B：保守 append。

- 只在文件不存在或没有 `[tui]` 时 append。
- 如果已有 `[tui]`，只提示手动修改。

推荐先做选项 B：

```text
if config.toml missing:
  create with [tui] status_line
else if no [tui]:
  append section
else:
  print manual instructions
```

## 11. 与工具时序功能的关系

Codex 支持不应复制一套 timeline 实现。它必须复用：

- `ToolTimelineEvent`
- `ToolTimelineCache`
- cache API
- CLI timeline formatter
- `summarizeTool()`

Codex 只新增：

- `normalizeCodexToolHook()`
- Codex cache root
- Codex plugin/hook packaging
- Codex CLI info/install/status-line 命令

## 12. 详细 TODO 计划

### 阶段 A：前置整理

- [ ] 完成工具时序方案中的 `ToolTimelineEvent` 和 cache API。
- [ ] 确认 `appendToolTimelineEvent()` 支持 `provider`。
- [ ] 确认 `timeline` CLI 支持 `--provider`。
- [ ] 确认测试可通过 `PULSE_HOME_OVERRIDE` 指向临时目录。

### 阶段 B：Adapter 抽象

- [ ] 新增 `src/adapters/types.ts`。
- [ ] 新增 `src/adapters/claude-code.ts`。
- [ ] 新增 `src/adapters/codex.ts`。
- [ ] 新增 `src/adapters/index.ts`。
- [ ] 将 hook CLI 从直接调用 `normalizeClaudeToolHook()` 改为 `getRuntimeAdapter(provider)`。
- [ ] 未知 provider 在普通 CLI 中返回错误。
- [ ] 未知 provider 在 hook 模式中安静退出。

### 阶段 C：Codex normalizer

- [ ] 实现 `normalizeCodexToolHook()`。
- [ ] 仅处理 `PostToolUse`。
- [ ] 读取 `session_id`。
- [ ] 读取 `turn_id`。
- [ ] 读取 `tool_use_id`。
- [ ] 读取 `transcript_path`。
- [ ] 读取 `cwd`。
- [ ] 读取 `model`，可存到扩展字段或先忽略。
- [ ] 复用 `summarizeTool()`。
- [ ] 实现 `inferCodexToolStatus()`。
- [ ] 支持 Bash response status 推断。
- [ ] 支持 apply_patch response status 推断。
- [ ] 支持 MCP response status 推断。
- [ ] 没有可信状态时输出 `unknown`。

### 阶段 D：Codex CLI

- [ ] `pulse-line timeline --provider codex` 能读取 `~/.codex/pulse`。
- [ ] `pulse-line timeline clear --provider codex` 能清理 Codex cache。
- [ ] 新增 `pulse-line codex info`。
- [ ] 新增 `pulse-line codex status-line`。
- [ ] 新增 `pulse-line codex hooks`。
- [ ] 新增 `pulse-line codex install --dry-run`。
- [ ] 输出文本明确自定义 statusline 限制。
- [ ] 所有 Codex 命令不依赖 Claude Code 安装。

### 阶段 E：Codex 插件文件

- [ ] 新增 `.codex-plugin/plugin.json`。
- [ ] 新增 `codex/hooks/hooks.json`。
- [ ] 新增 `codex/README.md`，说明安装、限制和调试。
- [ ] 更新 `package.json.files` 包含 `.codex-plugin/` 和 `codex/`。
- [ ] 确认 `.claude-plugin/plugin.json` 不受影响。
- [ ] 确认根目录 `hooks/hooks.json` 仍服务 Claude Code。
- [ ] 确认 Codex manifest 显式指向 `./codex/hooks/hooks.json`。

### 阶段 F：文档

- [ ] 更新 `README.md` Codex 章节。
- [ ] 更新 `README_EN.md` Codex 章节。
- [ ] 更新模块列表，说明 Codex 下只支持 timeline CLI。
- [ ] 更新 `CHANGELOG.md`。
- [ ] 如新增 Codex skill，新增 `skills/codex-support/` 可选。

### 阶段 G：验证

- [ ] `npm run build`。
- [ ] `npm test`。
- [ ] 手工模拟 Codex hook stdin。
- [ ] 手工运行 `pulse-line timeline --provider codex`。
- [ ] 检查 npm pack 包含 `.codex-plugin` 和 `codex/hooks/hooks.json`。

## 13. 测试方案

### 13.1 新增测试文件

```text
test/codex-adapter.test.ts
test/codex-cli.test.ts
test/codex-plugin-files.test.ts
```

### 13.2 Codex adapter 测试

覆盖：

- [ ] 非 `PostToolUse` 返回 null。
- [ ] 缺少 `session_id` 返回 null。
- [ ] 缺少 `tool_name` 返回 null。
- [ ] Bash 成功 response 推断 success。
- [ ] Bash 非零 exit 推断 failure。
- [ ] Bash 无 exit code 推断 unknown。
- [ ] `apply_patch` 成功文本推断 success。
- [ ] `apply_patch` 错误文本推断 failure。
- [ ] MCP `isError: true` 推断 failure。
- [ ] MCP 正常对象推断 unknown 或 success，按实现固定。
- [ ] `turn_id` 被写入事件。
- [ ] `tool_use_id` 被写入事件。
- [ ] `model` 不导致异常。

示例 fixture：

```ts
const codexBashHook = {
  session_id: 'codex-session-1',
  transcript_path: '/tmp/codex.jsonl',
  cwd: '/repo',
  hook_event_name: 'PostToolUse',
  model: 'gpt-5.3-codex',
  turn_id: 'turn-1',
  tool_name: 'Bash',
  tool_use_id: 'call-1',
  tool_input: { command: 'npm test' },
  tool_response: { exit_code: 1, stdout: '', stderr: 'failed' }
};
```

### 13.3 CLI 测试

覆盖：

- [ ] `hook collect-tool-event --provider codex` 写入 Codex cache。
- [ ] `timeline --provider codex --json` 能输出 JSON。
- [ ] `timeline --provider codex --last 1` 截断。
- [ ] `timeline clear --provider codex` 清理。
- [ ] `codex info` 退出码 0。
- [ ] `codex status-line` 输出 `[tui]` 和 `status_line`。
- [ ] `codex hooks` 输出 `PostToolUse` 和 `--provider codex`。
- [ ] `codex install --dry-run` 不写真实 home。

测试不要写真实 `~/.codex`：

```ts
env: {
  ...process.env,
  PULSE_HOME_OVERRIDE: tmpDir
}
```

### 13.4 插件文件测试

覆盖：

- [ ] `.codex-plugin/plugin.json` 存在。
- [ ] `plugin.json` 是合法 JSON。
- [ ] `plugin.json.name === 'pulse-line'`。
- [ ] `plugin.json.hooks === './codex/hooks/hooks.json'`。
- [ ] `codex/hooks/hooks.json` 存在。
- [ ] Codex hooks JSON 包含 `PostToolUse`。
- [ ] Codex hooks command 包含 `pulse-line` 和 `--provider codex`。
- [ ] `package.json.files` 包含 `.codex-plugin/` 和 `codex/`。

### 13.5 手工验证

#### 模拟 Codex hook

PowerShell：

```powershell
$env:PULSE_HOME_OVERRIDE = "$PWD\.tmp-codex-pulse"

$json = @{
  session_id = "codex-session"
  transcript_path = "D:\tmp\codex.jsonl"
  cwd = "D:\code\status-bar-cc"
  hook_event_name = "PostToolUse"
  model = "gpt-5.3-codex"
  turn_id = "turn-1"
  tool_name = "Bash"
  tool_use_id = "call-1"
  tool_input = @{ command = "npm test" }
  tool_response = @{ exit_code = 1; stdout = ""; stderr = "failed" }
} | ConvertTo-Json -Depth 10

$json | node dist/src/cli.js hook collect-tool-event --provider codex
node dist/src/cli.js timeline --provider codex --session codex-session
node dist/src/cli.js timeline --provider codex --session codex-session --json
```

#### 检查 Codex 配置建议

```powershell
node dist/src/cli.js codex status-line
node dist/src/cli.js codex hooks
node dist/src/cli.js codex info
```

#### 检查打包

```powershell
npm pack --dry-run
```

确认输出包含：

```text
.codex-plugin/plugin.json
codex/hooks/hooks.json
dist/src/cli.js
```

## 14. 验收标准

功能验收：

- [ ] Codex hook 输入能写入 `~/.codex/pulse/cache/tool-timeline/<session>.json`。
- [ ] `pulse-line timeline --provider codex` 能显示 Codex 事件。
- [ ] `pulse-line codex status-line` 能输出官方内置 TUI 配置建议。
- [ ] `.codex-plugin/plugin.json` 能指向 Codex hooks。
- [ ] Claude Code 现有插件不受影响。

边界验收：

- [ ] Codex 没有 `duration_ms` 时不会显示假耗时。
- [ ] Codex Bash 非零退出能标记 failure。
- [ ] 未知 response schema 标记 unknown，不抛错。
- [ ] 未安装 Claude Code 时，Codex CLI 命令仍能运行。

质量验收：

- [ ] `npm run build` 通过。
- [ ] `npm test` 通过。
- [ ] 新增 Codex adapter 和 CLI 测试。
- [ ] npm pack 包含 Codex 插件文件。

## 15. 关键风险与处理

### 15.1 Codex hook 命令路径

风险：

- 官方文档未明确类似 `${CLAUDE_PLUGIN_ROOT}` 的 Codex 插件根变量。
- hooks command 运行在 session cwd。

MVP 处理：

- Codex 插件 hooks 使用 `npx -y pulse-line@latest ...`。

代价：

- 首次运行可能需要网络或 npm cache。

后续：

- 实测 Codex 插件运行环境后，如果有稳定 plugin root，改成本地 `node dist/src/cli.js`。

### 15.2 Codex TUI 自定义状态栏不可用

风险：

- 用户可能以为 Codex 支持和 Claude Code 完全一致。

处理：

- README、CLI `codex info`、插件 longDescription 都明确说明限制。
- 使用 “telemetry and CLI reports for Codex” 表述，不写 “Codex statusline renderer”。

### 15.3 Codex tool_response schema 不稳定

风险：

- 不同工具 response shape 不一致。

处理：

- normalizer 只做宽松推断。
- 未知状态使用 `unknown`。
- 不因为 schema 不认识而丢事件。

### 15.4 与 Claude hooks 文件冲突

风险：

- Codex 默认读取 `./hooks/hooks.json`，但该文件面向 Claude Code。

处理：

- `.codex-plugin/plugin.json` 必须显式 `"hooks": "./codex/hooks/hooks.json"`。
- 不把 Codex hook 写进根 `hooks/hooks.json`。

## 16. 推荐编码顺序

1. 先完成工具时序 MVP 的共享类型、cache、CLI。
2. 抽 adapter 接口，并让 Claude Code 路径仍通过测试。
3. 实现 Codex normalizer 和测试。
4. 让 `hook collect-tool-event --provider codex` 写入独立 cache。
5. 扩展 `timeline --provider codex`。
6. 新增 `codex` CLI 命令组。
7. 新增 `.codex-plugin/plugin.json` 和 `codex/hooks/hooks.json`。
8. 更新 package files。
9. 更新 README/CHANGELOG。
10. 跑 build/test/npm pack dry-run。

## 17. 参考资料

- OpenAI Codex hooks：`https://developers.openai.com/codex/hooks`
- OpenAI Codex config reference：`https://developers.openai.com/codex/config-reference`
- OpenAI Codex sample config：`https://developers.openai.com/codex/config-sample`
- OpenAI Codex build plugins：`https://developers.openai.com/codex/plugins/build`
- 工具时序调研文档：`docs/tool-timeline-and-codex-support-research.md`
