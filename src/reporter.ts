import * as fs from 'fs';
import * as path from 'path';
import { CLIAnalysisResult } from './cliAnalyzer';
import { CLIConfig } from './cliConfig';
import { DetectedFeature, WebFeatureDetails, CompatibilityReport, ReportSummary, FeatureUsage, FileLocation } from '../src/types';

export class CLIReporter {
    private config: CLIConfig;

    constructor(config?: CLIConfig) {
        this.config = config || new CLIConfig();
    }

    /**
     * Generate a comprehensive compatibility report from analysis results
     */
    async generateReport(result: CLIAnalysisResult): Promise<CompatibilityReport> {
        const summary: ReportSummary = {
            totalFeatures: result.features.length,
            widelyAvailable: result.summary.widelyAvailable,
            newlyAvailable: result.summary.newlyAvailable,
            limitedAvailability: result.summary.limitedAvailability,
            riskDistribution: result.riskDistribution,
            fileTypeBreakdown: result.fileTypeBreakdown
        };

        const features = this.groupFeaturesByType(result.features);
        const recommendations = this.generateRecommendations(result);

        return {
            summary,
            features,
            recommendations,
            generatedAt: new Date(),
            projectPath: '',
            totalFiles: result.totalFiles,
            analyzedFiles: result.analyzedFiles,
            errors: result.errors
        };
    }

    /**
     * Format report in the specified format
     */
    formatReport(report: CompatibilityReport, format: string): string {
        switch (format.toLowerCase()) {
            case 'json':
                return this.formatAsJSON(report);
            case 'markdown':
                return this.formatAsMarkdown(report);
            case 'junit':
                return this.formatAsJUnit(report);
            default:
                return this.formatAsJSON(report);
        }
    }

