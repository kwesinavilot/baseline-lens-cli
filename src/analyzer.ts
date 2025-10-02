import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { DetectedFeature, BaselineStatus, WebFeatureDetails, AnalysisError } from './types';
import { CompatibilityDataService } from './services/compatibilityService';
import { CLICSSAnalyzer, CLIJavaScriptAnalyzer, CLIHTMLAnalyzer } from './cliAnalyzers';
import { CLIConfig, CLIAnalysisOptions } from './cliConfig';

export interface CLIAnalysisResult {
    totalFiles: number;
    analyzedFiles: number;
    features: DetectedFeature[];
    errors: AnalysisError[];
    summary: {
        widelyAvailable: number;
        newlyAvailable: number;
        limitedAvailability: number;
    };
    riskDistribution: {
        low: number;
        medium: number;
        high: number;
    };
    fileTypeBreakdown: {
        [fileType: string]: number;
    };
}

export interface FeatureListOptions {
    type?: string;
    status?: string;
    limit?: number;
}

export class CLIAnalyzer {
    private compatibilityService: CompatibilityDataService;
    private cssAnalyzer: CLICSSAnalyzer;
    private jsAnalyzer: CLIJavaScriptAnalyzer;
    private htmlAnalyzer: CLIHTMLAnalyzer;
    private config: CLIConfig;

    constructor(config?: CLIConfig) {
        this.config = config || new CLIConfig();
        this.compatibilityService = new CompatibilityDataService();
        this.cssAnalyzer = new CLICSSAnalyzer(this.compatibilityService);
        this.jsAnalyzer = new CLIJavaScriptAnalyzer(this.compatibilityService);
        this.htmlAnalyzer = new CLIHTMLAnalyzer(this.compatibilityService);
    }

    /**
     * Initialize the analyzer by loading compatibility data
     */
    async initialize(): Promise<void> {
        await this.compatibilityService.initialize();
    }

