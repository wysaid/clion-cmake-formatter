# Formatting Tips Feature

## Overview

This extension now provides visual feedback when formatting CMake files, similar to CLion's formatting behavior.

## Features

### 1. No Changes Notification

When you format a file that is already well-formatted, you will see a status bar message:

```
No changes: content is already well-formatted - Reformat Code (Ctrl+Shift+I)
```

This helps you quickly understand that the file doesn't need any formatting changes.

### 2. Changed Lines Count

When formatting makes changes to the file, you will see how many lines were affected:

```
Formatted 9 lines - Reformat Code (Ctrl+Shift+I)
```

This gives you immediate feedback about the impact of the formatting operation.

### 3. Keybinding Display

The notification includes the current keybinding for the format command (if available), making it easier to remember the shortcut for future use.

**Note:** The keybinding shown depends on your VS Code configuration and may vary based on:
- Your operating system (Windows, Mac, Linux)
- Custom keybinding configurations
- Keyboard layout

## Implementation Details

### Changed Lines Calculation

The extension compares the original text with the formatted text line by line:
- Lines that are added, removed, or modified are counted as changed lines
- Empty lines and whitespace changes are included in the count
- The comparison is done after applying all formatting rules

### Status Bar Display

- Messages are displayed in the status bar for 3 seconds
- The keybinding is retrieved dynamically from VS Code's keybinding configuration
- If no keybinding is set, only the message without keybinding information is shown

## Usage

Simply format your CMake file using any of these methods:
- Right-click in the editor and select "Format Document"
- Use the keyboard shortcut (default: Ctrl+Shift+I on Windows/Linux, Cmd+Shift+I on Mac)
- Run the command "Format Document" from the command palette
- Use the extension command "CLion CMake Format: Format Document"

After formatting, check the status bar at the bottom of the VS Code window for the formatting result.

## Comparison with CLion

This feature is inspired by CLion's formatting feedback:

| Feature | CLion | This Extension |
|---------|-------|----------------|
| No changes message | ✅ | ✅ |
| Changed lines count | ✅ | ✅ |
| Keybinding display | ✅ | ✅ |
| Display location | Popup notification | Status bar message |
| Display duration | Persistent until dismissed | 3 seconds |

## Testing

To test this feature:

1. Open a well-formatted CMake file
2. Format it (Ctrl+Shift+I)
3. Observe the "No changes" message

4. Open a poorly formatted CMake file (e.g., `test-formatting-demo.cmake`)
5. Format it
6. Observe the "Formatted X lines" message

## Technical Notes

- The feature works with both document formatting and range formatting
- Line count is calculated before the actual text replacement happens
- The status bar message does not block the formatting operation
- Errors in displaying the notification do not affect the formatting result
