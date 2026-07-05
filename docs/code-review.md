# Pulse Line 代码审查报告

> 审查日期：2026-07-05
> 审查范围：`src/`、`bin/`、`scripts/`、`hooks/`、`.claude-plugin/`、`commands/`、`package.json`、`tsconfig.json`
> TypeScript 类型检查：通过（`npx tsc --noEmit` exit 0）

---

## 一、关键问题（导致用户反馈的 Bug）

### 1.1 `.claude-plugin/plugin.json` 未声明 `hooks` 字段（根因）

**位置**：`.claude-plugin/plugin.json`

**现象**：用户从 npm 安装 `pulse-line` 后，开启 `toolTimeline` 开关，工具分析面板始终不显示。

**根因分析**：

工具分析面板的渲染链路：
1. Claude Code 触发 `PostToolUse` Hook → 调用 `dist/src/cli.js hook collect-tool-event`
2. Hook 把工具调用事件写入 `~/.claude/pulse/cache/tool-timeline/<session>.json`
3. 状态栏渲染时，`renderToolAnalyticsPanel()` 读取该缓存；若 `cache.events.length === 0` 则直接返回 `null`（`src/extractors/tool-timeline.ts:408`）

**但实际链路在第 1 步就断了**：
- `.claude-plugin/plugin.json` 只声明了 `commands` 和 `skills`，**未声明 `hooks`**：
  ```json
  {
    "commands": [...],
    "skills": "./skills/"
    // 缺少: "hooks": "./hooks/hooks.json"
  }
  ```
- Claude Code 的插件机制要求显式声明 hooks 路径才会注册。`hooks/hooks.json` 形同虚设。
- 即使用户额外执行 `claude plugin install pulse-line`，hooks 仍不会被注册。
- `npx pulse-line install` 命令也没有把 hooks 写入 `~/.claude/settings.json`。

**结果**：缓存目录始终为空 → `extractToolTimeline` / `renderToolAnalyticsPanel` 都返回 `null` → 面板永不显示。

这一点也在 `docs/tool-timeline-and-codex-support-research.md:463` 中留下了不确定的备注：
> "Claude Code 插件安装时是否自动读取 `hooks/hooks.json` 需要结合现有插件机制验证。"

**修复建议**：

1. **修复 `.claude-plugin/plugin.json`**（核心修复）：
   ```json
   {
     "name": "pulse-line",
     "version": "1.0.5",
     ...
     "commands": [...],
     "skills": "./skills/",
     "hooks": "./hooks/hooks.json"
   }
   ```
2. **`src/cli.ts` 的 `install` 命令兜底**：当插件未安装时，把 hooks 直接写入用户 `~/.claude/settings.json`，确保仅靠 `npx pulse-line install` 也能工作。

---

## 二、高危问题

### 2.1 `thirdPartyApi` 模块查询结果被丢弃（功能完全失效）

**位置**：`src/index.ts:277-286`

```ts
if (modules.thirdPartyApi.enabled) {
  const providers = modules.thirdPartyApi.providers || [];
  if (providers.length > 0) {
    extractThirdPartyApi(providers, theme, HTTP_TIMEOUT_MS, input.cwd)
      .then((results) => {
        debug(`Third-party API query complete: ${results.length} providers`);
      })
      .catch((err) => debug('Third-party API query error:', err));
  }
}
```

**问题**：`extractThirdPartyApi` 是异步的，结果只在 `.then` 里被 `debug` 打印，**从未 push 到 `segments`**。即便下次渲染命中内部缓存（`extractors/third-party-api.ts:60-63`），数据依旧不会被显示。

**影响**：开启 `thirdPartyApi` 模块的用户永远看不到第三方 API 用量。

**修复建议**：
- 同步分支：先尝试读缓存，命中则立即 push 到 `segments`；
- 异步分支：未命中时 fire-and-forget 发起请求填充缓存，下次渲染自然显示。
- 参考 `account-usage.ts` 的实现模式（`extractAccountUsageSync` + `refreshAccountUsage`）。

---

### 2.2 `extractMcpStatus` 使用错误的 cwd

**位置**：`src/extractors/mcp.ts:32`

```ts
const projectPath = path.join(process.cwd(), '.mcp.json');
```

**问题**：状态栏命令由 Claude Code 调用，`process.cwd()` 是 Claude Code 进程的工作目录，**未必等于** `input.cwd`（用户当前项目目录）。其他 extractor 都通过 `input.cwd` 拿到正确路径，唯独 MCP 漏了。

`src/index.ts:224-230` 调用 `extractMcpStatus(theme, mcpIcon)` 时也未传 `cwd`。

**影响**：项目级 `.mcp.json` 可能漏统计或重复统计。

**修复建议**：让 `extractMcpStatus(theme, iconOverride, cwd)` 接收 `cwd` 参数并使用它。

