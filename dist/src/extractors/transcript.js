"use strict";
// src/extractors/transcript.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTurns = extractTurns;
const fs = __importStar(require("fs"));
function extractTurns(transcriptPath) {
    try {
        if (!fs.existsSync(transcriptPath))
            return null;
        const content = fs.readFileSync(transcriptPath, 'utf8');
        const lines = content.split('\n');
        let turns = 0;
        for (const line of lines) {
            try {
                const entry = JSON.parse(line.trim());
                if (entry.type === 'user' || entry.type === 'assistant') {
                    turns++;
                }
            }
            catch {
                // skip invalid lines
            }
        }
        if (turns === 0)
            return null;
        return { text: `💬 ${turns} turns` };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=transcript.js.map