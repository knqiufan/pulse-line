// test/model-display-env.test.ts

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { test } from 'node:test';
import assert from 'node:assert';
import { resolveModelDisplayLabel } from '../src/utils/model-display-env';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-mdl-'));
}

test('tier maps Opus stdin to ANTHROPIC_DEFAULT_OPUS_MODEL when set only in process.env', () => {
  const d = tmpDir();
  const k = 'ANTHROPIC_DEFAULT_OPUS_MODEL';
  const prev = process.env[k];
  process.env[k] = 'glm-5.1';
  try {
    const label = resolveModelDisplayLabel(d, {
      id: 'claude-opus-4-7',
      display_name: 'Opus 4.7 (1M context)'
    });
    assert.strictEqual(label, 'glm-5.1');
  } finally {
    if (prev === undefined) delete process.env[k];
    else process.env[k] = prev;
  }
});

test('PULSE_MODEL_DISPLAY beats tier mapping', () => {
  const d = tmpDir();
  const k = 'PULSE_MODEL_DISPLAY';
  const opus = 'ANTHROPIC_DEFAULT_OPUS_MODEL';
  const prevP = process.env[k];
  const prevO = process.env[opus];
  process.env[k] = 'pinned';
  process.env[opus] = 'glm-5.1';
  try {
    const label = resolveModelDisplayLabel(d, {
      id: 'claude-opus-4-7',
      display_name: 'Opus 4'
    });
    assert.strictEqual(label, 'pinned');
  } finally {
    if (prevP === undefined) delete process.env[k];
    else process.env[k] = prevP;
    if (prevO === undefined) delete process.env[opus];
    else process.env[opus] = prevO;
  }
});

test('ANTHROPIC_MODEL used only when tier-specific key empty', () => {
  const d = tmpDir();
  const opus = 'ANTHROPIC_DEFAULT_OPUS_MODEL';
  const ambi = 'ANTHROPIC_MODEL';
  const prevO = process.env[opus];
  const prevM = process.env[ambi];
  delete process.env[opus];
  process.env[ambi] = 'fallback-model';
  try {
    const label = resolveModelDisplayLabel(d, {
      id: 'claude-opus-4',
      display_name: 'Opus'
    });
    assert.strictEqual(label, 'fallback-model');
  } finally {
    if (prevO === undefined) delete process.env[opus];
    else process.env[opus] = prevO;
    if (prevM === undefined) delete process.env[ambi];
    else process.env[ambi] = prevM;
  }
});