---

## 三、中等问题

### 3.1 `extractRules` 把 `.claude/` 下所有文件都算作规则

**位置**：`src/extractors/rules.ts:170-173`

```ts
const claudeDir = path.join(cwd, '.claude');
if (fs.existsSync(claudeDir)) {
  allFiles.push(...walkDir(claudeDir, cwd, excludePatterns, 'rule'));
}
```

**问题**：`walkDir` 递归收集目录下**所有文件**，包括 `settings.json`、`settings.local.json`、`plugins/` 下的缓存等。这些并非"规则文件"，统计结果会虚高。

**修复建议**：限制为常见规则文件名（`*.md`、`CLAUDE.md`、`.clinerules/*`、`.cursorrules/*`、`.windsurfrules` 等），或在 `walkDir` 增加 `fileFilter` 参数。

### 3.2 `dist/src/tag/` 是历史遗留产物

**现象**：`dist/src/tag/` 包含 `bluetag-client.js`、`doctor.js`、`render-svg.js`、`svg-to-png.js`、`install-guide.js` 等文件，但 `src/` 下根本没有 `tag/` 目录。这些是过往特性被删除后未清理的产物。

**风险**：
- `npm publish` 会把它们一起发布（`package.json` 的 `files` 字段包含 `dist/`），导致包体积虚大；
- 用户安装后看到无关文件可能产生困惑；
- `tsconfig.json` 没有设置 `incremental: false` + `tsc --build --clean`，单纯 `tsc` 不会清理过期产物。

**修复建议**：
- 在 `package.json` 的 `prepublishOnly` 脚本里加上 `rimraf dist` 后再 `tsc`；
- 或在 `tsconfig.json` 增加 `"noEmitOnError": true` 并显式清理。

### 3.3 版本号三处不一致

| 位置 | 版本 |
|------|------|
| `package.json` | `1.0.5` |
| `src/cli.ts:121` (`program.version('1.0.0')`) | `1.0.0` |
| `.claude-plugin/plugin.json` `version` | `1.0.0` |
| `.claude-plugin/marketplace.json` `metadata.version` | `1.0.0` |

**影响**：用户运行 `pulse-line --version` 看到 `1.0.0`，与实际包版本 `1.0.5` 不符；插件商店元数据也滞后。

**修复建议**：
- 让 `src/cli.ts` 在编译期通过 `package.json` 注入版本（如 `require('../package.json').version`）；
- 或在发布脚本里同步所有版本字段。

### 3.4 `cli.ts config` 命令存在潜在 shell injection

**位置**：`src/cli.ts:224`

```ts
execSync(`${editor} "${configPath}"`, { stdio: 'inherit' });
```

**问题**：`editor` 来自 `process.env.EDITOR || process.env.VISUAL || 'vi'`，直接拼接到 shell 命令。虽然用户对自己的环境变量有控制权，但若 `EDITOR='code --wait; rm -rf ~'`，命令会被执行。

**修复建议**：把 editor 命令按空格切分为数组，使用 `execFileSync(editorBinary, [...args, configPath])` 避免 shell 解析。

### 3.5 `saveSessionCache` 写入非原子

**位置**：`src/utils/cache.ts:80`

```ts
fs.writeFileSync(cachePath, JSON.stringify(cache));
```

**对比**：`src/tool-timeline/cache.ts:44-69` 的 `writeJsonAtomic` 使用了 `tmp + rename` 的原子写策略。

**问题**：
- 状态栏渲染和 Hook 收集可能并发写同一个 `global.json`（rules 缓存、account-usage 缓存都在这里）；
- 写到一半被读，会读到截断的 JSON，触发 catch 分支返回 null，缓存失效；
- 严重时可能损坏用户配置（虽然 `config.json` 走的是 `saveConfig` 单独路径）。

**修复建议**：让 `saveSessionCache` 复用 `writeJsonAtomic` 的实现。

### 3.6 `parseStdinSync` 静默吞掉读取错误

**位置**：`src/parser/stdin-parser.ts:56-63`

```ts
function read(fd: number, ...): number {
  ...
  try {
    return fs.readSync(fd, buffer, offset, length, position);
  } catch {
    return 0;
  }
}
```

**问题**：把任何错误（包括 EBADF、EIO 等）都当作 EOF 返回 0，导致 `JSON.parse` 收到截断数据，最终报"Failed to parse stdin JSON"，掩盖真实错误。

**修复建议**：仅把 `EOF`（`code === 'EOF'` 或返回 0 字节）视为结束；其他错误应向上抛出。

---

## 四、轻微问题 / 代码质量

### 4.1 `getProgressColor` 出现重复分支

**位置**：`src/formatters/progress-bar.ts:11-12`

