# Baseline Lens CLI User Guide

Complete guide to using the Baseline Lens CLI for web feature compatibility analysis.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [CI/CD Integration](#cicd-integration)
- [Output Formats](#output-formats)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Installation

### Global Installation (Recommended)

```bash
npm install -g baseline-lens-cli
```

### Project-specific Installation

```bash
npm install --save-dev baseline-lens-cli
npx baseline-lens-cli --help
```

### Verify Installation

```bash
baseline-lens-cli --version
baseline-lens-cli --help
```

## Quick Start

### 1. Analyze Your Project

```bash
# Basic analysis
baseline-lens-cli analyze

# Analyze specific directory
baseline-lens-cli analyze --path ./src

# Generate report file
baseline-lens-cli analyze --output report.json --format json
```

### 2. Set Up CI/CD Integration

```bash
# GitHub Actions (appends to existing workflow)
baseline-lens-cli init-ci --type github

# GitLab CI (appends to .gitlab-ci.yml)
baseline-lens-cli init-ci --type gitlab

# Generate new file instead of appending
baseline-lens-cli init-ci --type github --overwrite
```

### 3. Configure for Your Project

```bash
# Create configuration file
baseline-lens-cli validate-config --config .baseline-lens.json

# View current settings
baseline-lens-cli show-config
```

## Commands

### `analyze` - Project Analysis

Analyze your project for web feature compatibility issues.

```bash
baseline-lens-cli analyze [options]
```

**Options:**
- `-p, --path <path>` - Project path to analyze (default: current directory)
- `-c, --config <config>` - Configuration file path
- `-o, --output <output>` - Output file path
- `-f, --format <format>` - Output format: `json`, `markdown`, `junit` (default: json)
- `--fail-on <level>` - Fail build on risk level: `high`, `medium`, `low` (default: high)
- `--threshold <threshold>` - Support threshold percentage (default: 90)
- `--include <patterns>` - File patterns to include (comma-separated)
- `--exclude <patterns>` - File patterns to exclude (comma-separated)
- `--changed-only` - Only analyze files changed in current branch/PR
- `--base-branch <branch>` - Base branch for changed files comparison (default: main)
- `--silent` - Suppress console output except errors
- `--verbose` - Enable verbose logging

**Examples:**
```bash
# Basic analysis with default settings
baseline-lens-cli analyze

# Analyze with custom threshold and fail conditions
baseline-lens-cli analyze --threshold 95 --fail-on medium

# Generate JUnit report for CI/CD
baseline-lens-cli analyze --format junit --output test-results.xml

# Analyze specific file types only
baseline-lens-cli analyze --include "**/*.css,**/*.js" --exclude "**/node_modules/**"

# Analyze only changed files (great for CI/CD performance)
baseline-lens-cli analyze --changed-only

# Compare against specific base branch
baseline-lens-cli analyze --changed-only --base-branch develop
```

### `init-ci` - CI/CD Configuration

Generate CI/CD configuration files with Baseline Lens integration.

```bash
baseline-lens-cli init-ci [options]
```

**Options:**
- `-t, --type <type>` - CI/CD platform: `github`, `gitlab`, `azure`, `jenkins` (default: github)
- `-o, --output <output>` - Output directory (default: .github/workflows)
- `-c, --config <config>` - Configuration file path
- `--fail-on <level>` - Fail build on risk level (default: high)
- `--threshold <threshold>` - Support threshold percentage (default: 90)
- `--changed-only` - Add changed-files-only mode to CI/CD config
- `--overwrite` - Overwrite existing CI/CD files instead of appending

**Examples:**
```bash
# Append to existing GitHub Actions workflow
baseline-lens-cli init-ci --type github

# Generate new GitLab CI configuration
baseline-lens-cli init-ci --type gitlab --overwrite

# Custom output directory and settings
baseline-lens-cli init-ci --type azure --output .azure --threshold 95

# Generate CI config that only analyzes changed files
baseline-lens-cli init-ci --type github --changed-only
```

### `validate-config` - Configuration Validation

Validate your Baseline Lens configuration file.

```bash
baseline-lens-cli validate-config [options]
```

**Options:**
- `-c, --config <config>` - Configuration file path (default: .baseline-lens.json)

### `show-config` - Display Configuration

Display current configuration settings.

```bash
baseline-lens-cli show-config [options]
```

**Options:**
- `-c, --config <config>` - Configuration file path (default: .baseline-lens.json)
- `-f, --format <format>` - Output format: `json`, `table` (default: table)

### `feature` - Feature Lookup

Look up information about a specific web feature.

```bash
baseline-lens-cli feature <feature-id> [options]
```

**Options:**
- `-f, --format <format>` - Output format: `json`, `table` (default: table)

**Examples:**
```bash
baseline-lens-cli feature css-grid
baseline-lens-cli feature container-queries --format json
```

### `list-features` - List Features

List all supported web features with filtering options.

```bash
baseline-lens-cli list-features [options]
```

**Options:**
- `-t, --type <type>` - Feature type: `css`, `javascript`, `html`, `all` (default: all)
- `-s, --status <status>` - Baseline status: `widely_available`, `newly_available`, `limited_availability`, `all` (default: all)
- `-f, --format <format>` - Output format: `json`, `table`, `csv` (default: table)
- `--limit <limit>` - Limit number of results (default: 50)

**Examples:**
```bash
# List all CSS features
baseline-lens-cli list-features --type css

# List newly available features
baseline-lens-cli list-features --status newly_available

# Export to CSV
baseline-lens-cli list-features --format csv --limit 100
```

## Configuration

### Configuration File

Create `.baseline-lens.json` in your project root:

```json
{
  "supportThreshold": 90,
  "failOn": "high",
  "outputFormat": "json",
  "maxFileSize": 10485760,
  "analysisTimeout": 30000,
  "enabledAnalyzers": {
    "css": true,
    "javascript": true,
    "html": true
  },
  "includePatterns": [
    "**/*.css",
    "**/*.scss",
    "**/*.js",
    "**/*.jsx",
    "**/*.ts",
    "**/*.tsx",
    "**/*.html",
    "**/*.vue",
    "**/*.svelte"
  ],
  "excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**"
  ],
  "customBrowserMatrix": [
    "chrome >= 90",
    "firefox >= 88",
    "safari >= 14",
    "edge >= 90"
  ]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `supportThreshold` | number | 90 | Minimum browser support percentage |
| `failOn` | string | "high" | Build failure threshold (high/medium/low) |
| `outputFormat` | string | "json" | Default output format |
| `maxFileSize` | number | 10MB | Maximum file size to analyze |
| `analysisTimeout` | number | 30000 | Analysis timeout in milliseconds |
| `enabledAnalyzers` | object | all true | Enable/disable specific analyzers |
| `includePatterns` | array | web files | File patterns to include |
| `excludePatterns` | array | build dirs | File patterns to exclude |
| `customBrowserMatrix` | array | [] | Custom browser support requirements |

## CI/CD Integration

### GitHub Actions

The CLI automatically detects existing workflows and appends Baseline Lens jobs:

```yaml
# Existing workflow.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  # Baseline Lens job gets appended here
  baseline-lens:
    runs-on: ubuntu-latest  # Inherits from existing jobs
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'  # Inherits from existing setup
      - run: npm install -g baseline-lens-cli
      - run: baseline-lens-cli analyze --fail-on high --format junit
```

### GitLab CI

Appends to existing `.gitlab-ci.yml`:

```yaml
# Existing .gitlab-ci.yml
stages:
  - test
  - deploy

test:
  stage: test
  image: node:18
  script:
    - npm test

# Baseline Lens job gets appended
baseline-lens:
  stage: test
  image: node:18  # Inherits from existing jobs
  script:
    - npm install -g baseline-lens-cli
    - baseline-lens-cli analyze --fail-on high --format junit
  artifacts:
    reports:
      junit: baseline-report.xml
```

### Configuration Inheritance

The CLI intelligently inherits configuration from existing CI/CD files:

- **Runner OS**: Detects `runs-on` values in GitHub Actions
- **Node.js Version**: Extracts `node-version` from setup steps
- **Docker Images**: Uses existing `image` values in GitLab CI
- **Environment**: Maintains consistency with existing setup

## Output Formats

### JSON Format

Structured data suitable for programmatic processing:

```json
{
  "summary": {
    "totalFeatures": 15,
    "widelyAvailable": 10,
    "newlyAvailable": 3,
    "limitedAvailability": 2
  },
  "features": [
    {
      "name": "CSS Grid",
      "status": "widely_available",
      "support": 96.5,
      "files": ["src/styles.css"]
    }
  ],
  "errors": []
}
```

### Markdown Format

Human-readable reports for documentation:

```markdown
# Baseline Lens Compatibility Report

## Summary
- **Total Features**: 15
- **Widely Available**: 10 ✅
- **Newly Available**: 3 ⚠️
- **Limited Availability**: 2 🚫

## Feature Details

### ✅ Widely Available
- CSS Grid (96.5% support)
- Flexbox (98.2% support)

### ⚠️ Newly Available
- Container Queries (75.3% support)
```

### JUnit Format

XML format for CI/CD test reporting:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Baseline Lens" tests="15" failures="2">
    <testcase name="CSS Grid" classname="widely_available"/>
    <testcase name="Container Queries" classname="newly_available">
      <failure message="Limited browser support: 75.3%"/>
    </testcase>
  </testsuite>
</testsuites>
```

## Examples

### Basic Project Analysis

```bash
# Analyze current directory
baseline-lens-cli analyze

# Output:
# 🔍 Starting Baseline Lens analysis...
# Analyzing 25 files... (100%)
# 
# ✅ Analysis completed successfully
# 📊 Found 12 web features across 25 files
#    • 8 widely available
#    • 3 newly available  
#    • 1 limited availability
```

### Conditional Execution (Performance Optimization)

```bash
# Analyze only files changed in current PR/branch
baseline-lens-cli analyze --changed-only

# Output:
# 🔍 Analyzing 3 changed files...
#   - src/components/Button.tsx
#   - src/styles/main.css
#   - src/utils/helpers.js
# ✅ Analysis completed successfully
```

### Custom Configuration

```bash
# Create custom config
cat > .baseline-lens.json << EOF
{
  "supportThreshold": 95,
  "failOn": "medium",
  "excludePatterns": ["**/legacy/**"]
}
EOF

# Run analysis with custom config
baseline-lens-cli analyze --config .baseline-lens.json
```

### CI/CD Pipeline Integration

```bash
# Set up GitHub Actions
baseline-lens-cli init-ci --type github --threshold 95 --fail-on medium

# The generated workflow will:
# 1. Detect existing runner configuration
# 2. Append Baseline Lens job
# 3. Generate JUnit reports
# 4. Fail builds on compatibility issues
```

### Feature Research

```bash
# Look up specific feature
baseline-lens-cli feature css-container-queries

# List all newly available CSS features
baseline-lens-cli list-features --type css --status newly_available

# Export feature list for analysis
baseline-lens-cli list-features --format csv > features.csv
```

## Troubleshooting

### Common Issues

**1. "No files found to analyze"**
```bash
# Check include/exclude patterns
baseline-lens-cli analyze --include "**/*.{css,js,html}" --verbose
```

**2. "Configuration validation failed"**
```bash
# Validate and fix configuration
baseline-lens-cli validate-config
baseline-lens-cli show-config --format json
```

**3. "Build failed: compatibility issues"**
```bash
# Adjust failure threshold
baseline-lens-cli analyze --fail-on low --threshold 80

# Or exclude problematic patterns
baseline-lens-cli analyze --exclude "**/vendor/**,**/polyfills/**"
```

**4. "CI/CD configuration not appending correctly"**
```bash
# Use overwrite to generate new file
baseline-lens-cli init-ci --type github --overwrite

# Check existing file structure
cat .github/workflows/ci.yml
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
baseline-lens-cli analyze --verbose
```

### Performance Issues

For large projects:

```bash
# Use changed-only mode for faster analysis
baseline-lens-cli analyze --changed-only

# Limit file size
baseline-lens-cli analyze --config custom-config.json

# custom-config.json:
{
  "maxFileSize": 5242880,
  "analysisTimeout": 60000,
  "excludePatterns": ["**/node_modules/**", "**/dist/**"]
}
```

### Getting Help

- **Documentation**: [GitHub Wiki](https://github.com/kwesinavilot/baseline-lens-cli/wiki)
- **Issues**: [GitHub Issues](https://github.com/kwesinavilot/baseline-lens-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kwesinavilot/baseline-lens-cli/discussions)

---

For more advanced usage and API documentation, see the [API Documentation](API_DOCUMENTATION.md).