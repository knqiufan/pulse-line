export interface OutputStyleSegment {
    text: string;
}
export declare function extractOutputStyle(input: {
    output_style: {
        name: string;
    };
}): OutputStyleSegment | null;
