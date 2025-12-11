# CLion CMake 格式化工具

一个专业的 VSCode 扩展，使用 JetBrains CLion 的格式化规范来格式化 CMake 文件（CMakeLists.txt 和 .cmake）。**零外部依赖** - 无需 Python、cmake-format 或 gersemi。

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

本扩展支持所有主要的 CLion CMake 格式化选项。可通过 VSCode 设置进行配置（文件 → 首选项 → 设置 或 `settings.json`）。

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
| `clionCMakeFormatter.lineLength` | number | `0` | 换行前的最大行长度（0 = 不限制，非零值最小为 40） |
| `clionCMakeFormatter.alignMultiLineArguments` | boolean | `false` | 在多行命令中垂直对齐参数 |
| `clionCMakeFormatter.alignMultiLineParentheses` | boolean | `false` | 在多行命令中将右括号与开始行对齐 |
| `clionCMakeFormatter.alignControlFlowParentheses` | boolean | `false` | 在多行格式中对齐控制流语句的括号 |

### 其他选项

| 设置 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `clionCMakeFormatter.commandCase` | string | `"unchanged"` | 命令名称大小写转换: `"unchanged"`（不变）、`"lowercase"`（小写） 或 `"uppercase"`（大写） |
| `clionCMakeFormatter.maxBlankLines` | number | `2` | 保留的最大连续空行数（范围: 0-10） |

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

# 打包发布
npm run package
```

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
│   └── extension.ts       # VSCode 集成
├── test/
│   ├── parser.test.ts
│   └── formatter.test.ts
├── resources/
│   └── sample-input.cmake
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
