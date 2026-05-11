---
description: Toggle debug mode on or off
---

# Toggle Debug Mode

## Command

```
/pulse-line:debug <on|off>
```

## Description

Enable or disable debug mode. When enabled, verbose logs are written to stderr (requires `PULSE_DEBUG=1` env var).

## Instructions

Run the following shell command with the mode provided by the user:

```bash
npx -y pulse-line@latest debug <on|off>
```

If the user did not specify `on` or `off`, ask which mode they want.
