---
description: Switch status bar theme (dark, light, cyberpunk, forest, ocean)
---

# Switch Theme

## Command

```
/pulse-line:theme <name>
```

## Description

Switch the visual theme of the status bar. Available themes: `dark`, `light`, `cyberpunk`, `forest`, `ocean`.

Changes take effect immediately on the next status bar render.

## Instructions

Run the following shell command with the theme name provided by the user:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pulse-line.js" theme <name>
```

If the user did not provide a theme name, ask which theme they want to switch to.
