---
description: Show project rules/config file summary and list
---

# Rules

## Command

```
/pulse-line:rules
```

## Description

Show a summary of project rules and config files detected by Pulse Line. This includes CLAUDE.md files, `.claude/` directory contents, and `skills/` directory contents.

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
