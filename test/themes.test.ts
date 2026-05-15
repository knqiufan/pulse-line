// test/themes.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import {
  loadTheme,
  getBuiltinThemeNames,
  getAllThemes
} from '../src/themes';

test('loadTheme should load dark theme', () => {
  const theme = loadTheme('dark', 'text');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Deep Dark');
  assert.ok(theme.colors.primary);
  assert.ok(theme.components.model.fg);
});

test('loadTheme should load light theme', () => {
  const theme = loadTheme('light', 'text');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Minimal Light');
});

test('loadTheme should load cyberpunk theme', () => {
  const theme = loadTheme('cyberpunk', 'text');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Cyberpunk');
});

test('loadTheme should load forest theme', () => {
  const theme = loadTheme('forest', 'text');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Forest');
});

test('loadTheme should load ocean theme', () => {
  const theme = loadTheme('ocean', 'text');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Ocean');
});

test('loadTheme should fallback to dark for unknown theme', () => {
  const theme = loadTheme('nonexistent', 'text');
  assert.ok(theme);
  assert.strictEqual(theme.meta.name, 'Deep Dark');
});

test('loadTheme nerd overlays PUA icons and powerline sep', () => {
  const t = loadTheme('dark', 'nerd');
  assert.notStrictEqual(t.components.model.icon, '[M]');
  assert.strictEqual(t.separator.left, '\u{e0b0}');
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
    'accountUsage', 'mcpStatus', 'thinking', 'outputStyle', 'toolTimeline',
    'separator'
  ];

  for (const theme of themes) {
    for (const comp of requiredComponents) {
      assert.ok(theme.components[comp as keyof typeof theme.components], `Theme ${theme.meta.name} missing component: ${comp}`);
    }
  }
});

test('loadTheme nerd overlays tool timeline icon', () => {
  const t = loadTheme('dark', 'nerd');
  assert.ok(t.components.toolTimeline.icon);
});
