import type { PulseConfig } from '../types/pulse-config';
export declare function loadConfig(): PulseConfig;
export declare function saveConfig(config: PulseConfig): void;
export declare function getConfigPath(): string;
export declare function getPulseDir(): string;
export declare function validateConfig(config: PulseConfig): string[];
