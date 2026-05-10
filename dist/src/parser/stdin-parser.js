"use strict";
// src/parser/stdin-parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStdin = parseStdin;
exports.parseStdinSync = parseStdinSync;
function parseStdin() {
    return new Promise((resolve, reject) => {
        if (process.stdin.isTTY) {
            reject(new Error('No stdin data provided'));
            return;
        }
        let raw = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            raw += chunk;
        });
        process.stdin.on('end', () => {
            try {
                const data = JSON.parse(raw.trim());
                resolve(data);
            }
            catch (err) {
                reject(new Error(`Failed to parse stdin JSON: ${err}`));
            }
        });
        process.stdin.on('error', (err) => {
            reject(new Error(`Failed to read stdin: ${err}`));
        });
    });
}
function parseStdinSync() {
    const raw = readFileSync(0, 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
        throw new Error('No stdin data provided');
    }
    return JSON.parse(trimmed);
}
function readFileSync(fd, encoding) {
    const chunks = [];
    const buffer = Buffer.alloc(8192);
    let bytesRead;
    while ((bytesRead = read(fd, buffer, 0, buffer.length, null)) > 0) {
        chunks.push(buffer.subarray(0, bytesRead));
    }
    const combined = Buffer.concat(chunks);
    return combined.toString(encoding);
}
function read(fd, buffer, offset, length, position) {
    const fs = require('fs');
    try {
        return fs.readSync(fd, buffer, offset, length, position);
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=stdin-parser.js.map