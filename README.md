# Baseline Lens CLI

[![npm version](https://badge.fury.io/js/baseline-lens-cli.svg)](https://badge.fury.io/js/baseline-lens-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool for web feature compatibility analysis using Baseline data. Analyze your web projects for browser compatibility issues and get actionable insights.

## Features

- 🔍 **Real-time Analysis** - Detect modern web features in CSS, JavaScript, and HTML
- 📊 **Comprehensive Reports** - Generate detailed compatibility reports in JSON, Markdown, or JUnit formats
- 🚨 **CI/CD Integration** - Fail builds on compatibility issues with configurable thresholds
- 🌐 **Baseline Data** - Uses official web-features database with 1000+ features
- ⚡ **Fast & Lightweight** - Analyze entire projects in seconds

## Installation

```bash
npm install -g baseline-lens-cli
```

## Usage

### Analyze Project

```bash
baseline-lens-cli analyze --path ./src
baseline-lens-cli analyze --path ./src --output report.json --format json
baseline-lens-cli analyze --path ./src --threshold 95 --fail-on medium
```

### Generate CI/CD Configuration

```bash
# Append to existing CI/CD files (default)
baseline-lens-cli init-ci --type github
baseline-lens-cli init-ci --type gitlab

# Generate new files (overwrite existing)
baseline-lens-cli init-ci --type github --overwrite
baseline-lens-cli init-ci --type azure --output custom-dir
```

### Validate Configuration

```bash
baseline-lens-cli validate-config --config .baseline-lens.json
```

### Show Configuration

```bash
baseline-lens-cli show-config
baseline-lens-cli show-config --format json
```

### Feature Lookup

```bash
baseline-lens-cli feature css-grid
baseline-lens-cli list-features --type css --status newly_available
```

## Configuration

Create `.baseline-lens.json` in your project root:

```json
{
  "supportThreshold": 90,
  "enabledAnalyzers": {
    "css": true,
    "javascript": true,
    "html": true
  },
  "excludePatterns": ["**/node_modules/**", "**/dist/**"],
  "failOn": "high",
  "outputFormat": "json"
}
```

## Example Output

```bash
$ baseline-lens-cli analyze --path ./src

🔍 Starting Baseline Lens analysis...
Analyzing 25 files... (100%)

✅ Analysis completed successfully
📊 Found 12 web features across 25 files
   • 8 widely available
   • 3 newly available  
   • 1 limited availability
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Kwesi Navilot](https://github.com/kwesinavilot)