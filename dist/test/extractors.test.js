"use strict";
// test/extractors.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const model_1 = require("../src/extractors/model");
const context_1 = require("../src/extractors/context");
const cost_1 = require("../src/extractors/cost");
const workspace_1 = require("../src/extractors/workspace");
const dark_1 = require("../src/themes/builtin/dark");
const fullInput = (overrides = {}) => ({
    cwd: '',
    session_id: '',
    transcript_path: '',
    model: { id: 'claude-opus-4', display_name: 'Opus 4' },
    workspace: { current_dir: '', project_dir: '', project_name: '', read_only: false },
    version: '1.0',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 0, input_cost_usd: 0, output_cost_usd: 0 },
    context_window: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        context_window_size: 200000,
        used_percentage: 0,
        remaining_percentage: 100
    },
    exceeds_200k_tokens: false,
    ...overrides
});
(0, node_test_1.test)('extractModel should return model segment', () => {
    const input = fullInput({
        model: { id: 'claude-opus-4', display_name: 'Opus 4' }
    });
    const result = (0, model_1.extractModel)(input, dark_1.darkTheme);
    node_assert_1.default.ok(result);
    // Icon prefix should be present before model name
    node_assert_1.default.ok(result.text.endsWith('Opus 4'));
    node_assert_1.default.strictEqual(result.fg, '#7aa2f7');
    node_assert_1.default.strictEqual(result.bold, true);
});
(0, node_test_1.test)('extractModel should return null for empty display_name', () => {
    const input = fullInput({
        model: { id: 'claude-opus-4', display_name: '' }
    });
    const result = (0, model_1.extractModel)(input, dark_1.darkTheme);
    node_assert_1.default.strictEqual(result, null);
});
(0, node_test_1.test)('extractContext should format progress correctly', () => {
    const input = fullInput({
        context_window: {
            total_input_tokens: 100000,
            total_output_tokens: 5000,
            context_window_size: 200000,
            used_percentage: 52.5,
            remaining_percentage: 47.5,
            current_usage: {
                input_tokens: 80000,
                output_tokens: 5000,
                cache_creation_input_tokens: 2000,
                cache_read_input_tokens: 35000
            }
        }
    });
    const result = (0, context_1.extractContext)(input);
    node_assert_1.default.strictEqual(result.percentage, 52.5);
    node_assert_1.default.ok(result.barText.includes('53%'));
    node_assert_1.default.ok(result.tokensText.includes('115,000'));
});
(0, node_test_1.test)('extractContext should handle null current_usage', () => {
    const input = fullInput({
        context_window: {
            total_input_tokens: 100000,
            total_output_tokens: 5000,
            context_window_size: 200000,
            used_percentage: 50.0,
            remaining_percentage: 50.0
        }
    });
    const result = (0, context_1.extractContext)(input);
    node_assert_1.default.strictEqual(result.tokensText, '');
});
(0, node_test_1.test)('extractContext should clamp percentage to 0-100', () => {
    const input = fullInput({
        context_window: {
            total_input_tokens: 100000,
            total_output_tokens: 5000,
            context_window_size: 200000,
            used_percentage: 150,
            remaining_percentage: -50
        }
    });
    const result = (0, context_1.extractContext)(input);
    node_assert_1.default.strictEqual(result.percentage, 100);
});
(0, node_test_1.test)('extractCost should format cost correctly', () => {
    const input = fullInput({
        cost: { total_cost_usd: 0.042, input_cost_usd: 0.008, output_cost_usd: 0.034 }
    });
    const result = (0, cost_1.extractCost)(input);
    node_assert_1.default.ok(result);
    node_assert_1.default.strictEqual(result.text, '$0.0420');
});
(0, node_test_1.test)('extractCost should return null for zero cost', () => {
    const input = fullInput({
        cost: { total_cost_usd: 0, input_cost_usd: 0, output_cost_usd: 0 }
    });
    const result = (0, cost_1.extractCost)(input);
    node_assert_1.default.strictEqual(result, null);
});
(0, node_test_1.test)('extractWorkspace should use project_name if available', () => {
    const input = fullInput({
        workspace: { current_dir: '/Users/test/project', project_dir: '/Users/test/project', project_name: 'my-project', read_only: false }
    });
    const result = (0, workspace_1.extractWorkspace)(input);
    node_assert_1.default.strictEqual(result.text, 'my-project');
});
(0, node_test_1.test)('extractWorkspace should fallback to directory basename', () => {
    const input = fullInput({
        workspace: { current_dir: '/Users/test/project', project_dir: '/Users/test/project', project_name: undefined, read_only: false }
    });
    const result = (0, workspace_1.extractWorkspace)(input);
    node_assert_1.default.strictEqual(result.text, 'project');
});
//# sourceMappingURL=extractors.test.js.map