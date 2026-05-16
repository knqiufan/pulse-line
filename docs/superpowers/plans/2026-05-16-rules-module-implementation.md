# 规则模块 — 详细实施方案

## 概述

为 pulse-line 状态栏新增"规则"模块，统计项目中的 CLAUDE.md 文件、`.claude/` 目录下的配置文件以及 `skills/` 目录下的技能文件数量。同时提供 CLI 命令用于查看详细文件列表和管理自定义扫描模式。

**状态栏显示效果：**

```
[规则] 15  规则:12 Skill:3
```

- `[规则] 15` — 图标 + 总数，使用主题 info 色
- `规则:12 Skill:3` — 分类明细，使用主题 muted 色（暗色备注样式）
- 某分类为 0 时省略该分类；总数为 0 时不显示明细

---

## 变更文件总览

| 文件 | 操作 | 复杂度 |
|---|---|---|
| `src/types/pulse-config.ts` | 修改 | 低 |
| `src/types/theme.ts` | 修改 | 低 |
| `src/extractors/rules.ts` | **新建** | 中 |
| `src/extractors/index.ts` | 修改 | 低 |
| `src/index.ts` | 修改 | 低 |
| `src/i18n/locales/zh.ts` | 修改 | 低 |
| `src/i18n/locales/en.ts` | 修改 | 低 |
| `src/cli.ts` | 修改 | 中 |
| `src/config/migrate-config.ts` | 修改 | 低 |
| `src/config/loader.ts` | 修改 | 低 |
| `src/utils/display-sanitize.ts` | 修改 | 低 |
| `src/themes/index.ts` | 修改 | 低 |
| `src/themes/icon-sets/nerd.ts` | 修改 | 低 |
| `src/themes/icon-sets/text.ts` | 修改 | 低 |
| `src/themes/builtin/dark.ts` | 修改 | 低 |
| `src/themes/builtin/light.ts` | 修改 | 低 |
| `src/themes/builtin/cyberpunk.ts` | 修改 | 低 |
| `src/themes/builtin/forest.ts` | 修改 | 低 |
| `src/themes/builtin/ocean.ts` | 修改 | 低 |
| `commands/rules.md` | **新建** | 低 |
| `commands/enable.md` | 修改 | 低 |
| `commands/disable.md` | 修改 | 低 |
| `test/extractors.test.ts` | 修改 | 中 |
| `README.md` | 修改 | 低 |
| `README_EN.md` | 修改 | 低 |

**合计：2 个新建文件，24 个修改文件**

---

## 步骤 1：类型系统

### 1.1 `src/types/pulse-config.ts`

**添加 `RulesModuleConfig` 接口**（在 `ToolTimelineModuleConfig` 之后）：

```typescript
export interface RulesModuleConfig extends ModuleConfig {
  includePatterns?: string[];
  excludePatterns?: string[];
}
```

**在 `PulseConfig.modules` 中添加 `rules` 字段**：

```typescript
modules: {
  // ... 现有模块 ...
  rules: RulesModuleConfig;
};
```

**更新 `DEFAULT_CONFIG`**：

- `schemaVersion` 从 `6` 改为 `7`
- 在 `modules` 中插入（放在 `toolTimeline` 之前，order=15）：

```typescript
rules: {
  enabled: true,
  order: 15,
  icon: '[规则]',
  includePatterns: [],
  excludePatterns: []
},
```

### 1.2 `src/types/theme.ts`

**在 `Theme.components` 中添加 `rules`**（在 `toolTimeline` 之后）：

```typescript
rules: ComponentStyle;
```

### 1.3 `src/themes/icon-sets/nerd.ts` 和 `src/themes/icon-sets/text.ts`

两个文件都定义了 `IconSet` 接口和具体的图标对象。**都需要修改：**

**`IconSet` 接口添加：**

```typescript
rules: string;
```

**`nerdIconSet` 对象添加：**

```typescript
rules: "",  // Nerd Font 中暂无合适的规则图标，保持空串，回退到配置中的文本图标
```

**`textIconSet` 对象添加：**

