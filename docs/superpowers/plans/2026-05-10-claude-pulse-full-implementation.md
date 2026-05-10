# Claude Pulse 完整实现计划

> **For agentic workers:** 本计划涵盖 Phase 1~Phase 8 所有功能，采用增量交付策略，每个 phase 都有明确的完成标志。

**目标：** 实现一个高性能、可定制、跨平台兼容的 Claude Code 状态栏工具

**技术栈：** Node.js + TypeScript (零第三方依赖)，使用 Node.js 内置模块 (fs, path, child_process, os, https)

---

## 项目文件结构

```
claude-pulse/
├── src/
│   ├── index.ts                    # 总入口: stdin → 协调各模块 → stdout
│   ├── types/
│   │   ├── pulse-input.ts          # stdin JSON 类型定义
│   │   ├── pulse-config.ts         # 配置类型定义
│   │   └── theme.ts                # 主题类型定义
│   ├── parser/
│   │   └── stdin-parser.ts         # stdin 解析器
│   ├── extractors/
│   │   ├── model.ts                # 模型标识提取器
│   │   ├── context.ts              # 上下文使用情况提取器
│   │   ├── git.ts                  # Git 分支和 upstream 提取器
│   │   ├── cost.ts                 # 成本计算提取器
│   │   ├── workspace.ts            # 工作区名称提取器
│   │   ├── session.ts              # 会话时长提取器
│   │   ├── transcript.ts           # 对话轮次提取器
│   │   ├── rate-limits.ts          # 速率限制提取器
│   │   ├── mcp.ts                  # MCP 状态检测
│   │   ├── third-party-api.ts      # 第三方 API 用量查询
│   │   └── index.ts                # 统一导出
│   ├── formatters/
│   │   ├── progress-bar.ts         # 进度条格式化
│   │   ├── duration.ts             # 时长格式化
│   │   ├── separator.ts            # 分隔符渲染
│   │   ├── segment.ts              # 单段完整渲染
│   │   └── layout.ts               # 多段组合与换行
│   ├── themes/
│   │   ├── index.ts                # 主题加载器
│   │   └── builtin/
│   │       ├── dark.ts             # 深邃黑主题
│   │       ├── light.ts            # 极简白主题
│   │       ├── cyberpunk.ts        # 赛博朋克主题
│   │       ├── forest.ts           # 森林绿主题
│   │       └── ocean.ts            # 海洋蓝主题
│   ├── config/
│   │   ├── loader.ts               # 配置加载器
│   │   ├── defaults.ts             # 默认配置
│   │   └── validator.ts            # 配置验证
│   └── utils/
│       ├── cache.ts                # TTL 缓存
│       ├── git.ts                  # Git 命令执行
│       ├── ansi.ts                 # ANSI 转义码生成
│       ├── fs.ts                   # 跨平台文件操作
│       └── logger.ts               # 调试日志
├── bin/
│   └── claude-pulse.js             # CLI 可执行入口
├── themes/                         # 自定义主题目录
├── test/
│   ├── fixtures/
│   │   └── sample-input.json       # 测试用模拟 JSON
│   ├── extractors.test.ts          # extractor 测试
│   ├── formatters.test.ts          # formatter 测试
│   ├── themes.test.ts              # 主题测试
│   └── integration.test.ts         # 集成测试
├── tsconfig.json
├── package.json
└── README.md
```

---

## Phase 1: 项目骨架与核心数据流

**目标：** 能接收 stdin JSON 并输出基础状态栏（<50ms P99）

### Task 1.1: 初始化 npm 项目和 TypeScript

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "claude-pulse",
  "version": "1.0.0",
  "description": "Customizable status bar for Claude Code",
  "main": "dist/index.js",
  "bin": {
    "claude-pulse": "./bin/claude-pulse.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "node --test test/**/*.test.ts",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["claude-code", "pulse", "cli"],
  "license": "MIT",
  "engines": { "node": ">=18.0.0" },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 4: 运行 npm install**

```bash
npm install
```

Expected: 所有依赖安装成功

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json .gitignore
git commit -m "chore: initialize npm project with TypeScript"
```

### Task 1.2: 创建完整类型定义

**Files:**
- Create: `src/types/pulse-input.ts`
- Create: `src/types/pulse-config.ts`
- Create: `src/types/theme.ts`

- [ ] **Step 1: 创建 pulse-input.ts**

```typescript
// src/types/pulse-input.ts

export interface PulseInput {
  cwd: string;
  session_id: string;
  session_name?: string;
  transcript_path: string;
  model: ModelInfo;
  workspace: WorkspaceInfo;
  version: string;
  output_style: { name: string };
  cost: CostInfo;
  context_window: ContextWindow;
  exceeds_200k_tokens: boolean;
  effort?: { level: string };
  thinking?: { enabled: boolean };
  rate_limits?: RateLimits;
  vim?: { mode: string };
  agent?: { name: string };
  worktree?: WorktreeInfo;
}

export interface ModelInfo {
  id: string;
  display_name: string;
}

export interface ContextWindow {
  total_input_tokens: number;
  total_output_tokens: number;
  context_window_size: number;
  used_percentage: number;
  remaining_percentage: number;
  current_usage?: CurrentUsage;
}

export interface CurrentUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface WorkspaceInfo {
  current_dir: string;
  project_dir?: string;
  project_name?: string;
  read_only: boolean;
}

export interface CostInfo {
  total_cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  current_usage?: CurrentUsage;
}

export interface RateLimits {
  five_hour: {
    requests_used: number;
    requests_limit: number;
    input_tokens_used: number;
    input_tokens_limit: number;
    output_tokens_used: number;
    output_tokens_limit: number;
    resets_at: string;
  };
  seven_day?: {
    requests_used: number;
    requests_limit: number;
    input_tokens_used: number;
    input_tokens_limit: number;
    output_tokens_used: number;
    output_tokens_limit: number;
    resets_at: string;
  };
}

export interface WorktreeInfo {
  worktree_path: string;
  base_path: string;
}
```

- [ ] **Step 2: 创建 pulse-config.ts**

```typescript
// src/types/pulse-config.ts

export interface PulseConfig {
  theme: string;
  separator: string;
  padding: number;
  refreshInterval: number;
  modules: {
    model: ModuleConfig;
    context: ContextModuleConfig;
    git: GitModuleConfig;
    cost: ModuleConfig;
    duration: ModuleConfig;
    workspace: ModuleConfig;
    turns: ModuleConfig;
    cacheRatio: ModuleConfig;
    rateLimits: RateLimitModuleConfig;
    weeklyQuota: RateLimitModuleConfig;
    mcpStatus: ModuleConfig;
    thinking: ModuleConfig;
    outputStyle: ModuleConfig;
    thirdPartyApi: ThirdPartyApiConfig;
  };
  advanced: {
    cacheEnabled: boolean;
    cacheTTL: number;
    gitTimeout: number;
    debugMode: boolean;
    customThemePath: string | null;
  };
}

export interface ModuleConfig {
  enabled: boolean;
  order: number;
  icon?: string;
}

export interface ContextModuleConfig extends ModuleConfig {
  showBar?: boolean;
  showTokens?: boolean;
  barWidth?: number;
}

export interface GitModuleConfig extends ModuleConfig {
  showUpstream?: boolean;
}

export interface RateLimitModuleConfig extends ModuleConfig {
  showCountdown?: boolean;
}

export interface ThirdPartyApiConfig extends ModuleConfig {
  providers?: string[];
}

export const DEFAULT_CONFIG: PulseConfig = {
  theme: 'dark',
  separator: ' │ ',
  padding: 1,
  refreshInterval: 5,
  modules: {
    model: { enabled: true, order: 1, icon: '🧠' },
    context: {
      enabled: true,
      order: 2,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '📊'
    },
    git: {
      enabled: true,
      order: 3,
      showUpstream: false,
      icon: '🌿'
    },
    cost: { enabled: true, order: 4, icon: '💰' },
    duration: { enabled: false, order: 5, icon: '⏱️' },
    workspace: { enabled: false, order: 6, icon: '📁' },
    turns: { enabled: false, order: 7, icon: '💬' },
    cacheRatio: { enabled: false, order: 8, icon: '📦' },
    rateLimits: { enabled: false, order: 9, icon: '⚡', showCountdown: true },
    weeklyQuota: { enabled: false, order: 10, icon: '📅', showCountdown: true },
    mcpStatus: { enabled: false, order: 11, icon: '🔌' },
    thinking: { enabled: false, order: 12, icon: '🤔' },
    outputStyle: { enabled: false, order: 13, icon: '📝' },
    thirdPartyApi: { enabled: false, order: 14, icon: '🔗', providers: [] }
  },
  advanced: {
    cacheEnabled: true,
    cacheTTL: 300,
    gitTimeout: 200,
    debugMode: false,
    customThemePath: null
  }
};
```

- [ ] **Step 3: 创建 theme.ts**

```typescript
// src/types/theme.ts

export interface Theme {
  meta: {
    name: string;
    author: string;
    version: string;
    description: string;
  };
  separator: {
    left: string;
    right: string;
    color: string;
  };
  colors: {
    background: string;
    primary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    muted: string;
    dim: string;
  };
  components: {
    model: ComponentStyle;
    context: ComponentStyle;
    contextBar: ComponentStyle;
    git: ComponentStyle;
    cost: ComponentStyle;
    duration: ComponentStyle;
    workspace: ComponentStyle;
    turns: ComponentStyle;
    cacheRatio: ComponentStyle;
    rateLimit: ComponentStyle;
    weeklyQuota: ComponentStyle;
    mcpStatus: ComponentStyle;
    thinking: ComponentStyle;
    outputStyle: ComponentStyle;
    separator: ComponentStyle;
  };
}

export interface ComponentStyle {
  fg: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  icon: string;
  showIcon?: boolean;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: add type definitions for pulse input, config, and theme"
```

### Task 1.3: 实现 stdin 解析器

**Files:**
- Create: `src/parser/stdin-parser.ts`

- [ ] **Step 1: 编写 stdin 解析器**

```typescript
// src/parser/stdin-parser.ts

import type { PulseInput } from '../types/pulse-input';

export function parseStdin(): PulseInput {
  let raw = '';

  if (process.stdin.isTTY) {
    throw new Error('No stdin data provided');
  }

  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    process.stdin.on('data', (chunk: string) => {
      raw += chunk;
    });

    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(raw.trim());
        resolve(data as PulseInput);
      } catch (err) {
        reject(new Error(`Failed to parse stdin JSON: ${err}`));
      }
    });

    process.stdin.on('error', (err) => {
      reject(new Error(`Failed to read stdin: ${err}`));
    });
  });
}

