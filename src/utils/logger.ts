// src/utils/logger.ts

const DEBUG = process.env.PULSE_DEBUG === 'true' || process.env.PULSE_DEBUG === '1';

export function debug(...args: any[]): void {
  if (DEBUG) {
    console.error('[pulse]', ...args);
  }
}

export function measure<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  debug(`${label}: ${elapsed.toFixed(2)}ms`);
  if (elapsed > 100) {
    console.error(`[pulse] WARNING: ${label} exceeded 100ms!`);
  }
  return result;
}

export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  debug(`${label}: ${elapsed.toFixed(2)}ms`);
  if (elapsed > 100) {
    console.error(`[pulse] WARNING: ${label} exceeded 100ms!`);
  }
  return result;
}

export interface TimingInfo {
  [key: string]: number;
}

let timings: TimingInfo = {};

export function startTiming(label: string): void {
  timings[label] = performance.now();
}

export function endTiming(label: string): number {
  const start = timings[label] || performance.now();
  const elapsed = performance.now() - start;
  debug(`${label}: ${elapsed.toFixed(2)}ms`);
  delete timings[label];
  return elapsed;
}

export function reportTimings(): void {
  if (!DEBUG) return;
  console.error('[pulse] Timing breakdown:');
  console.error(JSON.stringify(timings, null, 2));
}
