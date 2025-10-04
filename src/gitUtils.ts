import { execSync } from 'child_process';
import * as fs from 'fs';

export class GitUtils {
    
    /**
     * Get changed files in current branch vs base branch
     */
    static getChangedFiles(baseBranch: string = 'main'): string[] {
        try {
            const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, { encoding: 'utf8' });
            return output.trim().split('\n').filter(file => file && fs.existsSync(file));
        } catch {
            return [];
        }
    }

    /**
     * Get changed files in PR/MR (staged + unstaged)
     */
    static getUncommittedFiles(): string[] {
        try {
            const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
            const unstaged = execSync('git diff --name-only', { encoding: 'utf8' });
            
            const files = [...staged.trim().split('\n'), ...unstaged.trim().split('\n')]
                .filter(file => file && fs.existsSync(file));
            
            return [...new Set(files)]; // Remove duplicates
        } catch {
            return [];
        }
    }

    /**
     * Check if running in CI environment
     */
    static isCI(): boolean {
        return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI);
    }

    /**
     * Get current branch name
     */
    static getCurrentBranch(): string {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        } catch {
            return 'unknown';
        }
    }
}