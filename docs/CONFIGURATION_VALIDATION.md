# Configuration Validation and Safety Limits

This document describes the validation rules applied to numeric configuration values to prevent invalid or extreme settings that could produce poor formatting results.

## Design Philosophy

The validation limits are intentionally **permissive** to allow for diverse coding styles while preventing truly problematic values:

- **Allow uncommon preferences**: Users with non-mainstream formatting preferences (e.g., 1-space or 12-space indents) are fully supported
- **Prevent obvious mistakes**: Only block values that would clearly break formatting (e.g., 0 spaces, negative numbers, or absurdly large values like 1000)
- **Helpful warnings**: When invalid values are corrected, users receive clear feedback about what was changed and why

## Validation Rules

### Tab and Indentation Settings

| Setting | Valid Range | Default | Description |
|---------|-------------|---------|-------------|
| `tabSize` | 1-16 | 4 | Values outside this range are automatically clamped to the nearest boundary |
| `indentSize` | 1-16 | 4 | Values outside this range are automatically clamped to the nearest boundary |
| `continuationIndentSize` | 1-16 | 4 | Values outside this range are automatically clamped to the nearest boundary |

**Rationale**: Indent sizes smaller than 1 are meaningless, and sizes larger than 16 spaces create excessive indentation. The range allows for both compact (1-2 spaces) and spacious (8-16 spaces) coding styles.

### Blank Lines

| Setting | Valid Range | Default | Description |
|---------|-------------|---------|-------------|
| `maxBlankLines` | 0-20 | 2 | Values outside this range are automatically clamped to the nearest boundary |

**Rationale**:
- 0 blank lines removes all spacing between logical sections
- More than 20 consecutive blank lines is rarely intentional and likely indicates a mistake- Trailing blank lines at end of file should be minimal (0-1) to avoid excessive whitespace
### Line Length

| Setting | Valid Range | Default | Description |
|---------|-------------|---------|-------------|
| `lineLength` | 0 or ≥30 | 0 | 0 means unlimited; non-zero values less than 30 are automatically set to 30 |

**Rationale**:
- 0 is a special value meaning "unlimited" (no line wrapping)
- Lines shorter than 30 characters are too restrictive for typical CMake commands
- This prevents formatting issues where even basic commands would require excessive wrapping

## Behavior

When an invalid value is detected:

1. **Automatic Correction**: The value is automatically adjusted to the nearest valid value
2. **User Notification**: A warning message is displayed explaining the correction
3. **Formatting Proceeds**: The formatter continues with the corrected value

### Example Warning Messages

```
tabSize value 0 is out of range [1, 16]. Using minimum value 1.
indentSize value 20 is out of range [1, 16]. Using maximum value 16.
lineLength value 10 is too small. Using minimum value 30.
maxBlankLines value 25 is out of range [0, 20]. Using maximum value 20.
```

## Best Practices

### Recommended Settings

For most projects, the default values provide good results:

```json
{
  "clionCMakeFormatter.tabSize": 4,
  "clionCMakeFormatter.indentSize": 4,
  "clionCMakeFormatter.continuationIndentSize": 4,
  "clionCMakeFormatter.maxBlankLines": 2,
  "clionCMakeFormatter.lineLength": 0
}
```

### Common Scenarios

**Compact Style** (minimum whitespace):
```json
{
  "clionCMakeFormatter.indentSize": 2,
  "clionCMakeFormatter.continuationIndentSize": 2,
  "clionCMakeFormatter.maxBlankLines": 1,
  "clionCMakeFormatter.lineLength": 80
}
```

**Spacious Style** (maximum readability):
```json
{
  "clionCMakeFormatter.indentSize": 4,
  "clionCMakeFormatter.continuationIndentSize": 4,
  "clionCMakeFormatter.maxBlankLines": 3,
  "clionCMakeFormatter.lineLength": 0
}
```

**Tab-based Style**:
```json
{
  "clionCMakeFormatter.useTabs": true,
  "clionCMakeFormatter.tabSize": 4,
  "clionCMakeFormatter.lineLength": 0
}
```

## Rationale for Limits

These limits are based on:

1. **Industry Standards**: Common practices in software development
2. **Readability Research**: Studies on code comprehension
3. **CLion Behavior**: Alignment with JetBrains CLion's sensible defaults
4. **Practical Experience**: Real-world CMake project requirements

## Disabling Validation (Not Recommended)

The validation logic is built into the extension and cannot be disabled. This is intentional to prevent:

- Accidentally breaking formatting with typos
- Configuration files with invalid or extreme values
- Poor user experience from malformed output

If you believe a validation limit is too restrictive for your use case, please [open an issue](https://github.com/wysaid/clion-cmake-format/issues) to discuss adjusting the limits.
