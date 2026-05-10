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
    const mcpPath = path.join(os.homedir(), '.claude', '.mcp.json');
    if (!fs.existsSync(mcpPath)) return null;
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    const count = Object.keys(mcp.mcpServers || {}).length;
    if (count === 0) return null;
    const i = theme.components.mcpStatus.icon;
    const glyph = theme.components.mcpStatus.showIcon !== false && i ? `${i} ` : '';
    return { text: `${glyph}${count} servers` };
  } catch {
    return null;
  }
}
