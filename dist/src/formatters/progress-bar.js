"use strict";
// src/formatters/progress-bar.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderProgressBar = renderProgressBar;
exports.getProgressColor = getProgressColor;
function renderProgressBar(percentage, width = 12) {
    const filled = Math.max(0, Math.min(Math.round((percentage / 100) * width), width));
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
function getProgressColor(percentage) {
    const pct = Math.min(100, Math.max(0, percentage));
    if (pct < 30)
        return '#9ece6a';
    if (pct < 50)
        return '#9ece6a';
    if (pct < 70)
        return '#e0af68';
    if (pct < 90)
        return '#ff9e64';
    return '#f7768e';
}
//# sourceMappingURL=progress-bar.js.map