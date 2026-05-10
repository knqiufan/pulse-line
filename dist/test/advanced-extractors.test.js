"use strict";
// test/advanced-extractors.test.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const transcript_1 = require("../src/extractors/transcript");
const thinking_1 = require("../src/extractors/thinking");
const mcp_1 = require("../src/extractors/mcp");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, node_test_1.test)('extractThinking should detect thinking mode', () => {
    const result = (0, thinking_1.extractThinking)({ thinking: { enabled: true } });
    node_assert_1.default.ok(result);
    node_assert_1.default.strictEqual(result.text, '🤔 on');
});
(0, node_test_1.test)('extractThinking should return null when not enabled', () => {
    const result = (0, thinking_1.extractThinking)({});
    node_assert_1.default.strictEqual(result, null);
});
(0, node_test_1.test)('extractMcpStatus should detect MCP servers', () => {
    const result = (0, mcp_1.extractMcpStatus)();
    // May or may not find servers, just shouldn't crash
    node_assert_1.default.ok(result === null || typeof result.text === 'string');
});
(0, node_test_1.test)('extractTurns should count transcript entries', () => {
    const tmpFile = path.join(os.tmpdir(), 'pulse-test-transcript.jsonl');
    const lines = [
        JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }),
        JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: 'hello' } }),
        JSON.stringify({ type: 'user', message: { role: 'user', content: 'how are you?' } }),
        JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: 'fine' } }),
        JSON.stringify({ type: 'system', message: { role: 'system', content: 'notice' } })
    ];
    fs.writeFileSync(tmpFile, lines.join('\n'));
    try {
        const result = (0, transcript_1.extractTurns)(tmpFile);
        node_assert_1.default.ok(result);
        node_assert_1.default.strictEqual(result.text, '💬 4 turns');
    }
    finally {
        fs.unlinkSync(tmpFile);
    }
});
(0, node_test_1.test)('extractTurns should return null for empty transcript', () => {
    const tmpFile = path.join(os.tmpdir(), 'pulse-test-empty.jsonl');
    fs.writeFileSync(tmpFile, '');
    try {
        const result = (0, transcript_1.extractTurns)(tmpFile);
        node_assert_1.default.strictEqual(result, null);
    }
    finally {
        fs.unlinkSync(tmpFile);
    }
});
(0, node_test_1.test)('extractTurns should return null for non-existent file', () => {
    const result = (0, transcript_1.extractTurns)('/tmp/nonexistent-file-12345.jsonl');
    node_assert_1.default.strictEqual(result, null);
});
//# sourceMappingURL=advanced-extractors.test.js.map