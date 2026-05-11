---
description: Switch display language (zh, en)
---

# Switch Language

## Command

```
/pulse-line:language <lang>
```

## Description

Switch the display language of the status bar labels. Available languages: `zh` (Chinese, default), `en` (English).

Changes take effect immediately on the next status bar render.

## Instructions

Run the following shell command with the language code provided by the user:

```bash
npx -y pulse-line@latest language <lang>
```

If the user did not provide a language, ask which one they want: `zh` (Chinese) or `en` (English).
