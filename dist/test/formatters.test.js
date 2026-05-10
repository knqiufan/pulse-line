"use strict";
// test/formatters.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const progress_bar_1 = require("../src/formatters/progress-bar");
const duration_1 = require("../src/formatters/duration");
(0, node_test_1.test)('renderProgressBar should render correct bar', () => {
    const bar = (0, progress_bar_1.renderProgressBar)(50, 12);
    node_assert_1.default.strictEqual(bar, '██████░░░░░░');
});
(0, node_test_1.test)('renderProgressBar should handle 0%', () => {
    const bar = (0, progress_bar_1.renderProgressBar)(0, 12);
    node_assert_1.default.strictEqual(bar, '░░░░░░░░░░░░');
});
(0, node_test_1.test)('renderProgressBar should handle 100%', () => {
    const bar = (0, progress_bar_1.renderProgressBar)(100, 12);
    node_assert_1.default.strictEqual(bar, '████████████');
});
(0, node_test_1.test)('renderProgressBar should clamp values', () => {
    const bar = (0, progress_bar_1.renderProgressBar)(150, 12);
    node_assert_1.default.strictEqual(bar, '████████████');
    const bar2 = (0, progress_bar_1.renderProgressBar)(-10, 12);
    node_assert_1.default.strictEqual(bar2, '░░░░░░░░░░░░');
});
(0, node_test_1.test)('getProgressColor should return correct color for low usage', () => {
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(20), '#9ece6a');
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(29), '#9ece6a');
});
(0, node_test_1.test)('getProgressColor should return correct color for medium usage', () => {
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(50), '#e0af68');
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(69), '#e0af68');
});
(0, node_test_1.test)('getProgressColor should return correct color for high usage', () => {
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(80), '#ff9e64');
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(89), '#ff9e64');
});
(0, node_test_1.test)('getProgressColor should return correct color for critical usage', () => {
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(95), '#f7768e');
    node_assert_1.default.strictEqual((0, progress_bar_1.getProgressColor)(100), '#f7768e');
});
(0, node_test_1.test)('formatDuration should format seconds correctly', () => {
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(5000), '5s');
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(59999), '59s');
});
(0, node_test_1.test)('formatDuration should format minutes correctly', () => {
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(60000), '1m 0s');
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(925000), '15m 25s');
});
(0, node_test_1.test)('formatDuration should format hours correctly', () => {
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(3600000), '1h 0m');
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(3725000), '1h 2m');
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(7200000), '2h 0m');
});
(0, node_test_1.test)('formatDuration should handle zero', () => {
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(0), '0s');
    node_assert_1.default.strictEqual((0, duration_1.formatDuration)(-1000), '0s');
});
//# sourceMappingURL=formatters.test.js.map