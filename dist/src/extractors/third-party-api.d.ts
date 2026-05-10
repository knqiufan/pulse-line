interface ApiUsageResult {
    provider: string;
    text: string;
    fg: string;
    icon: string;
}
export type { ApiUsageResult };
export declare function extractThirdPartyApi(providers: string[], theme: any, timeout?: number): Promise<ApiUsageResult[]>;
export declare function createDefaultApiKeysConfig(): void;
