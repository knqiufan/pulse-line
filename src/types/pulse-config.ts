// src/types/pulse-config.ts

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

export const DEFAULT_CONFIG: PulseConfig = {
  theme: 'dark',
  separator: ' │ ',
  padding: 1,
  refreshInterval: 5,
  modules: {
    model: { enabled: true, order: 1, icon: '🧠' },
    context: {
      enabled: true,
      order: 2,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '📊'
    },
    git: {
      enabled: true,
      order: 3,
      showUpstream: false,
      icon: '🌿'
    },
    cost: { enabled: true, order: 4, icon: '💰' },
    duration: { enabled: false, order: 5, icon: '⏱️' },
    workspace: { enabled: false, order: 6, icon: '📁' },
    turns: { enabled: false, order: 7, icon: '💬' },
    cacheRatio: { enabled: false, order: 8, icon: '📦' },
    rateLimits: { enabled: false, order: 9, icon: '⚡', showCountdown: true },
    weeklyQuota: { enabled: false, order: 10, icon: '📅', showCountdown: true },
    mcpStatus: { enabled: false, order: 11, icon: '🔌' },
    thinking: { enabled: false, order: 12, icon: '🤔' },
    outputStyle: { enabled: false, order: 13, icon: '📝' },
    thirdPartyApi: { enabled: false, order: 14, icon: '🔗', providers: [] }
  },
  advanced: {
    cacheEnabled: true,
    cacheTTL: 300,
    gitTimeout: 200,
    debugMode: false,
    customThemePath: null
  }
};
