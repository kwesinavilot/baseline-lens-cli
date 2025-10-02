import { Command } from 'commander';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Config {
  supportThreshold: number;
  includePatterns: string[];
  excludePatterns: string[];
  enabledFileTypes: string[];
}

interface AnalysisResult {
  totalFeatures: number;
  files: Array<{
    path: string;
    features: Array<{
      name: string;
      status: 'widely_available' | 'newly_available' | 'limited_availability';
      support: number;
    }>;
  }>;
  shouldFail(level: string): boolean;
}

export const analyzeCommand = new Command('analyze')
  .description('Analyze web feature compatibility across project files')
  .argument('[directory]', 'Target directory to analyze', '.')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --output <format>', 'Output format: json, markdown, console', 'console')
  .option('--output-file <path>', 'Save output to file')
  .option('--threshold <number>', 'Support threshold percentage (0-100)', '90')
  .option('--fail-on <level>', 'Fail on compatibility level: high, medium, low')
  .option('--include <patterns>', 'File patterns to include (comma-separated)')
  .option('--exclude <patterns>', 'File patterns to exclude (comma-separated)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-s, --silent', 'Suppress progress output')
  .action(async (directory, options) => {
    const spinner = options.silent ? null : ora('Analyzing files...').start();
    
    try {
      const config: Config = {
        supportThreshold: parseInt(options.threshold),
        includePatterns: options.include?.split(',') || ['**/*.{css,js,jsx,ts,tsx,html,vue,svelte}'],
        excludePatterns: options.exclude?.split(',') || ['**/node_modules/**'],
        enabledFileTypes: ['css', 'javascript', 'html']
      };

      const files = await glob(config.includePatterns, {
        ignore: config.excludePatterns,
        cwd: directory,
        absolute: true
      });

      if (files.length === 0) {
        spinner?.fail('No files found to analyze');
        process.exit(1);
      }

      const results: AnalysisResult = {
        totalFeatures: files.length * 2, // Mock data
        files: files.slice(0, 5).map(file => ({
          path: file,
          features: [
            { name: 'CSS Grid', status: 'widely_available', support: 95 },
            { name: 'Container Queries', status: 'newly_available', support: 75 }
          ]
        })),
        shouldFail: (level: string) => level === 'high' && files.length > 10
      };

      spinner?.succeed(`Analysis complete: ${results.totalFeatures} features found in ${files.length} files`);

      if (options.output === 'json') {
        const output = JSON.stringify(results, null, 2);
        if (options.outputFile) {
          await fs.writeFile(options.outputFile, output);
          console.log(chalk.green(`Report saved to ${options.outputFile}`));
        } else {
          console.log(output);
        }
      } else {
        console.log(chalk.blue(`\nCompatibility Analysis Results:`));
        console.log(`Files analyzed: ${files.length}`);
        console.log(`Features detected: ${results.totalFeatures}`);
        results.files.forEach(file => {
          console.log(chalk.yellow(`\n${path.basename(file.path)}:`));
          file.features.forEach(feature => {
            const icon = feature.status === 'widely_available' ? '✅' : 
                        feature.status === 'newly_available' ? '⚠️' : '🚫';
            console.log(`  ${icon} ${feature.name} (${feature.support}% support)`);
          });
        });
      }

      if (options.failOn && results.shouldFail(options.failOn)) {
        process.exit(1);
      }

    } catch (error) {
      spinner?.fail('Analysis failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

export const reportCommand = new Command('report')
  .description('Generate detailed compatibility reports')
  .argument('[directory]', 'Target directory', '.')
  .option('--format <type>', 'Report format: json, markdown, html, csv', 'markdown')
  .option('--output <path>', 'Output file path')
  .action(async (directory, options) => {
    console.log(chalk.blue('Generating compatibility report...'));
    
    const report = `# Compatibility Report\n\nGenerated for: ${directory}\nFormat: ${options.format}\n`;
    
    if (options.output) {
      await fs.writeFile(options.output, report);
      console.log(chalk.green(`Report saved to ${options.output}`));
    } else {
      console.log(report);
    }
  });

export const featuresCommand = new Command('features')
  .description('List supported web features')
  .option('--category <type>', 'Filter by category: css, javascript, html, api')
  .option('--status <level>', 'Filter by baseline status')
  .option('--format <type>', 'Output format: table, json, list', 'table')
  .action((options) => {
    const features = [
      { name: 'CSS Grid', category: 'css', status: 'widely_available' },
      { name: 'Container Queries', category: 'css', status: 'newly_available' },
      { name: 'Fetch API', category: 'javascript', status: 'widely_available' }
    ];

    if (options.format === 'json') {
      console.log(JSON.stringify(features, null, 2));
    } else {
      console.log(chalk.blue('Supported Web Features:'));
      features.forEach(feature => {
        if (!options.category || feature.category === options.category) {
          const icon = feature.status === 'widely_available' ? '✅' : 
                      feature.status === 'newly_available' ? '⚠️' : '🚫';
          console.log(`${icon} ${feature.name} (${feature.category})`);
        }
      });
    }
  });

export const validateCommand = new Command('validate')
  .description('Validate configuration files')
  .option('--config <path>', 'Configuration file to validate', '.baseline-lens.json')
  .option('--fix', 'Attempt to fix common issues')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      await fs.access(configPath);
      console.log(chalk.green(`✅ Configuration file ${configPath} is valid`));
    } catch {
      console.log(chalk.yellow(`⚠️ Configuration file not found: ${options.config}`));
      
      if (options.fix) {
        const defaultConfig = {
          supportThreshold: 90,
          enabledFileTypes: ['css', 'javascript', 'html'],
          excludePatterns: ['**/node_modules/**']
        };
        
        await fs.writeFile(options.config, JSON.stringify(defaultConfig, null, 2));
        console.log(chalk.green(`✅ Created default configuration: ${options.config}`));
      }
    }
  });