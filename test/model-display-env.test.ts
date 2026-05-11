// test/model-display-env.test.ts

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { test } from 'node:test';
import assert from 'node:assert';
import { resolveModelDisplayLabel } from '../src/utils/model-display-env';
import { __setTestEnvOverride } from '../src/utils/claude-settings-env';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-mdl-'));
}

const ALL_MODEL_KEYS = [
  'PULSE_MODEL_DISPLAY',
  'CLAUDE_CODE_MODEL_DISPLAY',
  'CLAUDE_MODEL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_REASONING_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL'
] as const;

function isolateEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const k of ALL_MODEL_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  __setTestEnvOverride({});
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>) {
  __setTestEnvOverride(null);
  for (const k of ALL_MODEL_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test('tier maps Opus stdin to ANTHROPIC_DEFAULT_OPUS_MODEL when set only in process.env', () => {
  const d = tmpDir();
  const saved = isolateEnv();
  process.env['ANTHROPIC_DEFAULT_OPUS_MODEL'] = 'glm-5.1';
  try {
    const label = resolveModelDisplayLabel(d, {
      id: 'claude-opus-4-7',
      display_name: 'Opus 4.7 (1M context)'
    });
    assert.strictEqual(label, 'glm-5.1');
  } finally {
    restoreEnv(saved);
  }
});

test('PULSE_MODEL_DISPLAY beats tier mapping', () => {
  const d = tmpDir();
  const saved = isolateEnv();
  process.env['PULSE_MODEL_DISPLAY'] = 'pinned';
  process.env['ANTHROPIC_DEFAULT_OPUS_MODEL'] = 'glm-5.1';
  try {
    const label = resolveModelDisplayLabel(d, {
      id: 'claude-opus-4-7',
      display_name: 'Opus 4'
    });
    assert.strictEqual(label, 'pinned');
  } finally {
    restoreEnv(saved);
  }
});

test('ANTHROPIC_MODEL used only when tier-specific key empty', () => {
  const d = tmpDir();
  const saved = isolateEnv();
  process.env['ANTHROPIC_MODEL'] = 'fallback-model';
  try {
    const label = resolveModelDisplayLabel(d, {
      id: 'claude-opus-4',
      display_name: 'Opus'
    });
    assert.strictEqual(label, 'fallback-model');
  } finally {
    restoreEnv(saved);
  }
});
