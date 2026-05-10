// src/themes/icon-provider.ts

import { nerdIconSet } from './icon-sets/nerd';
import { textIconSet } from './icon-sets/text';
import type { IconSet } from './icon-sets/nerd';

export function getIconSet(iconSetType: 'nerd' | 'text'): IconSet {
  return iconSetType === 'nerd' ? nerdIconSet : textIconSet;
}