    /**
     * Write report to file
     */
    async writeReport(report: CompatibilityReport, outputPath: string, format: string): Promise<void> {
        const content = this.formatReport(report, format);
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, content, 'utf8');
    }

    /**
     * Format feature information for display
     */
    formatFeatureInfo(feature: WebFeatureDetails, format: string): string {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(feature, null, 2);
            case 'table':
                return this.formatFeatureAsTable(feature);
            default:
                return this.formatFeatureAsTable(feature);
        }
    }

    /**
     * Format feature list for display
     */
    formatFeatureList(features: WebFeatureDetails[], format: string): string {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(features, null, 2);
            case 'table':
                return this.formatFeaturesAsTable(features);
            case 'csv':
                return this.formatFeaturesAsCSV(features);
            default:
                return this.formatFeaturesAsTable(features);
        }
    }

    /**
     * Group features by their identifier and aggregate locations
     */
    private groupFeaturesByType(features: DetectedFeature[]): FeatureUsage[] {
        const featureMap = new Map<string, FeatureUsage>();

        for (const feature of features) {
            const key = `${feature.id}-${feature.type}`;
            
            if (!featureMap.has(key)) {
                featureMap.set(key, {
                    feature: {
                        name: feature.name,
                        description: feature.name, // Use name as description fallback
                        baseline: feature.baselineStatus
                    },
                    locations: [],
                    riskLevel: this.getRiskLevel(feature.baselineStatus.status),
                    usageCount: 0
                });
            }

            const usage = featureMap.get(key)!;
            usage.usageCount++;
            
            if (feature.filePath) {
                usage.locations.push({
                    filePath: feature.filePath,
                    line: feature.range?.start.line || 0,
                    column: feature.range?.start.character || 0,
                    context: feature.context
                });
            }
        }

        return Array.from(featureMap.values()).sort((a, b) => {
            // Sort by risk level (high first), then by count (descending)
            const riskOrder = { high: 3, medium: 2, low: 1 };
            const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
            return riskDiff !== 0 ? riskDiff : b.usageCount - a.usageCount;
        });
    }

    /**
     * Generate recommendations based on analysis results
     */
    private generateRecommendations(result: CLIAnalysisResult): string[] {
        const recommendations: string[] = [];

        if (result.riskDistribution.high > 0) {
            recommendations.push(
                `⚠️  ${result.riskDistribution.high} high-risk features detected. Consider using polyfills or alternative implementations.`
            );
        }

        if (result.riskDistribution.medium > 0) {
            recommendations.push(
                `📋 ${result.riskDistribution.medium} newly available features found. Verify browser support requirements.`
            );
        }

        if (result.errors.length > 0) {
            recommendations.push(
                `🔧 ${result.errors.length} files had analysis errors. Check file syntax and encoding.`
            );
        }

        const analysisRate = (result.analyzedFiles / result.totalFiles) * 100;
        if (analysisRate < 90) {
            recommendations.push(
                `📊 Only ${analysisRate.toFixed(1)}% of files were successfully analyzed. Consider reviewing excluded patterns.`
            );
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ No significant compatibility issues detected.');
        }

        return recommendations;
    }

    /**
     * Get risk level from baseline status
     */
    private getRiskLevel(status: string): 'low' | 'medium' | 'high' {
        switch (status) {
            case 'widely_available':
                return 'low';
            case 'newly_available':
                return 'medium';
            case 'limited_availability':
                return 'high';
            default:
                return 'medium';
        }
    }

    /**
     * Format report as JSON
     */
    private formatAsJSON(report: CompatibilityReport): string {
        return JSON.stringify(report, null, 2);
    }

    /**
     * Format report as Markdown
     */
    private formatAsMarkdown(report: CompatibilityReport): string {
        const lines: string[] = [];
        
        lines.push('# Baseline Lens Compatibility Report');
        lines.push('');
        lines.push(`Generated: ${report.generatedAt.toISOString()}`);
        lines.push('');

        // Summary section
        lines.push('## Summary');
        lines.push('');
        lines.push(`- **Total Files**: ${report.totalFiles}`);
        lines.push(`- **Analyzed Files**: ${report.analyzedFiles}`);
        lines.push(`- **Total Features**: ${report.summary.totalFeatures}`);
        lines.push('');

        // Risk distribution
        lines.push('### Risk Distribution');
        lines.push('');
        lines.push(`- 🚫 **High Risk**: ${report.summary.riskDistribution.high} features`);
        lines.push(`- ⚠️  **Medium Risk**: ${report.summary.riskDistribution.medium} features`);
        lines.push(`- ✅ **Low Risk**: ${report.summary.riskDistribution.low} features`);
        lines.push('');

        // File type breakdown
        if (Object.keys(report.summary.fileTypeBreakdown).length > 0) {
            lines.push('### File Type Breakdown');
            lines.push('');
            for (const [type, count] of Object.entries(report.summary.fileTypeBreakdown)) {
                lines.push(`- **${type.toUpperCase()}**: ${count} features`);
            }
            lines.push('');
        }

        // Features section
        if (report.features.length > 0) {
            lines.push('## Detected Features');
            lines.push('');
            
            for (const feature of report.features) {
                const riskIcon = feature.riskLevel === 'high' ? '🚫' : 
                               feature.riskLevel === 'medium' ? '⚠️' : '✅';
                
                lines.push(`### ${riskIcon} ${feature.feature.name}`);
                lines.push('');
                lines.push(`- **Status**: ${feature.feature.baseline.status}`);
                lines.push(`- **Usage Count**: ${feature.usageCount}`);
                lines.push('');
                
                if (feature.locations.length > 0) {
                    lines.push('**Locations:**');
                    for (const location of feature.locations.slice(0, 10)) { // Limit to first 10
                        const lineInfo = location.line !== undefined ? `:${location.line + 1}` : '';
                        lines.push(`- \`${location.filePath}${lineInfo}\``);
                    }
                    if (feature.locations.length > 10) {
                        lines.push(`- ... and ${feature.locations.length - 10} more locations`);
                    }
                    lines.push('');
                }
            }
        }

        // Recommendations section
        if (report.recommendations.length > 0) {
            lines.push('## Recommendations');
            lines.push('');
            for (const recommendation of report.recommendations) {
                lines.push(`- ${recommendation}`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Format report as JUnit XML for CI/CD integration
     */
    private formatAsJUnit(report: CompatibilityReport): string {
        const testCases: string[] = [];
        let failures = 0;
        let errors = 0;

        for (const feature of report.features) {
            const testName = `compatibility.${feature.feature.name.replace(/\s+/g, '_')}`;
            const className = 'BaselineLens.CompatibilityCheck';
            
            if (feature.riskLevel === 'high') {
                failures++;
                const locations = feature.locations.map(loc => 
                    `${loc.filePath}:${loc.line + 1}`
                ).join(', ');
                
                testCases.push(`
    <testcase classname="${className}" name="${testName}" time="0">
      <failure message="High-risk feature detected: ${feature.feature.name}" type="CompatibilityError">
Feature: ${feature.feature.name}
Status: ${feature.feature.baseline.status}
Locations: ${locations}
      </failure>
    </testcase>`);
            } else if (feature.riskLevel === 'medium') {
                testCases.push(`
    <testcase classname="${className}" name="${testName}" time="0">
      <system-out>Medium-risk feature: ${feature.feature.name} (${feature.feature.baseline.status})</system-out>
    </testcase>`);
            } else {
                testCases.push(`
    <testcase classname="${className}" name="${testName}" time="0"/>`);
            }
        }

        const totalTests = report.features.length;
        const timestamp = report.generatedAt.toISOString();

        return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="BaselineLens.CompatibilityCheck" 
           tests="${totalTests}" 
           failures="${failures}" 
           errors="${errors}" 
           time="0" 
           timestamp="${timestamp}">
  ${testCases.join('\n')}
</testsuite>`;
    }

    /**
     * Format single feature as table
     */
    private formatFeatureAsTable(feature: WebFeatureDetails): string {
        const lines: string[] = [];
        
        lines.push(`Feature: ${feature.name}`);
        lines.push(`Description: ${feature.description || 'N/A'}`);
        lines.push(`Status: ${feature.baseline?.status || 'N/A'}`);
        
        if (feature.baseline?.baseline_date) {
            lines.push(`Baseline Date: ${feature.baseline.baseline_date}`);
        }
        
        if (feature.mdn_url) {
            lines.push(`MDN: ${feature.mdn_url}`);
        }
        
        if (feature.spec_url) {
            lines.push(`Spec: ${feature.spec_url}`);
        }

        return lines.join('\n');
    }

    /**
     * Format feature list as table
     */
    private formatFeaturesAsTable(features: WebFeatureDetails[]): string {
        if (features.length === 0) {
            return 'No features found.';
        }

        const lines: string[] = [];
        lines.push('Name'.padEnd(40) + 'Status'.padEnd(20) + 'Description');
        lines.push('-'.repeat(80));

        for (const feature of features) {
            const name = (feature.name || '').substring(0, 39).padEnd(40);
            const status = (feature.baseline?.status || 'unknown').padEnd(20);
            const description = (feature.description || '').substring(0, 40);
            lines.push(`${name}${status}${description}`);
        }

        return lines.join('\n');
    }

    /**
     * Format feature list as CSV
     */
    private formatFeaturesAsCSV(features: WebFeatureDetails[]): string {
        const lines: string[] = [];
        lines.push('Name,Status,Description,MDN URL,Spec URL');

        for (const feature of features) {
            const row = [
                feature.name || '',
                feature.baseline?.status || '',
                (feature.description || '').replace(/"/g, '""'),
                feature.mdn_url || '',
                feature.spec_url || ''
            ];
            lines.push(row.map(field => `"${field}"`).join(','));
        }

        return lines.join('\n');
    }
}