```typescript
rules: '[R]'
```

### 1.4 `src/themes/index.ts`

**`overlayNerdIcons` 函数**中添加 `rules` 映射（在 `toolTimeline` 之后）：

```typescript
theme.components.rules.icon = n.rules;
```

---

## 步骤 2：核心提取器

### 2.1 `src/extractors/rules.ts`（新建）

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { loadSessionCache, saveSessionCache } from '../utils/cache';

export interface RulesFileEntry {
  relativePath: string;
  category: 'rule' | 'skill';
}

export interface RulesSegment {
  total: number;
  rulesCount: number;
  skillsCount: number;
  files: RulesFileEntry[];
}

/** 默认跳过的目录名 */
const DEFAULT_EXCLUDES = new Set([
  'node_modules', '.git', 'dist', '.worktrees',
  '.next', '.nuxt', 'coverage', '__pycache__', '.turbo'
]);

/** 搜索 CLAUDE.md 时的最大递归深度 */
const MAX_DEPTH = 10;

const CACHE_TTL = 60_000; // 60 秒

/** 构建缓存键——包含 cwd 和 pattern 参数以避免过期 */
function buildCacheKey(cwd: string, includes: string[], excludes: string[]): string {
  const payload = `${cwd}::${includes.join(',')}::${excludes.join(',')}`;
  return `rules-scan:${payload}`;
}

function shouldExcludeDir(name: string, excludePatterns: string[]): boolean {
  if (DEFAULT_EXCLUDES.has(name)) return true;
  for (const pat of excludePatterns) {
    if (globMatch(name, pat)) return true;
  }
  return false;
}

/** 极简 glob 匹配：仅支持 * 和 ? 通配符 */
function globMatch(value: string, pattern: string): boolean {
  const re = '^' + pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // 转义正则特殊字符
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.') + '$';
  return new RegExp(re).test(value);
}

/** 递归遍历目录，收集所有文件 */
function walkDir(
  dir: string,
  cwd: string,
  excludePatterns: string[],
  category: 'rule' | 'skill'
): RulesFileEntry[] {
  const results: RulesFileEntry[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldExcludeDir(entry.name, excludePatterns)) continue;
        results.push(...walkDir(path.join(dir, entry.name), cwd, excludePatterns, category));
      } else if (entry.isFile()) {
        results.push({
          relativePath: path.relative(cwd, path.join(dir, entry.name)),
          category
        });
      }
    }
  } catch {
    // 目录不存在或无权限——跳过
  }
  return results;
}

/** 递归搜索所有 CLAUDE.md 文件 */
function findClaudeMdFiles(
  dir: string,
  cwd: string,
  excludePatterns: string[],
  depth: number
): RulesFileEntry[] {
  if (depth > MAX_DEPTH) return [];
  const results: RulesFileEntry[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldExcludeDir(entry.name, excludePatterns)) continue;
        results.push(...findClaudeMdFiles(
          path.join(dir, entry.name), cwd, excludePatterns, depth + 1
        ));
      } else if (entry.name === 'CLAUDE.md') {
        results.push({
          relativePath: path.relative(cwd, path.join(dir, entry.name)),
          category: 'rule'
        });
      }
    }
  } catch {
    // 跳过
  }
  return results;
}

/** 处理用户自定义的 includePatterns */
function scanIncludePatterns(
  cwd: string,
  patterns: string[],
  excludePatterns: string[],
  existing: RulesFileEntry[]
): RulesFileEntry[] {
  const results: RulesFileEntry[] = [];
  const existingPaths = new Set(existing.map(f => f.relativePath));

  for (const pattern of patterns) {
    // 尝试解析为字面路径
    const resolved = path.resolve(cwd, pattern);
    try {
      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        const rel = path.relative(cwd, resolved);
        if (!existingPaths.has(rel)) {
          results.push({ relativePath: rel, category: 'rule' });
        }
      } else if (stat.isDirectory()) {
        const entries = walkDir(resolved, cwd, excludePatterns, 'rule');
        for (const e of entries) {
          if (!existingPaths.has(e.relativePath)) {
            results.push(e);
          }
        }
      }
    } catch {
      // 路径不存在——跳过（支持 glob 模式需后续迭代）
    }
  }
  return results;
}

