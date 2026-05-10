// src/extractors/transcript.ts

import * as fs from 'fs';
import type { Theme } from '../types/theme';

export interface TurnsSegment {
  text: string;
}

export function extractTurns(transcriptPath: string, theme: Theme): TurnsSegment | null {
  try {
    if (!fs.existsSync(transcriptPath)) return null;

    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    let turns = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line.trim());
        if (entry.type === 'user' || entry.type === 'assistant') {
          turns++;
        }
      } catch {
        // skip invalid lines
      }
    }

    if (turns === 0) return null;
    const ic = theme.components.turns.icon;
    const glyph = theme.components.turns.showIcon !== false && ic ? `${ic} ` : '';
    return { text: `${glyph}${turns} turns` };
  } catch {
    return null;
  }
}
