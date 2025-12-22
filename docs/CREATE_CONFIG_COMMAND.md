# Create Default Configuration File Command

## Feature Overview

This feature adds a command to the CLion CMake Format plugin that quickly creates a `.cc-format.jsonc` default configuration file in the project's git root directory.

## Usage

### Via Command Palette

1. Open any file in VS Code (or ensure a workspace folder is open)
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type and select **"CLion CMake Format: Create Default Configuration File"**
4. The configuration file will be created in the project's git root directory

## Features

### Smart Git Root Detection

- **Active Document Priority**: If there's an active document, start searching from its directory
- **Git Submodule Handling**: Correctly identifies and handles git submodules (checks `.git` file content)
- **Workspace Fallback**: Uses workspace folders if no active document or git root found
- **Multi-workspace Support**: Searches for git repositories across multiple workspace folders

### Default Configuration

The generated configuration file uses the plugin's default parameters, meaning loading this configuration file won't change any formatting behavior (same as not using a configuration file). This allows users to:

1. See all available configuration options
2. Understand the default value of each option
3. Modify specific options as needed

### Configuration File Format

- **Filename**: `.cc-format.jsonc`
- **Format**: JSONC (JSON with Comments)
- **Required Header**: First line must be `// https://github.com/wysaid/clion-cmake-format`
- **Auto-open**: Automatically opens in editor after creation

### Conflict Handling

If the configuration file already exists, prompts the user to:
- **Overwrite**: Replace existing configuration file
- **Cancel**: Keep existing configuration file

## Technical Implementation

### Git Root Detection Logic

```typescript
function findGitRoot(startPath: string): string | null {
    // Traverse upward from start path

    // Check for .git directory or file

    // If directory -> regular git repository

    // If file -> git submodule (check "gitdir:" prefix)

    // Continue upward until found or reach root
}
```

### Configuration File Priority

1. `.cc-format.jsonc`
2. `.cc-format`

The plugin searches upward from the document's directory and uses the first configuration file found.

## Examples

### Generated Configuration File Example

```jsonc
// https://github.com/wysaid/clion-cmake-format
{
    // Tab and Indentation
    "useTabs": false,
    "tabSize": 4,
    "indentSize": 4,
    "continuationIndentSize": 4,
    "keepIndentOnEmptyLines": false,

    // Spacing Before Parentheses
    "spaceBeforeCommandDefinitionParentheses": false,
    "spaceBeforeCommandCallParentheses": false,
    "spaceBeforeIfParentheses": true,
    "spaceBeforeForeachParentheses": true,
    "spaceBeforeWhileParentheses": true,

    // Spacing Inside Parentheses
    "spaceInsideCommandDefinitionParentheses": false,
    "spaceInsideCommandCallParentheses": false,
    "spaceInsideIfParentheses": false,
    "spaceInsideForeachParentheses": false,
    "spaceInsideWhileParentheses": false,

    // Blank Lines
    "maxBlankLines": 2,
    "maxTrailingBlankLines": 0,

    // Command Case: "unchanged", "lowercase", or "uppercase"
    "commandCase": "unchanged",

    // Line Wrapping and Alignment
    "lineLength": 0,
    "alignMultiLineArguments": false,
    "alignMultiLineParentheses": false,
    "alignControlFlowParentheses": false
}
```

## Related Files

- `src/extension.ts` - Command implementation and git root detection logic
- `src/config.ts` - Configuration file generation and parsing
- `package.json` - Command registration
- `package.nls.json` / `package.nls.zh-cn.json` - Multi-language support
