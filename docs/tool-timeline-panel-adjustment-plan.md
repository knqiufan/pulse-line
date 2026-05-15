# 工具时间线面板调整方案

> 日期：2026-05-15
>
> 目标：将 `toolTimeline` 从普通状态栏片段调整为独立多行面板，只展示最近 5 条工具调用，并评估 Claude Code 内通过方向键选中面板项、Enter 查看详情的可行性。

## 1. 需求重述

当前实现的问题：

- `toolTimeline` 被作为普通 segment 加入现有状态栏布局，显示为 `[工具] 3 calls avg ...`。
- 用户只能看到统计摘要，看不到具体工具调用序列。
- 详细信息主要依赖 `/pulse-line:timeline` 或 CLI 命令查看，这会打断用户当前对话流程，并可能导致额外 token 消耗。

期望效果：

- 工具时间线不与现有状态栏片段混排。
- 工具时间线作为独立模块另起一行显示。
- 状态栏中直接展示最近 5 条工具调用，包括工具名、目标、耗时、状态、耗时条。
- 不把 slash command 作为主要查看入口。

目标示例：

```text
[当前模型] deepseek-v4-pro  │  [Git 分支] main  │  [工作区] status-bar-cc  │  [上下文使用率] ██░░░░░░░░░░ 19%  │  [缓存] 37.4K
[MCP] 5 servers  │  [账户] DeepSeek: CN¥60.23  │  [轮次] 61 turns  │  [思考] 开启

═══════════════════════════════════════════════════════════
   TOOL TIMELINE (Last 5 calls)
═══════════════════════════════════════════════════════════
  [Read]   src/auth/jwt.ts      █░░░░░░░░░  45ms   ✓
  [Bash]   git diff HEAD~3      ███░░░░░░░  320ms  ✓
  [Edit]   src/auth/jwt.ts +3-1 ██░░░░░░░░  180ms  ✓
  [Bash]   npm run test         ██████████  2.8s   ✓
  [Bash]   git status           █░░░░░░░░░  38ms   ✓
  ─────────────────────────────────────────────────────────
   Success: 100%  │  Avg: 673ms  │  Total: 3.4s
═══════════════════════════════════════════════════════════
```

## 2. 官方能力调研结论

### 2.1 Claude Code statusline 的能力边界

根据 Claude Code 官方 statusline 文档，statusline 是一个由 Claude Code 调用的本地命令：

- Claude Code 通过 stdin 向 statusline 命令传入 JSON。
- statusline 命令通过 stdout 输出要展示的文本。
- 支持多行输出。
- 支持 ANSI 颜色。
- 支持 OSC 8 超链接，主要用于鼠标点击打开链接。
- 更新有 debounce，并且新的更新可能取消旧的 statusline 命令。

这说明多行工具时间线面板是可行的，因为它本质上仍是 stdout 文本。

### 2.2 方向键选中面板项 + Enter 查看详情是否可行

结论：当前 Claude Code statusline 通道内不可行。

原因：

- statusline 输出不是可获得键盘焦点的 TUI 组件。
- 官方文档没有提供 statusline item selection、focus、keydown、Enter callback 等 API。
- statusline 命令是短生命周期渲染进程，输出完成后进程退出，无法持续监听方向键。
- Claude Code 的方向键属于主交互输入区域，statusline 无法接管这些键盘事件。
- OSC 8 链接可用于鼠标点击，但不能实现“向下方向键选中、Enter 激活”的键盘导航语义。

因此，不能在 Claude Code 原生 statusline 中实现：

```text
按 ↓ 选中工具时间线某一项 -> 按 Enter 查看详情
```

### 2.3 可替代交互方案

可行替代方案如下：

| 方案 | 可行性 | 是否消耗对话 token | 说明 |
|------|--------|------------------|------|
| 状态栏直接展示最近 5 条 | 高 | 否 | 本次主方案 |
| OSC 8 鼠标点击链接 | 中 | 否 | 可点击打开本地详情页或执行外部 URI，但键盘选择不可控 |
| 外部 TUI `pulse-line timeline --watch` | 高 | 否 | 在独立终端查看，不占 Claude Code 对话 |
| Slash command 查看详情 | 高 | 是/可能 | 不作为主路径 |
| 写入本地 HTML 报告并提供 file/link | 中 | 否 | 适合历史分析，不适合即时键盘导航 |

