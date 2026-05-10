// src/extractors/thinking.ts

export interface ThinkingSegment {
  text: string;
}

export function extractThinking(input: { thinking?: { enabled: boolean } }): ThinkingSegment | null {
  if (!input.thinking) return null;
  return { text: `🤔 ${input.thinking.enabled ? 'on' : 'off'}` };
}
