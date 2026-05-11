---
description: Toggle debug mode on or off
---

# Toggle Debug Mode

## Command

```
/claude-pulse:debug <on|off>
```

## Description

Enable or disable debug mode. When enabled, verbose logs are written to stderr (requires `PULSE_DEBUG=1` env var).

## Instructions

Run the following shell command with the mode provided by the user:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/claude-pulse.js" debug <on|off>
```

If the user did not specify `on` or `off`, ask which mode they want.
