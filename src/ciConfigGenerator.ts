import * as path from 'path';
import * as fs from 'fs';
import { CLIConfig } from './config';

export interface CIGenerationOptions {
    failOn: string;
    threshold: string;
    outputPath: string;
    overwrite?: boolean;
    changedOnly?: boolean;
}

export class CIConfigGenerator {
    private config: CLIConfig;

    constructor(config: CLIConfig) {
        this.config = config;
    }

    /**
     * Generate CI/CD configuration for the specified platform
     */
    async generateConfig(platform: string, options: CIGenerationOptions): Promise<{ content: string; isAppended: boolean }> {
        const configPath = this.getConfigFileName(platform, options.outputPath);
        const existingContent = await this.getExistingConfig(configPath);
        
        if (existingContent && !options.overwrite) {
            const appendedContent = await this.appendToExistingConfig(platform, existingContent, options);
            return { content: appendedContent, isAppended: true };
        }
        
        const newContent = this.generateNewConfig(platform, options);
        return { content: newContent, isAppended: false };
    }

    /**
     * Generate new CI/CD configuration for the specified platform
     */
    private generateNewConfig(platform: string, options: CIGenerationOptions): string {
        switch (platform.toLowerCase()) {
            case 'github':
                return this.generateGitHubActions(options);
            case 'gitlab':
                return this.generateGitLabCI(options);
            case 'azure':
                return this.generateAzurePipelines(options);
            case 'jenkins':
                return this.generateJenkinsfile(options);
            default:
                throw new Error(`Unsupported CI/CD platform: ${platform}`);
        }
    }

    /**
     * Get existing configuration file content
     */
    private async getExistingConfig(configPath: string): Promise<string | null> {
        try {
            return await fs.promises.readFile(configPath, 'utf8');
        } catch {
            return null;
        }
    }

    /**
     * Append Baseline Lens job to existing CI/CD configuration
     */
    private async appendToExistingConfig(platform: string, existingContent: string, options: CIGenerationOptions): Promise<string> {
        switch (platform.toLowerCase()) {
            case 'github':
                return this.appendToGitHubActions(existingContent, options);
            case 'gitlab':
                return this.appendToGitLabCI(existingContent, options);
            case 'azure':
                return this.appendToAzurePipelines(existingContent, options);
            case 'jenkins':
                return this.appendToJenkinsfile(existingContent, options);
            default:
                throw new Error(`Unsupported CI/CD platform: ${platform}`);
        }
    }

    /**
     * Append to existing GitHub Actions workflow
     */
    private appendToGitHubActions(existingContent: string, options: CIGenerationOptions): string {
        const runnerOs = this.extractRunnerOS(existingContent) || 'ubuntu-latest';
        const nodeVersion = this.extractNodeVersion(existingContent) || '18';
        
        const baselineJob = `
  baseline-lens:
    runs-on: ${runnerOs}
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '${nodeVersion}'
    - run: npm install -g baseline-lens-cli
    - run: |
        baseline-lens-cli analyze \\
          --fail-on ${options.failOn} \\
          --threshold ${options.threshold} \\
          --format junit \\
          --output baseline-report.xml
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: baseline-lens-report
        path: baseline-report.xml`;

        if (existingContent.includes('jobs:')) {
            return existingContent.replace(/jobs:\s*\n/, `jobs:${baselineJob}\n`);
        }
        return existingContent + `\njobs:${baselineJob}`;
    }

    /**
     * Append to existing GitLab CI configuration
     */
    private appendToGitLabCI(existingContent: string, options: CIGenerationOptions): string {
        const dockerImage = this.extractDockerImage(existingContent) || 'node:18';
        
        const baselineJob = `
baseline-lens:
  stage: test
  image: ${dockerImage}
  script:
    - npm install -g baseline-lens-cli
    - baseline-lens-cli analyze --fail-on ${options.failOn} --threshold ${options.threshold} --format junit --output baseline-report.xml
  artifacts:
    when: always
    reports:
      junit: baseline-report.xml`;

        if (!existingContent.includes('stages:')) {
            return `stages:\n  - test\n${existingContent}${baselineJob}`;
        }
        return existingContent + baselineJob;
    }

