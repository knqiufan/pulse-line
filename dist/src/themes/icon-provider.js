"use strict";
// src/themes/icon-provider.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIconSet = getIconSet;
const nerd_1 = require("./icon-sets/nerd");
const text_1 = require("./icon-sets/text");
function getIconSet(iconSetType) {
    return iconSetType === 'nerd' ? nerd_1.nerdIconSet : text_1.textIconSet;
}
//# sourceMappingURL=icon-provider.js.map