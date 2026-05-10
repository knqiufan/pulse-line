// src/extractors/session.ts

import * as fs from 'fs';
import * as path from 'path';

export interface DurationSegment {
  text: string;
}

export function extractSessionDuration(sessionId: string, sessionPath: string): DurationSegment | null {
  try {
    if (!fs.existsSync(sessionPath)) return null;
    const stat = fs.statSync(sessionPath);
    const elapsed = Date.now() - stat.mtimeMs;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let text: string;
    if (hours > 0) {
      text = `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      text = `${minutes}m ${seconds % 60}s`;
    } else {
      text = `${seconds}s`;
    }

    return { text: `⏱️ ${text}` };
  } catch {
    return null;
  }
}
