// src/extractors/mcp.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface McpSegment {
  text: string;
}

export function extractMcpStatus(): McpSegment | null {
  try {
    const mcpPath = path.join(os.homedir(), '.claude', '.mcp.json');
    if (!fs.existsSync(mcpPath)) return null;
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    const count = Object.keys(mcp.mcpServers || {}).length;
    if (count === 0) return null;
    return { text: `🔌 ${count} servers` };
  } catch {
    return null;
  }
}
