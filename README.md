# Claude Pulse

可定制的 Claude Code 状态栏插件，在终端底部显示会话关键信息。

[English version →](./README_EN.md)

## 安装

```bash
npm install -g claude-pulse
claude-pulse install
```

重启 Claude Code 即可生效。

## 使用方式

在 Claude Code 会话中，通过 slash command 调整所有配置，无需离开会话。

### 切换主题

```
/claude-pulse:theme <name>
```

可用主题：`dark`（默认）、`light`、`cyberpunk`、`forest`、`ocean`。

查看所有主题：

```
/claude-pulse:themes
```

### 启用 / 禁用模块

```
/claude-pulse:enable <module>
/claude-pulse:disable <module>
```

模块 ID 列表：

| ID | 说明 | 默认 |
|----|------|------|
| `model` | 当前模型名称 | 开启 |
| `context` | 上下文窗口用量 | 开启 |
| `git` | Git 分支 | 开启 |
| `accountUsage` | 第三方账户余量 | 开启 |
| `cost` | 会话费用（USD） | 关闭 |
| `duration` | 会话时长 | 关闭 |
| `workspace` | 工作区名称 | 关闭 |
| `turns` | 对话轮次 | 关闭 |
| `cacheRatio` | 缓存命中率 | 关闭 |
| `rateLimits` | API 速率限制 | 关闭 |
| `weeklyQuota` | 周配额 | 关闭 |
| `mcpStatus` | MCP 连接数 | 关闭 |
| `thinking` | 思考模式 | 关闭 |
| `outputStyle` | 输出风格 | 关闭 |
| `thirdPartyApi` | 第三方 API 用量 | 关闭 |

修改立即生效，下次状态栏刷新即可看到变化。

### 编辑配置

```
/claude-pulse:config
```

在编辑器中打开 `~/.claude/pulse/config.json`，保存后配置自动生效。

### 重载配置

```
/claude-pulse:reload
```

### 调试模式

```
/claude-pulse:debug on
/claude-pulse:debug off
```

### 安装 / 卸载

```
/claude-pulse:install
/claude-pulse:uninstall
```

## 配置文件

配置文件位于 `~/.claude/pulse/config.json`，完整示例：

```json
{
  "theme": "dark",
  "separator": " │ ",
  "padding": 1,
  "iconSet": "text",
  "schemaVersion": 3,
  "modules": {
    "model": { "enabled": true, "order": 1, "icon": "[M]" },
    "context": { "enabled": true, "order": 2, "showBar": true, "barWidth": 12, "icon": "[C]" },
    "git": { "enabled": true, "order": 3, "showUpstream": false, "icon": "[G]" },
    "cost": { "enabled": false, "order": 4, "icon": "[$]" },
    "duration": { "enabled": false, "order": 5, "icon": "[T]" },
    "workspace": { "enabled": false, "order": 6, "icon": "[W]" },
    "turns": { "enabled": false, "order": 7, "icon": "[N]" },
    "cacheRatio": { "enabled": false, "order": 8, "icon": "[R]" },
    "rateLimits": { "enabled": false, "order": 9, "icon": "[L]", "showCountdown": true },
    "weeklyQuota": { "enabled": false, "order": 10, "icon": "[Q]", "showCountdown": true },
    "accountUsage": { "enabled": true, "order": 11, "icon": "[A]", "providers": ["zhipu", "deepseek"] },
    "mcpStatus": { "enabled": false, "order": 12, "icon": "[P]" },
    "thinking": { "enabled": false, "order": 13, "icon": "[Think]" },
    "outputStyle": { "enabled": false, "order": 14, "icon": "[S]" },
    "thirdPartyApi": { "enabled": false, "order": 15, "icon": "[L]", "providers": [] }
  },
  "advanced": {
    "cacheEnabled": true,
    "cacheTTL": 300,
    "gitTimeout": 200,
    "debugMode": false,
    "customThemePath": null
  }
}
```

### 配置项说明

**全局：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `theme` | string | `"dark"` | 主题名称 |
| `separator` | string | `" │ "` | 模块分隔符 |
| `padding` | number | `1` | 分隔符两侧空格数 |
| `iconSet` | `"text"` \| `"nerd"` | `"text"` | 图标集 |

