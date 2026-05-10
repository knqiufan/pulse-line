// test/extractors.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { extractModel } from '../src/extractors/model';
import { extractContext } from '../src/extractors/context';
import { extractCost } from '../src/extractors/cost';
import { extractWorkspace } from '../src/extractors/workspace';
import { darkTheme } from '../src/themes/builtin/dark';

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
  const input = fullInput({
    model: { id: 'claude-opus-4', display_name: 'Opus 4' }
  });

  const result = extractModel(input, darkTheme);
  assert.ok(result);
  assert.strictEqual(result.text, '🧠 Opus 4');
  assert.strictEqual(result.fg, '#7aa2f7');
  assert.strictEqual(result.bold, true);
});

test('extractModel should return null for empty display_name', () => {
  const input = fullInput({
    model: { id: 'claude-opus-4', display_name: '' }
  });

  const result = extractModel(input, darkTheme);
  assert.strictEqual(result, null);
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

test('extractCost should return null for zero cost', () => {
  const input = fullInput({
    cost: { total_cost_usd: 0, input_cost_usd: 0, output_cost_usd: 0 }
  });

  const result = extractCost(input);
  assert.strictEqual(result, null);
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