    /**
     * Append to existing Azure Pipelines configuration
     */
    private appendToAzurePipelines(existingContent: string, options: CIGenerationOptions): string {
        const baselineStep = `
- script: |
    npm install -g baseline-lens-cli
    baseline-lens-cli analyze --fail-on ${options.failOn} --threshold ${options.threshold} --format junit --output baseline-report.xml
  displayName: 'Baseline Lens Analysis'
- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'baseline-report.xml'
    testRunTitle: 'Baseline Lens Results'`;

        if (existingContent.includes('steps:')) {
            return existingContent.replace(/steps:\s*\n/, `steps:\n${baselineStep}\n`);
        }
        return existingContent + `\nsteps:${baselineStep}`;
    }

    /**
     * Append to existing Jenkinsfile
     */
    private appendToJenkinsfile(existingContent: string, options: CIGenerationOptions): string {
        const baselineStage = `
        stage('Baseline Lens') {
            steps {
                sh 'npm install -g baseline-lens-cli'
                sh 'baseline-lens-cli analyze --fail-on ${options.failOn} --threshold ${options.threshold} --format junit --output baseline-report.xml'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'baseline-report.xml'
                }
            }
        }`;

        if (existingContent.includes('stages {')) {
            return existingContent.replace(/stages\s*\{/, `stages {${baselineStage}`);
        }
        return existingContent + baselineStage;
    }

    /**
     * Extract runner OS from existing GitHub Actions workflow
     */
    private extractRunnerOS(content: string): string | null {
        const match = content.match(/runs-on:\s*([^\n]+)/);
        return match ? match[1].trim() : null;
    }

    /**
     * Extract Node.js version from existing workflow
     */
    private extractNodeVersion(content: string): string | null {
        const match = content.match(/node-version:\s*['"]?([^'"\n]+)['"]?/);
        return match ? match[1].trim() : null;
    }

    /**
     * Extract Docker image from existing GitLab CI
     */
    private extractDockerImage(content: string): string | null {
        const match = content.match(/image:\s*([^\n]+)/);
        return match ? match[1].trim() : null;
    }

    /**
     * Get the appropriate config file name for the platform
     */
    getConfigFileName(platform: string, outputDir: string): string {
        const fileNames: { [key: string]: string } = {
            github: 'baseline-lens.yml',
            gitlab: '.gitlab-ci.yml',
            azure: 'azure-pipelines.yml',
            jenkins: 'Jenkinsfile'
        };

        const fileName = fileNames[platform.toLowerCase()];
        if (!fileName) {
            throw new Error(`Unsupported CI/CD platform: ${platform}`);
        }

        return path.join(outputDir, fileName);
    }

    /**
     * Get additional files that need to be created for the platform
     */
    getAdditionalFiles(platform: string): Map<string, string> {
        const files = new Map<string, string>();

        switch (platform.toLowerCase()) {
            case 'github':
                // Add a sample configuration file
                files.set('.baseline-lens.json', this.generateSampleConfig());
                break;
            case 'gitlab':
                files.set('.baseline-lens.json', this.generateSampleConfig());
                break;
        }

        return files;
    }

    /**
     * Generate GitHub Actions workflow
     */
    private generateGitHubActions(options: CIGenerationOptions): string {
        return `name: Baseline Lens Compatibility Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  compatibility-check:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Baseline Lens CLI
      run: npm install -g baseline-lens
      
    - name: Validate configuration
      run: baseline-lens validate-config
      
    - name: Run compatibility analysis
      run: |
        baseline-lens analyze \\
          --fail-on ${options.failOn} \\
          --threshold ${options.threshold} \\
          --format junit \\
          --output compatibility-report.xml \\
          --verbose
          
    - name: Generate detailed report
      if: always()
      run: |
        baseline-lens analyze \\
          --fail-on ${options.failOn} \\
          --threshold ${options.threshold} \\
          --format markdown \\
          --output compatibility-report.md
          
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: compatibility-reports
        path: |
          compatibility-report.xml
          compatibility-report.md
        
    - name: Publish test results
      uses: EnricoMi/publish-unit-test-result-action@v2
      if: always()
      with:
        files: compatibility-report.xml
        check_name: "Baseline Lens Compatibility Results"
        
    - name: Comment PR with results
      uses: actions/github-script@v7
      if: github.event_name == 'pull_request' && always()
      with:
        script: |
          const fs = require('fs');
          try {
            const report = fs.readFileSync('compatibility-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: \`## 🔍 Baseline Lens Compatibility Report\\n\\n\${report}\`
            });
          } catch (error) {
            console.log('Could not post report comment:', error.message);
          }
`;
    }

    /**
     * Generate GitLab CI configuration
     */
    private generateGitLabCI(options: CIGenerationOptions): string {
        return `stages:
  - test
  - compatibility

variables:
  NODE_VERSION: "18"

baseline-lens:
  stage: compatibility
  image: node:\${NODE_VERSION}
  
  before_script:
    - npm ci
    - npm install -g baseline-lens
    
  script:
    - baseline-lens validate-config
    - |
      baseline-lens analyze \\
        --fail-on ${options.failOn} \\
        --threshold ${options.threshold} \\
        --format junit \\
        --output compatibility-report.xml \\
        --verbose
    - |
      baseline-lens analyze \\
        --fail-on ${options.failOn} \\
        --threshold ${options.threshold} \\
        --format markdown \\
        --output compatibility-report.md
        
  artifacts:
    when: always
    reports:
      junit: compatibility-report.xml
    paths:
      - compatibility-report.xml
      - compatibility-report.md
    expire_in: 1 week
    
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Optional: Separate job for different failure thresholds
baseline-lens-strict:
  extends: baseline-lens
  script:
    - baseline-lens validate-config
    - |
      baseline-lens analyze \\
        --fail-on medium \\
        --threshold 95 \\
        --format junit \\
        --output compatibility-report-strict.xml \\
        --verbose
  artifacts:
    when: always
    reports:
      junit: compatibility-report-strict.xml
    paths:
      - compatibility-report-strict.xml
  allow_failure: true
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
`;
    }

    /**
     * Generate Azure Pipelines configuration
     */
    private generateAzurePipelines(options: CIGenerationOptions): string {
        return `trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '18.x'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '\$(nodeVersion)'
  displayName: 'Install Node.js'

- script: |
    npm ci
    npm install -g baseline-lens
  displayName: 'Install dependencies'

- script: |
    baseline-lens analyze \\
      --fail-on ${options.failOn} \\
      --threshold ${options.threshold} \\
      --format junit \\
      --output \$(Agent.TempDirectory)/compatibility-report.xml
  displayName: 'Run Baseline Lens analysis'

- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '\$(Agent.TempDirectory)/compatibility-report.xml'
    testRunTitle: 'Baseline Lens Compatibility Results'
    failTaskOnFailedTests: true
`;
    }

    /**
     * Generate Jenkinsfile
     */
    private generateJenkinsfile(options: CIGenerationOptions): string {
        return `pipeline {
    agent any
    
    tools {
        nodejs '18'
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npm install -g baseline-lens'
            }
        }
        
        stage('Compatibility Analysis') {
            steps {
                sh """
                    baseline-lens analyze \\
                        --fail-on ${options.failOn} \\
                        --threshold ${options.threshold} \\
                        --format junit \\
                        --output compatibility-report.xml
                """
            }
            
            post {
                always {
                    publishTestResults(
                        testResultsPattern: 'compatibility-report.xml',
                        allowEmptyResults: false
                    )
                    
                    archiveArtifacts(
                        artifacts: 'compatibility-report.xml',
                        allowEmptyArchive: false
                    )
                }
            }
        }
    }
    
    post {
        failure {
            echo 'Baseline Lens detected compatibility issues that exceed the configured threshold.'
        }
    }
}
`;
    }

    /**
     * Generate a sample configuration file
     */
    private generateSampleConfig(): string {
        return JSON.stringify({
            supportThreshold: parseInt(this.config.supportThreshold.toString()) || 90,
            customBrowserMatrix: this.config.customBrowserMatrix,
            excludePatterns: [
                "**/node_modules/**",
                "**/dist/**",
                "**/build/**",
                "**/coverage/**",
                "**/.git/**",
                ...this.config.excludePatterns
            ],
            includePatterns: this.config.includePatterns.length > 0 ? this.config.includePatterns : [
                "**/*.css",
                "**/*.scss",
                "**/*.sass",
                "**/*.less",
                "**/*.js",
                "**/*.jsx",
                "**/*.ts",
                "**/*.tsx",
                "**/*.mjs",
                "**/*.html",
                "**/*.htm",
                "**/*.vue",
                "**/*.svelte"
            ],
            enabledAnalyzers: this.config.enabledAnalyzers,
            maxFileSize: this.config.maxFileSize,
            analysisTimeout: this.config.analysisTimeout
        }, null, 2);
    }
}