// src/parser/stdin-parser.ts

import type { PulseInput } from '../types/pulse-input';

export function parseStdin(): Promise<PulseInput> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      reject(new Error('No stdin data provided'));
      return;
    }

    let raw = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      raw += chunk;
    });

    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(raw.trim());
        resolve(data as PulseInput);
      } catch (err) {
        reject(new Error(`Failed to parse stdin JSON: ${err}`));
      }
    });

    process.stdin.on('error', (err: Error) => {
      reject(new Error(`Failed to read stdin: ${err}`));
    });
  });
}

export function parseStdinSync(): PulseInput {
  const raw = readFileSync(0, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('No stdin data provided');
  }
  return JSON.parse(trimmed) as PulseInput;
}

function readFileSync(fd: number, encoding: string): string {
  const fs = require('fs');
  const chunks: Buffer[] = [];
  const buffer = Buffer.alloc(8192);

  while (true) {
    let bytesRead: number;
    try {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
    } catch (err) {
      // EOF on Windows pipes surfaces as EEOF or a benign error after data was read;
      // surface real I/O errors only when nothing has been read yet.
      const code = (err as NodeJS.ErrnoException)?.code;
      if (chunks.length > 0 || code === 'EOF' || code === 'EIO') break;
      throw err;
    }
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
  }

  const combined = Buffer.concat(chunks);
  return combined.toString(encoding as BufferEncoding);
}
