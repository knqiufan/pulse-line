"use strict";
// src/themes/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTheme = loadTheme;
exports.getBuiltinThemeNames = getBuiltinThemeNames;
exports.getAllThemes = getAllThemes;
const dark_1 = require("./builtin/dark");
const light_1 = require("./builtin/light");
const cyberpunk_1 = require("./builtin/cyberpunk");
const forest_1 = require("./builtin/forest");
const ocean_1 = require("./builtin/ocean");
const BUILTIN_THEMES = {
    dark: dark_1.darkTheme,
    light: light_1.lightTheme,
    cyberpunk: cyberpunk_1.cyberpunkTheme,
    forest: forest_1.forestTheme,
    ocean: ocean_1.oceanTheme
};
function loadTheme(name) {
    return BUILTIN_THEMES[name] || dark_1.darkTheme;
}
function getBuiltinThemeNames() {
    return Object.keys(BUILTIN_THEMES);
}
function getAllThemes() {
    return Object.values(BUILTIN_THEMES);
}
//# sourceMappingURL=index.js.map