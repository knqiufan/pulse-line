// test/themes.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import {
  loadTheme,
  getBuiltinThemeNames,
  getAllThemes
} from '../src/themes';
import type { Theme } from '../src/types/theme';

test('loadTheme should load dark theme', () => {
  const theme = loadTheme('dark');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Deep Dark');
  assert.ok(theme.colors.primary);
  assert.ok(theme.components.model.fg);
});

test('loadTheme should load light theme', () => {
  const theme = loadTheme('light');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Minimal Light');
});

test('loadTheme should load cyberpunk theme', () => {
  const theme = loadTheme('cyberpunk');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Cyberpunk');
});

test('loadTheme should load forest theme', () => {
  const theme = loadTheme('forest');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Forest');
});

test('loadTheme should load ocean theme', () => {
  const theme = loadTheme('ocean');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Ocean');
});

test('loadTheme should fallback to dark for unknown theme', () => {
  const theme = loadTheme('nonexistent');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Deep Dark');
});

test('getBuiltinThemeNames should return 5 themes', () => {
  const names = getBuiltinThemeNames();
  assert.strictEqual(names.length, 5);
  assert.ok(names.includes('dark'));
  assert.ok(names.includes('light'));
  assert.ok(names.includes('cyberpunk'));
  assert.ok(names.includes('forest'));
  assert.ok(names.includes('ocean'));
});

test('getAllThemes should return 5 themes', () => {
  const themes = getAllThemes();
  assert.strictEqual(themes.length, 5);
});

test('all themes should have required color properties', () => {
  const themes = getAllThemes();
  const requiredColors = ['primary', 'accent', 'success', 'warning', 'error', 'info', 'muted', 'dim'];

  for (const theme of themes) {
    for (const color of requiredColors) {
      assert.ok(theme.colors[color as keyof typeof theme.colors], `Theme ${theme.meta.name} missing color: ${color}`);
      assert.ok((theme.colors[color as keyof typeof theme.colors] as string).startsWith('#'), `Theme ${theme.meta.name} color ${color} should be hex`);
    }
  }
});

test('all themes should have all component styles', () => {
  const themes = getAllThemes();
  const requiredComponents = [
    'model', 'context', 'contextBar', 'git', 'cost', 'duration',
    'workspace', 'turns', 'cacheRatio', 'rateLimit', 'weeklyQuota',
    'mcpStatus', 'thinking', 'outputStyle', 'separator'
  ];

  for (const theme of themes) {
    for (const comp of requiredComponents) {
      assert.ok(theme.components[comp as keyof typeof theme.components], `Theme ${theme.meta.name} missing component: ${comp}`);
    }
  }
});
