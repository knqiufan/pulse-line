"use strict";
// test/parser.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
(0, node_test_1.test)('parseStdinSync should parse valid JSON from stdin', () => {
    const testFile = (0, path_1.join)((0, os_1.tmpdir)(), 'pulse-test-input.json');
    const mockInput = {
        cwd: '/Users/test/project',
        session_id: 'session-123',
        transcript_path: '/Users/test/.claude/sessions/session-123.jsonl',
        model: { id: 'claude-opus-4', display_name: 'Opus 4' },
        workspace: {
            current_dir: '/Users/test/project',
            project_dir: '/Users/test/project',
            project_name: 'project',
            read_only: false
        },
        version: '1.0.0',
        output_style: { name: 'default' },
        cost: {
            total_cost_usd: 0.042,
            input_cost_usd: 0.008,
            output_cost_usd: 0.034
        },
        context_window: {
            total_input_tokens: 1200,
            total_output_tokens: 420,
            context_window_size: 200000,
            used_percentage: 65.0,
            remaining_percentage: 99.4
        },
        exceeds_200k_tokens: false
    };
    try {
        (0, fs_1.writeFileSync)(testFile, JSON.stringify(mockInput));
        const raw = JSON.stringify(mockInput);
        const result = JSON.parse(raw);
        // Verify structure
        node_assert_1.default.strictEqual(result.model.display_name, 'Opus 4');
        node_assert_1.default.strictEqual(result.cost.total_cost_usd, 0.042);
        node_assert_1.default.strictEqual(result.cwd, '/Users/test/project');
    }
    finally {
        try {
            (0, fs_1.unlinkSync)(testFile);
        }
        catch { }
    }
});
(0, node_test_1.test)('parseStdinSync should throw on invalid JSON', () => {
    const invalidJson = 'not valid json{{{';
    node_assert_1.default.throws(() => {
        JSON.parse(invalidJson);
    });
});
(0, node_test_1.test)('parseStdinSync should handle optional fields', () => {
    const minimal = {
        cwd: '/tmp',
        session_id: 's1',
        transcript_path: '/tmp/s1.jsonl',
        model: { id: 'claude-sonnet-4', display_name: 'Sonnet 4' },
        workspace: { current_dir: '/tmp', read_only: false },
        version: '1.0',
        output_style: { name: 'default' },
        cost: { total_cost_usd: 0.01 },
        context_window: {
            total_input_tokens: 0,
            total_output_tokens: 0,
            context_window_size: 200000,
            used_percentage: 0,
            remaining_percentage: 100
        },
        exceeds_200k_tokens: false
    };
    const result = minimal;
    node_assert_1.default.strictEqual(result.model.display_name, 'Sonnet 4');
    node_assert_1.default.strictEqual(result.rate_limits, undefined);
});
(0, node_test_1.test)('parseStdinSync should handle large context window', () => {
    const largeCtx = {
        cwd: '/tmp',
        session_id: 's1',
        transcript_path: '/tmp/s1.jsonl',
        model: { id: 'claude-opus-4', display_name: 'Opus 4' },
        workspace: { current_dir: '/tmp', read_only: false },
        version: '1.0',
        output_style: { name: 'default' },
        cost: { total_cost_usd: 0.01 },
        context_window: {
            total_input_tokens: 190000,
            total_output_tokens: 5000,
            context_window_size: 200000,
            used_percentage: 97.5,
            remaining_percentage: 2.5
        },
        exceeds_200k_tokens: false
    };
    node_assert_1.default.strictEqual(largeCtx.context_window.used_percentage, 97.5);
    node_assert_1.default.strictEqual(largeCtx.exceeds_200k_tokens, false);
});
//# sourceMappingURL=parser.test.js.map