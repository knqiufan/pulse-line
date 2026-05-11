---
description: Clear all pulse cache files
---

# Clear Cache

## Command

```
/claude-pulse:clear-cache
```

## Description

Clear all cached data for the pulse status bar, including API query results and session data. Useful when data appears stale or after configuration changes that don't seem to take effect.

## Instructions

Run the following shell command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/claude-pulse.js" clear-cache
```
