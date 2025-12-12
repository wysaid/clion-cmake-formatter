# CLion CMake 格式化工具 (cc-format)

一个专业的 VSCode 扩展，使用 JetBrains CLion 的格式化规范来格式化 CMake 文件（CMakeLists.txt 和 .cmake）。**零外部依赖** - 无需 Python、cmake-format 或 gersemi。

> **项目代号**: `cc-format` (CLion CMake Format)

[English](README.md) | 简体中文

## 功能特性

- **CLion 兼容格式化**: 精确复刻 JetBrains CLion 的 CMake 格式化行为
- **可配置的命令大小写**: 支持小写、大写或保持不变的命令名称
- **智能缩进**: 可配置的缩进方式，支持控制结构的正确嵌套
- **智能换行**: 自动换行过长的参数列表并提供正确的连续缩进
- **块结构支持**: 正确缩进 `if/endif`、`function/endfunction`、`macro/endmacro`、`foreach/endforeach`、`while/endwhile` 块
- **注释保留**: 保持内联注释和尾随注释在原始位置
- **灵活的空格设置**: 提供丰富的括号前后空格选项
- **多行对齐**: 可选的多行命令参数对齐功能
- **保存时格式化**: 与 VSCode 的保存时格式化功能无缝集成
- **项目级配置**: 支持 `.cc-format.jsonc` 配置文件
- **配置文件缓存**: 通过自动文件监听优化性能
- **纯 TypeScript 实现**: 无外部依赖，快速可靠

## 安装

### 从 VSCode 市场安装

1. 打开 VSCode
2. 进入扩展 (Ctrl+Shift+X)
3. 搜索 "CLion CMake Formatter"
4. 点击安装

### 从 VSIX 文件安装

