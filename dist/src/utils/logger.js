"use strict";
// src/utils/logger.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = debug;
exports.measure = measure;
exports.measureAsync = measureAsync;
exports.startTiming = startTiming;
exports.endTiming = endTiming;
exports.reportTimings = reportTimings;
const DEBUG = process.env.PULSE_DEBUG === 'true' || process.env.PULSE_DEBUG === '1';
function debug(...args) {
    if (DEBUG) {
        console.error('[pulse]', ...args);
    }
}
function measure(label, fn) {
    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;
    debug(`${label}: ${elapsed.toFixed(2)}ms`);
    if (elapsed > 100) {
        console.error(`[pulse] WARNING: ${label} exceeded 100ms!`);
    }
    return result;
}
async function measureAsync(label, fn) {
    const start = performance.now();
    const result = await fn();
    const elapsed = performance.now() - start;
    debug(`${label}: ${elapsed.toFixed(2)}ms`);
    if (elapsed > 100) {
        console.error(`[pulse] WARNING: ${label} exceeded 100ms!`);
    }
    return result;
}
let timings = {};
function startTiming(label) {
    timings[label] = performance.now();
}
function endTiming(label) {
    const start = timings[label] || performance.now();
    const elapsed = performance.now() - start;
    debug(`${label}: ${elapsed.toFixed(2)}ms`);
    delete timings[label];
    return elapsed;
}
function reportTimings() {
    if (!DEBUG)
        return;
    console.error('[pulse] Timing breakdown:');
    console.error(JSON.stringify(timings, null, 2));
}
//# sourceMappingURL=logger.js.map