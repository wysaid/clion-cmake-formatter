# Changelog

All notable changes to the CLion CMake Formatter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ⚠️ Breaking Changes

- **Changed default `lineLength` from 120 to 0 (unlimited)**: The formatter will no longer wrap lines by default. This provides a better out-of-box experience that matches user expectations.
  - **Migration**: If you want to preserve the previous line-wrapping behavior, explicitly set `"clionCMakeFormatter.lineLength": 120` (or your preferred value like 80, 100) in your VS Code settings.

### Added

- **Comprehensive numeric configuration validation**: All numeric settings now have safety limits to prevent invalid configurations
  - `tabSize`, `indentSize`, `continuationIndentSize`: Valid range 1-16 (automatically clamped)
  - `maxBlankLines`: Valid range 0-20 (automatically clamped)
  - `lineLength`: 0 (unlimited) or minimum 30 for non-zero values
- **Automatic value correction with user warnings**: When an out-of-range value is detected, it's automatically corrected to the nearest valid value, and a warning is shown once per session
- **New documentation**: Added `docs/CONFIGURATION_VALIDATION.md` with detailed validation rules, rationale, and best practices

### Changed

- Default `lineLength` changed from 120 to 0 (unlimited) - see Breaking Changes above
- Configuration descriptions updated to include valid ranges in English and Chinese
- Formatter logic optimized to handle `lineLength = 0` as unlimited

### Fixed

- Removed unused `defaultValue` parameter from validation functions (lint fix)

## [0.1.0] - 2024-01-01

### Added

- Initial release
- CMake parser with tokenizer and AST builder
- CLion-compatible formatting rules:
  - Lowercase command names
  - 4-space indentation (configurable)
  - 120-character line length (configurable)
  - Multi-line command support
  - Block indentation for if/function/macro/foreach/while
- VSCode integration:
  - Document formatting provider
  - Range formatting provider
  - Format-on-save support
- Configuration options:
  - `clionCMakeFormatter.lineLength`
  - `clionCMakeFormatter.indentSize`
  - `clionCMakeFormatter.useSpaces`
- Support for:
  - Quoted arguments
  - Bracket arguments
  - Line comments
  - Bracket comments
  - Nested blocks
