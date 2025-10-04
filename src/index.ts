#!/usr/bin/env node

import { Command } from 'commander';
const program = new Command();
import { CLIAnalyzer } from './analyzer';
import { CIConfigGenerator } from './configGenerator';
import { CLIReporter } from './reporter';
import { CLIConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

program
    .name('baseline-lens-cli')
    .description('CLI for Baseline Lens - Web Feature Compatibility Analysis')
    .version(packageJson.version);

// Main analysis command
program
    .command('analyze')
    .description('Analyze project for web feature compatibility')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .option('-c, --config <config>', 'Configuration file path')
    .option('-o, --output <output>', 'Output file path')
    .option('-f, --format <format>', 'Output format (json|markdown|junit)', 'json')
    .option('--fail-on <level>', 'Fail build on risk level (high|medium|low)', 'high')
    .option('--threshold <threshold>', 'Support threshold percentage', '90')
    .option('--include <patterns>', 'File patterns to include (comma-separated)')
    .option('--exclude <patterns>', 'File patterns to exclude (comma-separated)')
    .option('--silent', 'Suppress console output except errors')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options: any) => {
        try {
            const config = await CLIConfig.load(options.config, options);
            const analyzer = new CLIAnalyzer(config);
            const reporter = new CLIReporter(config);

            if (!options.silent) {
                console.log('🔍 Starting Baseline Lens analysis...');
            }

            const result = await analyzer.analyzeProject(options.path, (progress, message) => {
                if (!options.silent) {
                    process.stdout.write(`\r${message} (${progress}%)`);
                    if (progress === 100) {
                        console.log(''); // New line after completion
                    }
                }
            });
            
            // Generate report
            const report = await reporter.generateReport(result);
            
            // Output report
            if (options.output) {
                await reporter.writeReport(report, options.output, options.format);
                if (!options.silent) {
                    console.log(`📄 Report written to: ${options.output}`);
                }
            } else {
                const output = reporter.formatReport(report, options.format);
                console.log(output);
            }

            // Check for build failure conditions
            const shouldFail = analyzer.shouldFailBuild(result, options.failOn);
            if (shouldFail) {
                const failureMessage = analyzer.getFailureMessage(result, options.failOn);
                const errorMessages = analyzer.generateCIErrorMessages(result);
                
                console.error(`❌ Build failed: ${failureMessage}`);
                console.error('');
                console.error('Compatibility issues detected:');
                for (const message of errorMessages) {
                    console.error(message);
                }
                console.error('');
                console.error('To resolve these issues:');
                console.error('1. Review the detected features and their browser support');
                console.error('2. Consider using polyfills or alternative implementations');
                console.error('3. Update your browser support requirements if appropriate');
                console.error('4. Use --fail-on parameter to adjust failure threshold');
                
                process.exit(analyzer.getExitCode(result));
            }

            if (!options.silent) {
                console.log('\n✅ Analysis completed successfully');
                if (result.features.length > 0) {
                    console.log(`📊 Found ${result.features.length} web features across ${result.analyzedFiles} files`);
                    console.log(`   • ${result.summary.widelyAvailable} widely available`);
                    console.log(`   • ${result.summary.newlyAvailable} newly available`);
                    console.log(`   • ${result.summary.limitedAvailability} limited availability`);
                }
                if (result.errors.length > 0) {
                    console.log(`⚠️  ${result.errors.length} files had analysis errors`);
                }
            }

        } catch (error) {
            console.error('❌ Analysis failed:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

// CI/CD configuration generation command
program
    .command('init-ci')
    .description('Generate CI/CD configuration files')
    .option('-t, --type <type>', 'CI/CD platform (github|gitlab|azure|jenkins)', 'github')
    .option('-o, --output <output>', 'Output directory', '.github/workflows')
    .option('-c, --config <config>', 'Configuration file path')
    .option('--fail-on <level>', 'Fail build on risk level (high|medium|low)', 'high')
    .option('--threshold <threshold>', 'Support threshold percentage', '90')
    .option('--overwrite', 'Overwrite existing CI/CD files instead of appending')
    .action(async (options: any) => {
        try {
            const config = await CLIConfig.load(options.config, options);
            const generator = new CIConfigGenerator(config);

            const result = await generator.generateConfig(options.type, {
                failOn: options.failOn,
                threshold: options.threshold,
                outputPath: options.output,
                overwrite: options.overwrite
            });

            const outputFile = generator.getConfigFileName(options.type, options.output);
            
            // Ensure output directory exists
            const outputDir = path.dirname(outputFile);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(outputFile, result.content);
            
            if (result.isAppended) {
                console.log(`✅ Baseline Lens configuration appended to existing file: ${outputFile}`);
            } else {
                console.log(`✅ New CI/CD configuration generated: ${outputFile}`);
            }

            // Generate additional files if needed (only for new configs)
            if (!result.isAppended) {
                const additionalFiles = generator.getAdditionalFiles(options.type);
                for (const [fileName, content] of additionalFiles) {
                    const filePath = path.join(outputDir, fileName);
                    fs.writeFileSync(filePath, content);
                    console.log(`📄 Additional file created: ${filePath}`);
                }
            }

        } catch (error) {
            console.error('❌ CI/CD configuration generation failed:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

// Configuration validation command
program
    .command('validate-config')
    .description('Validate configuration file')
    .option('-c, --config <config>', 'Configuration file path', '.baseline-lens.json')
    .action(async (options) => {
        try {
            const config = await CLIConfig.load(options.config);
            const validation = CLIConfig.validate(config);
            
            if (validation.isValid) {
                console.log('✅ Configuration is valid');
                
                // Show warnings if any
                if (validation.warnings.length > 0) {
                    console.log('\n⚠️  Warnings:');
                    for (const warning of validation.warnings) {
                        console.log(`  - ${warning}`);
                    }
                }
            } else {
                console.error('❌ Configuration validation failed:');
                for (const error of validation.errors) {
                    console.error(`  - ${error}`);
                }
                
                if (validation.warnings.length > 0) {
                    console.error('\n⚠️  Warnings:');
                    for (const warning of validation.warnings) {
                        console.error(`  - ${warning}`);
                    }
                }
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Configuration validation failed:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

// Show current configuration command
program
    .command('show-config')
    .description('Display current configuration')
    .option('-c, --config <config>', 'Configuration file path', '.baseline-lens.json')
    .option('-f, --format <format>', 'Output format (json|table)', 'table')
    .action(async (options) => {
        try {
            const config = await CLIConfig.load(options.config);
            
            if (options.format === 'json') {
                console.log(JSON.stringify(config, null, 2));
            } else {
                console.log('Current Baseline Lens Configuration:');
                console.log('=====================================');
                console.log(`Support Threshold: ${config.supportThreshold}%`);
                console.log(`Fail On: ${config.failOn}`);
                console.log(`Output Format: ${config.outputFormat}`);
                console.log(`Max File Size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
                console.log(`Analysis Timeout: ${config.analysisTimeout}ms`);
                console.log('');
                console.log('Enabled Analyzers:');
                console.log(`  CSS: ${config.enabledAnalyzers.css ? '✅' : '❌'}`);
                console.log(`  JavaScript: ${config.enabledAnalyzers.javascript ? '✅' : '❌'}`);
                console.log(`  HTML: ${config.enabledAnalyzers.html ? '✅' : '❌'}`);
                console.log('');
                console.log(`Exclude Patterns: ${config.excludePatterns.length} patterns`);
                if (config.excludePatterns.length > 0) {
                    for (const pattern of config.excludePatterns) {
                        console.log(`  - ${pattern}`);
                    }
                }
                console.log('');
                console.log(`Include Patterns: ${config.includePatterns.length} patterns`);
                if (config.includePatterns.length > 0) {
                    for (const pattern of config.includePatterns) {
                        console.log(`  - ${pattern}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to load configuration:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

// Feature lookup command
program
    .command('feature')
    .description('Look up information about a specific web feature')
    .argument('<feature-id>', 'Web feature identifier')
    .option('-f, --format <format>', 'Output format (json|table)', 'table')
    .action(async (featureId: string, options: any) => {
        try {
            const config = new CLIConfig();
            const analyzer = new CLIAnalyzer(config);
            const featureInfo = await analyzer.getFeatureInfo(featureId);
            
            if (!featureInfo) {
                console.error(`❌ Feature not found: ${featureId}`);
                process.exit(1);
            }

            const reporter = new CLIReporter();
            const output = reporter.formatFeatureInfo(featureInfo, options.format);
            console.log(output);

        } catch (error) {
            console.error('❌ Feature lookup failed:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

// List supported features command
program
    .command('list-features')
    .description('List all supported web features')
    .option('-t, --type <type>', 'Feature type (css|javascript|html|all)', 'all')
    .option('-s, --status <status>', 'Baseline status (widely_available|newly_available|limited_availability|all)', 'all')
    .option('-f, --format <format>', 'Output format (json|table|csv)', 'table')
    .option('--limit <limit>', 'Limit number of results', '50')
    .action(async (options: any) => {
        try {
            const config = new CLIConfig();
            const analyzer = new CLIAnalyzer(config);
            const features = await analyzer.listFeatures({
                type: options.type,
                status: options.status,
                limit: parseInt(options.limit)
            });

            const reporter = new CLIReporter();
            const output = reporter.formatFeatureList(features, options.format);
            console.log(output);

        } catch (error) {
            console.error('❌ Feature listing failed:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

program.parse(process.argv);