// src/extractors/cost.ts

import type { PulseInput } from '../types/pulse-input';

export interface CostSegment {
  text: string;
}

export function extractCost(input: PulseInput): CostSegment | null {
  const cost = input.cost?.total_cost_usd;
  if (cost === undefined || cost === null || cost === 0) return null;

  return {
    text: `$${cost.toFixed(4)}`
  };
}