/** 去重 */
function dedup(files: RulesFileEntry[]): RulesFileEntry[] {
  const seen = new Set<string>();
  const result: RulesFileEntry[] = [];
  for (const f of files) {
    if (!seen.has(f.relativePath)) {
      seen.add(f.relativePath);
      result.push(f);
    }
  }
  return result;
}

export function extractRules(
  cwd: string,
  includePatterns: string[] = [],
  excludePatterns: string[] = []
): RulesSegment {
  // 检查缓存（包含 pattern 参数以避免配置变更后缓存过期）
  const cacheKey = buildCacheKey(cwd, includePatterns, excludePatterns);
  const cached = loadSessionCache<RulesSegment>('global', cacheKey);
  if (cached) return cached;

  const allFiles: RulesFileEntry[] = [];

  // 1. 扫描 CLAUDE.md 文件（递归，有深度限制）
  allFiles.push(...findClaudeMdFiles(cwd, cwd, excludePatterns, 0));

  // 2. 扫描 .claude/ 目录
  const claudeDir = path.join(cwd, '.claude');
  if (fs.existsSync(claudeDir)) {
    allFiles.push(...walkDir(claudeDir, cwd, excludePatterns, 'rule'));
  }

  // 3. 扫描 skills/ 目录
  const skillsDir = path.join(cwd, 'skills');
  if (fs.existsSync(skillsDir)) {
    allFiles.push(...walkDir(skillsDir, cwd, excludePatterns, 'skill'));
  }

  // 4. 处理用户自定义 includePatterns
  const extras = scanIncludePatterns(cwd, includePatterns, excludePatterns, allFiles);
  allFiles.push(...extras);

  // 去重
  const files = dedup(allFiles);

  const segment: RulesSegment = {
    total: files.length,
    rulesCount: files.filter(f => f.category === 'rule').length,
    skillsCount: files.filter(f => f.category === 'skill').length,
    files
  };

  // 缓存结果
  saveSessionCache('global', cacheKey, segment, CACHE_TTL);
  return segment;
}
```

**设计要点：**

- **零外部依赖**：glob 匹配使用极简正则实现，不引入 minimatch/picomatch
- **深度限制**：CLAUDE.md 搜索限制 10 层，防止大项目卡顿
- **缓存键包含参数**：`cwd + includePatterns + excludePatterns` 组合为键，配置变更自动失效
- **默认排除列表**：涵盖常见的非项目文件目录（node_modules, .git, dist, .worktrees 等）

---

## 步骤 3：接入渲染管线

### 3.1 `src/extractors/index.ts`

添加导出：

```typescript
export { extractRules } from './rules';
export type { RulesSegment, RulesFileEntry } from './rules';
```

### 3.2 `src/index.ts`

**添加导入**（在文件顶部的导入区域）：

```typescript
import { extractRules } from './extractors';
import { getLabel } from './i18n';
```

**在模块渲染区域添加规则模块**（位置无关，最终按 `segment.order` 排序）：

```typescript
// Rules
if (modules.rules.enabled) {
  const rules = extractRules(
    input.cwd,
    modules.rules.includePatterns ?? [],
    modules.rules.excludePatterns ?? []
  );
  const icon = modules.rules.icon ?? theme.components.rules.icon ?? '';
  const label = rules.total.toString();
  const line = icon.length > 0 ? `${icon} ${label}` : label;

  const parts: string[] = [];
  if (rules.rulesCount > 0) {
    parts.push(`${getLabel(config.language, 'rulesFiles')}:${rules.rulesCount}`);
  }
  if (rules.skillsCount > 0) {
    parts.push(`${getLabel(config.language, 'rulesSkills')}:${rules.skillsCount}`);
  }
  const suffix = parts.length > 0 ? `  ${parts.join(' ')}` : '';

  segments.push({
    order: modules.rules.order,
    text: colorize(theme.colors.info, line) +
      (suffix ? colorize(theme.colors.muted, suffix) : '')
  });
}
```

---

## 步骤 4：国际化标签

### 4.1 `src/i18n/locales/zh.ts`

在 `zhLabels` 对象末尾添加：

```typescript
rules: '规则',
rulesFiles: '规则',
rulesSkills: 'Skill',
rulesTitle: '规则文件',
rulesCategory: '规则文件',
skillsCategory: 'Skills',
rulesTotal: '总计',
```

### 4.2 `src/i18n/locales/en.ts`

在 `enLabels` 对象末尾添加：

```typescript
rules: 'Rules',
rulesFiles: 'Rules',
rulesSkills: 'Skill',
rulesTitle: 'Rules Files',
rulesCategory: 'Rules',
skillsCategory: 'Skills',
rulesTotal: 'Total',
```

---

## 步骤 5：CLI 命令

### 5.1 `src/cli.ts`

**添加导入**（文件顶部）：

```typescript
import { extractRules } from './extractors/rules';
```

**在 `timeline` 命令组之后、`program.command('language')` 之前，添加 `rules` 命令组：**

```typescript
// ── Rules 命令组 ──────────────────────────────────
const rulesCmd = program
  .command('rules')
  .description('Show project rules/config file count and list');

