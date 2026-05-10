"use strict";
// src/formatters/segment.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSegment = renderSegment;
const ansi_1 = require("../utils/ansi");
function renderSegment(data) {
    let ansi = '';
    if (data.fg) {
        ansi += (0, ansi_1.ansiColor)(data.fg);
    }
    if (data.bold)
        ansi += ansi_1.ANSI_BOLD;
    if (data.dim)
        ansi += '\x1b[2m';
    const text = data.icon ? `${data.icon} ${data.text}` : data.text;
    return `${ansi}${text}${ansi_1.ANSI_RESET}`;
}
//# sourceMappingURL=segment.js.map