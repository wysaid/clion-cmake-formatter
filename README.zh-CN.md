# CLion CMake 格式化工具

[![CI](https://github.com/wysaid/clion-cmake-format/actions/workflows/ci.yml/badge.svg)](https://github.com/wysaid/clion-cmake-format/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/wysaid.clion-cmake-format)](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)
[![npm](https://img.shields.io/npm/v/cc-format)](https://www.npmjs.com/package/cc-format)

**专业级 CMake 代码格式化工具** — 使用 JetBrains CLion 成熟的格式化风格，格式化您的 `CMakeLists.txt` 和 `*.cmake` 文件。**零外部依赖** — 无需 Python、cmake-format 或 gersemi。纯 TypeScript 实现，极速快捷。

提供多种使用方式：

- 🔌 **VS Code 扩展** — [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)
- 💻 **命令行工具** — [npm 包](https://www.npmjs.com/package/cc-format)
- 📦 **核心库** — [@cc-format/core](https://www.npmjs.com/package/@cc-format/core) 供开发者使用

> **为什么选择这个格式化工具？** 精准、可配置、零麻烦。如果您重视简洁、可维护的 CMake 脚本，这就是您的选择。

[English](README.md) | 简体中文

## 📦 Monorepo 架构

本项目采用 **monorepo** 架构组织，包含三个协同工作的包，提供全方位的 CMake 格式化解决方案：

| 包 | 说明 | npm 包 |
|---------|-------------|-------------|
| **[@cc-format/core](packages/core/)** | 核心格式化引擎，零依赖。纯 TypeScript 解析器和格式化器，可集成到任何 JavaScript/TypeScript 项目中 | [@cc-format/core](https://www.npmjs.com/package/@cc-format/core) |
| **[cc-format](packages/cli/)** | 命令行接口工具，用于终端使用、CI/CD 流水线和 pre-commit 钩子 | [cc-format](https://www.npmjs.com/package/cc-format) |
| **[clion-cmake-format](packages/vscode/)** | VS Code 扩展，提供无缝编辑器集成，支持保存时自动格式化 | [Marketplace](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format) |

三个包共享相同的核心格式化引擎，确保在不同环境中**结果一致**。无论您在编辑器中、通过命令行还是在自己的工具中以编程方式格式化文件，输出都是相同的。

## ✨ 为什么选择这个扩展？

### 🎯 CLion 品质格式化

精确复刻 JetBrains CLion 的 CMake 格式化 — 全球数百万专业开发者信赖的工具。让您的整个团队获得一致、可读的代码。

### ⚡ 零配置开箱即用

无需安装 Python。无需 pip 包。无需配置困扰。只需安装即可格式化 — 开箱即用。

### 🔧 完全可自定义

23 个配置选项让您完全掌控：

- **缩进**：制表符、空格、大小、续行
- **空格**：所有命令类型的括号前后空格
- **换行**：自定义长度、对齐规则
- **命令大小写**：小写、大写或保持不变
- **更多**：空行、项目配置、自动监听

### 📁 项目级配置文件

使用 `.cc-format.jsonc` 文件在团队间共享格式化规则。支持自动文件监听 — 更改立即生效。

### 🖼️ 可视化配置编辑器

在 VS Code 内使用友好的可视化界面编辑 `.cc-format.jsonc`。

[![可视化配置编辑器截图](images/config-editor.png)](images/config-editor.png)

### ✅ 经过充分测试

- **126+ 单元测试** 确保坚如磐石的可靠性
- **幂等性验证** — 格式化两次产生相同结果
- **CMake 官方测试** — CMake 仓库中的 20 个真实文件（6,302 行）
- **100% 通过率** ✅

### 🚀 性能卓越

纯 TypeScript 实现。无需生成外部进程。快速、可靠、高效。

## 🚀 快速开始

### 1️⃣ 安装

### 方式 A：从 VS Code 市场安装（推荐）

1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（Mac 用户按 `Cmd+Shift+X`）
3. 搜索 **"CLion CMake Format"**
4. 点击 **安装**

### 方式 B：从 VSIX 文件安装

1. 从 [Releases](https://github.com/wysaid/clion-cmake-format/releases) 下载 `.vsix` 文件
2. 在 VS Code 中打开扩展面板（`Ctrl+Shift+X`）
3. 点击 `...` → **从 VSIX 安装...**

### 2️⃣ 格式化代码

### 方法 1：键盘快捷键

- 打开任何 `CMakeLists.txt` 或 `*.cmake` 文件
- 按 `Shift+Alt+F`（Windows/Linux）或 `Shift+Option+F`（Mac）

### 方法 2：右键菜单

- 在编辑器中右键 → **格式化文档**

### 方法 3：保存时格式化（推荐）

在 VS Code `settings.json` 中添加：

```json
{
  "[cmake]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "wysaid.clion-cmake-format"
  }
}
```

### 3️⃣（可选）创建项目配置

与团队共享格式化规则：

1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. 运行 **"CLion CMake 格式化工具: 创建默认配置文件"**
3. 在项目根目录编辑 `.cc-format.jsonc`

更改会自动应用 — 无需重启！

---

## 💻 命令行工具 (npm 包)

同样的格式化功能也可以作为命令行工具使用，适用于 CI/CD 流水线、pre-commit 钩子或直接在终端中使用。

### 安装

```bash
# 全局安装
npm install -g cc-format

# 或使用 npx（无需安装）
npx cc-format --help
```

### 基本用法

```bash
# 格式化单个文件（输出到 stdout）
cc-format CMakeLists.txt

# 格式化并写回文件
cc-format -w CMakeLists.txt

# 格式化目录下所有 CMake 文件
cc-format -w src/

# 检查文件是否已格式化（用于 CI）
cc-format --check CMakeLists.txt

# 从 stdin 格式化
echo 'project(Test)' | cc-format --stdin
```

### CLI 选项

| 选项 | 描述 |
|------|------|
| `-w, --write` | 将格式化后的内容写回文件 |
| `-c, --check` | 检查文件是否已格式化（如未格式化则退出码为 1） |
| `--stdin` | 从 stdin 读取并输出到 stdout |
| `--no-project-config` | 忽略项目级 `.cc-format.jsonc` 文件 |
| `--command-case <case>` | 设置命令大小写：`unchanged`、`lowercase`、`uppercase` |
| `--indent-size <size>` | 缩进空格数 |
| `--use-tabs` | 使用制表符代替空格 |
| `--line-length <length>` | 最大行长度（0 表示不限制） |
| `--init` | 在当前目录创建 `.cc-format.jsonc` 配置文件 |
| `--init-global` | 创建全局配置文件 |
| `--config-path` | 显示全局配置文件路径 |

### 全局配置

CLI 支持用户级全局配置文件：

```bash
# 显示全局配置路径
cc-format --config-path
# 输出: ~/.config/cc-format/.cc-format.jsonc

# 创建全局配置
cc-format --init-global
```

全局配置文件使用与项目配置相同的格式。配置优先级：

1. CLI 选项（最高）
2. 项目配置（项目目录下的 `.cc-format.jsonc`）
3. 全局配置（`~/.config/cc-format/.cc-format.jsonc`）
4. 默认选项（最低）

### CI/CD 集成

```yaml
# GitHub Actions 示例
- name: 检查 CMake 格式化
  run: npx cc-format --check **/*.cmake CMakeLists.txt
```

```bash
# Pre-commit 钩子
#!/bin/sh
cc-format --check $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(cmake|CMakeLists\.txt)$') || exit 1
```

---

## 📋 格式化前后对比

### 示例 1：基本格式化

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

### 示例 2：复杂项目

无缝支持：

- ✅ 带参数的多行命令
- ✅ 嵌套 `if`/`else`/`endif` 块
- ✅ `foreach` 和 `while` 循环
- ✅ 函数和宏定义
- ✅ 注释（行内和独立）
- ✅ 引号字符串和转义序列
- ✅ 生成器表达式

## ⚙️ 配置选项

通过以下方式自定义格式化行为：

1. **VS Code 设置** — 全局或工作区级别
2. **项目配置文件** — 项目根目录的 `.cc-format.jsonc`（优先级更高）

### 常用配置选项

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `indentSize` | `4` | 每个缩进级别的空格数（1-16） |
| `useTabs` | `false` | 使用制表符代替空格 |
| `commandCase` | `"unchanged"` | 命令大小写：`unchanged` / `lowercase` / `uppercase`<br>⚠️ 模块命令（如 `FetchContent_Declare`、`ExternalProject_Add`）总是保持原有大小写 |
| `lineLength` | `0` | 最大行长度（0 = 不限制，设置时最小 30） |
| `maxBlankLines` | `2` | 最大连续空行数（0-20） |
| `maxTrailingBlankLines` | `1` | 文件末尾最大空行数（>= 0） |
| `spaceBeforeIfParentheses` | `true` | `if ()` / `elseif ()` / `endif ()` 括号前空格 |
| `spaceBeforeForeachParentheses` | `true` | `foreach ()` / `endforeach ()` 括号前空格 |
| `alignMultiLineArguments` | `false` | 垂直对齐参数 |
| `enableProjectConfig` | `true` | 启用读取 `.cc-format.jsonc` 文件 |

### 项目配置文件示例

在项目根目录创建 `.cc-format.jsonc`：

```jsonc
// https://github.com/wysaid/clion-cmake-format
{
    // Tab and Indentation
    "useTabs": false,
    "tabSize": 4,
    "indentSize": 4,
    "continuationIndentSize": 8,
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
    "maxTrailingBlankLines": 1,

    // Command Case: "unchanged", "lowercase", or "uppercase"
    "commandCase": "unchanged",

    // Line Wrapping and Alignment
    "lineLength": 0,
    "alignMultiLineArguments": false,
    "alignMultiLineParentheses": false,
    "alignControlFlowParentheses": false
}
```

📖 **[查看全部 23 个配置选项 →](https://github.com/wysaid/clion-cmake-format/blob/main/README.zh-CN.md#完整配置参考)**

## 📚 其他资源

- 📖 **[完整配置参考](#完整配置参考)** — 全部 22 个选项详解
- 🛠️ **[贡献指南](CONTRIBUTING.md)** — 开发设置、测试和贡献指南（英文）
- 📝 **[更新日志](CHANGELOG.md)** — 版本历史和更新
- 🐛 **[问题反馈](https://github.com/wysaid/clion-cmake-format/issues)** — 错误报告和功能请求
- 💬 **[讨论区](https://github.com/wysaid/clion-cmake-format/discussions)** — 问题和社区支持

---

## 📖 完整配置参考

> **⚠️ 注意**: 版本 1.3.0+ 将默认 `continuationIndentSize` 从 4 改为 8 以匹配 CLion 的默认值。如果您希望保持之前的默认值,请在 `.cc-format.jsonc` 文件中添加 `"continuationIndentSize": 4`。

### 制表符和缩进

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `useTabs` | boolean | `false` | 使用制表符代替空格 |
| `tabSize` | number | `4` | 每个制表符的空格数 (1-16) |
| `indentSize` | number | `4` | 每个缩进级别的空格数 (1-16) |
| `continuationIndentSize` | number | `8` | 续行缩进 (1-16) ⚠️ _v1.3.0 中从 4 改为 8_ |
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
| `maxTrailingBlankLines` | number | `1` | 文件末尾最大空行数 (>= 0，设置大数字保留所有) |
| `enableProjectConfig` | boolean | `true` | 启用 `.cc-format.jsonc` 文件 |

### 配置验证

配置值会自动验证，以防止常见错误，同时对不同的编码风格保持宽容：

#### 自动修正

当检测到无效值时，格式化器会自动将其修正为最接近的有效值，并显示警告消息。这确保即使配置不正确，格式化也能始终成功。

**验证规则：**

- **缩进大小**（`tabSize`、`indentSize`、`continuationIndentSize`）：有效范围 1-16
  - 支持紧凑（1-2 空格）和宽松（8-16 空格）的编码风格
  - 超出此范围的值会被限制到最近的边界

- **行长度**（`lineLength`）：0（不限制）或 ≥30
  - 0 表示不限制行长度（不换行）
  - 非零值小于 30 会被设置为 30，以防止过度换行
  - 确保即使基本的 CMake 命令也能保持可读性

- **空行数**（`maxBlankLines`）：有效范围 0-20
  - 防止意外的过多空白
  - 超过 20 个连续空行很少是有意为之的

- **尾部空行**（`maxTrailingBlankLines`）：≥0
  - 设置为较大的数字（如 1000）可保留所有尾部空行

**警告消息示例：**

```text
tabSize value 0 is out of range [1, 16]. Using minimum value 1.
lineLength value 10 is too small. Using minimum value 30.
maxBlankLines value 25 is out of range [0, 20]. Using maximum value 20.
```

---

## 💡 提示与最佳实践

### 格式化行为

- **幂等性**：格式化两次产生相同输出
- **注释保留**：所有注释（行内和独立）都会保留
- **空白处理**：智能空白规范化，不丢失数据
- **换行**：智能换行遵循 `lineLength` 设置

### 团队推荐设置

```jsonc
{
    "commandCase": "lowercase",           // 现代 CMake 约定
    "indentSize": 4,                      // 标准缩进
    "lineLength": 120,                    // 可读行长度
    "maxBlankLines": 1,                   // 紧凑格式
    "spaceBeforeIfParentheses": true,     // 清晰的控制流
    "spaceBeforeForeachParentheses": true,
    "spaceBeforeWhileParentheses": true
}
```

### 与 CLion 的差异

本扩展旨在兼容 CLion，但有**两个有意的增强**：

#### 1. 模块命令大小写保持

**模块命令保持其规范的 PascalCase 命名**，不受 `commandCase` 设置的影响：

```cmake
# 当 commandCase: "lowercase" 时
include(FetchContent)                    # 标准命令 → 小写
FetchContent_Declare(mylib)              # 模块命令 → 保持原大小写
FetchContent_MakeAvailable(mylib)        # 模块命令 → 保持原大小写

include(ExternalProject)                 # 标准命令 → 小写
ExternalProject_Add(somelib)             # 模块命令 → 保持原大小写

include(CheckCXXSourceCompiles)          # 标准命令 → 小写
check_cxx_source_compiles(...)           # 设计上就是小写 → 不变
```

**常见的保持大小写的模块命令**：

- `FetchContent_*`（Declare、MakeAvailable、Populate、GetProperties）
- `ExternalProject_*`（Add、Add_Step、Add_StepTargets）
- `GTest_*`（Add_Tests）、`GMock_*`（Add_Tests）
- `Qt5_*`、`Qt6_*`（Use_Modules、Add_Resources）
- `CPM_*`（AddPackage）
- 以及其他来自 CMake 模块的 PascalCase_PascalCase 模式命令

**注意**：某些模块如 `CheckCXXSourceCompiles` 提供的是小写命令（例如 `check_cxx_source_compiles`），这些命令不符合 PascalCase_PascalCase 模式，因此会按照 `commandCase` 设置进行转换。

**为什么？** CMake 模块作者使用特定的大小写（例如 `FetchContent_Declare`）来区分模块命令和标准命令。CLion 强制所有命令匹配 `commandCase` 设置，这可能会使模块命令不易识别。本工具保持它们的预期大小写，以提高可读性并与 CMake 文档保持一致。

#### 2. 循环控制命令

**循环控制命令**（`break`/`continue`）遵循其父循环的空格规则，提供更一致的格式化：

```cmake
# 当 spaceBeforeForeachParentheses: true 时
foreach (item IN LISTS items)
    if (condition)
        break ()      # 与 foreach () 保持一致
    endif ()
endforeach ()
```

_CLion 对 `break`/`continue` 忽略空格规则，可能会感觉不一致。_

---

## 🛠️ 开发者指南

想要贡献或自定义扩展？查看我们的 **[贡献指南](CONTRIBUTING.md)**（英文），了解：

- 🔧 开发环境设置
- 📜 可用的 pnpm 脚本
- 📂 项目结构概览
- 🐛 调试说明
- ✅ 测试指南
- 📝 代码风格和 PR 指南

**开发快速开始：**

```bash
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
pnpm install && pnpm run compile && pnpm run test:unit
```

---

## 📜 许可证

[MIT 许可证](LICENSE) © [wysaid](https://github.com/wysaid)

个人和商业使用均免费。

---

## 🙏 致谢

- **[JetBrains CLion](https://www.jetbrains.com/clion/)** — 格式化行为的灵感来源
- **[cmake_format](https://github.com/cheshirekow/cmake_format)** — 配置选项参考
- **[ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin)** — VS Code 扩展开发实践

---

## 🌟 支持本项目

如果这个扩展帮助了您，请考虑：

- ⭐ **[在 GitHub 上点赞](https://github.com/wysaid/clion-cmake-format)**
- ✍️ **[留下评价](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format&ssr=false#review-details)**
- 🐛 **[报告问题](https://github.com/wysaid/clion-cmake-format/issues)**
- 💬 **[分享反馈](https://github.com/wysaid/clion-cmake-format/discussions)**

谢谢您！🙌
