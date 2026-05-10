export interface Theme {
    meta: {
        name: string;
        author: string;
        version: string;
        description: string;
    };
    separator: {
        left: string;
        right: string;
        color: string;
    };
    colors: {
        background: string;
        primary: string;
        accent: string;
        success: string;
        warning: string;
        error: string;
        info: string;
        muted: string;
        dim: string;
    };
    components: {
        model: ComponentStyle;
        context: ComponentStyle;
        contextBar: ComponentStyle;
        git: ComponentStyle;
        cost: ComponentStyle;
        duration: ComponentStyle;
        workspace: ComponentStyle;
        turns: ComponentStyle;
        cacheRatio: ComponentStyle;
        rateLimit: ComponentStyle;
        weeklyQuota: ComponentStyle;
        mcpStatus: ComponentStyle;
        thinking: ComponentStyle;
        outputStyle: ComponentStyle;
        accountUsage: ComponentStyle;
        separator: ComponentStyle;
    };
}
export interface ComponentStyle {
    fg: string;
    bg?: string;
    bold?: boolean;
    dim?: boolean;
    icon: string;
    showIcon?: boolean;
}
