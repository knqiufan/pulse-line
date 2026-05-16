# 规则模块 — 设计规格

## 概述

为 pulse-line 状态栏新增"规则"模块，统计项目中的 CLAUDE.md 文件、`.claude/` 目录下的配置文件以及 `skills/` 目录下的技能文件数量。同时提供 CLI 命令用于查看详细文件列表和管理自定义扫描模式。

## 显示格式

```
[规则] 15  规则:12 Skill:3
```

- `[规则] 15` — 图标 + 总数，使用主题 info 色
- `规则:12 Skill:3` — 分类明细，使用主题 muted 色（暗色备注样式）
- 某分类为 0 时省略该分类
- 总数为 0 时不显示明细

## 默认扫描目标

| 分类 | 模式 | 标签（中/英） |
|---|---|---|
| 规则 | `**/CLAUDE.md`、`.claude/**` | 规则 / Rules |
| 技能 | `skills/**` | Skill / Skill |

默认排除目录：`node_modules`、`.git`、`dist`、`.worktrees`、`.next`、`.turbo`

## 配置结构

```json
{
  "modules": {
    "rules": {
      "enabled": true,
      "order": 15,
      "icon": "[规则]",
      "includePatterns": [],
      "excludePatterns": []
    }
  }
}
```

## CLI 命令

| 命令 | 输出 |
|---|---|
| `pulse-line rules` | 摘要：总数 + 分类明细 |
| `pulse-line rules list` | 按分类列出所有检测到的文件（相对路径） |
| `pulse-line rules pattern add <path>` | 添加 include 模式 |
| `pulse-line rules pattern remove <path>` | 移除 include 模式 |
| `pulse-line rules pattern add-exclude <name>` | 添加 exclude 模式 |
| `pulse-line rules pattern remove-exclude <name>` | 移除 exclude 模式 |

## 架构

```
src/
├── extractors/rules.ts           (新建) — 扫描 + 计数逻辑
├── extractors/index.ts           (修改) — 导出新提取器
├── types/pulse-config.ts         (修改) — RulesModuleConfig + 模块入口
├── types/theme.ts                (修改) — rules 组件样式
├── themes/icon-sets/nerd.ts      (修改) — IconSet 接口 + 图标
├── themes/icon-sets/text.ts      (修改) — IconSet 接口 + 图标
├── themes/index.ts               (修改) — overlayNerdIcons 映射
├── themes/builtin/*.ts           (修改) — 5 个主题添加 rules 组件
├── index.ts                      (修改) — 接入渲染管线
├── cli.ts                        (修改) — rules 命令组
├── config/migrate-config.ts      (修改) — schema v7 迁移
├── config/loader.ts              (修改) — 更新缓存键
├── i18n/locales/zh.ts            (修改) — 中文标签
├── i18n/locales/en.ts            (修改) — 英文标签
├── utils/display-sanitize.ts     (修改) — MODULE_KEYS 添加 rules
```

## 缓存策略

使用 `loadSessionCache` / `saveSessionCache`，缓存键由 `cwd + includePatterns + excludePatterns` 组合，TTL 60 秒。配置变更后缓存自动失效。

## 约束

- **零外部依赖**：不引入 minimatch 等库，glob 匹配使用内联正则实现
- **深度限制**：CLAUDE.md 搜索限制 10 层递归深度
- **同步 I/O**：提取器使用 `fs.readdirSync`，与现有提取器模式一致