rulesCmd.action(() => {
  const cwd = process.cwd();
  const config = loadConfig();
  const mod = config.modules.rules;
  const result = extractRules(cwd, mod.includePatterns ?? [], mod.excludePatterns ?? []);
  const labels = getLabels(config.language);

  console.log(`${labels.rulesTitle || 'Rules Files'} Summary`);
  console.log(`  ${labels.rulesCategory || 'Rules'}: ${result.rulesCount}`);
  console.log(`  ${labels.skillsCategory || 'Skills'}: ${result.skillsCount}`);
  console.log(`  ${labels.rulesTotal || 'Total'}: ${result.total}`);
});

rulesCmd
  .command('list')
  .description('List all detected rules/config files')
  .action(() => {
    const cwd = process.cwd();
    const config = loadConfig();
    const mod = config.modules.rules;
    const result = extractRules(cwd, mod.includePatterns ?? [], mod.excludePatterns ?? []);

    if (result.total === 0) {
      console.log('No rules/config files found in current project.');
      return;
    }

    const labels = getLabels(config.language);

    if (result.rulesCount > 0) {
      console.log(`=== ${labels.rulesCategory || 'Rules'} (${result.rulesCount}) ===`);
      for (const f of result.files.filter(f => f.category === 'rule')) {
        console.log(`  ${f.relativePath}`);
      }
      console.log('');
    }

    if (result.skillsCount > 0) {
      console.log(`=== ${labels.skillsCategory || 'Skills'} (${result.skillsCount}) ===`);
      for (const f of result.files.filter(f => f.category === 'skill')) {
        console.log(`  ${f.relativePath}`);
      }
      console.log('');
    }

    console.log(`${labels.rulesTotal || 'Total'}: ${result.total}`);
  });