```ts
if (pct < 30) return '#9ece6a';
if (pct < 50) return '#9ece6a';  // 颜色与上一行相同
```

要么合并成一个 `if (pct < 50)`，要么第二条该是不同颜色（如黄色）。

### 4.2 `DEFAULT_CONFIG` 语言与图标不一致

**位置**：`src/types/pulse-config.ts:99-129`

```ts
language: 'en',  // 默认英文
modules: {
  model: { ..., icon: '[当前模型]' },   // 中文
  git:    { ..., icon: '[Git 分支]' },  // 中文
  context:{ ..., icon: '[上下文使用率]' }, // 中文
  ...
}
```

英文用户首装后会看到中文图标标签。`migrate-config.ts:16-21` 的 v4 迁移只对 `model.icon` 做了处理，其他模块没管。

**修复建议**：默认图标改为通用 ASCII（`[M]`、`[G]`、`[C]` 等），与 `themes/builtin/dark.ts` 一致；中文图标让用户通过 `pulse-line language zh` 显式切换。

### 4.3 `renderToolAnalyticsPanel` 中 `void theme`

**位置**：`src/extractors/tool-timeline.ts:458`

```ts
lines.push(divider, border);
void theme;
return { text: lines.join('\n') };
```

`theme` 参数未使用，靠 `void theme;` 抑制告警。要么移除参数（影响调用方），要么真正用上（例如根据 `theme.colors` 给标题着色）。

### 4.4 `logger.ts` 中 `measure` / `measureAsync` / `startTiming` / `endTiming` / `reportTimings` 均为死代码

**位置**：`src/utils/logger.ts:11-55`

代码库中无人调用。建议删除，或在关键路径（如 `loadConfig`、`extractRules`、`renderToolAnalyticsPanel`）启用以辅助性能分析。

### 4.5 `appendToolTimelineEvent` 每次写入都全量重算

**位置**：`src/tool-timeline/cache.ts:323-357`

每次 Hook 触发：
1. 读整个缓存文件
2. `JSON.parse`
3. 过滤旧事件、push 新事件
4. **全量** `computeToolTimelineStats` + `computeToolAnalyticsStats`（O(n)）
5. `JSON.stringify` + 原子写

被 `maxEvents`（默认 100）封顶后可接受，但高频使用时仍是 O(n²)。

**优化建议**：增量维护 stats（添加 delta、滚动平均），或仅在读取时计算 stats（写路径只 append events）。

### 4.6 `extractCost` 在 cost=0 时不显示

**位置**：`src/extractors/cost.ts:11`

```ts
if (cost === undefined || cost === null || cost === 0) return null;
```

新会话的 cost 通常是 0，导致模块始终隐藏直到首次产生费用。可能是预期行为，但若希望"显示 $0.0000"以表明模块已启用，可改为只判 `undefined/null`。

### 4.7 `loadConfig` 缓存返回的是可变引用

**位置**：`src/config/loader.ts:26-34`

```ts
const cached = loadSessionCache<PulseConfig>('global', cacheKey);
if (cached) {
  const migrated = upgradePulseSchemaIfNeeded(cached);
  sanitizePulseDisplayConfig(cached);
  ...
  return cached;
}
```

`cached` 是反序列化得到的对象，调用方（如 `enable`/`disable` 命令）会直接修改它。若同一进程内多次 `loadConfig`，第二次拿到的还是同一份缓存对象，可能携带上次的修改痕迹。在 CLI 一次性进程里影响不大，但单元测试和长生命周期进程中需要警惕。

### 4.8 `resolveModelDisplayLabel` 子串匹配过宽

**位置**：`src/utils/model-display-env.ts:20-28`

```ts
if (lowId.includes('opus') || /\bopus\b/.test(lowDisp)) {
  return 'ANTHROPIC_DEFAULT_OPUS_MODEL';
}
```

`includes('opus')` 会匹配到任何包含 "opus" 子串的模型 ID。`includes('sonnet')`、`includes('haiku')` 同理。对正常模型名没问题，但若自定义模型名含这些词，会被误判为对应层级。

### 4.9 `extractOutputStyle` 类型签名与 PulseInput 不一致

**位置**：`src/extractors/output-style.ts:10-14`

```ts
export function extractOutputStyle(
  input: { output_style: { name: string } },
  ...
)
```

但调用处传入的是完整 `input: PulseInput`。类型可以更宽松（结构类型），但与 `PulseInput['output_style']` 的 `name?: string` 不一致——`PulseInput` 里 `output_style.name` 是必填，这里隐式假设它一定有值。`?.` 在第 13 行的使用又暗示可能为空。建议统一。

### 4.10 `install` 命令未提示用户配置 hooks 的兜底

**位置**：`src/cli.ts:124-172`

