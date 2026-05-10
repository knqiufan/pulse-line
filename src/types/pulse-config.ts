// src/types/pulse-config.ts

export interface PulseConfig {
  theme: string;
  separator: string;
  padding: number;
  refreshInterval: number;
  iconSet: 'nerd' | 'text';
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
  separator: ' │ ',
  padding: 1,
  refreshInterval: 5,
  iconSet: 'nerd',
  modules: {
    model: { enabled: true, order: 1, icon: '🧠' },
    context: {
      enabled: true,
      order: 2,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '\u{F0085}'
    },
    git: {
      enabled: true,
      order: 3,
      showUpstream: false,
      icon: '\u{F0080}'
    },
    cost: { enabled: true, order: 4, icon: '\u{F002A}' },
    duration: { enabled: false, order: 5, icon: '\u{F0019}' },
    workspace: { enabled: false, order: 6, icon: '\u{F003B}' },
    turns: { enabled: false, order: 7, icon: '\u{F0014}' },
    cacheRatio: { enabled: false, order: 8, icon: '\u{F00D2}' },
    rateLimits: { enabled: false, order: 9, icon: '\u{F000B}', showCountdown: true },
    weeklyQuota: { enabled: false, order: 10, icon: '\u{F0030}', showCountdown: true },
    accountUsage: { enabled: true, order: 11, icon: '\u{F00E6}', providers: ['zhipu', 'deepseek', 'minimax'] },
    mcpStatus: { enabled: false, order: 12, icon: '\u{F00E6}' },
    thinking: { enabled: false, order: 13, icon: '\u{F00B2}' },
    outputStyle: { enabled: false, order: 14, icon: '\u{F003A}' },
    thirdPartyApi: { enabled: false, order: 15, icon: '\u{F00E6}', providers: [] }
  },
  advanced: {
    cacheEnabled: true,
    cacheTTL: 300,
    gitTimeout: 200,
    debugMode: false,
    customThemePath: null
  }
};
