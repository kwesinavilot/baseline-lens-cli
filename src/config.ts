import * as fs from 'fs';
import * as path from 'path';

export interface CLIAnalysisOptions {
    path?: string;
    config?: string;
    output?: string;
    format?: string;
    failOn?: string;
    threshold?: string;
    include?: string;
    exclude?: string;
    silent?: boolean;
    verbose?: boolean;
}

export interface CLIConfigData {
    supportThreshold: number;
    customBrowserMatrix: string[];
    excludePatterns: string[];
    includePatterns: string[];
    baselineStatusMapping: {
        widely_available: 'error' | 'warning' | 'info' | 'none';
        newly_available: 'error' | 'warning' | 'info' | 'none';
        limited_availability: 'error' | 'warning' | 'info' | 'none';
    };
    enabledAnalyzers: {
        css: boolean;
        javascript: boolean;
        html: boolean;
    };
    maxFileSize: number;
    analysisTimeout: number;
    failOn: 'high' | 'medium' | 'low';
    outputFormat: 'json' | 'markdown' | 'junit';
    cicd: {
        github: {
            enabled: boolean;
            workflowName: string;
            triggers: string[];
        };
        gitlab: {
            enabled: boolean;
            jobName: string;
            stage: string;
        };
        azure: {
            enabled: boolean;
            taskName: string;
        };
        jenkins: {
            enabled: boolean;
            stageName: string;
        };
    };
}

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class CLIConfig implements CLIConfigData {
    supportThreshold: number = 90;
    customBrowserMatrix: string[] = [];
    excludePatterns: string[] = [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.git/**'
    ];
    includePatterns: string[] = [];
    baselineStatusMapping = {
        widely_available: 'info' as const,
        newly_available: 'warning' as const,
        limited_availability: 'error' as const
    };
    enabledAnalyzers = {
        css: true,
        javascript: true,
        html: true
    };
    maxFileSize: number = 10 * 1024 * 1024; // 10MB
    analysisTimeout: number = 5000; // 5 seconds
    failOn: 'high' | 'medium' | 'low' = 'high';
    outputFormat: 'json' | 'markdown' | 'junit' = 'json';
    cicd = {
        github: {
            enabled: false,
            workflowName: 'baseline-lens',
            triggers: ['push', 'pull_request']
        },
        gitlab: {
            enabled: false,
            jobName: 'baseline-lens',
            stage: 'test'
        },
        azure: {
            enabled: false,
            taskName: 'BaselineLensAnalysis'
        },
        jenkins: {
            enabled: false,
            stageName: 'Baseline Analysis'
        }
    };

    /**
     * Load configuration from file and command line options
     */
    static async load(configPath?: string, options: CLIAnalysisOptions = {}): Promise<CLIConfig> {
        const config = new CLIConfig();

        // Load from configuration file
        if (configPath || fs.existsSync('.baseline-lens.json')) {
            const filePath = configPath || '.baseline-lens.json';
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                
                // Validate JSON before parsing
                if (!fileContent.trim()) {
                    throw new Error('Configuration file is empty');
                }
                
                let fileConfig;
                try {
                    fileConfig = JSON.parse(fileContent);
                } catch (jsonError) {
                    throw new Error(`Invalid JSON syntax: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
                }
                
                if (typeof fileConfig !== 'object' || fileConfig === null) {
                    throw new Error('Configuration must be a JSON object');
                }
                
                Object.assign(config, fileConfig);
            } catch (error) {
                if ((error as any).code === 'ENOENT') {
                    throw new Error(`Configuration file not found: ${filePath}`);
                }
                if ((error as any).code === 'EACCES') {
                    throw new Error(`Permission denied reading configuration: ${filePath}`);
                }
                throw new Error(`Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Override with command line options
        if (options.threshold) {
            config.supportThreshold = parseInt(options.threshold);
        }

        if (options.failOn) {
            config.failOn = options.failOn as 'high' | 'medium' | 'low';
        }

        if (options.format) {
            config.outputFormat = options.format as 'json' | 'markdown' | 'junit';
        }

        if (options.include) {
            config.includePatterns = options.include.split(',').map(p => p.trim());
        }

        if (options.exclude) {
            config.excludePatterns.push(...options.exclude.split(',').map(p => p.trim()));
        }

        return config;
    }

    /**
     * Save configuration to file
     */
    save(filePath: string = '.baseline-lens.json'): void {
        const configData = {
            supportThreshold: this.supportThreshold,
            customBrowserMatrix: this.customBrowserMatrix,
            excludePatterns: this.excludePatterns,
            includePatterns: this.includePatterns,
            baselineStatusMapping: this.baselineStatusMapping,
            enabledAnalyzers: this.enabledAnalyzers,
            maxFileSize: this.maxFileSize,
            analysisTimeout: this.analysisTimeout,
            failOn: this.failOn,
            outputFormat: this.outputFormat,
            cicd: this.cicd
        };

        fs.writeFileSync(filePath, JSON.stringify(configData, null, 2));
    }

    /**
     * Validate configuration
     */
    static validate(config: CLIConfig): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate support threshold
        if (config.supportThreshold < 0 || config.supportThreshold > 100) {
            errors.push('supportThreshold must be between 0 and 100');
        }

        // Validate max file size
        if (config.maxFileSize < 1024) {
            errors.push('maxFileSize must be at least 1024 bytes (1KB)');
        }

        // Validate analysis timeout
        if (config.analysisTimeout < 1000) {
            errors.push('analysisTimeout must be at least 1000ms (1 second)');
        }

        // Validate fail on level
        if (!['high', 'medium', 'low'].includes(config.failOn)) {
            errors.push('failOn must be one of: high, medium, low');
        }

        // Validate output format
        if (!['json', 'markdown', 'junit'].includes(config.outputFormat)) {
            errors.push('outputFormat must be one of: json, markdown, junit');
        }

        // Validate baseline status mapping
        const validSeverities = ['error', 'warning', 'info', 'none'];
        for (const [status, severity] of Object.entries(config.baselineStatusMapping)) {
            if (!validSeverities.includes(severity)) {
                errors.push(`baselineStatusMapping.${status} must be one of: ${validSeverities.join(', ')}`);
            }
        }

        // Validate enabled analyzers
        if (!config.enabledAnalyzers.css && !config.enabledAnalyzers.javascript && !config.enabledAnalyzers.html) {
            warnings.push('All analyzers are disabled - no analysis will be performed');
        }

        // Validate browser matrix format
        for (const browser of config.customBrowserMatrix) {
            if (!browser.includes('>=') && !browser.includes('>') && !browser.includes('=')) {
                warnings.push(`Browser matrix entry "${browser}" may not be in correct format (e.g., "chrome >= 90")`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get default configuration
     */
    static getDefault(): CLIConfig {
        return new CLIConfig();
    }

    /**
     * Merge with another configuration
     */
    merge(other: Partial<CLIConfigData>): CLIConfig {
        const merged = new CLIConfig();
        Object.assign(merged, this, other);
        return merged;
    }

    /**
     * Export configuration for team sharing
     */
    exportTeamConfig(): string {
        const teamConfig = {
            supportThreshold: this.supportThreshold,
            customBrowserMatrix: this.customBrowserMatrix,
            excludePatterns: this.excludePatterns,
            baselineStatusMapping: this.baselineStatusMapping,
            enabledAnalyzers: this.enabledAnalyzers,
            maxFileSize: this.maxFileSize,
            analysisTimeout: this.analysisTimeout
        };

        return JSON.stringify(teamConfig, null, 2);
    }

    /**
     * Import team configuration
     */
    static importTeamConfig(configContent: string): CLIConfig {
        const config = new CLIConfig();
        const teamConfig = JSON.parse(configContent);
        Object.assign(config, teamConfig);
        return config;
    }
}