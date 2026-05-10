"use strict";
// src/utils/git.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitInfo = getGitInfo;
exports.isGitRepository = isGitRepository;
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
function getGitInfo(cwd, timeout = 200) {
    try {
        const branch = (0, child_process_1.execSync)('git branch --show-current', {
            cwd,
            timeout,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        if (!branch) {
            return { branch: null, ahead: 0, behind: 0 };
        }
        let ahead = 0;
        let behind = 0;
        try {
            const revList = (0, child_process_1.execSync)('git rev-list --left-right --count @{upstream}...HEAD', {
                cwd,
                timeout,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            const [behindStr, aheadStr] = revList.trim().split('\t');
            behind = parseInt(behindStr, 10) || 0;
            ahead = parseInt(aheadStr, 10) || 0;
        }
        catch {
            // No upstream set, ignore
        }
        (0, logger_1.debug)(`Git branch: ${branch}, ahead: ${ahead}, behind: ${behind}`);
        return { branch, ahead, behind };
    }
    catch (err) {
        (0, logger_1.debug)('Git command failed:', err);
        return { branch: null, ahead: 0, behind: 0 };
    }
}
function isGitRepository(cwd) {
    try {
        (0, child_process_1.execSync)('git rev-parse --git-dir', {
            cwd,
            timeout: 100,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=git.js.map