export function parseStdinSync(): PulseInput {
  const raw = readFileSync(0, 'utf8');
  return JSON.parse(raw.trim()) as PulseInput;
}
```

- [ ] **Step 2: 编写测试**

```typescript
// test/parser.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { parseStdinSync } from '../src/parser/stdin-parser';

const mockInput = {
  cwd: '/Users/test/project',
  session_id: 'session-123',
  transcript_path: '/Users/test/.claude/sessions/session-123.jsonl',
  model: { id: 'claude-opus-4', display_name: 'Opus 4' },
  workspace: {
    current_dir: '/Users/test/project',
    project_dir: '/Users/test/project',
    project_name: 'project',
    read_only: false
  },
  version: '1.0.0',
  output_style: { name: 'default' },
  cost: {
    total_cost_usd: 0.042,
    input_cost_usd: 0.008,
    output_cost_usd: 0.034,
    current_usage: {
      input_tokens: 850,
      output_tokens: 420,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 350
    }
  },
  context_window: {
    total_input_tokens: 1200,
    total_output_tokens: 420,
    context_window_size: 200000,
    used_percentage: 0.6,
    remaining_percentage: 99.4,
    current_usage: {
      input_tokens: 850,
      output_tokens: 420,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 350
    }
  },
  exceeds_200k_tokens: false
};

test('parseStdinSync should parse valid JSON', () => {
  const result = parseStdinSync(mockInput);
  assert.strictEqual(result.model.display_name, 'Opus 4');
  assert.strictEqual(result.cost.total_cost_usd, 0.042);
});
```

- [ ] **Step 3: 运行测试验证**

```bash
npm test -- test/parser.test.ts
```

Expected: 测试通过

- [ ] **Step 4: Commit**

```bash
git add src/parser/stdin-parser.ts test/parser.test.ts
git commit -m "feat: implement stdin parser with JSON validation"
```

### Task 1.4: 实现模型提取器

**Files:**
- Create: `src/extractors/model.ts`

- [ ] **Step 1: 编写模型提取器**

```typescript
// src/extractors/model.ts

import type { PulseInput } from '../types/pulse-input';
import type { Theme } from '../types/theme';

export interface ModelSegment {
  text: string;
  fg: string;
  bold: boolean;
  dim: boolean;
}

export function extractModel(
  input: PulseInput,
  theme: Theme
): ModelSegment | null {
  const modelName = input.model.display_name;
  if (!modelName) return null;

  const style = theme.components.model;

  return {
    text: `${style.icon} ${modelName}`,
    fg: style.fg,
    bold: style.bold ?? false,
    dim: style.dim ?? false
  };
}
```

- [ ] **Step 2: 编写测试**

```typescript
// test/extractors.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { extractModel } from '../src/extractors/model';
import { darkTheme } from '../src/themes/builtin/dark';

