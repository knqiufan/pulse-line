"use strict";
// src/extractors/context.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContext = extractContext;
function extractContext(input) {
    const pct = Math.min(100, Math.max(0, input.context_window.used_percentage));
    const barWidth = 12;
    const filled = Math.round((pct / 100) * barWidth);
    const empty = barWidth - filled;
    const barText = `█`.repeat(filled) + `░`.repeat(empty) + ` ${pct.toFixed(0)}%`;
    const usage = input.context_window.current_usage;
    const tokensText = usage
        ? `(${formatNumber(usage.input_tokens + usage.cache_read_input_tokens)} / ${formatNumber(input.context_window.context_window_size)} tokens)`
        : '';
    return { percentage: pct, barText, tokensText };
}
function formatNumber(n) {
    return n.toLocaleString('en-US');
}
//# sourceMappingURL=context.js.map