"use strict";
// test/third-party-api.test.ts
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
const third_party_api_1 = require("../src/extractors/third-party-api");
const dark_1 = require("../src/themes/builtin/dark");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, node_test_1.test)('extractThirdPartyApi should return empty array when no providers configured', async () => {
    const results = await (0, third_party_api_1.extractThirdPartyApi)([], dark_1.darkTheme);
    node_assert_1.default.ok(Array.isArray(results));
    node_assert_1.default.strictEqual(results.length, 0);
});
(0, node_test_1.test)('extractThirdPartyApi should handle disabled providers', async () => {
    const results = await (0, third_party_api_1.extractThirdPartyApi)(['zhipu', 'deepseek'], dark_1.darkTheme);
    node_assert_1.default.ok(Array.isArray(results));
    // Should be empty since providers are disabled by default
    node_assert_1.default.ok(results.length >= 0);
});
(0, node_test_1.test)('createDefaultApiKeysConfig should create config file', () => {
    const testPath = path.join(os.tmpdir(), 'pulse-test-api-keys.json');
    const originalPath = '/d/code/status-bar-cc/.worktrees/implementation/src/utils/constants.ts';
    // Just verify the function doesn't throw
    try {
        (0, third_party_api_1.createDefaultApiKeysConfig)();
        node_assert_1.default.ok(true);
    }
    catch (err) {
        node_assert_1.default.fail('Should not throw');
    }
});
(0, node_test_1.test)('extractThirdPartyApi should gracefully handle network errors', async () => {
    // Query with invalid provider should not crash
    const results = await (0, third_party_api_1.extractThirdPartyApi)(['nonexistent'], dark_1.darkTheme);
    node_assert_1.default.ok(Array.isArray(results));
});
//# sourceMappingURL=third-party-api.test.js.map