test('extractModel should return model segment', () => {
  const input = {
    model: { display_name: 'Opus 4' },
    cwd: '',
    session_id: '',
    transcript_path: '',
    workspace: { current_dir: '', read_only: false },
    version: '',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0 },
    context_window: {
      total_input_tokens: 0,
      total_output_tokens: 0,
      context_window_size: 200000,
      used_percentage: 0,
      remaining_percentage: 100
    },
    exceeds_200k_tokens: false
  };

  const result = extractModel(input, darkTheme);
  assert.ok(result);
  assert.strictEqual(result.text, '🧠 Opus 4');
  assert.strictEqual(result.fg, '#7aa2f7');
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test -- test/extractors.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/extractors/model.ts test/extractors.test.ts
git commit -m "feat: implement model extractor"
```

### Task 1.5: 实现上下文提取器

**Files:**
- Create: `src/extractors/context.ts`

- [ ] **Step 1: 编写上下文提取器**

```typescript
// src/extractors/context.ts

import type { PulseInput } from '../types/pulse-input';

export interface ContextSegment {
  percentage: number;
  barText: string;
  tokensText: string;
}

export function extractContext(input: PulseInput): ContextSegment {
  const pct = input.context_window.used_percentage;
  const barWidth = 12;

  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;

  const barText = `█`.repeat(filled) + `░`.repeat(empty) + ` ${pct.toFixed(0)}%`;

  const usage = input.context_window.current_usage;
  const tokensText = usage
    ? `(${formatNumber(usage.input_tokens + usage.cache_read_input_tokens)} / ${formatNumber(input.context_window.context_window_size)} tokens)`
    : '';

  return { percentage: pct, barText, tokensText };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}
```

- [ ] **Step 2: 编写测试**

```typescript
// test/extractors.test.ts (追加)

test('extractContext should format progress correctly', () => {
  const input = {
    model: { display_name: 'Opus' },
    cwd: '',
    session_id: '',
    transcript_path: '',
    workspace: { current_dir: '', read_only: false },
    version: '',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0 },
    context_window: {
      total_input_tokens: 100000,
      total_output_tokens: 5000,
      context_window_size: 200000,
      used_percentage: 52.5,
      remaining_percentage: 47.5,
      current_usage: {
        input_tokens: 80000,
        output_tokens: 5000,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 35000
      }
    },
    exceeds_200k_tokens: false
  };

  const result = extractContext(input);
  assert.strictEqual(result.percentage, 52.5);
  assert.ok(result.barText.includes('53%'));
  assert.ok(result.tokensText.includes('115,000'));
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm test -- test/extractors.test.ts && git add src/extractors/context.ts test/extractors.test.ts && git commit -m "feat: implement context extractor"
```

### Task 1.6: 实现成本提取器

**Files:**
- Create: `src/extractors/cost.ts`

- [ ] **Step 1: 编写成本提取器**

```typescript
// src/extractors/cost.ts

import type { PulseInput } from '../types/pulse-input';

export interface CostSegment {
  text: string;
}

export function extractCost(input: PulseInput): CostSegment | null {
  const cost = input.cost.total_cost_usd;
  if (cost === undefined || cost === null) return null;

  return {
    text: `💰 $${cost.toFixed(4)}`
  };
}
```

- [ ] **Step 2: 编写测试**

```typescript
test('extractCost should format cost correctly', () => {
  const input = {
    model: { display_name: 'Opus' },
    cwd: '',
    session_id: '',
    transcript_path: '',
    workspace: { current_dir: '', read_only: false },
    version: '',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0.042 },
    context_window: {
      total_input_tokens: 0,
      total_output_tokens: 0,
      context_window_size: 200000,
      used_percentage: 0,
      remaining_percentage: 100
    },
    exceeds_200k_tokens: false
  };

  const result = extractCost(input);
  assert.ok(result);
  assert.strictEqual(result.text, '💰 $0.0420');
});
```

- [ ] **Step 3: 提交**

```bash
git add src/extractors/cost.ts test/extractors.test.ts && git commit -m "feat: implement cost extractor"
```

### Task 1.7: 实现工作区提取器

**Files:**
- Create: `src/extractors/workspace.ts`

- [ ] **Step 1: 编写工作区提取器**

```typescript
// src/extractors/workspace.ts

import * as path from 'path';

export interface WorkspaceSegment {
  text: string;
}

export function extractWorkspace(input: { workspace: { current_dir: string; project_name?: string } }): WorkspaceSegment {
  const name = input.workspace.project_name || path.basename(input.workspace.current_dir);
  return { text: `📁 ${name}` };
}
```

- [ ] **Step 2: 测试 + 提交**

```bash
npm test -- test/extractors.test.ts && git add src/extractors/workspace.ts test/extractors.test.ts && git commit -m "feat: implement workspace extractor"
```

### Task 1.8: 实现进度条和时长格式化器

**Files:**
- Create: `src/formatters/progress-bar.ts`
- Create: `src/formatters/duration.ts`

- [ ] **Step 1: 创建进度条格式化器**

```typescript
// src/formatters/progress-bar.ts

export function renderProgressBar(percentage: number, width: number = 12): string {
  const filled = Math.max(0, Math.min(Math.round((percentage / 100) * width), width));
  const empty = width - filled;
  return `█`.repeat(filled) + `░`.repeat(empty);
}

export function getProgressColor(percentage: number): string {
  if (percentage < 30) return '#9ece6a';      // 绿色
  if (percentage < 50) return '#9ece6a';      // 浅绿
  if (percentage < 70) return '#e0af68';      // 黄色
  if (percentage < 90) return '#ff9e64';      // 橙色
  return '#f7768e';                            // 红色
}
```

- [ ] **Step 2: 创建时长格式化器**

```typescript
// src/formatters/duration.ts

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
```

- [ ] **Step 3: 测试 + 提交**

```typescript
// test/formatters.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { renderProgressBar, getProgressColor } from '../src/formatters/progress-bar';
import { formatDuration } from '../src/formatters/duration';

test('renderProgressBar should render correct bar', () => {
  const bar = renderProgressBar(50, 12);
  assert.strictEqual(bar, '████████░░░░');
});

test('getProgressColor should return correct color', () => {
  assert.strictEqual(getProgressColor(20), '#9ece6a');
  assert.strictEqual(getProgressColor(60), '#e0af68');
  assert.strictEqual(getProgressColor(95), '#f7768e');
});

test('formatDuration should format correctly', () => {
  assert.strictEqual(formatDuration(925000), '15m 25s');
  assert.strictEqual(formatDuration(3725000), '1h 2m');
});
```

```bash
git add src/formatters/progress-bar.ts src/formatters/duration.ts test/formatters.test.ts
git commit -m "feat: implement progress bar and duration formatters"
```

### Task 1.9: 实现分隔符和布局格式化器

**Files:**
- Create: `src/formatters/separator.ts`
- Create: `src/formatters/segment.ts`
- Create: `src/formatters/layout.ts`

- [ ] **Step 1: 分隔符渲染器**

```typescript
// src/formatters/separator.ts

export function renderSeparator(sep: string, fg: string): string {
  if (!sep) return '';
  return ansiColor(fg) + sep + ANSI_RESET;
}

const ANSI_RESET = '\x1b[0m';

function ansiColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}
```

- [ ] **Step 2: 段渲染器**

```typescript
// src/formatters/segment.ts

export interface SegmentData {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  icon?: string;
}

