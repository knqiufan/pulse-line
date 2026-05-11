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
    model: { enabled: true, order: 1, icon: '[模型]' },
    context: {
      enabled: true,
      order: 2,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '[上下文使用率]'
    },
    git: {
      enabled: true,
      order: 3,
      showUpstream: false,
      icon: '[Git 分支]'
    },
    cost: { enabled: false, order: 4, icon: '[费用]' },
    duration: { enabled: false, order: 5, icon: '[时长]' },
    workspace: { enabled: false, order: 6, icon: '[工作区]' },
    turns: { enabled: false, order: 7, icon: '[轮次]' },
    cacheRatio: { enabled: false, order: 8, icon: '[缓存]' },
    rateLimits: { enabled: false, order: 9, icon: '[限速]', showCountdown: true },
    weeklyQuota: { enabled: false, order: 10, icon: '[配额]', showCountdown: true },
    accountUsage: { enabled: true, order: 11, icon: '[账户]', providers: ['zhipu', 'deepseek'] },
    mcpStatus: { enabled: false, order: 12, icon: '[MCP]' },
    thinking: { enabled: false, order: 13, icon: '[思考]' },
    outputStyle: { enabled: false, order: 14, icon: '[风格]' },
    thirdPartyApi: { enabled: false, order: 15, icon: '[API]', providers: [] }
  },
  advanced: {
    cacheEnabled: true,
    cacheTTL: 300,
    gitTimeout: 200,
    debugMode: false,
    customThemePath: null
  }
};
