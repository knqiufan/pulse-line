// src/utils/constants.ts

import * as os from 'os';
import * as path from 'path';

export const PULSE_DIR = path.join(os.homedir(), '.claude', 'pulse');
export const CONFIG_PATH = path.join(PULSE_DIR, 'config.json');
export const API_KEYS_PATH = path.join(PULSE_DIR, 'api-keys.json');
export const CACHE_DIR = path.join(PULSE_DIR, 'cache');