1. 从 [releases 页面](https://github.com/wysaid/clion-cmake-formatter/releases) 下载 `.vsix` 文件
2. 在 VSCode 中，进入扩展 (Ctrl+Shift+X)
3. 点击 "..." 菜单，选择 "从 VSIX 安装..."
4. 选择下载的文件

## 使用方法

### 格式化文档

- 打开 `CMakeLists.txt` 或 `.cmake` 文件
- 按 `Shift+Alt+F` (Windows/Linux) 或 `Shift+Option+F` (Mac)
- 或右键点击选择 "格式化文档"

### 创建默认配置文件

要快速设置项目特定的配置：

1. 打开项目中的任何文件（或确保工作区文件夹已打开）
2. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
3. 输入并选择 "CLion CMake 格式化工具: 创建默认配置文件"
4. 将在项目的 git 根目录中创建包含默认设置的 `.cc-format.jsonc` 文件

该命令会自动：
- 从活动文档的位置查找 git 根目录
- 正确处理 git 子模块
- 如果未找到 git 仓库，则回退到工作区文件夹
- 使用插件的默认配置值

### 保存时格式化

在 VSCode 设置 (`settings.json`) 中添加:

```json
{
  "[cmake]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "wysaid.clion-cmake-formatter"
  }
}
```

## 配置选项

本扩展支持所有主要的 CLion CMake 格式化选项。配置可通过以下方式设置：

1. **VSCode 设置**: 在 `settings.json` 中的全局或工作区设置
2. **项目配置文件**: 项目中的 `.cc-format.jsonc` 或 `.cc-format` 文件

### 项目配置文件 (`.cc-format.jsonc`)

对于项目特定的设置，可在项目根目录创建 `.cc-format.jsonc` 文件。该文件：

- 使用 JSONC 格式（支持注释的 JSON）
- 第一行必须是项目 URL 注释
- 会覆盖该目录及子目录中文件的 VSCode 设置
- 支持与 VSCode 设置相同的所有选项
- 自动监视文件变化（无需重启）

**`.cc-format.jsonc` 示例：**

```jsonc
// https://github.com/wysaid/clion-cmake-formatter
{
    // 制表符和缩进
    "useTabs": false,
    "tabSize": 4,
    "indentSize": 4,
    "continuationIndentSize": 4,
    "keepIndentOnEmptyLines": false,

    // 括号前空格
    "spaceBeforeCommandDefinitionParentheses": false,
    "spaceBeforeCommandCallParentheses": false,
    "spaceBeforeIfParentheses": true,
    "spaceBeforeForeachParentheses": true,
    "spaceBeforeWhileParentheses": true,

    // 括号内空格
    "spaceInsideCommandDefinitionParentheses": false,
    "spaceInsideCommandCallParentheses": false,
    "spaceInsideIfParentheses": false,
    "spaceInsideForeachParentheses": false,
    "spaceInsideWhileParentheses": false,

    // 空行
    "maxBlankLines": 2,

    // 命令大小写: "unchanged"（不变，默认值）、"lowercase"（小写）或 "uppercase"（大写）
    // 注意: 默认值为 "unchanged"，此处为演示自定义设置
    "commandCase": "lowercase",

    // 换行和对齐
    // 注意: 默认值为 0（不限制），此处设置自定义值
    "lineLength": 120,
    "alignMultiLineArguments": false,
    "alignMultiLineParentheses": false,
    "alignControlFlowParentheses": false
}
```

扩展会自动从文档所在目录开始向上搜索配置文件，直到工作区根目录。找到的第一个匹配文件将被使用。

**配置文件名（按优先级排序）：**
1. `.cc-format.jsonc`
2. `.cc-format`

你可以通过命令面板中的 "CLion CMake 格式化工具: 创建默认配置文件" 命令来创建包含所有默认设置的配置文件。

### VSCode 设置

可通过 VSCode 设置进行配置（文件 → 首选项 → 设置 或 `settings.json`）。

### 制表符和缩进

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `clionCMakeFormatter.useTabs` | boolean | `false` | 使用制表符而非空格进行缩进 |
| `clionCMakeFormatter.tabSize` | number | `4` | 每个制表符对应的空格数（范围: 1-16） |
| `clionCMakeFormatter.indentSize` | number | `4` | 每个缩进层级的空格数（范围: 1-16） |
| `clionCMakeFormatter.continuationIndentSize` | number | `4` | 多行命令的连续行额外缩进空格数（范围: 1-16） |
| `clionCMakeFormatter.keepIndentOnEmptyLines` | boolean | `false` | 在空行保留缩进 |

### 括号前空格

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `clionCMakeFormatter.spaceBeforeCommandDefinitionParentheses` | boolean | `false` | 在 `function` 和 `macro` 定义的括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeCommandCallParentheses` | boolean | `false` | 在常规命令调用的括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeIfParentheses` | boolean | `true` | 在 `if` 语句的括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeForeachParentheses` | boolean | `true` | 在 `foreach` 循环的括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeWhileParentheses` | boolean | `true` | 在 `while` 循环的括号前添加空格 |

### 括号内空格

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `clionCMakeFormatter.spaceInsideCommandDefinitionParentheses` | boolean | `false` | 在 `function` 和 `macro` 定义的括号内添加空格 |
| `clionCMakeFormatter.spaceInsideCommandCallParentheses` | boolean | `false` | 在常规命令调用的括号内添加空格 |
| `clionCMakeFormatter.spaceInsideIfParentheses` | boolean | `false` | 在 `if` 语句的括号内添加空格 |
| `clionCMakeFormatter.spaceInsideForeachParentheses` | boolean | `false` | 在 `foreach` 循环的括号内添加空格 |
| `clionCMakeFormatter.spaceInsideWhileParentheses` | boolean | `false` | 在 `while` 循环的括号内添加空格 |

### 换行和对齐

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `clionCMakeFormatter.lineLength` | number | `0` | 换行前的最大行长度（0 = 不限制，非零值最小为 30） |
| `clionCMakeFormatter.alignMultiLineArguments` | boolean | `false` | 在多行命令中垂直对齐参数 |
| `clionCMakeFormatter.alignMultiLineParentheses` | boolean | `false` | 在多行命令中将右括号与开始行对齐 |
| `clionCMakeFormatter.alignControlFlowParentheses` | boolean | `false` | 在多行格式中对齐控制流语句的括号 |

### 其他选项

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `clionCMakeFormatter.commandCase` | string | `"unchanged"` | 命令名称大小写转换: `"unchanged"`（不变）、`"lowercase"`（小写） 或 `"uppercase"`（大写） |
| `clionCMakeFormatter.maxBlankLines` | number | `2` | 保留的最大连续空行数（范围: 0-10） |
| `clionCMakeFormatter.enableProjectConfig` | boolean | `true` | 启用从 `.cc-format.jsonc` 文件读取项目级配置 |

### 配置示例

```json
{
  "clionCMakeFormatter.commandCase": "lowercase",
  "clionCMakeFormatter.indentSize": 4,
  "clionCMakeFormatter.spaceBeforeIfParentheses": true,
  "clionCMakeFormatter.lineLength": 0,
  "clionCMakeFormatter.alignMultiLineArguments": false
}
```

## 示例

### 格式化前:

```cmake
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(MyProject)
SET(SOURCES src/main.cpp src/utils.cpp src/parser.cpp src/formatter.cpp src/renderer.cpp)
IF(WIN32)
TARGET_LINK_LIBRARIES(myapp ws2_32)
ENDIF()
```

### 格式化后:

```cmake
cmake_minimum_required(VERSION 3.10)
project(MyProject)
set(SOURCES src/main.cpp src/utils.cpp src/parser.cpp src/formatter.cpp
    src/renderer.cpp)
if(WIN32)
    target_link_libraries(myapp ws2_32)
endif()
```

## 开发

### 前提条件

- Node.js 18+
- npm

### 设置

```bash
# 克隆仓库
git clone https://github.com/wysaid/clion-cmake-formatter.git
cd clion-cmake-formatter

# 安装依赖
npm install

# 编译
npm run compile

# 运行测试
npm run test:unit

# 测试 CMake 官方文件 (20 个代表性测试用例)
node scripts/test-cmake-official.js

# 打包发布
npm run package
```

### 测试覆盖

项目包含完整的测试套件：

- **单元测试**: 107 个测试用例，覆盖解析器、格式化器和配置系统
- **幂等性测试**: 8 个精心选择的 well-formatted 测试文件
- **官方测试**: 20 个从 CMake 官方仓库精选的测试用例
  - 从 8,899 个文件中选出
  - 复杂度范围: 4-2504
  - 总计 6,302 行代码
  - 100% 通过幂等性测试 ✅

详见 [扩展测试集指南](docs/EXTENDING_TESTS.md)。

### 项目结构

```
clion-cmake-formatter/
├── .vscode/               # VSCode 开发配置
│   ├── launch.json        # 调试启动配置
│   ├── tasks.json         # 构建任务
│   ├── settings.json      # 工作区设置
│   └── extensions.json    # 推荐扩展
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
│       ├── ci.yml         # 持续集成
│       └── release.yml    # 发布自动化
├── src/
│   ├── parser.ts          # CMake 分词器和 AST 构建器
│   ├── formatter.ts       # 格式化逻辑
│   ├── config.ts          # 配置文件支持
│   └── extension.ts       # VSCode 集成
├── test/
│   ├── parser.test.ts     # 解析器测试
│   ├── formatter.test.ts  # 格式化测试
│   ├── config.test.ts     # 配置测试
│   └── datasets/          # 测试数据集
│       ├── well-formatted/  # 8 个幂等性测试文件
│       └── cmake-official/  # 20 个 CMake 官方测试文件
├── resources/
│   ├── sample-input.cmake
│   └── cc-format.schema.json  # .cc-format.jsonc 的 JSON Schema
├── package.json
├── package.nls.json       # 英文语言包（默认）
├── package.nls.zh-cn.json # 中文语言包
├── tsconfig.json
├── README.md              # 英文文档
└── README.zh-CN.md        # 中文文档
```

### 调试扩展

1. 在 VSCode 中打开此项目
2. 按 `F5` 或进入 "运行和调试" (Ctrl+Shift+D)
3. 从下拉菜单选择 "Launch Extension"
4. 一个新的 VSCode 窗口将打开，并加载该扩展
5. 打开一个 `CMakeLists.txt` 文件并测试格式化功能

对于持续开发，在终端运行 `npm run watch` 后，使用 "Launch Extension (Watch Mode)"。

## 格式化规则

此扩展实现了 CLion 的 CMake 格式化规则:

1. **命令大小写转换**: 可配置的大小写转换（不变/小写/大写）
2. **一致的缩进**: 可配置每个缩进层级的空格数或制表符
3. **智能换行**: 自动拆分超过最大长度的行
4. **块结构**: 为控制流和函数定义块提供正确的缩进
5. **多行保留**: 已经跨多行的命令保持其结构
6. **参数空格**: 参数之间使用单个空格，无尾随空白
7. **注释处理**: 保留独立注释、内联注释和尾随注释
8. **空行管理**: 限制连续空行数量，同时保留逻辑分组
9. **括号空格**: 针对不同命令类型可配置括号前后的空格

## 与 CLion 的差异

虽然本扩展旨在复刻 CLion 的 CMake 格式化行为，但在某些方面存在有意的差异：

### 循环控制命令（`break` 和 `continue`）

**CLion 行为**: CLion 忽略 `break()` 和 `continue()` 命令的空格规则，`break()` 和 `break ()` 都被视为可接受的。

**本扩展**: `break` 和 `continue` 遵循其所在循环结构（`foreach`/`while`）相同的空格规则。这意味着：
- 如果 `spaceBeforeForeachParentheses` 为 `true`，格式化器将强制使用 `break ()` 和 `continue ()`
- 如果 `spaceBeforeWhileParentheses` 为 `true`（对于 `while` 循环中的 `break`/`continue`），应用相同的空格规则

**设计理由**: 循环控制命令在语义上与其循环结构相关。与循环关键字（`foreach`、`while`）保持一致的空格规则可以提高视觉一致性和代码一致性。

**示例**:
```cmake
# 当 spaceBeforeForeachParentheses: true 时
foreach (item IN LISTS items)
    if (condition)
        break ()      # 与 foreach () 保持一致
    endif ()
endforeach ()
```

这个设计决策优先考虑一致性而非精确的 CLion 兼容性。如果您更喜欢 CLion 的行为，可能需要手动调整 `break` 和 `continue` 的空格。

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本历史。

## 致谢

本项目的 VSCode 扩展结构和开发配置参考自:

- **[ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin)** - 提供了优秀的 VSCode 扩展开发实践，包括调试配置、CI/CD 工作流和项目结构。

- **[cmake_format](https://github.com/cheshirekow/cmake_format)** - 提供了全面的 CMake 格式化配置选项。本扩展的格式化选项设计参考了 cmake_format 的可配置 CMake 样式方法。

## 相关项目

- [ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin) - EGE 图形库自动配置
- [cmake_format](https://github.com/cheshirekow/cmake_format) - CMake 源代码美化工具 (Python)
