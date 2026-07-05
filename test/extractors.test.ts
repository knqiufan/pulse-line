// test/extractors.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractModel } from '../src/extractors/model';
import { extractContext } from '../src/extractors/context';
import { extractCost } from '../src/extractors/cost';
import { extractWorkspace } from '../src/extractors/workspace';
import { darkTheme } from '../src/themes/builtin/dark';
import { __setTestEnvOverride } from '../src/utils/claude-settings-env';

const fullInput = (overrides: Partial<import('../src/types/pulse-input').PulseInput> = {}): import('../src/types/pulse-input').PulseInput => ({
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

test('extractModel should return model segment', () => {
  const keys = [
    'PULSE_MODEL_DISPLAY',
    'CLAUDE_CODE_MODEL_DISPLAY',
    'CLAUDE_MODEL',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_REASONING_MODEL',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL'
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  __setTestEnvOverride({});
  try {
    const input = fullInput({
      model: { id: 'claude-opus-4', display_name: 'Opus 4' }
    });

    const result = extractModel(input, darkTheme);
    assert.ok(result);
    assert.ok(result.text.endsWith('Opus 4'));
    assert.strictEqual(result.fg, '#7aa2f7');
    assert.strictEqual(result.bold, true);
  } finally {
    __setTestEnvOverride(null);
    for (const k of keys) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('extractModel should fall back to model id when display_name is empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-ext-'));
  const keys = [
    'PULSE_MODEL_DISPLAY',
    'CLAUDE_CODE_MODEL_DISPLAY',
    'CLAUDE_MODEL',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL'
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  try {
    const input = fullInput({
      cwd: dir,
      model: { id: 'custom-unknown-id', display_name: '' }
    });

    const result = extractModel(input, darkTheme);
    assert.ok(result);
    assert.ok(result!.text.includes('custom-unknown-id'));
  } finally {
    for (const k of keys) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('extractModel maps Opus tier to ANTHROPIC_DEFAULT_OPUS_MODEL', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-ext-'));
  const k = 'ANTHROPIC_DEFAULT_OPUS_MODEL';
  const prev = process.env[k];
  process.env[k] = 'glm-5.1';
  try {
    const input = fullInput({
      cwd: dir,
      model: { id: 'claude-opus-4-7', display_name: 'Opus 4.7 (1M context)' }
    });
    const result = extractModel(input, darkTheme);
    assert.ok(result);
    assert.ok(result!.text.includes('glm-5.1'));
    assert.ok(!result!.text.includes('Opus 4.7'));
  } finally {
    if (prev === undefined) delete process.env[k];
    else process.env[k] = prev;
  }
});

test('extractModel uses PULSE_MODEL_DISPLAY over stdin when set', () => {
  const k = 'PULSE_MODEL_DISPLAY';
  const prev = process.env[k];
  process.env[k] = 'Custom From Settings';
  try {
    const input = fullInput({
      model: { id: 'x', display_name: 'Opus 4' }
    });
    const result = extractModel(input, darkTheme);
    assert.ok(result);
    assert.ok(result!.text.includes('Custom From Settings'));
    assert.ok(!result!.text.includes('Opus 4'));
  } finally {
    if (prev === undefined) delete process.env[k];
    else process.env[k] = prev;
  }
});

test('extractContext should format progress correctly', () => {
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

  const result = extractContext(input);
  assert.strictEqual(result.percentage, 52.5);
  assert.ok(result.barText.includes('53%'));
  assert.ok(result.tokensText.includes('115,000'));
});

test('extractContext should handle null current_usage', () => {
  const input = fullInput({
    context_window: {
      total_input_tokens: 100000,
      total_output_tokens: 5000,
      context_window_size: 200000,
      used_percentage: 50.0,
      remaining_percentage: 50.0
    }
  });

  const result = extractContext(input);
  assert.strictEqual(result.tokensText, '');
});

test('extractContext should clamp percentage to 0-100', () => {
  const input = fullInput({
    context_window: {
      total_input_tokens: 100000,
      total_output_tokens: 5000,
      context_window_size: 200000,
      used_percentage: 150,
      remaining_percentage: -50
    }
  });

  const result = extractContext(input);
  assert.strictEqual(result.percentage, 100);
});

test('extractCost should format cost correctly', () => {
  const input = fullInput({
    cost: { total_cost_usd: 0.042, input_cost_usd: 0.008, output_cost_usd: 0.034 }
  });

  const result = extractCost(input);
  assert.ok(result);
  assert.strictEqual(result.text, '$0.0420');
});

test('extractCost should render zero cost as $0.0000', () => {
  const input = fullInput({
    cost: { total_cost_usd: 0, input_cost_usd: 0, output_cost_usd: 0 }
  });

  const result = extractCost(input);
  assert.ok(result);
  assert.strictEqual(result.text, '$0.0000');
});

test('extractWorkspace should use project_name if available', () => {
  const input = fullInput({
    workspace: { current_dir: '/Users/test/project', project_dir: '/Users/test/project', project_name: 'my-project', read_only: false }
  });

  const result = extractWorkspace(input);
  assert.strictEqual(result.text, 'my-project');
});

test('extractWorkspace should fallback to directory basename', () => {
  const input = fullInput({
    workspace: { current_dir: '/Users/test/project', project_dir: '/Users/test/project', project_name: undefined, read_only: false }
  });

  const result = extractWorkspace(input);
  assert.strictEqual(result.text, 'project');
});
