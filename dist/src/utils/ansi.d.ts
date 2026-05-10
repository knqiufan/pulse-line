export declare function ansiColor(hex: string): string;
export declare function ansiColor256(hex: string): string;
export declare const ANSI_RESET = "\u001B[0m";
export declare const ANSI_BOLD = "\u001B[1m";
export declare const ANSI_DIM = "\u001B[2m";
export declare function colorize(hex: string, text: string, bold?: boolean, dim?: boolean): string;
