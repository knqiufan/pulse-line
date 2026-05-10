"use strict";
// test/themes.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const themes_1 = require("../src/themes");
(0, node_test_1.test)('loadTheme should load dark theme', () => {
    const theme = (0, themes_1.loadTheme)('dark');
    node_assert_1.default.ok(theme);
    node_assert_1.default.strictEqual(theme.meta.name, 'Deep Dark');
    node_assert_1.default.ok(theme.colors.primary);
    node_assert_1.default.ok(theme.components.model.fg);
});
(0, node_test_1.test)('loadTheme should load light theme', () => {
    const theme = (0, themes_1.loadTheme)('light');
    node_assert_1.default.ok(theme);
    node_assert_1.default.strictEqual(theme.meta.name, 'Minimal Light');
});
(0, node_test_1.test)('loadTheme should load cyberpunk theme', () => {
    const theme = (0, themes_1.loadTheme)('cyberpunk');
    node_assert_1.default.ok(theme);
    node_assert_1.default.strictEqual(theme.meta.name, 'Cyberpunk');
});
(0, node_test_1.test)('loadTheme should load forest theme', () => {
    const theme = (0, themes_1.loadTheme)('forest');
    node_assert_1.default.ok(theme);
    node_assert_1.default.strictEqual(theme.meta.name, 'Forest');
});
(0, node_test_1.test)('loadTheme should load ocean theme', () => {
    const theme = (0, themes_1.loadTheme)('ocean');
    node_assert_1.default.ok(theme);
    node_assert_1.default.strictEqual(theme.meta.name, 'Ocean');
});
(0, node_test_1.test)('loadTheme should fallback to dark for unknown theme', () => {
    const theme = (0, themes_1.loadTheme)('nonexistent');
    node_assert_1.default.ok(theme);
    node_assert_1.default.strictEqual(theme.meta.name, 'Deep Dark');
});
(0, node_test_1.test)('getBuiltinThemeNames should return 5 themes', () => {
    const names = (0, themes_1.getBuiltinThemeNames)();
    node_assert_1.default.strictEqual(names.length, 5);
    node_assert_1.default.ok(names.includes('dark'));
    node_assert_1.default.ok(names.includes('light'));
    node_assert_1.default.ok(names.includes('cyberpunk'));
    node_assert_1.default.ok(names.includes('forest'));
    node_assert_1.default.ok(names.includes('ocean'));
});
(0, node_test_1.test)('getAllThemes should return 5 themes', () => {
    const themes = (0, themes_1.getAllThemes)();
    node_assert_1.default.strictEqual(themes.length, 5);
});
(0, node_test_1.test)('all themes should have required color properties', () => {
    const themes = (0, themes_1.getAllThemes)();
    const requiredColors = ['primary', 'accent', 'success', 'warning', 'error', 'info', 'muted', 'dim'];
    for (const theme of themes) {
        for (const color of requiredColors) {
            node_assert_1.default.ok(theme.colors[color], `Theme ${theme.meta.name} missing color: ${color}`);
            node_assert_1.default.ok(theme.colors[color].startsWith('#'), `Theme ${theme.meta.name} color ${color} should be hex`);
        }
    }
});
(0, node_test_1.test)('all themes should have all component styles', () => {
    const themes = (0, themes_1.getAllThemes)();
    const requiredComponents = [
        'model', 'context', 'contextBar', 'git', 'cost', 'duration',
        'workspace', 'turns', 'cacheRatio', 'rateLimit', 'weeklyQuota',
        'mcpStatus', 'thinking', 'outputStyle', 'separator'
    ];
    for (const theme of themes) {
        for (const comp of requiredComponents) {
            node_assert_1.default.ok(theme.components[comp], `Theme ${theme.meta.name} missing component: ${comp}`);
        }
    }
});
//# sourceMappingURL=themes.test.js.map