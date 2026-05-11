---
description: Enable a status bar module
---

# Enable Module

## Command

```
/pulse-line:enable <module>
```

## Description

Enable a status bar module. Changes take effect immediately on the next status bar render.

Available module IDs: `model`, `context`, `git`, `accountUsage`, `cost`, `duration`, `workspace`, `turns`, `cacheRatio`, `rateLimits`, `weeklyQuota`, `mcpStatus`, `thinking`, `outputStyle`, `thirdPartyApi`.

## Instructions

Run the following shell command with the module name provided by the user:

```bash
npx -y pulse-line@latest enable <module>
```

If the user did not provide a module name, list the available modules and ask which one they want to enable.
