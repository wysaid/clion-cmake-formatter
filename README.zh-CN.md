# CLion CMake 格式化工具

[![CI](https://github.com/wysaid/clion-cmake-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/wysaid/clion-cmake-formatter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-formatter)

一个 VS Code 扩展，使用 JetBrains CLion 的格式化风格来格式化 CMake 文件（`CMakeLists.txt` 和 `*.cmake`）。**零外部依赖** — 无需 Python、cmake-format 或 gersemi。

> **项目代号**: `cc-format` (CLion CMake Format)

[English](README.md) | 简体中文

## ✨ 功能特性

- 🎯 **CLion 兼容格式化** — 精确复刻 JetBrains CLion 的 CMake 格式化行为
- 🔧 **高度可配置** — 21 个配置选项，涵盖缩进、空格、换行等
- 📁 **项目级配置** — 支持 `.cc-format.jsonc` 文件，自动监听变化
- 🚀 **零依赖** — 纯 TypeScript 实现，快速可靠
- 🌍 **多语言支持** — 中英文界面
- ✅ **全面测试** — 126+ 单元测试，含幂等性验证

## 📦 安装

### 从 VS Code 市场安装

1. 打开 VS Code
2. 进入扩展 (`Ctrl+Shift+X`)
3. 搜索 "**CLion CMake Formatter**"
4. 点击 **安装**

### 从 VSIX 安装

1. 从 [Releases](https://github.com/wysaid/clion-cmake-formatter/releases) 页面下载 `.vsix` 文件
2. 在 VS Code 中，进入扩展 (`Ctrl+Shift+X`)
3. 点击 `...` → **从 VSIX 安装...**
4. 选择下载的文件

## 🚀 快速开始

### 格式化文档

- 打开 `CMakeLists.txt` 或 `*.cmake` 文件
- 按 `Shift+Alt+F` (Windows/Linux) 或 `Shift+Option+F` (Mac)
- 或右键 → **格式化文档**

### 启用保存时格式化

在 VS Code `settings.json` 中添加：

```json
{
  "[cmake]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "wysaid.clion-cmake-formatter"
  }
}
```

### 创建项目配置文件

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 运行 **CLion CMake 格式化工具: 创建默认配置文件**
3. 将在项目根目录创建 `.cc-format.jsonc` 文件

## 📋 示例

**格式化前：**
```cmake
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(MyProject)
SET(SOURCES src/main.cpp src/utils.cpp src/parser.cpp src/formatter.cpp src/renderer.cpp)
IF(WIN32)
TARGET_LINK_LIBRARIES(myapp ws2_32)
ENDIF()
```

**格式化后**（使用 `commandCase: "lowercase"`）：
```cmake
cmake_minimum_required(VERSION 3.10)
project(MyProject)
set(SOURCES
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
    src/formatter.cpp
    src/renderer.cpp)
if (WIN32)
    target_link_libraries(myapp ws2_32)
endif ()
```

## ⚙️ 配置

配置可通过以下方式设置：
1. **VS Code 设置** — 全局或工作区设置
2. **项目文件** — 项目根目录的 `.cc-format.jsonc`

### 主要选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `indentSize` | number | `4` | 每个缩进级别的空格数 (1-16) |
| `useTabs` | boolean | `false` | 使用制表符代替空格 |
| `commandCase` | string | `"unchanged"` | 命令大小写：`unchanged`、`lowercase`、`uppercase` |
| `lineLength` | number | `0` | 最大行长度 (0 = 不限制) |
| `maxBlankLines` | number | `2` | 最大连续空行数 (0-20) |
| `spaceBeforeIfParentheses` | boolean | `true` | `if()` 括号前空格 |
| `enableProjectConfig` | boolean | `true` | 启用 `.cc-format.jsonc` 读取 |

📖 查看下方[完整配置参考](#完整配置参考)了解全部 21 个选项。

### 项目配置文件

在项目根目录创建 `.cc-format.jsonc`：

```jsonc
// https://github.com/wysaid/clion-cmake-formatter
{
    "indentSize": 4,
    "commandCase": "lowercase",
    "spaceBeforeIfParentheses": true,
    "lineLength": 120
}
```

## 📖 完整配置参考

### 制表符和缩进

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `useTabs` | boolean | `false` | 使用制表符代替空格 |
| `tabSize` | number | `4` | 每个制表符的空格数 (1-16) |
| `indentSize` | number | `4` | 每个缩进级别的空格数 (1-16) |
| `continuationIndentSize` | number | `4` | 续行缩进 (1-16) |
| `keepIndentOnEmptyLines` | boolean | `false` | 空行保留缩进 |

### 括号前空格

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `spaceBeforeCommandDefinitionParentheses` | boolean | `false` | `function()` / `macro()` |
| `spaceBeforeCommandCallParentheses` | boolean | `false` | 常规命令 |
| `spaceBeforeIfParentheses` | boolean | `true` | `if()` / `elseif()` / `else()` / `endif()` |
| `spaceBeforeForeachParentheses` | boolean | `true` | `foreach()` / `endforeach()` |
| `spaceBeforeWhileParentheses` | boolean | `true` | `while()` / `endwhile()` |

### 括号内空格

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `spaceInsideCommandDefinitionParentheses` | boolean | `false` | `function( )` / `macro( )` |
| `spaceInsideCommandCallParentheses` | boolean | `false` | 常规命令 |
| `spaceInsideIfParentheses` | boolean | `false` | `if( )` 语句 |
| `spaceInsideForeachParentheses` | boolean | `false` | `foreach( )` 循环 |
| `spaceInsideWhileParentheses` | boolean | `false` | `while( )` 循环 |

### 换行和对齐

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `lineLength` | number | `0` | 最大行长度 (0 = 不限制，非零最小 30) |
| `alignMultiLineArguments` | boolean | `false` | 垂直对齐参数 |
| `alignMultiLineParentheses` | boolean | `false` | 对齐右括号 |
| `alignControlFlowParentheses` | boolean | `false` | 对齐控制流括号 |

### 其他选项

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `commandCase` | string | `"unchanged"` | `unchanged`、`lowercase` 或 `uppercase` |
| `maxBlankLines` | number | `2` | 最大连续空行数 (0-20) |
| `enableProjectConfig` | boolean | `true` | 启用 `.cc-format.jsonc` 文件 |

## 🛠️ 开发

### 前提条件

- Node.js 18+
- npm

### 设置

```bash
git clone https://github.com/wysaid/clion-cmake-formatter.git
cd clion-cmake-formatter
npm install
npm run compile
npm run test:unit
```

### 可用脚本

| 脚本 | 描述 |
|------|------|
| `npm run compile` | 编译 TypeScript |
| `npm run watch` | 监听模式编译 |
| `npm run lint` | 运行 ESLint |
| `npm run test:unit` | 运行所有单元测试 |
| `npm run package` | 打包为 `.vsix` |

### 项目结构

```
clion-cmake-formatter/
├── src/
│   ├── parser.ts      # CMake 分词器和 AST 构建器
│   ├── formatter.ts   # 格式化逻辑
│   ├── config.ts      # 配置文件支持
│   └── extension.ts   # VS Code 集成
├── test/
│   └── datasets/      # 测试数据
├── resources/
│   └── cc-format.schema.json  # JSON Schema
└── docs/              # 其他文档
```

### 调试

1. 在 VS Code 中打开此项目
2. 按 `F5` 或进入 **运行和调试**
3. 选择 **Launch Extension**
4. 新的 VS Code 窗口将打开并加载扩展

## 📊 测试覆盖

- **126+ 单元测试** 覆盖解析器、格式化器和配置
- **幂等性测试** — 格式化两次产生相同输出
- **CMake 官方测试** — CMake 仓库的 20 个文件 (6,302 行)
- **100% 通过率** ✅

## 🔄 与 CLion 的差异

本扩展旨在兼容 CLion，但有一个有意的差异：

**循环控制命令**（`break`/`continue`）：遵循其父循环（`foreach`/`while`）相同的空格规则，而 CLion 对这些命令忽略空格规则。

```cmake
# 当 spaceBeforeForeachParentheses: true 时
foreach (item IN LISTS items)
    break ()      # 与 foreach () 保持一致
endforeach ()
```

## 📜 许可证

[MIT](LICENSE) © [wysaid](https://github.com/wysaid)

## 🙏 致谢

- [ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin) — VS Code 扩展开发实践
- [cmake_format](https://github.com/cheshirekow/cmake_format) — 配置选项灵感来源

## 🔗 链接

- [VS Code 市场](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-formatter)
- [GitHub 仓库](https://github.com/wysaid/clion-cmake-formatter)
- [问题反馈](https://github.com/wysaid/clion-cmake-formatter/issues)
- [更新日志](CHANGELOG.md)
