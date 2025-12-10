# Changelog

All notable changes to the CLion CMake Formatter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
