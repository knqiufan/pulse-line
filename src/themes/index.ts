// src/themes/index.ts

import type { Theme } from '../types/theme';
import { darkTheme } from './builtin/dark';

const BUILTIN_THEMES: Record<string, Theme> = {
  dark: darkTheme
};

export function loadTheme(name: string): Theme {
  return BUILTIN_THEMES[name] || darkTheme;
}

export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES);
}
