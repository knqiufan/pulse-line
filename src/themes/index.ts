// src/themes/index.ts

import type { Theme } from '../types/theme';
import { darkTheme } from './builtin/dark';
import { lightTheme } from './builtin/light';
import { cyberpunkTheme } from './builtin/cyberpunk';
import { forestTheme } from './builtin/forest';
import { oceanTheme } from './builtin/ocean';
import { nerdIconSet } from './icon-sets/nerd';

const BUILTIN_THEMES: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  cyberpunk: cyberpunkTheme,
  forest: forestTheme,
  ocean: oceanTheme
};

function cloneTheme(theme: Theme): Theme {
  return JSON.parse(JSON.stringify(theme)) as Theme;
}

function overlayNerdIcons(theme: Theme): Theme {
  const n = nerdIconSet;
  theme.components.model.icon = n.model;
  theme.components.context.icon = n.context;
  theme.components.git.icon = n.git;
  theme.components.cost.icon = n.cost;
  theme.components.duration.icon = n.duration;
  theme.components.workspace.icon = n.workspace;
  theme.components.turns.icon = n.turns;
  theme.components.cacheRatio.icon = n.cacheRatio;
  theme.components.rateLimit.icon = n.rateLimit;
  theme.components.weeklyQuota.icon = n.weeklyQuota;
  theme.components.accountUsage.icon = n.accountUsage;
  theme.components.mcpStatus.icon = n.mcpStatus;
  theme.components.thinking.icon = n.thinking;
  theme.components.outputStyle.icon = n.outputStyle;
  theme.components.toolTimeline.icon = n.toolTimeline;
  theme.separator.left = '\u{e0b0}';
  return theme;
}

export function loadTheme(name: string, iconSet: 'nerd' | 'text'): Theme {
  const base = BUILTIN_THEMES[name] || darkTheme;
  const t = cloneTheme(base);
  if (iconSet === 'nerd') {
    overlayNerdIcons(t);
  }
  return t;
}

export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES);
}

export function getAllThemes(): Theme[] {
  return Object.values(BUILTIN_THEMES);
}
