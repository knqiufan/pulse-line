export declare class TTLCache<T> {
    private cache;
    get(key: string): T | null;
    set(key: string, value: T, ttl: number): void;
    has(key: string): boolean;
    clear(): void;
}
export declare function getSessionCachePath(sessionId: string): string;
export declare function loadSessionCache<T>(sessionId: string, key: string): T | null;
export declare function saveSessionCache<T>(sessionId: string, key: string, value: T, ttl: number): void;