rulesCmd
  .command('pattern')
  .description('Manage custom file patterns (include/exlose)')
  .argument('<action>', 'add | remove | add-exclude | remove-exclude')
  .argument('<glob>', 'File or directory pattern')
  .action((action: string, pattern: string) => {
    const validActions = ['add', 'remove', 'add-exclude', 'remove-exclude'];
    if (!validActions.includes(action)) {
      console.error(`[ERROR] Action must be one of: ${validActions.join(', ')}`);
      process.exit(1);
    }

    const config = loadConfig();
    const mod = config.modules.rules;

    if (action === 'add' || action === 'remove') {
      const patterns = mod.includePatterns ?? [];
      if (action === 'add') {
        if (patterns.includes(pattern)) {
          console.log(`Pattern already exists: ${pattern}`);
          return;
        }
        mod.includePatterns = [...patterns, pattern];
        saveAndInvalidate(config);
        console.log(`[OK] Include pattern added: ${pattern}`);
      } else {
        if (!patterns.includes(pattern)) {
          console.log(`Pattern not found: ${pattern}`);
          return;
        }
        mod.includePatterns = patterns.filter(p => p !== pattern);
        saveAndInvalidate(config);
        console.log(`[OK] Include pattern removed: ${pattern}`);
      }
    } else {
      // add-exclude / remove-exclude
      const patterns = mod.excludePatterns ?? [];
      if (action === 'add-exclude') {
        if (patterns.includes(pattern)) {
          console.log(`Exclude pattern already exists: ${pattern}`);
          return;
        }
        mod.excludePatterns = [...patterns, pattern];
        saveAndInvalidate(config);
        console.log(`[OK] Exclude pattern added: ${pattern}`);
      } else {
        if (!patterns.includes(pattern)) {
          console.log(`Exclude pattern not found: ${pattern}`);
          return;
        }
        mod.excludePatterns = patterns.filter(p => p !== pattern);
        saveAndInvalidate(config);
        console.log(`[OK] Exclude pattern removed: ${pattern}`);
      }
    }
  });
```

**更新 `language` 命令**中的 `moduleKeyMap`（添加 `rules` 条目）：

```typescript
const moduleKeyMap: Record<string, string> = {
  // ... 现有条目 ...
  toolTimeline: 'toolTimeline',
  rules: 'rules'  // 新增
};
```

**更新 `CONFIG_CACHE_KEY`**（在 `saveAndInvalidate` 函数附近）：

```typescript
const CONFIG_CACHE_KEY = 'pulse-config-v7';
```

---

## 步骤 6：配置迁移（schema v6 → v7）

### 6.1 `src/config/migrate-config.ts`

- `CURRENT_SCHEMA` 从 `6` 改为 `7`
- 添加 v7 迁移块（在 `if (v < 6)` 块之后）：

```typescript
if (v < 7) {
  if (!(config.modules as any).rules) {
    (config.modules as any).rules = JSON.parse(
      JSON.stringify(DEFAULT_CONFIG.modules.rules)
    );
  }
}
```

### 6.2 `src/config/loader.ts`

- 缓存键从 `'pulse-config-v6'` 改为 `'pulse-config-v7'`

---

## 步骤 7：主题组件

### 7.1 所有 5 个内置主题

每个主题的 `components` 对象中，在 `toolTimeline` 之后添加 `rules` 组件。

**dark.ts：**
```typescript
rules: { fg: '#7dcfff', icon: '[R]', showIcon: true },
```

**light.ts：**
```typescript
rules: { fg: '#0891b2', icon: '[R]', showIcon: true },
```

**cyberpunk.ts：**
```typescript
rules: { fg: '#8be9fd', icon: '[R]', showIcon: true },
```

**forest.ts：**
```typescript
rules: { fg: '#95d5b2', icon: '[R]', showIcon: true },
```

**ocean.ts：**
```typescript
rules: { fg: '#67e8f9', icon: '[R]', showIcon: true },
```

颜色选取逻辑：每个主题中 `rules` 复用该主题的 `info`/`git` 色系（与同类信息型模块一致）。

---

## 步骤 8：显示清理

### 8.1 `src/utils/display-sanitize.ts`

在 `MODULE_KEYS` 数组末尾添加 `'rules'`：

```typescript
const MODULE_KEYS = [
  'model', 'context', 'git', 'cost', 'duration', 'workspace',
  'turns', 'cacheRatio', 'rateLimits', 'weeklyQuota', 'mcpStatus',
  'thinking', 'outputStyle', 'thirdPartyApi', 'accountUsage',
  'toolTimeline', 'rules'
] as const;
```

---

## 步骤 9：命令文档

### 9.1 `commands/rules.md`（新建）

```markdown
---
description: Show project rules/config file summary and list
---

# Rules

## Command

```
/pulse-line:rules
```

## Description

Show a summary of project rules and config files detected by Pulse Line. This
includes CLAUDE.md files, `.claude/` directory contents, and `skills/` directory
contents.

## Instructions

Run the following shell command:

```bash
npx -y pulse-line@latest rules
```

