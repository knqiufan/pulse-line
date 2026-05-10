"use strict";
// src/extractors/model.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractModel = extractModel;
function extractModel(input, theme) {
    const modelName = input.model?.display_name;
    if (!modelName)
        return null;
    const style = theme.components.model;
    return {
        text: `${style.icon} ${modelName}`,
        fg: style.fg,
        bold: style.bold ?? false,
        dim: style.dim ?? false
    };
}
//# sourceMappingURL=model.js.map