# Baseline Lens CLI

CLI tool for web feature compatibility analysis using Baseline data.

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
baseline-lens-cli init-ci --type github
baseline-lens-cli init-ci --type gitlab --output .gitlab-ci
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

Create `.baseline-lens.json`:

```json
{
  "supportThreshold": 90,
  "enabledAnalyzers": {
    "css": true,
    "javascript": true,
    "html": true
  },
  "excludePatterns": ["**/node_modules/**"],
  "failOn": "high"
}
```