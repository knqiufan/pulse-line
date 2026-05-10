"use strict";
// src/extractors/cost.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCost = extractCost;
function extractCost(input) {
    const cost = input.cost?.total_cost_usd;
    if (cost === undefined || cost === null || cost === 0)
        return null;
    return {
        text: `$${cost.toFixed(4)}`
    };
}
//# sourceMappingURL=cost.js.map