推荐：

- MVP 只做“状态栏多行面板展示最近 5 条”。
- 保留 CLI 作为调试和导出工具。
- 可选增强 `pulse-line timeline --watch` 外部 TUI，不进入 Claude Code 主输入流。
- OSC 8 链接可以后续作为鼠标增强，但不承诺方向键/Enter 交互。

## 3. 新架构设计

当前架构：

```text
所有模块 -> segments[] -> renderLayout() -> 单一状态栏布局
```

调整为：

```text
普通状态栏模块 -> normalSegments[] -> renderLayout()
工具时间线模块 -> standalonePanels[] -> renderToolTimelinePanel()
最终输出 -> normalLayout + "\n" + timelinePanel
```

关键变化：

- `toolTimeline` 不再进入 `segments.push()`。
- `toolTimeline` 不参与 `maxPerLine` 普通分行。
- `toolTimeline` 由独立 block renderer 输出多行面板。
- 如果没有 cache 或没有事件，则不输出面板，避免空白占位。

## 4. 配置调整

建议 schema 从 v5 升到 v6。

扩展 `ToolTimelineModuleConfig`：

```ts
export interface ToolTimelineModuleConfig extends ModuleConfig {
  displayMode?: 'panel' | 'summary' | 'compact-list';
  maxEvents?: number;
  maxDisplayEvents?: number;
  panelWidth?: number;
  barWidth?: number;
  showHeader?: boolean;
  showFooterStats?: boolean;
  slowThresholdMs?: number;
  showFailures?: boolean;
  showAverage?: boolean;
  showSlowest?: boolean;
  summaryMaxLength?: number;
}
```

默认配置：

```ts
toolTimeline: {
  enabled: false,
  order: 16,
  icon: '[工具]',
  displayMode: 'panel',
  maxEvents: 100,
  maxDisplayEvents: 5,
  panelWidth: 59,
  barWidth: 10,
  showHeader: true,
  showFooterStats: true,
  slowThresholdMs: 3000,
  showFailures: true,
  showAverage: true,
  showSlowest: true,
  summaryMaxLength: 80
}
```

兼容策略：

- 保留旧字段 `mode`，但 v6 migration 将 `mode: 'summary' | 'compact-list'` 映射到 `displayMode`。
- 默认迁移后使用 `displayMode: 'panel'`，满足新需求。
- CLI 的 `timeline` 命令继续保留。

## 5. 渲染设计

新增渲染函数：

```ts
export interface ToolTimelinePanel {
  text: string;
}

export function renderToolTimelinePanel(
  sessionId: string,
  config: ToolTimelineModuleConfig,
  theme: Theme,
  iconOverride?: string
): ToolTimelinePanel | null
```

输入：

- 读取 `readToolTimelineCache(sessionId, 'claude-code')`。
- 取最近 `maxDisplayEvents` 条，默认 5。
- 重新基于这 5 条计算局部 stats，用于 footer。

输出：

- 多行字符串。
- 第一版可先使用纯文本边框和符号，减少 ANSI 对齐风险。
- 若使用 ANSI，只包整行颜色，不在列宽计算前插入 ANSI。

### 5.1 行格式

建议固定列：

```text
  [Tool]   Target/Summary        Bar         Duration Status
```

示例：

```text
  [Read]   src/index.ts          █░░░░░░░░░  45ms   ✓
  [Bash]   npm test              ████████░░  1.8s   ✗
```

列宽建议：

- tool column：8 chars，左对齐，例如 `[Bash]`
- summary column：20-24 chars，根据 `panelWidth` 截断
- bar column：`barWidth`，默认 10
- duration column：6 chars，右对齐
- status column：1 char

### 5.2 耗时条计算

只基于当前展示的 5 条计算比例：

