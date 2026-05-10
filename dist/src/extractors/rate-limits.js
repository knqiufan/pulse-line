"use strict";
// src/extractors/rate-limits.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRateLimits = extractRateLimits;
exports.extractWeeklyQuota = extractWeeklyQuota;
const progress_bar_1 = require("../formatters/progress-bar");
function extractRateLimits(input, theme) {
    if (!input.rate_limits)
        return null;
    const fiveHour = input.rate_limits.five_hour;
    if (!fiveHour)
        return null;
    const pct = Math.min(100, (fiveHour.requests_used / fiveHour.requests_limit) * 100);
    const barWidth = 8;
    const bar = (0, progress_bar_1.renderProgressBar)(pct, barWidth);
    const text = `⚡ ${bar} ${pct.toFixed(0)}%`;
    return {
        text,
        fg: theme.components.rateLimit.fg
    };
}
function extractWeeklyQuota(input, theme) {
    if (!input.rate_limits?.seven_day)
        return null;
    const week = input.rate_limits.seven_day;
    const pct = Math.min(100, (week.requests_used / week.requests_limit) * 100);
    const barWidth = 10;
    const bar = (0, progress_bar_1.renderProgressBar)(pct, barWidth);
    const text = `📅 ${bar} ${pct.toFixed(0)}%`;
    return {
        text,
        fg: theme.components.weeklyQuota.fg
    };
}
//# sourceMappingURL=rate-limits.js.map