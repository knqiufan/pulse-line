// test/formatters.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { renderProgressBar, getProgressColor } from '../src/formatters/progress-bar';
import { formatDuration } from '../src/formatters/duration';

test('renderProgressBar should render correct bar', () => {
  const bar = renderProgressBar(50, 12);
  assert.strictEqual(bar, '██████░░░░░░');
});

test('renderProgressBar should handle 0%', () => {
  const bar = renderProgressBar(0, 12);
  assert.strictEqual(bar, '░░░░░░░░░░░░');
});

test('renderProgressBar should handle 100%', () => {
  const bar = renderProgressBar(100, 12);
  assert.strictEqual(bar, '████████████');
});

test('renderProgressBar should clamp values', () => {
  const bar = renderProgressBar(150, 12);
  assert.strictEqual(bar, '████████████');
  const bar2 = renderProgressBar(-10, 12);
  assert.strictEqual(bar2, '░░░░░░░░░░░░');
});

test('getProgressColor should return correct color for low usage', () => {
  assert.strictEqual(getProgressColor(20), '#9ece6a');
  assert.strictEqual(getProgressColor(29), '#9ece6a');
});

test('getProgressColor should return correct color for medium usage', () => {
  assert.strictEqual(getProgressColor(50), '#e0af68');
  assert.strictEqual(getProgressColor(69), '#e0af68');
});

test('getProgressColor should return correct color for high usage', () => {
  assert.strictEqual(getProgressColor(80), '#ff9e64');
  assert.strictEqual(getProgressColor(89), '#ff9e64');
});

test('getProgressColor should return correct color for critical usage', () => {
  assert.strictEqual(getProgressColor(95), '#f7768e');
  assert.strictEqual(getProgressColor(100), '#f7768e');
});

test('formatDuration should format seconds correctly', () => {
  assert.strictEqual(formatDuration(5000), '5s');
  assert.strictEqual(formatDuration(59999), '59s');
});

test('formatDuration should format minutes correctly', () => {
  assert.strictEqual(formatDuration(60000), '1m 0s');
  assert.strictEqual(formatDuration(925000), '15m 25s');
});

test('formatDuration should format hours correctly', () => {
  assert.strictEqual(formatDuration(3600000), '1h 0m');
  assert.strictEqual(formatDuration(3725000), '1h 2m');
  assert.strictEqual(formatDuration(7200000), '2h 0m');
});

test('formatDuration should handle zero', () => {
  assert.strictEqual(formatDuration(0), '0s');
  assert.strictEqual(formatDuration(-1000), '0s');
});
