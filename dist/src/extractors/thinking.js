"use strict";
// src/extractors/thinking.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractThinking = extractThinking;
function extractThinking(input) {
    if (!input.thinking)
        return null;
    return { text: `🤔 ${input.thinking.enabled ? 'on' : 'off'}` };
}
//# sourceMappingURL=thinking.js.map