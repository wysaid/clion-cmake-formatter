# Create Default Configuration File Command

## 功能概述 / Feature Overview

这个功能为 CLion CMake Formatter 插件添加了一个命令，可以快速在项目的 git 根目录创建 `.cc-format.jsonc` 默认配置文件。

This feature adds a command to the CLion CMake Formatter plugin that quickly creates a `.cc-format.jsonc` default configuration file in the project's git root directory.

## 使用方法 / Usage

### 通过命令面板 / Via Command Palette

1. 在 VS Code 中打开任何文件（或确保有工作区文件夹打开）
2. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
3. 输入并选择 **"CLion CMake Formatter: Create Default Configuration File"**
4. 配置文件将在项目的 git 根目录创建

---

1. Open any file in VS Code (or ensure a workspace folder is open)
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type and select **"CLion CMake Formatter: Create Default Configuration File"**
4. The configuration file will be created in the project's git root directory

## 功能特点 / Features

### 智能 Git 根目录查找 / Smart Git Root Detection

- **活动文档优先**：如果有打开的文档，从该文档所在目录开始查找 git 根目录
- **处理 Git 子模块**：正确识别和处理 git submodule（检查 `.git` 文件内容）
- **工作区回退**：如果没有活动文档或未找到 git 根目录，使用工作区文件夹
- **多工作区支持**：在多个工作区文件夹中查找 git 仓库

---

- **Active Document Priority**: If there's an active document, start searching from its directory
- **Git Submodule Handling**: Correctly identifies and handles git submodules (checks `.git` file content)
- **Workspace Fallback**: Uses workspace folders if no active document or git root found
- **Multi-workspace Support**: Searches for git repositories across multiple workspace folders

### 默认配置 / Default Configuration

生成的配置文件使用插件的默认参数，这意味着加载这个配置文件不会改变任何格式化行为（与不使用配置文件时相同）。这样用户可以：

1. 看到所有可用的配置选项
2. 了解每个选项的默认值
3. 根据需要修改特定选项

---

The generated configuration file uses the plugin's default parameters, meaning loading this configuration file won't change any formatting behavior (same as not using a configuration file). This allows users to:

1. See all available configuration options
2. Understand the default value of each option
3. Modify specific options as needed

### 配置文件格式 / Configuration File Format

- **文件名**：`.cc-format.jsonc`
- **格式**：JSONC（支持注释的 JSON）
- **必需头部**：第一行必须是 `// https://github.com/wysaid/clion-cmake-format`
- **自动打开**：创建后自动在编辑器中打开

---

- **Filename**: `.cc-format.jsonc`
- **Format**: JSONC (JSON with Comments)
- **Required Header**: First line must be `// https://github.com/wysaid/clion-cmake-format`
- **Auto-open**: Automatically opens in editor after creation

### 冲突处理 / Conflict Handling

如果配置文件已存在，会提示用户选择：
- **覆盖**：替换现有配置文件
- **取消**：保留现有配置文件

---

If the configuration file already exists, prompts the user to:
- **Overwrite**: Replace existing configuration file
- **Cancel**: Keep existing configuration file

## 技术实现 / Technical Implementation

### Git 根目录查找逻辑 / Git Root Detection Logic

```typescript
function findGitRoot(startPath: string): string | null {
    // 从起始路径向上遍历
    // Traverse upward from start path

    // 检查 .git 目录或文件
    // Check for .git directory or file

    // 如果是目录 -> 常规 git 仓库
    // If directory -> regular git repository

    // 如果是文件 -> git submodule（检查 "gitdir:" 前缀）
    // If file -> git submodule (check "gitdir:" prefix)

    // 继续向上直到找到或到达根目录
    // Continue upward until found or reach root
}
```

### 配置文件优先级 / Configuration File Priority

1. `.cc-format.jsonc`
2. `.cc-format`

插件会从文档所在目录开始向上搜索，使用第一个找到的配置文件。

---

The plugin searches upward from the document's directory and uses the first configuration file found.

## 示例 / Examples

### 生成的配置文件示例 / Generated Configuration File Example

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

    // Command Case: "unchanged", "lowercase", or "uppercase"
    "commandCase": "unchanged",

    // Line Wrapping and Alignment
    "lineLength": 0,
    "alignMultiLineArguments": false,
    "alignMultiLineParentheses": false,
    "alignControlFlowParentheses": false
}
```

## 相关文件 / Related Files

- `src/extension.ts` - 命令实现和 git 根目录查找逻辑
- `src/config.ts` - 配置文件生成和解析
- `package.json` - 命令注册
- `package.nls.json` / `package.nls.zh-cn.json` - 多语言支持

---

- `src/extension.ts` - Command implementation and git root detection logic
- `src/config.ts` - Configuration file generation and parsing
- `package.json` - Command registration
- `package.nls.json` / `package.nls.zh-cn.json` - Multi-language support