    /**
     * Analyze a project directory for web feature compatibility
     */
    async analyzeProject(projectPath: string, progressCallback?: (progress: number, message: string) => void): Promise<CLIAnalysisResult> {
        await this.initialize();

        const files = await this.findSupportedFiles(projectPath);
        const allFeatures: DetectedFeature[] = [];
        const errors: AnalysisError[] = [];
        let analyzedFiles = 0;

        console.log(`Found ${files.length} files to analyze...`);
        progressCallback?.(0, `Starting analysis of ${files.length} files...`);

        for (let i = 0; i < files.length; i++) {
            const filePath = files[i];
            const progress = Math.round((i / files.length) * 100);
            progressCallback?.(progress, `Analyzing ${path.basename(filePath)}...`);
            
            try {
                const features = await this.analyzeFile(filePath);
                if (features.length > 0) {
                    allFeatures.push(...features);
                    analyzedFiles++;
                }
            } catch (error) {
                errors.push({
                    file: filePath,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        
        progressCallback?.(100, 'Analysis complete');

        // Generate summary statistics
        const summary = this.generateSummary(allFeatures);
        const riskDistribution = this.calculateRiskDistribution(allFeatures);
        const fileTypeBreakdown = this.calculateFileTypeBreakdown(allFeatures);

        return {
            totalFiles: files.length,
            analyzedFiles,
            features: allFeatures,
            errors,
            summary,
            riskDistribution,
            fileTypeBreakdown
        };
    }

    /**
     * Analyze a single file for web features
     */
    async analyzeFile(filePath: string): Promise<DetectedFeature[]> {
        let content: string;
        let extension: string;
        
        try {
            // Validate file exists and size
            const stats = fs.statSync(filePath);
            if (stats.size > this.config.maxFileSize) {
                throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
            }
            if (stats.size === 0) {
                return []; // Skip empty files
            }

            content = fs.readFileSync(filePath, 'utf8');
            extension = path.extname(filePath).toLowerCase();
        } catch (error) {
            if (error instanceof Error) {
                if ((error as any).code === 'ENOENT') {
                    throw new Error(`File not found: ${filePath}`);
                }
                if ((error as any).code === 'EACCES') {
                    throw new Error(`Permission denied: ${filePath}`);
                }
                if (error.message.includes('invalid character')) {
                    throw new Error(`Invalid file encoding (not UTF-8): ${filePath}`);
                }
            }
            throw error;
        }

        // Create a mock document object for analyzers
        const mockDocument = {
            fileName: filePath,
            languageId: this.getLanguageId(extension),
            getText: () => content,
            uri: { fsPath: filePath }
        };

        // Add timeout wrapper for analysis
        const analyzeWithTimeout = async (): Promise<DetectedFeature[]> => {
            return new Promise(async (resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Analysis timeout after ${this.config.analysisTimeout}ms`));
                }, this.config.analysisTimeout);

                try {
                    const features: DetectedFeature[] = [];
                    
                    switch (extension) {
                        case '.css':
                        case '.scss':
                        case '.sass':
                        case '.less':
                            if (this.config.enabledAnalyzers.css) {
                                const cssFeatures = await this.cssAnalyzer.analyze(content, mockDocument as any);
                                features.push(...cssFeatures);
                            }
                            break;

                        case '.js':
                        case '.jsx':
                        case '.ts':
                        case '.tsx':
                        case '.mjs':
                            if (this.config.enabledAnalyzers.javascript) {
                                const jsFeatures = await this.jsAnalyzer.analyze(content, mockDocument as any);
                                features.push(...jsFeatures);
                            }
                            break;

                        case '.html':
                        case '.htm':
                        case '.vue':
                        case '.svelte':
                            if (this.config.enabledAnalyzers.html) {
                                const htmlFeatures = await this.htmlAnalyzer.analyze(content, mockDocument as any);
                                features.push(...htmlFeatures);
                            }
                            break;
                    }

                    clearTimeout(timeout);
                    resolve(features);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        };

        try {
            const analyzedFeatures = await analyzeWithTimeout();
            
            // Add file path to each feature
            return analyzedFeatures.map(feature => ({
                ...feature,
                filePath
            }));

        } catch (error) {
            throw new Error(`Failed to analyze ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Find all supported files in the project directory
     */
    private async findSupportedFiles(projectPath: string): Promise<string[]> {
        const supportedExtensions = [
            '**/*.css', '**/*.scss', '**/*.sass', '**/*.less',
            '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.mjs',
            '**/*.html', '**/*.htm', '**/*.vue', '**/*.svelte'
        ];

        const includePatterns = this.config.includePatterns.length > 0 
            ? this.config.includePatterns 
            : supportedExtensions;

        const excludePatterns = [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '**/.git/**',
            ...this.config.excludePatterns
        ];

        const allFiles: string[] = [];

        for (const pattern of includePatterns) {
            const files = glob.sync(pattern, {
                cwd: projectPath,
                absolute: true,
                ignore: excludePatterns
            });
            allFiles.push(...files);
        }

        // Remove duplicates and filter by file size
        const uniqueFiles = [...new Set(allFiles)];
        const filteredFiles: string[] = [];

        for (const file of uniqueFiles) {
            try {
                const stats = fs.statSync(file);
                if (stats.size <= this.config.maxFileSize) {
                    filteredFiles.push(file);
                }
            } catch (error) {
                // Skip files that can't be accessed
                continue;
            }
        }

        return filteredFiles;
    }

    /**
     * Get language ID from file extension
     */
    private getLanguageId(extension: string): string {
        const languageMap: { [key: string]: string } = {
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.mjs': 'javascript',
            '.html': 'html',
            '.htm': 'html',
            '.vue': 'vue',
            '.svelte': 'svelte'
        };

        return languageMap[extension] || 'plaintext';
    }

    /**
     * Generate summary statistics
     */
    private generateSummary(features: DetectedFeature[]) {
        const summary = {
            widelyAvailable: 0,
            newlyAvailable: 0,
            limitedAvailability: 0
        };

        for (const feature of features) {
            switch (feature.baselineStatus.status) {
                case 'widely_available':
                    summary.widelyAvailable++;
                    break;
                case 'newly_available':
                    summary.newlyAvailable++;
                    break;
                case 'limited_availability':
                    summary.limitedAvailability++;
                    break;
            }
        }

        return summary;
    }

    /**
     * Calculate risk distribution
     */
    private calculateRiskDistribution(features: DetectedFeature[]) {
        const distribution = { low: 0, medium: 0, high: 0 };

        for (const feature of features) {
            switch (feature.baselineStatus.status) {
                case 'widely_available':
                    distribution.low++;
                    break;
                case 'newly_available':
                    distribution.medium++;
                    break;
                case 'limited_availability':
                    distribution.high++;
                    break;
            }
        }

        return distribution;
    }

    /**
     * Calculate file type breakdown
     */
    private calculateFileTypeBreakdown(features: DetectedFeature[]) {
        const breakdown: { [fileType: string]: number } = {};

        for (const feature of features) {
            breakdown[feature.type] = (breakdown[feature.type] || 0) + 1;
        }

        return breakdown;
    }

    /**
     * Determine if build should fail based on analysis results
     */
    shouldFailBuild(result: CLIAnalysisResult, failOn: string): boolean {
        switch (failOn.toLowerCase()) {
            case 'high':
                return result.riskDistribution.high > 0;
            case 'medium':
                return result.riskDistribution.medium > 0 || result.riskDistribution.high > 0;
            case 'low':
                return result.features.length > 0;
            default:
                return false;
        }
    }

    /**
     * Get failure message for CI/CD
     */
    getFailureMessage(result: CLIAnalysisResult, failOn: string): string {
        const messages: string[] = [];

        if (failOn === 'high' && result.riskDistribution.high > 0) {
            messages.push(`${result.riskDistribution.high} high-risk features detected`);
        }

        if ((failOn === 'medium' || failOn === 'high') && result.riskDistribution.medium > 0) {
            messages.push(`${result.riskDistribution.medium} medium-risk features detected`);
        }

        if (failOn === 'low' && result.riskDistribution.low > 0) {
            messages.push(`${result.riskDistribution.low} low-risk features detected`);
        }

        return messages.join(', ');
    }

    /**
     * Get information about a specific web feature
     */
    async getFeatureInfo(featureId: string): Promise<WebFeatureDetails | null> {
        await this.initialize();
        return this.compatibilityService.getFeatureDetails(featureId);
    }

    /**
     * List supported web features
     */
    async listFeatures(options: FeatureListOptions): Promise<WebFeatureDetails[]> {
        await this.initialize();
        
        // Get all features from compatibility service
        const allFeatures = await this.compatibilityService.getAllFeatures();
        let filteredFeatures = allFeatures;

        // Filter by type if specified
        if (options.type && options.type !== 'all') {
            filteredFeatures = filteredFeatures.filter(feature => 
                feature.name.toLowerCase().includes(options.type!.toLowerCase())
            );
        }

        // Filter by status if specified
        if (options.status && options.status !== 'all') {
            filteredFeatures = filteredFeatures.filter(feature => 
                feature.baseline?.status === options.status
            );
        }

        // Apply limit
        if (options.limit && options.limit > 0) {
            filteredFeatures = filteredFeatures.slice(0, options.limit);
        }

        return filteredFeatures;
    }

    /**
     * Get exit code based on analysis results and configuration
     */
    getExitCode(result: CLIAnalysisResult): number {
        if (this.shouldFailBuild(result, this.config.failOn)) {
            return 1; // Failure exit code
        }
        return 0; // Success exit code
    }

    /**
     * Generate actionable error messages for CI/CD environments
     */
    generateCIErrorMessages(result: CLIAnalysisResult): string[] {
        const messages: string[] = [];

        if (result.riskDistribution.high > 0) {
            messages.push(`❌ ${result.riskDistribution.high} high-risk features detected that may cause compatibility issues`);
            
            // Add specific feature examples
            const highRiskFeatures = result.features
                .filter(f => f.baselineStatus.status === 'limited_availability')
                .slice(0, 3);
            
            for (const feature of highRiskFeatures) {
                messages.push(`   • ${feature.name} (${feature.type}) - limited browser support`);
            }
        }

        if (result.riskDistribution.medium > 0 && this.config.failOn !== 'high') {
            messages.push(`⚠️  ${result.riskDistribution.medium} newly available features detected`);
        }

        if (result.errors.length > 0) {
            messages.push(`🔧 ${result.errors.length} files could not be analyzed due to syntax errors`);
        }

        return messages;
    }
}