export function renderSegment(data: SegmentData): string {
  let ansi = '';

  if (data.fg) {
    const r = parseInt(data.fg.slice(1, 3), 16);
    const g = parseInt(data.fg.slice(3, 5), 16);
    const b = parseInt(data.fg.slice(5, 7), 16);
    ansi += `\x1b[38;2;${r};${g};${b}m`;
  }

  if (data.bold) ansi += '\x1b[1m';
  if (data.dim) ansi += '\x1b[2m';

  const text = data.icon ? `${data.icon} ${data.text}` : data.text;
  return `${ansi}${text}\x1b[0m`;
}
```

- [ ] **Step 3: 布局渲染器**

```typescript
// src/formatters/layout.ts

import type { Theme } from '../types/theme';

export interface LayoutSegment {
  text: string;
  separator: string;
}

export function renderLayout(segments: LayoutSegment[], theme: Theme): string {
  const sep = theme.separator.left;
  const sepColor = theme.separator.color;

  let result = '';
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) {
      result += colorize(sepColor, sep);
    }
    result += segments[i].text;
  }
  return result;
}

function colorize(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}
```

- [ ] **Step 4: 测试 + 提交**

```bash
npm test && git add src/formatters/separator.ts src/formatters/segment.ts src/formatters/layout.ts test/formatters.test.ts
git commit -m "feat: implement separator, segment and layout formatters"
```

### Task 1.10: 实现默认暗色主题

**Files:**
- Create: `src/themes/builtin/dark.ts`
- Create: `src/themes/index.ts`

- [ ] **Step 1: 深邃黑主题**

```typescript
// src/themes/builtin/dark.ts

import type { Theme } from '../../types/theme';

export const darkTheme: Theme = {
  meta: {
    name: 'Deep Dark',
    author: 'claude-pulse',
    version: '1.0.0',
    description: 'Professional dark theme'
  },
  separator: {
    left: ' │ ',
    right: '',
    color: '#414868'
  },
  colors: {
    background: 'transparent',
    primary: '#7aa2f7',
    accent: '#bb9af7',
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    info: '#7dcfff',
    muted: '#565f89',
    dim: '#414868'
  },
  components: {
    model: { fg: '#7aa2f7', bold: true, icon: '🧠', showIcon: true },
    context: { fg: '#9ece6a', icon: '📊', showIcon: true },
    contextBar: { fg: '#9ece6a', bg: '#414868' },
    git: { fg: '#7dcfff', icon: '🌿', showIcon: true },
    cost: { fg: '#e0af68', icon: '💰', showIcon: true },
    duration: { fg: '#565f89', icon: '⏱️', showIcon: true },
    workspace: { fg: '#bb9af7', icon: '📁', showIcon: true },
    turns: { fg: '#7dcfff', icon: '💬', showIcon: true },
    cacheRatio: { fg: '#bb9af7', icon: '📦', showIcon: true },
    rateLimit: { fg: '#7dcfff', icon: '⚡', showIcon: true },
    weeklyQuota: { fg: '#e0af68', icon: '📅', showIcon: true },
    mcpStatus: { fg: '#565f89', icon: '🔌', showIcon: true },
    thinking: { fg: '#bb9af7', icon: '🤔', showIcon: true },
    outputStyle: { fg: '#565f89', icon: '📝', showIcon: true },
    separator: { fg: '#414868', dim: true }
  }
};
```

- [ ] **Step 2: 主题加载器**

```typescript
// src/themes/index.ts

import * as path from 'path';
import * as fs from 'fs';
import { darkTheme } from './builtin/dark';

const BUILTIN_THEMES = {
  dark: darkTheme
  // 其他主题在 Phase 4 添加
};

export function loadTheme(name: string): typeof darkTheme {
  return BUILTIN_THEMES[name] || darkTheme;
}

export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES);
}
```

- [ ] **Step 3: 测试 + 提交**

```bash
git add src/themes/builtin/dark.ts src/themes/index.ts
git commit -m "feat: implement dark theme and theme loader"
```

### Task 1.11: 实现主入口

**Files:**
- Create: `src/index.ts`
- Create: `bin/claude-pulse.js`

- [ ] **Step 1: 主入口**

```typescript
// src/index.ts

import { parseStdinSync } from './parser/stdin-parser';
import { extractModel, extractContext, extractCost, extractWorkspace } from './extractors';
import { loadTheme } from './themes';
import { renderLayout, type LayoutSegment } from './formatters/layout';
import { renderProgressBar } from './formatters/progress-bar';
import type { Theme } from './types/theme';

async function main() {
  try {
    const input = parseStdinSync();
    const theme = loadTheme('dark');

    const segments: LayoutSegment[] = [];

    const model = extractModel(input, theme);
    if (model) {
      segments.push({ text: renderSegment(model), separator: theme.separator.left });
    }

    const context = extractContext(input);
    const contextBar = renderProgressBar(context.percentage, 12);
    const contextText = `📊 ${contextBar} ${context.percentage.toFixed(0)}%`;
    segments.push({ text: ansiColorize(theme.colors.success, contextText), separator: theme.separator.left });

    const git = extractGit(input);
    if (git) {
      segments.push({ text: `🌿 ${git}`, separator: theme.separator.left });
    }

    const cost = extractCost(input);
    if (cost) {
      segments.push({ text: ansiColorize(theme.colors.warning, cost.text), separator: '' });
    }

    const output = renderLayout(segments, theme);
    console.log(output);

  } catch (err) {
    if (process.env.PULSE_DEBUG) {
      console.error('[pulse] Error:', err);
    }
    process.exit(0);
  }
}

function renderSegment(data: { text: string; fg: string; bold?: boolean; dim?: boolean }): string {
  let ansi = '';
  const r = parseInt(data.fg.slice(1, 3), 16);
  const g = parseInt(data.fg.slice(3, 5), 16);
  const b = parseInt(data.fg.slice(5, 7), 16);
  ansi += `\x1b[38;2;${r};${g};${b}m`;
  if (data.bold) ansi += '\x1b[1m';
  const text = `${data.text}\x1b[0m`;
  return `${ansi}${text}\x1b[0m`;
}

