export declare function fileExists(filePath: string): boolean;
export declare function readJsonFile<T>(filePath: string): T | null;
export declare function writeJsonFile(filePath: string, data: any): boolean;
export declare function getHomeDir(): string;
export declare function joinPath(...segments: string[]): string;