Useful variants:

```bash
npx -y pulse-line@latest rules list
npx -y pulse-line@latest rules pattern add docs/
npx -y pulse-line@latest rules pattern remove docs/
npx -y pulse-line@latest rules pattern add-exclude vendor/
```
```

### 9.2 `commands/enable.md` 和 `commands/disable.md`

在可用模块列表中添加 `rules`：

```
Available module IDs: `model`, `context`, `git`, `accountUsage`, `cost`, `duration`, `workspace`, `turns`, `cacheRatio`, `rateLimits`, `weeklyQuota`, `mcpStatus`, `thinking`, `outputStyle`, `thirdPartyApi`, `toolTimeline`, `rules`.
```

---

## 步骤 10：测试

### 10.1 `test/extractors.test.ts`

新增 `extractRules` 测试用例：

1. **空目录** — 无 CLAUDE.md、无 .claude/、无 skills/ → total=0, rulesCount=0, skillsCount=0
2. **根目录 CLAUDE.md** — rulesCount=1, total=1
3. **嵌套 CLAUDE.md**（如 `packages/lib/CLAUDE.md`） → rulesCount=2
4. **`.claude/settings.json` + `.claude/agents/reviewer.md`** → rulesCount=3（含根目录 CLAUDE.md）
5. **`skills/my-skill/SKILL.md`** → skillsCount=1
6. **去重** — 不会重复计数
7. **includePatterns** — 添加额外目录后被统计
8. **excludePatterns** — 匹配的目录被排除
9. **缓存** — 第二次调用返回缓存结果（相同参数）
10. **缓存失效** — 修改 patterns 后缓存未命中

测试使用临时目录（`os.tmpdir()` + `fs.mkdirSync`），每个用例结束后清理。

---

## 步骤 11：文档更新

### 11.1 `README.md` 和 `README_EN.md`

在模块参考表中添加 `rules` 行：

中文 README：

```
| rules | 规则 | [规则] | 15 | 统计项目中的规则/配置文件数量 |
```

英文 README：

```
| rules | Rules | [规则] | 15 | Count project rules and config files |
```

---

## 实施顺序

```
步骤 1  类型系统       ← 基础，所有后续步骤依赖
步骤 2  核心提取器     ← 核心逻辑
步骤 3  接入渲染管线   ← 状态栏开始渲染
步骤 4  国际化标签     ← 显示正确的中文/英文
步骤 5  CLI 命令       ← 交互功能
步骤 6  配置迁移       ← 老用户平滑升级
步骤 7  主题组件       ← 全部 5 个主题
步骤 8  显示清理       ← icon 安全性
步骤 9  命令文档       ← slash 命令可用
步骤 10 测试           ← 验证正确性
步骤 11 文档更新       ← 用户可见的说明
```

步骤 1-4 为核心链路，完成后状态栏即可正常显示新模块。步骤 5-9 为周边功能，可并行开发。步骤 10-11 为收尾工作。

---

## 与原方案的主要改进点

| # | 改进内容 | 原因 |
|---|---|---|
| 1 | 补充 `IconSet` 接口和 `overlayNerdIcons` 更新 | 遗漏会导致 TypeScript 编译失败 |
| 2 | 移除 `minimatch` 残留导入，统一使用内联 glob | 避免自相矛盾 |
| 3 | 缓存键包含 pattern 参数 | 配置变更后缓存自动失效 |
| 4 | CLAUDE.md 搜索添加 10 层深度限制 | 防止大型项目性能问题 |
| 5 | CLI pattern 命令支持 `add-exclude`/`remove-exclude` | 用户可通过命令行管理排除规则 |
| 6 | 补充 `language` 命令的 `moduleKeyMap` 更新 | 切换语言时图标正确更新 |
| 7 | 补充 `enable.md`/`disable.md` 模块列表更新 | 新模块可被 enable/disable 命令发现 |
| 8 | 默认排除列表增加 `.next`、`.turbo` 等 | 覆盖更多常见构建产物目录 |
| 9 | 全部用中文重写 | 与项目主要用户语言一致 |