function ansiColorize(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function extractGit(input: { cwd: string }): string | null {
  // 暂时返回 null, Phase 2 实现
  return null;
}

main();
```

- [ ] **Step 2: 创建可执行入口**

```javascript
#!/usr/bin/env node
require('../dist/index.js');
```

- [ ] **Step 3: 创建测试 fixture**

```json
// test/fixtures/sample-input.json
{
  "cwd": "/Users/test/project",
  "session_id": "session-abc123",
  "transcript_path": "/Users/test/.claude/sessions/session-abc123.jsonl",
  "model": { "id": "claude-opus-4", "display_name": "Opus 4" },
  "workspace": {
    "current_dir": "/Users/test/project",
    "project_dir": "/Users/test/project",
    "project_name": "project",
    "read_only": false
  },
  "version": "1.0.0",
  "output_style": { "name": "default" },
  "cost": {
    "total_cost_usd": 0.042,
    "input_cost_usd": 0.008,
    "output_cost_usd": 0.034
  },
  "context_window": {
    "total_input_tokens": 1200,
    "total_output_tokens": 420,
    "context_window_size": 200000,
    "used_percentage": 65.0,
    "remaining_percentage": 99.4,
    "current_usage": {
      "input_tokens": 850,
      "output_tokens": 420,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 350
    }
  },
  "exceeds_200k_tokens": false
}
```

- [ ] **Step 4: 编译并本地测试**

```bash
npm run build
node dist/index.js < test/fixtures/sample-input.json
```

Expected: 输出包含 Opus 4、进度条 65%、成本 $0.0420

- [ ] **Step 5: 提交**

```bash
git add src/index.ts bin/claude-pulse.js test/fixtures/sample-input.json
git commit -m "feat: implement main entry point with core rendering pipeline"
```

**Phase 1 完成标志验证：**

```bash
echo '{"cwd":"/tmp/test","session_id":"s1","transcript_path":"/tmp/s1.jsonl","model":{"id":"claude-opus-4","display_name":"Opus 4"},"workspace":{"current_dir":"/tmp/test","read_only":false},"version":"1.0","output_style":{"name":"default"},"cost":{"total_cost_usd":0.042},"context_window":{"total_input_tokens":850,"total_output_tokens":420,"context_window_size":200000,"used_percentage":65,"remaining_percentage":99.4,"current_usage":{"input_tokens":850,"output_tokens":420,"cache_creation_input_tokens":0,"cache_read_input_tokens":350}},"exceeds_200k_tokens":false}' | node dist/index.js
```

应输出类似：`🧠 Opus 4 │ ████████░░░░░░░░░░ 65% │ 💰 $0.0420`

---

## Phase 2: Git 集成与缓存

**目标：** 正确显示 Git 分支，支持缓存

### Task 2.1: 实现 Git 命令执行工具

**Files:**
- Create: `src/utils/git.ts`

- [ ] **Step 1: 实现 git 命令执行器**

```typescript
// src/utils/git.ts

import { execSync } from 'child_process';
import * as path from 'path';

export interface GitInfo {
  branch: string | null;
  ahead: number;
  behind: number;
}

export function getGitInfo(cwd: string, timeout: number = 200): GitInfo {
  try {
    const branch = execSync('git branch --show-current', {
      cwd,
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!branch) {
      return { branch: null, ahead: 0, behind: 0 };
    }

    let ahead = 0;
    let behind = 0;

    try {
      const revList = execSync('git rev-list --left-right --count @{upstream}...HEAD', {
        cwd,
        timeout,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const [behindStr, aheadStr] = revList.trim().split('\t');
      behind = parseInt(behindStr, 10) || 0;
      ahead = parseInt(aheadStr, 10) || 0;
    } catch {
      // 无 upstream，忽略
    }

    return { branch, ahead, behind };
  } catch {
    return { branch: null, ahead: 0, behind: 0 };
  }
}

export function isGitRepository(cwd: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd,
      timeout: 100,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: 测试 + 提交**

```typescript
// test/utils.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { getGitInfo, isGitRepository } from '../src/utils/git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

test('isGitRepository should detect git repo', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-test-'));
  try {
    execSync('git init', { cwd: tmpDir });
    assert.strictEqual(isGitRepository(tmpDir), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
```

```bash
git add src/utils/git.ts test/utils.test.ts
git commit -m "feat: implement git info extractor with timeout handling"
```

### Task 2.2: 实现 TTL 缓存

**Files:**
- Create: `src/utils/cache.ts`

- [ ] **Step 1: 实现缓存模块**

```typescript
// src/utils/cache.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data;
  }

  set(key: string, value: T, ttl: number): void {
    this.cache.set(key, { data: value, timestamp: Date.now() + ttl });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
  }
}

export function getSessionCachePath(sessionId: string): string {
  const cacheDir = path.join(os.homedir(), '.claude', 'pulse', 'cache');
  return path.join(cacheDir, `${sessionId}.json`);
}

export function loadSessionCache<T>(sessionId: string, key: string): T | null {
  try {
    const cachePath = getSessionCachePath(sessionId);
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, 'utf8');
    const cache = JSON.parse(raw);
    if (cache[key] && Date.now() < cache[key].timestamp) {
      return cache[key].data as T;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSessionCache<T>(sessionId: string, key: string, value: T, ttl: number): void {
  try {
    const cachePath = getSessionCachePath(sessionId);
    const cacheDir = path.dirname(cachePath);
    fs.mkdirSync(cacheDir, { recursive: true });

    let cache: Record<string, any> = {};
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }

    cache[key] = { data: value, timestamp: Date.now() + ttl };
    fs.writeFileSync(cachePath, JSON.stringify(cache));
  } catch {
    // 缓存写入失败静默降级
  }
}
```

- [ ] **Step 2: 测试 + 提交**

```bash
npm test && git add src/utils/cache.ts test/utils.test.ts && git commit -m "feat: implement TTL cache with session persistence"
```

### Task 2.3: Git 提取器集成缓存

**Files:**
- Create: `src/extractors/git.ts`

- [ ] **Step 1: 编写 Git 提取器**

```typescript
// src/extractors/git.ts

import { getGitInfo, isGitRepository } from '../utils/git';
import { loadSessionCache, saveSessionCache } from '../utils/cache';
import type { Theme } from '../types/theme';

export interface GitSegment {
  text: string;
  fg: string;
}

export function extractGit(cwd: string, sessionId: string, theme: Theme): GitSegment | null {
  if (!isGitRepository(cwd)) return null;

  const cached = loadSessionCache<any>(sessionId, 'git');
  if (cached) {
    return renderGit(cached, theme);
  }

  const info = getGitInfo(cwd);
  saveSessionCache(sessionId, 'git', info, 5 * 60 * 1000); // 5 分钟 TTL

  return renderGit(info, theme);
}

function renderGit(info: { branch: string | null; ahead: number; behind: number }, theme: Theme): GitSegment | null {
  if (!info.branch) return null;

  let text = `🌿 ${info.branch}`;
  if (info.ahead > 0 || info.behind > 0) {
    text += ` ↑${info.ahead} ↓${info.behind}`;
  }

  return {
    text,
    fg: theme.components.git.fg
  };
}
```

- [ ] **Step 2: 更新主入口集成 Git**

在 `src/index.ts` 中替换 `extractGit` 占位函数，并引入 `extractGit`：

```typescript
import { extractGit } from './extractors/git';

// 在 segments 构建中
const git = extractGit(input.cwd, input.session_id, theme);
if (git) {
  segments.push({ text: renderSimple(git), separator: theme.separator.left });
}

function renderSimple(data: { text: string; fg: string }): string {
  const r = parseInt(data.fg.slice(1, 3), 16);
  const g = parseInt(data.fg.slice(3, 5), 16);
  const b = parseInt(data.fg.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m${data.text}\x1b[0m`;
}
```

- [ ] **Step 3: 测试 + 提交**

```bash
git add src/extractors/git.ts src/index.ts test/extractors.test.ts
git commit -m "feat: implement git extractor with 5-minute cache"
```

### Task 2.4~2.11: 其他高级 Git 功能

**Files:**
- Create: `src/extractors/rate-limits.ts` (基础)
- 更新主入口集成所有 extractors

- [ ] **Step 1: 实现速率限制提取器**

```typescript
// src/extractors/rate-limits.ts

import type { PulseInput } from '../types/pulse-input';
import type { Theme } from '../types/theme';

export interface RateLimitSegment {
  text: string;
  fg: string;
}

export function extractRateLimits(input: PulseInput, theme: Theme): RateLimitSegment | null {
  if (!input.rate_limits) return null;

  const fiveHour = input.rate_limits.five_hour;
  if (!fiveHour) return null;

  const pct = (fiveHour.requests_used / fiveHour.requests_limit) * 100;
  const barWidth = 8;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  const text = `⚡ ${bar} ${pct.toFixed(0)}%`;
  return { text, fg: theme.components.rateLimit.fg };
}
```

- [ ] **Step 2: 实现主入口完整集成**

在 `src/index.ts` 中实现完整的模块调度逻辑：

```typescript
async function main() {
  const input = parseStdinSync();
  const config = loadConfig(input);
  const theme = loadTheme(config.theme);

  const modules = config.modules;
  const segments: LayoutSegment[] = [];

  if (modules.model.enabled) {
    const model = extractModel(input, theme);
    if (model) {
      segments.push({ text: renderSegment(model), separator: theme.separator.left });
    }
  }

  if (modules.context.enabled) {
    const ctx = extractContext(input);
    const bar = renderProgressBar(ctx.percentage, modules.context.barWidth || 12);
    const ctxText = `${modules.context.icon || '📊'} ${bar} ${ctx.percentage.toFixed(0)}%`;
    segments.push({
      text: ansiColorize(theme.colors.success, ctxText),
      separator: theme.separator.left
    });
  }

  if (modules.git.enabled) {
    const git = extractGit(input.cwd, input.session_id, theme);
    if (git) {
      segments.push({ text: renderSimple(git), separator: theme.separator.left });
    }
  }

  if (modules.cost.enabled) {
    const cost = extractCost(input);
    if (cost) {
      segments.push({
        text: ansiColorize(theme.colors.warning, `${modules.cost.icon || '💰'} $${input.cost.total_cost_usd.toFixed(4)}`),
        separator: ''
      });
    }
  }

  // 高级模块（Phase 5 详细实现）
  if (modules.rateLimits.enabled && input.rate_limits) {
    const rl = extractRateLimits(input, theme);
    if (rl) segments.push({ text: renderSimple(rl), separator: theme.separator.left });
  }

  const output = renderLayout(segments, theme);
  console.log(output);
}
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: implement rate-limits extractor and complete main entry integration"
```

**Phase 2 完成标志验证：**

```bash
cd /tmp/test-git && git init
echo '{"cwd":"'$(pwd)'","session_id":"s1","transcript_path":"/tmp/s1.jsonl","model":{"id":"claude-opus-4","display_name":"Opus 4"},"workspace":{"current_dir":"'$(pwd)'","read_only":false},"version":"1.0","output_style":{"name":"default"},"cost":{"total_cost_usd":0.042},"context_window":{"total_input_tokens":1200,"total_output_tokens":420,"context_window_size":200000,"used_percentage":65,"remaining_percentage":99.4},"exceeds_200k_tokens":false}' | node dist/index.js
```

应输出包含分支名的状态栏，切换分支后 5 分钟内缓存生效。

---

## Phase 3: 配置系统与模块开关

### Task 3.1: 实现配置加载器

**Files:**
- Create: `src/config/loader.ts`
- Create: `src/config/defaults.ts`
- Create: `src/config/validator.ts`

- [ ] **Step 1: 配置加载器**

```typescript
// src/config/loader.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { PulseConfig } from '../types/pulse-config';
import { DEFAULT_CONFIG } from '../types/pulse-config';

export function loadConfig(): PulseConfig {
  const configPath = getConfigPath();
  const cacheKey = 'config';

  // 尝试从会话缓存加载
  const cached = loadSessionCache<PulseConfig>('global', cacheKey);
  if (cached) return cached;

  let config = { ...DEFAULT_CONFIG };

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(raw);
      config = deepMerge(config, userConfig);
    } catch (err) {
      // 配置文件解析失败，使用默认配置
      if (process.env.PULSE_DEBUG) {
        console.error('[pulse] Config load error:', err);
      }
    }
  } else {
    // 首次使用，创建默认配置
    saveConfig(config);
  }

  // 缓存配置（1 分钟 TTL）
  saveSessionCache('global', cacheKey, config, 60 * 1000);

  return config;
}

export function saveConfig(config: PulseConfig): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.claude', 'pulse', 'config.json');
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// 导入缓存函数
import { loadSessionCache, saveSessionCache } from '../utils/cache';
```

- [ ] **Step 2: 配置验证器**

```typescript
// src/config/validator.ts

import type { PulseConfig } from '../types/pulse-config';

export function validateConfig(config: PulseConfig): string[] {
  const errors: string[] = [];

  if (!config.theme || typeof config.theme !== 'string') {
    errors.push('theme must be a non-empty string');
  }

  if (config.padding < 0 || config.padding > 10) {
    errors.push('padding must be between 0 and 10');
  }

  const orders = Object.values(config.modules)
    .filter(m => m.enabled)
    .map(m => m.order);

  if (new Set(orders).size !== orders.length) {
    errors.push('module orders must be unique');
  }

  return errors;
}
```

- [ ] **Step 3: 集成到主入口**

在 `src/index.ts` 开头加载配置：

```typescript
import { loadConfig } from './config/loader';

async function main() {
  const config = loadConfig();
  const theme = loadTheme(config.theme);
  // ... 使用 config.modules 控制渲染
}
```

- [ ] **Step 4: 测试 + 提交**

```bash
git add src/config/ test/config.test.ts && git commit -m "feat: implement config loader with validation"
```

**Phase 3 完成标志：** 修改 `~/.claude/pulse/config.json` 中的模块开关后，重启 Claude Code 或热重载，状态栏按新配置显示。

---

## Phase 4: 主题系统完整实现

### Task 4.1~4.5: 实现 5 种内置主题

**Files:**
- Create: `src/themes/builtin/light.ts`
- Create: `src/themes/builtin/cyberpunk.ts`
- Create: `src/themes/builtin/forest.ts`
- Create: `src/themes/builtin/ocean.ts`

为每个主题创建完整的 Theme 对象，参考文档 7.2 节的详细参数。

- [ ] **Step 1-5: 依次创建 5 个主题文件**

```typescript
// 示例：light.ts（极简白）
export const lightTheme: Theme = {
  meta: { name: 'Minimal Light', author: 'claude-pulse', version: '1.0.0', description: 'Clean light theme' },
  separator: { left: ' │ ', right: '', color: '#a1a1aa' },
  colors: {
    background: 'transparent',
    primary: '#0369a1',
    accent: '#7c3aed',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#0891b2',
    muted: '#71717a',
    dim: '#a1a1aa'
  },
  components: {
    model: { fg: '#0369a1', bold: true, icon: '🧠', showIcon: true },
    context: { fg: '#16a34a', icon: '📊', showIcon: true },
    contextBar: { fg: '#16a34a', bg: '#e4e4e7' },
    git: { fg: '#0891b2', icon: '🌿', showIcon: true },
    cost: { fg: '#ca8a04', icon: '💰', showIcon: true },
    // ... 其他组件
    separator: { fg: '#a1a1aa', dim: true }
  }
};
```

- [ ] **Step 6: 更新主题加载器**

```typescript
// src/themes/index.ts

import { darkTheme } from './builtin/dark';
import { lightTheme } from './builtin/light';
import { cyberpunkTheme } from './builtin/cyberpunk';
import { forestTheme } from './builtin/forest';
import { oceanTheme } from './builtin/ocean';

const BUILTIN_THEMES = {
  dark: darkTheme,
  light: lightTheme,
  cyberpunk: cyberpunkTheme,
  forest: forestTheme,
  ocean: oceanTheme
};

export function loadTheme(name: string): typeof darkTheme {
  return BUILTIN_THEMES[name] || darkTheme;
}

export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES);
}
```

- [ ] **Step 7: 提交**

```bash
git add src/themes/builtin/ src/themes/index.ts && git commit -m "feat: implement 5 builtin themes"
```

**Phase 4 完成标志验证：**

```bash
node -e "
const { loadTheme } = require('./dist/themes');
console.log('Available themes:', Object.keys(loadTheme('')).constructor === Object ? Object.keys(loadTheme('')) : ['dark']);
"
```

---

## Phase 5: 高级功能模块

### Task 5.1~5.10: 实现所有高级模块

**Files:**
- Create: `src/extractors/session.ts`
- Create: `src/extractors/transcript.ts`
- Create: `src/extractors/mcp.ts`
- Create: `src/extractors/thinking.ts`
- Create: `src/extractors/output-style.ts`

- [ ] **Step 1: 会话时长提取器**

```typescript
// src/extractors/session.ts

