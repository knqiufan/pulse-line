"use strict";
// src/formatters/layout.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLayout = renderLayout;
function renderLayout(segments, theme) {
    const sep = theme.separator.left;
    const sepColor = theme.separator.color;
    let result = '';
    for (let i = 0; i < segments.length; i++) {
        if (i > 0 && sep) {
            result += colorize(sepColor, sep);
        }
        result += segments[i].text;
    }
    return result;
}
function colorize(hex, text) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}
//# sourceMappingURL=layout.js.map