**模块通用字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | boolean | 是否启用 |
| `order` | number | 显示顺序，越小越靠左 |
| `icon` | string | 前缀图标（可选） |

**`context` 模块额外字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showBar` | boolean | true | 显示进度条 |
| `barWidth` | number | 12 | 进度条宽度 |
| `showTokens` | boolean | false | 显示 token 数量 |

**`git` 模块额外字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showUpstream` | boolean | false | 显示 ahead/behind 提交数 |

**`accountUsage` 模块额外字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `providers` | string[] | `["zhipu", "deepseek"]` | 供应商列表，留空自动检测 |

**`rateLimits` / `weeklyQuota` 额外字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showCountdown` | boolean | true | 显示重置倒计时 |

## 图标集

### `text`（默认）

使用 ASCII 标签 `[M]` `[C]` `[G]` `[$]` `[A]` 等，分隔符为 `│`。无需安装任何字体。

### `nerd`

使用 Nerd Font 字形，需要终端安装 Nerd Font。

```json
{ "iconSet": "nerd" }
```

## 模型名称显示

`[M]` 模块按以下优先级解析（取第一个非空值）：

1. `PULSE_MODEL_DISPLAY` / `CLAUDE_CODE_MODEL_DISPLAY` 环境变量（显式覆盖）
2. 从模型 ID 推断 Opus/Sonnet/Haiku，查找 `ANTHROPIC_DEFAULT_OPUS_MODEL` 等环境变量
3. stdin 中的 `display_name` / `id`（自定义模型直接显示）
4. `CLAUDE_MODEL` / `ANTHROPIC_MODEL` 环境变量（全局回退）

环境变量合并顺序（弱→强，`process.env` 始终优先）：

1. `~/.claude/settings.json`
2. `~/.claude/settings.local.json`
3. `<cwd>/.claude/settings.json`
4. `<cwd>/.claude/settings.local.json`

使用第三方网关（如智谱 GLM）时，在 `~/.claude/settings.json` 中配置：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5"
  }
}
```

当 Claude Code 显示 "Opus 4.7" 时，状态栏自动显示 `glm-5.1`。`/model` 切换后 `[M]` 实时更新。

## 第三方账户用量

`[A]` 模块支持以下供应商的账户余量查询。

### 智谱 GLM（zhipu）

| 环境变量 | 说明 |
|----------|------|
| `ZHIPU_API_KEY` | 智谱 API Key |
| `ZHIPU_BASE_URL` | 自定义 API 地址（可选） |

当 `ANTHROPIC_BASE_URL` 指向 `*.bigmodel.cn`，自动使用 `ANTHROPIC_AUTH_TOKEN` 作为凭证。

设置 `PULSE_PROVIDER=zhipu` 可显式指定供应商（适用于本地代理转发场景）。

显示格式：`GLM: ████░░░░░░░░ 35.2% (3h 25m 剩余)`

### DeepSeek

| 环境变量 | 说明 |
|----------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key |

显示格式：`DeepSeek: CN¥73.72`

### MiniMax

| 环境变量 | 说明 |
|----------|------|
| `MINIMAX_API_KEY` | MiniMax API Key |
| `MINIMAX_GROUP_ID` | 小组 ID（可选） |

### 自动检测

当 `accountUsage.providers` 为空时，系统自动通过 `PULSE_PROVIDER` 或 `ANTHROPIC_BASE_URL` 域名检测供应商。

### 缓存

账户数据缓存 2 分钟，首次进入会话立即刷新。切换供应商后自动清理旧缓存，只显示当前供应商数据。

## CLI 命令

除了在会话中使用 slash command，也可在终端直接使用 CLI：

```bash
claude-pulse install              # 安装
claude-pulse theme cyberpunk      # 切换主题
claude-pulse enable mcpStatus     # 启用模块
claude-pulse disable workspace    # 禁用模块
claude-pulse config               # 编辑配置
claude-pulse reload               # 重载配置
claude-pulse themes               # 查看主题列表
claude-pulse debug on             # 开启调试
```

## 系统要求

- Node.js ≥ 18.0.0
- Claude Code

## License

MIT