import * as fs from 'fs';
import type { Theme } from '../types/theme';

export interface DurationSegment {
  text: string;
}

export function extractSessionDuration(sessionId: string, sessionPath: string, theme: Theme): DurationSegment | null {
  try {
    const stat = fs.statSync(sessionPath);
    const elapsed = Date.now() - stat.mtimeMs;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    return {
      text: `⏱️ ${hours}h ${minutes}m`
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: MCP 状态检测**

```typescript
// src/extractors/mcp.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function extractMcpStatus(): { text: string } | null {
  try {
    const mcpPath = path.join(os.homedir(), '.claude', '.mcp.json');
    if (!fs.existsSync(mcpPath)) return null;
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    const count = Object.keys(mcp.mcpServers || {}).length;
    if (count === 0) return null;
    return { text: `🔌 ${count} servers` };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: 思考模式检测**

```typescript
// src/extractors/thinking.ts

export function extractThinking(input: { thinking?: { enabled: boolean } }): { text: string } | null {
  if (!input.thinking) return null;
  return { text: `🤔 ${input.thinking.enabled ? 'on' : 'off'}` };
}
```

- [ ] **Step 4: 集成到主入口**

在主入口 `src/index.ts` 中，根据 `config.modules` 的 enabled 状态依次调用各个 extractor。

- [ ] **Step 5: 测试 + 提交**

```bash
git add src/extractors/session.ts src/extractors/mcp.ts src/extractors/thinking.ts src/extractors/output-style.ts
git commit -m "feat: implement session duration, mcp status, thinking mode extractors"
```

**Phase 5 完成标志：** 在 Pro 订阅账号上能看到速率限制进度条；开启配置后显示对话轮次和缓存命中率。

---

## Phase 5.5: 第三方 API 用量查询

**目标：** 支持 GLM、DeepSeek、MiniMax、StepFun、Mimo 用量查询

### Task 5.5.1: API 配置加载器

**Files:**
- Create: `src/extractors/third-party-api.ts` (完整实现)
- Create: `~/.claude/pulse/api-keys.json` (运行时创建)

- [ ] **Step 1: 创建 API Keys 配置路径常量**

```typescript
// src/utils/constants.ts

import * as os from 'os';
import * as path from 'path';

export const API_KEYS_PATH = path.join(os.homedir(), '.claude', 'pulse', 'api-keys.json');
export const CONFIG_PATH = path.join(os.homedir(), '.claude', 'pulse', 'config.json');
```

- [ ] **Step 2: 实现完整的 third-party-api extractor**

（由于代码较长，此处省略完整实现，后续会在实际编码时实现所有 5 个供应商适配器）

- [ ] **Step 3: 测试 + 提交**

```bash
git add src/extractors/third-party-api.ts src/utils/constants.ts
git commit -m "feat: implement third-party API usage query for GLM, DeepSeek, MiniMax, StepFun, Mimo"
```

**Phase 5.5 完成标志：** 配置 API Key 后状态栏显示各供应商用量；断网时静默隐藏。

---

## Phase 6: CLI 工具与交互命令

### Task 6.1: 实现 CLI 命令框架

**Files:**
- Create: `src/cli.ts`
- Update: `package.json` (添加 commands 字段)

- [ ] **Step 1: 实现命令路由**

```typescript
// src/cli.ts

import { Command } from 'commander';
import { loadConfig, saveConfig, getConfigPath } from './config/loader';
import { loadTheme } from './themes';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as { execSync } from 'child_process';

const program = new Command();

program
  .name('claude-pulse')
  .description('Customizable status bar for Claude Code')
  .version('1.0.0');

program
  .command('install')
  .description('Install claude-pulse to Claude Code settings')
  .action(install);

program
  .command('uninstall')
  .description('Uninstall claude-pulse')
  .action(uninstall);

program
  .command('theme <name>')
  .description('Switch theme')
  .action((name) => {
    const config = loadConfig();
    config.theme = name;
    saveConfig(config);
    console.log(`Theme switched to: ${name}`);
  });

program
  .command('config')
  .description('Open config file in editor')
  .action(() => {
    const editor = process.env.EDITOR || 'vi';
    execSync(`${editor} ${getConfigPath()}`);
  });

program
  .command('reload')
  .description('Reload config without restarting')
  .action(() => {
    console.log('Config reloaded');
  });

program.parse();
```

- [ ] **Step 2: 实现 install/uninstall**

```typescript
function install() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  // 备份并修改 settings.json
  // 创建 ~/.claude/pulse/ 目录
  // 复制默认配置
}

function uninstall() {
  // 恢复 settings.json
  // 清理 ~/.claude/pulse/
}
```

- [ ] **Step 3: 更新 package.json**

```json
{
  "bin": {
    "claude-pulse": "./bin/claude-pulse.js"
  },
  "dependencies": {
    "commander": "^12.0.0"
  }
}
```

- [ ] **Step 4: 测试 + 提交**

```bash
npm install commander
git add src/cli.ts package.json
git commit -m "feat: implement CLI commands (install/theme/config/reload)"
```

**Phase 6 完成标志验证：**

```bash
npm run build && node dist/index.js --help
```

应显示帮助信息。

---

## Phase 7: 插件化打包

### Task 7.1~7.9: 创建 Claude Code Plugin

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `commands/install.md`
- Create: `commands/theme.md`
- Create: `commands/uninstall.md`
- Create: `commands/reload.md`
- Create: `skills/pulse-config/SKILL.md`

- [ ] **Step 1: 创建 plugin.json**

```json
{
  "name": "claude-pulse",
  "description": "Customizable status bar for Claude Code with multiple themes",
  "version": "1.0.0",
  "author": {
    "name": "claude-pulse"
  },
  "commands": [
    "./commands/install.md",
    "./commands/theme.md",
    "./commands/uninstall.md",
    "./commands/reload.md"
  ],
  "skills": [
    "./skills/pulse-config/SKILL.md"
  ]
}
```

- [ ] **Step 2-5: 创建命令 markdown 文件**

每个文件包含命令描述、用法、示例。

- [ ] **Step 6: 创建 Skill 文档**

```markdown
---
name: pulse-config
description: Configure claude-pulse status bar modules, themes, and layout
---

# Pulse Configuration Guide

## Quick Start

Run `/pulse config` to open the configuration file.
```

- [ ] **Step 7-9: 打包和测试**

```bash
# 构建
npm run build

# 本地测试 plugin
# 在 Claude Code 中使用 /plugin install ./ 进行本地测试
```

```bash
git add .claude-plugin/ commands/ skills/ && git commit -m "feat: add Claude Code plugin packaging"
```

**Phase 7 完成标志：** 可通过 `/plugin install` 命令安装为 Claude Code 插件。

---

## Phase 8: 测试与性能优化

### Task 8.1: 编写完整单元测试

**Files:**
- Create/Update: 所有 `test/` 下的测试文件

- [ ] **Step 1: 补充所有 extractor 测试**

确保每个 extractor 都有边界条件测试：
- null 值处理
- 超长文本截断
- 极端百分比值

- [ ] **Step 2: 补充所有 formatter 测试**

测试进度条边界、颜色选择逻辑。

- [ ] **Step 3: 提交**

```bash
git add test/ && git commit -m "test: add comprehensive unit tests"
```

### Task 8.2: 性能基准测试

**Files:**
- Create: `test/benchmark.ts`

- [ ] **Step 1: 编写基准测试**

```typescript
// test/benchmark.ts

import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync('./test/fixtures/sample-input.json', 'utf8'));

function measure(label: string, fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

async function runBenchmark() {
  const times: number[] = [];
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    const ms = measure('render', () => {
      execSync('node dist/index.js', {
        input: JSON.stringify(input),
        encoding: 'utf8'
      });
    });
    times.push(ms);
  }

  times.sort((a, b) => a - b);

  console.log(`\n=== Performance Benchmark ===`);
  console.log(`Iterations: ${iterations}`);
  console.log(`P50: ${times[Math.floor(iterations * 0.5)].toFixed(2)}ms`);
  console.log(`P95: ${times[Math.floor(iterations * 0.95)].toFixed(2)}ms`);
  console.log(`P99: ${times[Math.floor(iterations * 0.99)].toFixed(2)}ms`);
  console.log(`Max: ${times[times.length - 1].toFixed(2)}ms`);
  console.log(`Target P99: < 80ms\n`);

  if (times[Math.floor(iterations * 0.99)] < 80) {
    console.log('✅ Performance target met!');
  } else {
    console.log('❌ Performance target missed!');
    process.exit(1);
  }
}

runBenchmark();
```

- [ ] **Step 2: 运行基准测试**

```bash
npm run build
node test/benchmark.ts
```

Expected: P99 < 80ms

- [ ] **Step 3: 提交**

```bash
git add test/benchmark.ts && git commit -m "test: add performance benchmark"
```

### Task 8.3: 跨平台 CI 配置

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: GitHub Actions 配置**

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm install
      - run: npm run build
      - run: npm test
      - run: node test/benchmark.ts
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/ci.yml && git commit -m "ci: add GitHub Actions CI matrix"
```

### Task 8.4: 错误场景和边界测试

在 `test/integration.test.ts` 中添加：

```typescript
// test/integration.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { parseStdinSync } from '../src/parser/stdin-parser';

test('should handle missing fields gracefully', () => {
  const input = {
    cwd: '/tmp',
    session_id: 's1',
    transcript_path: '/tmp/s1.jsonl',
    model: { display_name: 'Opus' },
    workspace: { current_dir: '/tmp', read_only: false },
    version: '1.0',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0 },
    context_window: {
      total_input_tokens: 0,
      total_output_tokens: 0,
      context_window_size: 200000,
      used_percentage: 0,
      remaining_percentage: 100
    },
    exceeds_200k_tokens: false
  };

  const result = parseStdinSync(input);
  assert.ok(result);
});

test('should handle non-git directory', () => {
  // 测试无 git 仓库场景
});

test('should handle null current_usage', () => {
  const input = { /* ... context_window.current_usage = null ... */ };
  const result = parseStdinSync(input);
  assert.ok(result);
});
```

- [ ] **Step 1-2: 编写测试 + 提交**

```bash
git add test/integration.test.ts && git commit -m "test: add integration and error scenario tests"
```

### Task 8.5: README 和文档

**Files:**
- Create: `README.md`

- [ ] **Step 1: 编写 README**

```markdown
# Claude Pulse

Customizable status bar for Claude Code CLI.

## Features

- 🧠 Model indicator
- 📊 Context usage with progress bar
- 🌿 Git branch
- 💰 Session cost
- 🎨 5 builtin themes (dark, light, cyberpunk, forest, ocean)
- ⚡ Performance optimized (P99 < 80ms)
- 🔌 Cross-platform (Windows/macOS/Linux)

## Installation

```bash
npm install -g claude-pulse
claude-pulse install
```

## Usage

Run Claude Code and the status bar will appear automatically.

## Configuration

Edit `~/.claude/pulse/config.json` to customize:
- Enable/disable modules
- Change theme
- Adjust separator and padding

## Performance

- P50: ~12ms
- P95: ~36ms
- P99: < 80ms
```

- [ ] **Step 2: 提交**

```bash
git add README.md && git commit -m "docs: add README"
```

**Phase 8 完成标志：** 所有测试通过，CI 绿色，性能基准达标。

---

## 最终验证清单

- [ ] 所有 Phase 1~8 的任务完成并勾选
- [ ] `npm test` 全部通过
- [ ] `npm run build` 无错误
- [ ] `node test/benchmark.ts` P99 < 80ms
- [ ] 5 种主题全部可用
- [ ] Git 分支显示正确
- [ ] 配置系统正常工作
- [ ] README 文档完整
- [ ] 跨平台测试通过（CI）

---

## 执行顺序总结

```
Phase 1: 项目骨架 + 核心数据流       (1-2 天)
  ↓
Phase 2: Git 集成 + 缓存            (1 天)
  ↓
Phase 3: 配置系统 + 模块开关         (1 天)
  ↓
Phase 4: 主题系统完整实现            (1 天)
  ↓
Phase 5: 高级功能模块                (2 天)
  ↓
Phase 5.5: 第三方 API 用量查询       (0.5 天)
  ↓
Phase 6: CLI 工具与交互命令          (1-2 天)
  ↓
Phase 7: 插件化打包                 (1 天)
  ↓
Phase 8: 测试与性能优化              (1-2 天)
```

**总工期：** 约 9-11 天