`tryInstallPlugin()` 失败时只提示用户手动安装插件市场，但**没有**告诉用户：如果只想用 `npx` 而不安装插件，工具时间线、SessionStart 自动配置等 hooks 类功能都不可用。

建议在 `[OK] statusLine.command configured` 之后增加一行诊断：

> "提示：工具时间线（toolTimeline）等功能依赖 hooks。请通过 `/plugin install pulse-line` 启用，或手动把 hooks 段落合并到 `~/.claude/settings.json`。"

---

## 五、性能 / 可优化点

### 5.1 重复加载 `claude-settings-env`

`loadMergedClaudeEnv(cwd)` 在以下位置被重复调用：
- `src/extractors/account-usage.ts:219`（每次 `extractAccountUsageSync` + `refreshAccountUsage`）
- `src/extractors/third-party-api.ts:34`
- `src/utils/model-display-env.ts:43`

每次都同步读取最多 4 个 settings 文件。在单次渲染中可能被调 2-3 次。

**优化**：加进程内 TTL 缓存（key 为 `cwd`），1 秒内的重复调用复用结果。

### 5.2 `extractRules` 全量扫描

`walkDir` + `findClaudeMdFiles` 在大型项目（如 monorepo）里可能扫描数千个文件。虽然有 60 秒 TTL 缓存，但首次扫描可能让状态栏首次渲染延迟数百毫秒。

**优化**：
- 默认 `MAX_DEPTH` 从 10 收紧到 5；
- 对常见大目录（`node_modules`、`.git`、`target`、`build`）默认排除；
- 把扫描放进异步预热（类似 `account-usage` 的 fire-and-forget），首次渲染先用空结果。

### 5.3 `getTerminalWidth` 每次都派生进程

**位置**：`src/utils/terminal-width.ts:34-50`

每次渲染都尝试 `mode con` / `stty size` 子进程。虽然 timeout 80ms，但累计开销不小。

**优化**：用 `process.stdout.columns` 优先，仅在拿不到时才回退到子进程；并加进程级缓存。

### 5.4 `computeToolAnalyticsStats` 重复计算

`readToolTimelineCache` 读取后会**重新计算** `stats` 和 `analyticsStats`（`src/tool-timeline/cache.ts:101-103`），即便磁盘上已经有这两个字段。这抹掉了"持久化 stats"的好处。

**修复**：先校验磁盘上的 stats 是否一致（例如 `events.length === stats.total`），一致则直接用。

### 5.5 `appendToolTimelineEvent` 触发 2 次 stats 计算

写入路径里 `computeToolTimelineStats(events)` 和 `computeToolAnalyticsStats(events, agents)` 各算一遍 `byTool`、`slowest` 等，存在重复遍历。

---

## 六、修复优先级建议

| 优先级 | 问题 | 修复成本 |
|--------|------|----------|
| P0 | 1.1 plugin.json 缺 hooks 字段 | 1 行 |
| P0 | 2.1 thirdPartyApi 结果丢弃 | 中（参考 account-usage 模式） |
| P1 | 2.2 extractMcpStatus 用错 cwd | 1 行 |
| P1 | 3.1 extractRules 过度计数 | 中 |
| P1 | 3.2 dist/src/tag 遗留产物 | 加清理脚本 |
| P1 | 3.3 版本号不同步 | 引入 `version.js` |
| P2 | 3.4 shell injection in config | 改 execFileSync |
| P2 | 3.5 saveSessionCache 非原子 | 复用 writeJsonAtomic |
| P2 | 3.6 parseStdinSync 吞错误 | 区分 EOF 与异常 |
| P3 | 4.x 各类代码质量 | 各自独立修复 |
| P3 | 5.x 性能优化 | 视场景而定 |

---

## 七、附录：复现用户报告的 Bug

**最小复现步骤**：

1. 在干净环境 `npm i -g pulse-line` 或 `npx -y pulse-line@latest install`
2. `pulse-line enable toolTimeline`
3. 重启 Claude Code，开始一个会话并使用任意工具（Bash/Read/Edit 等）
4. 状态栏不会出现"工具分析"面板

**诊断方法**：

```bash
# 1. 检查 hooks 是否注册（应为空）
cat ~/.claude/settings.json | grep -A20 hooks

# 2. 检查 plugin 是否声明 hooks（应为空）
cat node_modules/pulse-line/.claude-plugin/plugin.json | grep hooks

# 3. 检查缓存目录（应该不存在）
ls ~/.claude/pulse/cache/tool-timeline/
```

**临时绕过**（直到修复发布）：把 `hooks/hooks.json` 的内容手动合并到 `~/.claude/settings.json`，并把 `${CLAUDE_PLUGIN_ROOT}` 替换为 `pulse-line` 包的实际安装路径（或改用 `npx -y pulse-line@latest hook ...`）。
