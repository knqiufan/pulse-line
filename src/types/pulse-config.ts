// src/types/pulse-config.ts

export type Language = 'zh' | 'en';

export interface PulseConfig {
  theme: string;
  separator: string;
  padding: number;
  refreshInterval: number;
  iconSet: 'nerd' | 'text';
  language: Language;
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
  separator: ' │ ',
  padding: 1,
  refreshInterval: 5,
  iconSet: 'text',
  language: 'en',
  schemaVersion: 4,
  modules: {
    model: { enabled: true, order: 1, icon: '[当前模型]' },
    git: {
      enabled: true,
      order: 2,
      showUpstream: false,
      icon: '[Git 分支]'
    },
    workspace: { enabled: true, order: 3, icon: '[工作区]' },
    context: {
      enabled: true,
      order: 4,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '[上下文使用率]'
    },
    cacheRatio: { enabled: true, order: 5, icon: '[缓存]' },
    mcpStatus: { enabled: true, order: 6, icon: '[MCP]' },
    accountUsage: { enabled: true, order: 7, icon: '[账户]', providers: ['zhipu', 'deepseek'] },
    turns: { enabled: true, order: 8, icon: '[轮次]' },
    thinking: { enabled: true, order: 9, icon: '[思考]' },
    cost: { enabled: false, order: 10, icon: '[费用]' },
    duration: { enabled: false, order: 11, icon: '[时长]' },
    rateLimits: { enabled: false, order: 12, icon: '[限速]', showCountdown: true },
    weeklyQuota: { enabled: false, order: 13, icon: '[配额]', showCountdown: true },
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
