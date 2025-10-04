# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2025-01-03

### Added
- Smart CI/CD configuration detection and appending
- `--overwrite` flag for init-ci command to generate new files instead of appending
- Automatic detection of existing GitHub Actions, GitLab CI, Azure Pipelines, and Jenkins files
- Intelligent insertion of Baseline Lens jobs into existing CI/CD workflows

### Changed
- `init-ci` command now appends to existing CI/CD files by default
- Improved CI/CD configuration generation with better integration patterns

## [0.3.0] - 2025-10-02

### Fixed
- TypeScript compilation errors
- Import path issues
- Type interface compatibility
- Reporter formatting and error handling
- Missing dependencies and configurations

## [0.2.0] - 2025-10-02

### Added
- Initial release of Baseline Lens CLI
- Project analysis command with web feature compatibility detection
- CI/CD configuration generation for GitHub, GitLab, Azure DevOps, and Jenkins
- Configuration validation and management
- Feature lookup and listing capabilities
- Real web-features database integration with 1000+ features
- Browser compatibility data from MDN
- CSS property, selector, and at-rule analysis
- JavaScript API and syntax detection
- HTML element and attribute checking
- Multiple output formats (JSON, Markdown, JUnit)
- Progress reporting and error handling
- Configurable analysis thresholds and failure conditions
- File pattern inclusion/exclusion support
- Team configuration sharing capabilities

### Dependencies
- web-features ^0.8.0 for baseline compatibility data
- @mdn/browser-compat-data ^5.3.0 for browser support information
- commander ^11.0.0 for CLI interface
- chalk ^4.1.2 for colored output
- glob ^10.3.0 for file pattern matching
- ora ^5.4.1 for progress indicators
- postcss ^8.4.0 for CSS parsing
- acorn ^8.10.0 for JavaScript AST parsing

[Unreleased]: https://github.com/kwesinavilot/baseline-lens-cli/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/kwesinavilot/baseline-lens-cli/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kwesinavilot/baseline-lens-cli/releases/tag/v0.3.0
[0.2.0]: https://github.com/kwesinavilot/baseline-lens-cli/releases/tag/v0.2.0