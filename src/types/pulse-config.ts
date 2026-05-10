// src/types/pulse-config.ts

export interface PulseConfig {
  theme: string;
  separator: string;
  padding: number;
  refreshInterval: number;
  iconSet: 'nerd' | 'text';
  /** Bumped when a one-time default migration applies (omit in older files). */
  schemaVersion?: number;
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
    accountUsage: AccountUsageModuleConfig;
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

export interface AccountUsageModuleConfig extends ModuleConfig {
  providers?: string[];
}

export const DEFAULT_CONFIG: PulseConfig = {
  theme: 'dark',
  separator: ' \u2502 ',
  padding: 1,
  refreshInterval: 5,
  iconSet: 'text',
  schemaVersion: 3,
  modules: {
    model: { enabled: true, order: 1, icon: '[M]' },
    context: {
      enabled: true,
      order: 2,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '[C]'
    },
    git: {
      enabled: true,
      order: 3,
      showUpstream: false,
      icon: '[G]'
    },
    cost: { enabled: true, order: 4, icon: '[$]' },
    duration: { enabled: false, order: 5, icon: '[T]' },
    workspace: { enabled: false, order: 6, icon: '[W]' },
    turns: { enabled: false, order: 7, icon: '[N]' },
    cacheRatio: { enabled: false, order: 8, icon: '[R]' },
    rateLimits: { enabled: false, order: 9, icon: '[L]', showCountdown: true },
    weeklyQuota: { enabled: false, order: 10, icon: '[Q]', showCountdown: true },
    accountUsage: { enabled: true, order: 11, icon: '[A]', providers: ['zhipu', 'deepseek'] },
    mcpStatus: { enabled: false, order: 12, icon: '[P]' },
    thinking: { enabled: false, order: 13, icon: '[Think]' },
    outputStyle: { enabled: false, order: 14, icon: '[S]' },
    thirdPartyApi: { enabled: false, order: 15, icon: '[L]', providers: [] }
  },
  advanced: {
    cacheEnabled: true,
    cacheTTL: 300,
    gitTimeout: 200,
    debugMode: false,
    customThemePath: null
  }
};
