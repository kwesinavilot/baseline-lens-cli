import * as fs from 'fs';
import * as path from 'path';
import { CLIConfig } from './config';

export interface ProjectInfo {
    framework?: 'react' | 'vue' | 'angular' | 'svelte' | 'vanilla';
    hasTypeScript: boolean;
    hasSass: boolean;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    buildTool?: 'webpack' | 'vite' | 'rollup' | 'parcel';
}

export interface EnvironmentConfig {
    development: Partial<CLIConfig>;
    staging: Partial<CLIConfig>;
    production: Partial<CLIConfig>;
}

export class ConfigManager {
    
    /**
     * Scan project and detect framework/tools
     */
    async detectProject(projectPath: string): Promise<ProjectInfo> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        let packageJson: any = {};
        
        try {
            packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        } catch {
            // No package.json found
        }

        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        return {
            framework: this.detectFramework(dependencies),
            hasTypeScript: this.hasTypeScript(projectPath, dependencies),
            hasSass: this.hasSass(dependencies),
            packageManager: this.detectPackageManager(projectPath),
            buildTool: this.detectBuildTool(dependencies)
        };
    }

    /**
     * Generate optimal configuration based on project
     */
    generateConfig(projectInfo: ProjectInfo): CLIConfig {
        const baseConfig = new CLIConfig();
        const preset = this.getFrameworkPreset(projectInfo.framework);
        
        // Merge base config with framework preset
        const config = { ...baseConfig, ...preset };
        
        // Adjust for TypeScript
        if (projectInfo.hasTypeScript) {
            config.includePatterns.push('**/*.ts', '**/*.tsx');
        }
        
        // Adjust for Sass
        if (projectInfo.hasSass) {
            config.includePatterns.push('**/*.scss', '**/*.sass');
        }
        
        // Adjust for build tool
        if (projectInfo.buildTool) {
            config.excludePatterns.push(...this.getBuildToolExcludes(projectInfo.buildTool));
        }
        
        return config;
    }

    /**
     * Get framework-specific preset
     */
    getFrameworkPreset(framework?: string): Partial<CLIConfig> {
        const presets = {
            react: {
                supportThreshold: 92,
                includePatterns: ['**/*.jsx', '**/*.tsx', '**/*.css', '**/*.module.css'],
                excludePatterns: ['**/build/**', '**/public/**'],
                customBrowserMatrix: ['chrome >= 88', 'firefox >= 85', 'safari >= 14', 'edge >= 88']
            },
            vue: {
                supportThreshold: 90,
                includePatterns: ['**/*.vue', '**/*.js', '**/*.ts', '**/*.css'],
                excludePatterns: ['**/dist/**', '**/public/**'],
                customBrowserMatrix: ['chrome >= 87', 'firefox >= 84', 'safari >= 13.1', 'edge >= 87']
            },
            angular: {
                supportThreshold: 95,
                includePatterns: ['**/*.ts', '**/*.html', '**/*.scss', '**/*.css'],
                excludePatterns: ['**/dist/**', '**/node_modules/**', '**/.angular/**'],
                customBrowserMatrix: ['chrome >= 90', 'firefox >= 88', 'safari >= 14', 'edge >= 90']
            },
            svelte: {
                supportThreshold: 88,
                includePatterns: ['**/*.svelte', '**/*.js', '**/*.ts', '**/*.css'],
                excludePatterns: ['**/build/**', '**/public/**'],
                customBrowserMatrix: ['chrome >= 85', 'firefox >= 82', 'safari >= 13', 'edge >= 85']
            }
        };
        
        return presets[framework as keyof typeof presets] || {};
    }

    /**
     * Generate environment-specific configurations
     */
    generateEnvironmentConfigs(baseConfig: CLIConfig): EnvironmentConfig {
        return {
            development: {
                ...baseConfig,
                supportThreshold: Math.max(baseConfig.supportThreshold - 10, 70),
                failOn: 'low',
                excludePatterns: [...baseConfig.excludePatterns, '**/test/**', '**/*.test.*']
            },
            staging: {
                ...baseConfig,
                supportThreshold: Math.max(baseConfig.supportThreshold - 5, 80),
                failOn: 'medium'
            },
            production: {
                ...baseConfig,
                supportThreshold: Math.min(baseConfig.supportThreshold + 5, 98),
                failOn: 'high'
            }
        };
    }

    private detectFramework(dependencies: Record<string, string>): ProjectInfo['framework'] {
        if (dependencies.react || dependencies['@types/react']) return 'react';
        if (dependencies.vue || dependencies['@vue/cli']) return 'vue';
        if (dependencies['@angular/core']) return 'angular';
        if (dependencies.svelte) return 'svelte';
        return 'vanilla';
    }

    private hasTypeScript(projectPath: string, dependencies: Record<string, string>): boolean {
        return fs.existsSync(path.join(projectPath, 'tsconfig.json')) || 
               !!dependencies.typescript || 
               !!dependencies['@types/node'];
    }

    private hasSass(dependencies: Record<string, string>): boolean {
        return !!dependencies.sass || !!dependencies['node-sass'] || !!dependencies.scss;
    }

    private detectPackageManager(projectPath: string): ProjectInfo['packageManager'] {
        if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
        if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
        return 'npm';
    }

    private detectBuildTool(dependencies: Record<string, string>): ProjectInfo['buildTool'] {
        if (dependencies.vite || dependencies['@vitejs/plugin-react']) return 'vite';
        if (dependencies.webpack || dependencies['webpack-cli']) return 'webpack';
        if (dependencies.rollup) return 'rollup';
        if (dependencies.parcel) return 'parcel';
        return undefined;
    }

    private getBuildToolExcludes(buildTool: string): string[] {
        const excludes = {
            webpack: ['**/dist/**', '**/build/**'],
            vite: ['**/dist/**', '**/build/**'],
            rollup: ['**/dist/**', '**/build/**'],
            parcel: ['**/dist/**', '**/.parcel-cache/**']
        };
        
        return excludes[buildTool as keyof typeof excludes] || [];
    }
}