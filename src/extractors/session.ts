// src/extractors/session.ts

import * as fs from 'fs';
import * as path from 'path';
import type { Theme } from '../types/theme';

export interface DurationSegment {
  text: string;
}

export function extractSessionDuration(
  _sessionId: string,
  sessionPath: string,
  theme: Theme,
  iconOverride?: string
): DurationSegment | null {
  try {
    if (!fs.existsSync(sessionPath)) return null;
    const stat = fs.statSync(sessionPath);
    const startMs = stat.birthtimeMs || stat.mtimeMs;
    const elapsed = Date.now() - startMs;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let inner: string;
    if (hours > 0) {
      inner = `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      inner = `${minutes}m ${seconds % 60}s`;
    } else {
      inner = `${seconds}s`;
    }

    const ic = iconOverride ?? theme.components.duration.icon;
    const glyph = theme.components.duration.showIcon !== false && ic ? `${ic} ` : '';
    return { text: `${glyph}${inner}` };
  } catch {
    return null;
  }
}
