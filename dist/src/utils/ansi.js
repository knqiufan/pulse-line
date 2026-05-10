"use strict";
// src/utils/ansi.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANSI_DIM = exports.ANSI_BOLD = exports.ANSI_RESET = void 0;
exports.ansiColor = ansiColor;
exports.ansiColor256 = ansiColor256;
exports.colorize = colorize;
function ansiColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}
function ansiColor256(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}
exports.ANSI_RESET = '\x1b[0m';
exports.ANSI_BOLD = '\x1b[1m';
exports.ANSI_DIM = '\x1b[2m';
function colorize(hex, text, bold = false, dim = false) {
    let ansi = ansiColor(hex);
    if (bold)
        ansi += exports.ANSI_BOLD;
    if (dim)
        ansi += exports.ANSI_DIM;
    return `${ansi}${text}${exports.ANSI_RESET}`;
}
//# sourceMappingURL=ansi.js.map