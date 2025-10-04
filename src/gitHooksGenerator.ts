import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface GitHookOptions {
    type: 'pre-commit' | 'pre-push' | 'commit-msg';
    failOn: string;
    threshold: string;
    changedOnly: boolean;
}

export class GitHooksGenerator {
    
    /**
     * Generate git hook script
     */
    generateHook(options: GitHookOptions): string {
        switch (options.type) {
            case 'pre-commit':
                return this.generatePreCommitHook(options);
            case 'pre-push':
                return this.generatePrePushHook(options);
            case 'commit-msg':
                return this.generateCommitMsgHook();
            default:
                throw new Error(`Unsupported hook type: ${options.type}`);
        }
    }

    /**
     * Install git hook
     */
    async installHook(hookType: string, content: string): Promise<string> {
        const gitDir = this.findGitDirectory();
        const hookPath = path.join(gitDir, 'hooks', hookType);
        
        // Check if hook already exists
        if (fs.existsSync(hookPath)) {
            const existing = fs.readFileSync(hookPath, 'utf8');
            if (existing.includes('baseline-lens-cli')) {
                throw new Error(`Baseline Lens hook already exists in ${hookType}`);
            }
            // Append to existing hook
            const updatedContent = existing + '\n\n' + this.addHookComment() + content;
            fs.writeFileSync(hookPath, updatedContent);
        } else {
            // Create new hook
            const fullContent = this.getShebang() + this.addHookComment() + content;
            fs.writeFileSync(hookPath, fullContent);
        }
        
        // Make executable
        fs.chmodSync(hookPath, 0o755);
        
        return hookPath;
    }

    /**
     * Generate pre-commit hook
     */
    private generatePreCommitHook(options: GitHookOptions): string {
        const changedOnlyFlag = options.changedOnly ? ' --changed-only' : '';
        
        return `
# Baseline Lens compatibility check
echo "🔍 Running Baseline Lens compatibility check..."

if command -v baseline-lens-cli >/dev/null 2>&1; then
    baseline-lens-cli analyze${changedOnlyFlag} \\
        --fail-on ${options.failOn} \\
        --threshold ${options.threshold} \\
        --silent
    
    if [ $? -ne 0 ]; then
        echo "❌ Compatibility check failed. Commit blocked."
        echo "💡 Run 'baseline-lens-cli analyze${changedOnlyFlag}' to see details"
        exit 1
    fi
    
    echo "✅ Compatibility check passed"
else
    echo "⚠️  baseline-lens-cli not found, skipping compatibility check"
fi
`;
    }

    /**
     * Generate pre-push hook
     */
    private generatePrePushHook(options: GitHookOptions): string {
        return `
# Baseline Lens compatibility check before push
echo "🔍 Running Baseline Lens compatibility check before push..."

if command -v baseline-lens-cli >/dev/null 2>&1; then
    baseline-lens-cli analyze \\
        --fail-on ${options.failOn} \\
        --threshold ${options.threshold} \\
        --changed-only \\
        --base-branch origin/main \\
        --silent
    
    if [ $? -ne 0 ]; then
        echo "❌ Compatibility check failed. Push blocked."
        echo "💡 Run 'baseline-lens-cli analyze --changed-only' to see details"
        exit 1
    fi
    
    echo "✅ Compatibility check passed"
else
    echo "⚠️  baseline-lens-cli not found, skipping compatibility check"
fi
`;
    }

    /**
     * Generate commit-msg hook for conventional commits
     */
    private generateCommitMsgHook(): string {
        return `
# Add compatibility info to commit message
if command -v baseline-lens-cli >/dev/null 2>&1; then
    # Get compatibility summary
    COMPAT_SUMMARY=$(baseline-lens-cli analyze --changed-only --format json --silent 2>/dev/null | jq -r '.summary | "\\(.widelyAvailable)✅ \\(.newlyAvailable)⚠️ \\(.limitedAvailability)🚫"' 2>/dev/null)
    
    if [ ! -z "$COMPAT_SUMMARY" ] && [ "$COMPAT_SUMMARY" != "null" ]; then
        echo "" >> "$1"
        echo "Compatibility: $COMPAT_SUMMARY" >> "$1"
    fi
fi
`;
    }

    /**
     * Find git directory
     */
    private findGitDirectory(): string {
        try {
            const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
            return path.resolve(gitDir);
        } catch {
            throw new Error('Not a git repository');
        }
    }

    /**
     * Get shell shebang
     */
    private getShebang(): string {
        return '#!/bin/sh\n';
    }

    /**
     * Add hook identification comment
     */
    private addHookComment(): string {
        return '\n# === Baseline Lens Hook (auto-generated) ===\n';
    }

    /**
     * Remove Baseline Lens hooks
     */
    async removeHooks(): Promise<string[]> {
        const gitDir = this.findGitDirectory();
        const hooksDir = path.join(gitDir, 'hooks');
        const removedHooks: string[] = [];
        
        const hookTypes = ['pre-commit', 'pre-push', 'commit-msg'];
        
        for (const hookType of hookTypes) {
            const hookPath = path.join(hooksDir, hookType);
            
            if (fs.existsSync(hookPath)) {
                const content = fs.readFileSync(hookPath, 'utf8');
                
                if (content.includes('Baseline Lens Hook')) {
                    // Remove our section
                    const lines = content.split('\n');
                    const startIdx = lines.findIndex(line => line.includes('=== Baseline Lens Hook'));
                    
                    if (startIdx !== -1) {
                        // Find end of our section (next shebang or end of file)
                        let endIdx = lines.length;
                        for (let i = startIdx + 1; i < lines.length; i++) {
                            if (lines[i].startsWith('#!') || lines[i].includes('=== ')) {
                                endIdx = i;
                                break;
                            }
                        }
                        
                        // Remove our section
                        lines.splice(startIdx, endIdx - startIdx);
                        const newContent = lines.join('\n').trim();
                        
                        if (newContent === '#!/bin/sh' || newContent === '') {
                            // Remove entire file if only shebang left
                            fs.unlinkSync(hookPath);
                        } else {
                            fs.writeFileSync(hookPath, newContent);
                        }
                        
                        removedHooks.push(hookType);
                    }
                }
            }
        }
        
        return removedHooks;
    }
}