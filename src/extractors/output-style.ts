// src/extractors/output-style.ts

export interface OutputStyleSegment {
  text: string;
}

export function extractOutputStyle(input: { output_style: { name: string } }): OutputStyleSegment | null {
  const name = input.output_style?.name;
  if (!name || name === 'default') return null;
  return { text: `📝 ${name}` };
}
