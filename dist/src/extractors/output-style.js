"use strict";
// src/extractors/output-style.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractOutputStyle = extractOutputStyle;
function extractOutputStyle(input) {
    const name = input.output_style?.name;
    if (!name || name === 'default')
        return null;
    return { text: `📝 ${name}` };
}
//# sourceMappingURL=output-style.js.map