```text
ratio = event.durationMs / max(durationMs among displayed events)
filled = clamp(round(ratio * barWidth), 1, barWidth)
```

无 duration 的事件：

```text
░░░░░░░░░░  -
```

如果 duration 超过 `slowThresholdMs`：

- 后续可使用 warning 色。
- 纯文本 MVP 中只通过满格和 footer 表达。

### 5.3 状态符号

```text
success -> ✓
failure -> ✗
unknown -> ?
```

如果考虑 ASCII-only 模式，可配置为：

```text
success -> OK
failure -> ERR
unknown -> UNK
```

当前项目已有中文和 Unicode 进度条，优先使用 `✓/✗` 可以接受。

### 5.4 Footer 统计

Footer 只统计展示的 5 条：

```text
Success: 80%  │  Avg: 673ms  │  Total: 3.4s
```

原因：

- 标题写的是 `Last 5 calls`。
- footer 统计应与用户看见的行一致。
- 全量统计可继续由 CLI 提供。

## 6. 数据摘要增强

当前 cache 已有：

- `toolName`
- `displayName`
- `summary`
- `status`
- `durationMs`
- `target`

这足够渲染基础面板。

建议增强：

```ts
interface ToolTimelineEvent {
  ...
  changeSummary?: string; // Edit/MultiEdit: +3-1
  panelLabel?: string;    // 面板专用短标签
}
```

短期可先不改模型，直接在 normalizer 阶段把 summary 做得更适合面板：

- `Read`: `src/auth/jwt.ts`
- `Bash`: `npm run test`
- `Edit`: `src/auth/jwt.ts +3-1`
- `MultiEdit`: `src/auth/jwt.ts (3 edits)`
- `Grep`: `grep <pattern>`
- `Glob`: `glob <pattern>`
- `WebFetch`: `example.com/docs`
- `MCP`: `fs.read`

Edit 行数计算策略：

- `Edit`: 如果有 `old_string` / `new_string`，按换行数粗略计算 `+n-m`。
- `MultiEdit`: 聚合每个 edit 的 `old_string` / `new_string`。
- 若无法计算，显示 `edit <file>` 或 `multi-edit <file> (n)`。

## 7. `src/index.ts` 接入方案

当前：

```ts
if (modules.toolTimeline.enabled) {
  const timeline = extractToolTimeline(...);
  if (timeline) {
    segments.push({
      order: modules.toolTimeline.order,
      text: colorize(timeline.fg, timeline.text)
    });
  }
}
```

调整：

```ts
const segments: OrderedSegment[] = [];
const panels: string[] = [];

// 普通模块仍然进入 segments

if (modules.toolTimeline.enabled) {
  const panel = renderToolTimelinePanel(
    input.session_id,
    modules.toolTimeline,
    theme,
    modules.toolTimeline.icon
  );
  if (panel) {
    panels.push(panel.text);
  }
}

const normalOutput = renderLayout(...);
const output = [normalOutput, ...panels].filter(Boolean).join('\n');
console.log(output);
```

注意：

- `toolTimeline.order` 对独立面板不再参与普通 segment 排序。
- 如果未来有多个独立面板，可以用 `panelOrder` 或复用 `order` 对 panels 排序。
- 当前只一个独立面板，直接追加在普通状态栏之后即可。

## 8. CLI 和 Slash Command 定位调整

`pulse-line timeline` 保留，但定位改为：

- 调试 cache。
- 导出 JSON。
- 清理 timeline cache。
- 外部终端查看详情。

文档中不再把 slash command 作为主查看路径。

可选新增：

```text
pulse-line timeline --watch
```

用于外部终端实时刷新，不消耗 Claude Code 对话 token。

## 9. 关于“方向键选中 + Enter 查看详情”的后续策略

### 9.1 不在 statusline 内承诺

不应把该交互写成可实现的验收目标，因为 Claude Code statusline 当前没有这类 API。

### 9.2 可做的近似增强

