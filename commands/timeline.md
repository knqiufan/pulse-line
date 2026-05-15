---
description: Debug/export collected tool analytics data
---

# Tool Analytics Debug

## Command

```
/pulse-line:timeline
```

## Description

Show recent Claude Code tool-call events collected by Pulse Line hooks. The main analytics view appears directly in the statusline as an independent panel when `toolTimeline` is enabled; this command is only for debugging, export, and cache cleanup.

## Instructions

Run the following shell command:

```bash
npx -y pulse-line@latest timeline
```

Useful variants:

```bash
npx -y pulse-line@latest timeline --last 10
npx -y pulse-line@latest timeline --json
npx -y pulse-line@latest timeline clear
```
