"use strict";
// src/extractors/git.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGit = extractGit;
const git_1 = require("../utils/git");
const cache_1 = require("../utils/cache");
function extractGit(cwd, sessionId, theme) {
    if (!(0, git_1.isGitRepository)(cwd))
        return null;
    const cached = (0, cache_1.loadSessionCache)(sessionId, 'git');
    let gitInfo;
    if (cached) {
        gitInfo = cached;
    }
    else {
        gitInfo = (0, git_1.getGitInfo)(cwd);
        (0, cache_1.saveSessionCache)(sessionId, 'git', gitInfo, 30 * 1000); // 30 sec TTL for branch
    }
    return renderGit(gitInfo, theme);
}
function renderGit(info, theme) {
    if (!info.branch)
        return null;
    let text = `🌿 ${info.branch}`;
    if (info.ahead > 0 || info.behind > 0) {
        text += ` ↑${info.ahead} ↓${info.behind}`;
    }
    return {
        text,
        fg: theme.components.git.fg
    };
}
//# sourceMappingURL=git.js.map