1. OSC 8 鼠标点击链接：

   每一行渲染成可点击链接，例如：

   ```text
   [Bash] npm run test
   ```

   链接目标可以是：

   - 本地 HTML 报告。
   - `file://` 缓存详情。
   - 自定义协议（不推荐，跨平台复杂）。

   限制：

   - 依赖终端/Claude Code 是否支持点击。
   - 不是方向键选择。
   - 打开详情体验不一定稳定。

2. 外部 TUI：

   ```bash
   pulse-line timeline --watch
   ```

   在独立终端中实现方向键和 Enter 完全可行，因为这是我们自己的进程和 TTY。

   限制：

   - 不在 Claude Code 内部。
   - 需要用户额外打开终端。

3. Slash command：

   ```text
   /pulse-line:timeline
   ```

   可用，但不推荐作为主路径，因为可能进入对话上下文并消耗 token。

推荐优先级：

1. 多行面板展示最近 5 条。
2. 外部 `--watch` TUI 作为高级功能。
3. OSC 8 点击作为实验功能。
4. Slash command 仅保留调试用途。

## 10. 测试计划

新增/调整测试：

- `tool-timeline-render.test.ts`
  - panel 模式最多显示 5 条。
  - 标题显示 `Last 5 calls`。
  - 每行包含工具名、summary、bar、duration、status。
  - footer success/avg/total 只统计展示的 5 条。
  - failure 显示 `✗`。
  - 无 cache 或空 events 返回 null。

- `index` 集成测试
  - 启用 `toolTimeline` 后输出包含独立面板边框。
  - 普通状态栏中不再出现 `[工具] 3 calls avg...` 内联摘要。
  - 普通模块布局仍受 `maxPerLine` 控制。

- `migrate-config.test.ts`
  - v5 到 v6 自动补 `displayMode: 'panel'`。
  - `maxDisplayEvents` 默认是 5。
  - 旧配置保留用户显式配置的 `maxEvents`、`icon` 等字段。

- `normalizer` 测试
  - `Edit` 能生成或保留适合面板的文件摘要。
  - `MultiEdit` 至少显示编辑数量。
  - 长命令和长路径不会撑破面板列宽。

## 11. 验收标准

功能验收：

- [ ] `toolTimeline` 不再嵌入普通状态栏片段。
- [ ] 启用后在状态栏下方独立显示多行面板。
- [ ] 面板只展示最近 5 条工具调用。
- [ ] 每条展示工具名、调用目标/摘要、耗时条、耗时、状态。
- [ ] Footer 展示最近 5 条的成功率、平均耗时、总耗时。
- [ ] 不依赖 `/pulse-line:timeline` 查看主要信息。
- [ ] cache 损坏时状态栏不报错、不输出半截面板。

性能验收：

- [ ] statusline 仍只读 timeline cache，不解析完整 transcript。
- [ ] 面板渲染目标 < 5ms。
- [ ] hook 写入目标维持 < 30ms。

交互验收：

- [ ] 文档明确说明 Claude Code statusline 内无法实现方向键选中 + Enter 进入详情。
- [ ] 如实现替代方案，不能误导为 Claude Code 原生键盘交互。

质量验收：

- [ ] `npm run build` 通过。
- [ ] `npm test` 通过。
- [ ] 新增/更新测试覆盖 panel 渲染、schema migration、集成输出。

## 12. 实施顺序

1. 扩展 `ToolTimelineModuleConfig`，schema 升级到 v6。
2. 实现 `renderToolTimelinePanel()`，默认最近 5 条。
3. 调整 `src/index.ts`，将 tool timeline 输出到独立 panels。
4. 强化摘要，优先优化 `Read` / `Bash` / `Edit` / `MultiEdit`。
5. 更新 README / README_EN / CHANGELOG，弱化 slash command 主路径。
6. 更新测试。
7. 手工验证真实 statusline 多行输出。

## 13. 参考资料

- Claude Code statusline 文档：`https://docs.anthropic.com/en/docs/claude-code/statusline`
- Claude Code interactive mode 文档：`https://docs.anthropic.com/en/docs/claude-code/interactive-mode`
- 现有调研：`docs/four-ideas-deep-dive.md`
- 当前已完成实施计划：`docs/implementation-plan-tool-timeline.md`
