"use strict";
// src/formatters/separator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSeparator = renderSeparator;
const ansi_1 = require("../utils/ansi");
function renderSeparator(sep, fg) {
    if (!sep)
        return '';
    return (0, ansi_1.ansiColor)(fg) + sep + ansi_1.ANSI_RESET;
}
//# sourceMappingURL=separator.js.map