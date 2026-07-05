// src/utils/logger.ts

const DEBUG = process.env.PULSE_DEBUG === 'true' || process.env.PULSE_DEBUG === '1';

export function debug(...args: any[]): void {
  if (DEBUG) {
    console.error('[pulse]', ...args);
  }
}
