// src/types/pulse-config.ts

export type Language = 'zh' | 'en';

export interface PulseConfig {
  theme: string;
  separator: string;
  padding: number;
  maxPerLine?: number;
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
    toolTimeline: ToolTimelineModuleConfig;
    rules: RulesModuleConfig;
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

export interface ToolTimelineModuleConfig extends ModuleConfig {
  displayMode?: 'analytics-panel' | 'timeline-panel' | 'summary' | 'compact-list';
  mode?: 'summary' | 'compact-list';
  maxEvents?: number;
  maxDisplayEvents?: number;
  panelWidth?: number;
  showRecent?: boolean;
  showTokenStats?: boolean;
  showAgentStats?: boolean;
  showSuccessRate?: boolean;
  slowThresholdMs?: number;
  showFailures?: boolean;
  showAverage?: boolean;
  showSlowest?: boolean;
  summaryMaxLength?: number;
}

export interface RulesModuleConfig extends ModuleConfig {
  includePatterns?: string[];
  excludePatterns?: string[];
}

export const DEFAULT_CONFIG: PulseConfig = {
  theme: 'dark',
  separator: ' │ ',
  padding: 1,
  maxPerLine: 5,
  refreshInterval: 5,
  iconSet: 'text',
  language: 'en',
  schemaVersion: 7,
  modules: {
    model: { enabled: true, order: 1, icon: '[M]' },
    git: {
      enabled: true,
      order: 2,
      showUpstream: false,
      icon: '[G]'
    },
    workspace: { enabled: true, order: 3, icon: '[W]' },
    context: {
      enabled: true,
      order: 4,
      showBar: true,
      showTokens: false,
      barWidth: 12,
      icon: '[C]'
    },
    cacheRatio: { enabled: true, order: 5, icon: '[R]' },
    mcpStatus: { enabled: true, order: 6, icon: '[MCP]' },
    accountUsage: { enabled: true, order: 7, icon: '[A]', providers: ['zhipu', 'deepseek'] },
    turns: { enabled: true, order: 8, icon: '[N]' },
    thinking: { enabled: true, order: 9, icon: '[Think]' },
    cost: { enabled: false, order: 10, icon: '[$]' },
    duration: { enabled: false, order: 11, icon: '[T]' },
    rateLimits: { enabled: false, order: 12, icon: '[L]', showCountdown: true },
    weeklyQuota: { enabled: false, order: 13, icon: '[Q]', showCountdown: true },
    outputStyle: { enabled: false, order: 14, icon: '[S]' },
    thirdPartyApi: { enabled: false, order: 15, icon: '[API]', providers: [] },
    rules: {
      enabled: true,
      order: 16,
      icon: '[Rules]',
      includePatterns: [],
      excludePatterns: []
    },
    toolTimeline: {
      enabled: false,
      order: 17,
      icon: '[工具]',
      displayMode: 'analytics-panel',
      mode: 'summary',
      maxEvents: 100,
      maxDisplayEvents: 5,
      panelWidth: 59,
      showRecent: true,
      showTokenStats: true,
      showAgentStats: true,
      showSuccessRate: true,
      slowThresholdMs: 3000,
      showFailures: true,
      showAverage: true,
      showSlowest: true,
      summaryMaxLength: 80
    }
  },
  advanced: {
    cacheEnabled: true,
    cacheTTL: 300,
    gitTimeout: 200,
    debugMode: false,
    customThemePath: null
  }
};
