// src/extractors/transcript.ts

import * as fs from 'fs';

export interface TurnsSegment {
  text: string;
}

export function extractTurns(transcriptPath: string): TurnsSegment | null {
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
    return { text: `💬 ${turns} turns` };
  } catch {
    return null;
  }
}
