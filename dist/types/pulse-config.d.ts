export interface PulseConfig {
    theme: string;
    separator: string;
    padding: number;
    refreshInterval: number;
    modules: {
        model: ModuleConfig;
        context: ContextModuleConfig;
        git: GitModuleConfig;
        cost: ModuleConfig;
        duration: ModuleConfig;
        workspace: ModuleConfig;
        turns: ModuleConfig;
        cacheRatio: ModuleConfig;
        rateLimits: RateLimitModuleConfig;
        weeklyQuota: RateLimitModuleConfig;
        mcpStatus: ModuleConfig;
        thinking: ModuleConfig;
        outputStyle: ModuleConfig;
        thirdPartyApi: ThirdPartyApiConfig;
    };
    advanced: {
        cacheEnabled: boolean;
        cacheTTL: number;
        gitTimeout: number;
        debugMode: boolean;
        customThemePath: string | null;
    };
}
export interface ModuleConfig {
    enabled: boolean;
    order: number;
    icon?: string;
}
export interface ContextModuleConfig extends ModuleConfig {
    showBar?: boolean;
    showTokens?: boolean;
    barWidth?: number;
}
export interface GitModuleConfig extends ModuleConfig {
    showUpstream?: boolean;
}
export interface RateLimitModuleConfig extends ModuleConfig {
    showCountdown?: boolean;
}
export interface ThirdPartyApiConfig extends ModuleConfig {
    providers?: string[];
}
export declare const DEFAULT_CONFIG: PulseConfig;
