import * as fs from 'fs';
import { CLIConfig } from './config';

export class CIConfigGenerator {
    constructor(private config: CLIConfig) {}

    generateConfig(type: string, options: any): string {
        switch (type) {
            case 'github':
                return this.generateGitHubConfig(options);
            case 'gitlab':
                return this.generateGitLabConfig(options);
            default:
                return this.generateGitHubConfig(options);
        }
    }

    private generateGitHubConfig(options: any): string {
        return `name: Baseline Lens Analysis
on: [push, pull_request]
jobs:
  compatibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g baseline-lens-cli
      - run: baseline-lens-cli analyze --path ./src --threshold ${options.threshold} --fail-on ${options.failOn}`;
    }

    private generateGitLabConfig(options: any): string {
        return `baseline-lens:
  stage: test
  script:
    - npm install -g baseline-lens-cli
    - baseline-lens-cli analyze --path ./src --threshold ${options.threshold} --fail-on ${options.failOn}`;
    }

    getConfigFileName(type: string, outputPath: string): string {
        switch (type) {
            case 'github':
                return `${outputPath}/baseline-lens.yml`;
            case 'gitlab':
                return '.gitlab-ci.yml';
            default:
                return 'baseline-lens.yml';
        }
    }

    getAdditionalFiles(type: string): Map<string, string> {
        return new Map();
    }
}