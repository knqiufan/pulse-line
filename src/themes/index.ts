// src/themes/index.ts

import type { Theme } from '../types/theme';
import { darkTheme } from './builtin/dark';
import { lightTheme } from './builtin/light';
import { cyberpunkTheme } from './builtin/cyberpunk';
import { forestTheme } from './builtin/forest';
import { oceanTheme } from './builtin/ocean';

const BUILTIN_THEMES: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  cyberpunk: cyberpunkTheme,
  forest: forestTheme,
  ocean: oceanTheme
};

export function loadTheme(name: string): Theme {
  return BUILTIN_THEMES[name] || darkTheme;
}

export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES);
}

export function getAllThemes(): Theme[] {
  return Object.values(BUILTIN_THEMES);
}
