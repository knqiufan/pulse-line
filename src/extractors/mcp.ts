// src/extractors/mcp.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import type { Theme } from '../types/theme';

export interface McpSegment {
  text: string;
}

export function extractMcpStatus(theme: Theme): McpSegment | null {
  try {
    let count = 0;

    // ~/.claude.json (global MCP servers)
    const globalPath = path.join(os.homedir(), '.claude.json');
    if (fs.existsSync(globalPath)) {
      const global = JSON.parse(fs.readFileSync(globalPath, 'utf8'));
      count += Object.keys(global.mcpServers || {}).length;
    }

    // ~/.claude/.mcp.json (user-level shared MCP)
    const userPath = path.join(os.homedir(), '.claude', '.mcp.json');
    if (fs.existsSync(userPath)) {
      const user = JSON.parse(fs.readFileSync(userPath, 'utf8'));
      count += Object.keys(user.mcpServers || {}).length;
    }

    // <cwd>/.mcp.json (project-level MCP)
    const projectPath = path.join(process.cwd(), '.mcp.json');
    if (fs.existsSync(projectPath)) {
      const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
      count += Object.keys(project.mcpServers || {}).length;
    }

    if (count === 0) return null;
    const i = theme.components.mcpStatus.icon;
    const glyph = theme.components.mcpStatus.showIcon !== false && i ? `${i} ` : '';
    return { text: `${glyph}${count} servers` };
  } catch {
    return null;
  }
}
