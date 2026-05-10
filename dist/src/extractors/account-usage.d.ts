import type { AccountUsageModuleConfig } from '../types/pulse-config';
export interface AccountUsageResult {
    provider: string;
    text: string;
    fg: string;
    icon: string;
}
export declare function extractAccountUsageSync(config: AccountUsageModuleConfig, theme: any): AccountUsageResult[];
export declare function refreshAccountUsage(config: AccountUsageModuleConfig, theme: any, timeout?: number): Promise<void>;
