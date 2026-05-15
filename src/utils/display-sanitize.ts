// src/utils/display-sanitize.ts

import type { PulseConfig } from '../types/pulse-config';
import { DEFAULT_CONFIG } from '../types/pulse-config';

/** Private Use Areas and related planes likely to glyph as tofu without Nerd Font. */
export function containsPrivateUseOrProblematicPlanes(s: string): boolean {
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i)!;
    if (cp <= 0xffff) {
      i += 1;
    } else {
      i += 2;
    }
    if (cp >= 0xe000 && cp <= 0xf8ff) return true;
    if (cp >= 0xf0000 && cp <= 0xfffff) return true;
    if (cp >= 0x100000 && cp <= 0x10fffd) return true;
  }
  return false;
}

/** Text iconSet: allow ASCII printable so bracket tags work everywhere. */
function isAsciiPrintableIcon(s: string | undefined): boolean {
  if (s === undefined || s === '') return true;
  return /^[\u0020-\u007E]+$/.test(s);
}

const MODULE_KEYS = [
  'model',
  'context',
  'git',
  'cost',
  'duration',
  'workspace',
  'turns',
  'cacheRatio',
  'rateLimits',
  'weeklyQuota',
  'mcpStatus',
  'thinking',
  'outputStyle',
  'thirdPartyApi',
  'accountUsage',
  'toolTimeline'
] as const;

/**
 * After merging user config, drop Nerd/PUA fragments that break non–Nerd Font terminals.
 */
export function sanitizePulseDisplayConfig(config: PulseConfig): void {
  if (containsPrivateUseOrProblematicPlanes(config.separator)) {
    config.separator = DEFAULT_CONFIG.separator;
  }

  if (config.iconSet !== 'text') return;

  const defaults = DEFAULT_CONFIG.modules;
  for (const key of MODULE_KEYS) {
    const mod = config.modules[key] as { icon?: string };
    if (!mod) continue;
    const d = defaults[key] as { icon?: string };
    if (mod.icon !== undefined && !isAsciiPrintableIcon(mod.icon)) {
      mod.icon = d.icon;
    }
  }
}
