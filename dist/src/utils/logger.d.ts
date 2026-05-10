export declare function debug(...args: any[]): void;
export declare function measure<T>(label: string, fn: () => T): T;
export declare function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
export interface TimingInfo {
    [key: string]: number;
}
export declare function startTiming(label: string): void;
export declare function endTiming(label: string): number;
export declare function reportTimings(): void;
