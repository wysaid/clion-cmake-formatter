# CLion CMake 格式化工具

一个 VSCode 扩展，使用 JetBrains CLion 的缩进、空格和对齐风格来格式化 CMakeLists.txt 文件。**零外部依赖** - 无需 Python、cmake-format 或 gersemi。

[English](README.md) | 简体中文

## 功能特性

- **CLion 兼容格式化**: 匹配 JetBrains CLion 的格式化规则
- **小写命令**: 自动将命令名转换为小写 (`PROJECT` → `project`)
- **智能缩进**: 每层 4 个空格 (可配置)
- **多行支持**: 智能拆分长参数列表
- **块格式化**: 正确缩进 `if/endif`、`function/endfunction`、`macro/endmacro`、`foreach/endforeach`、`while/endwhile`
- **保留注释**: 保持注释位置不变
- **保存时格式化**: 配合 VSCode 内置的保存时格式化功能使用
- **无外部依赖**: 纯 TypeScript 实现

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

### 基本设置

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `clionCMakeFormatter.useTabs` | `false` | 使用制表符缩进而不是空格 |
| `clionCMakeFormatter.tabSize` | `4` | 一个制表符等于几个空格 |
| `clionCMakeFormatter.indentSize` | `4` | 缩进的空格数 |
| `clionCMakeFormatter.continuationIndentSize` | `4` | 连续缩进的空格数 |
| `clionCMakeFormatter.keepIndentOnEmptyLines` | `false` | 在空行时保持缩进 |
| `clionCMakeFormatter.lineLength` | `120` | 最大行长度 |
| `clionCMakeFormatter.commandCase` | `"unchanged"` | 强制命令大小写: `"unchanged"`、`"lowercase"` 或 `"uppercase"` |
| `clionCMakeFormatter.maxBlankLines` | `2` | 最大连续空行数 |

### 括号前空格

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `clionCMakeFormatter.spaceBeforeCommandDefinitionParentheses` | `false` | `function`/`macro` 圆括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeCommandCallParentheses` | `false` | 命令调用圆括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeIfParentheses` | `true` | `if` 圆括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeForeachParentheses` | `true` | `foreach` 圆括号前添加空格 |
| `clionCMakeFormatter.spaceBeforeWhileParentheses` | `true` | `while` 圆括号前添加空格 |

### 括号内空格

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `clionCMakeFormatter.spaceInsideCommandDefinitionParentheses` | `false` | `function`/`macro` 圆括号内添加空格 |
| `clionCMakeFormatter.spaceInsideCommandCallParentheses` | `false` | 命令调用圆括号内添加空格 |
| `clionCMakeFormatter.spaceInsideIfParentheses` | `false` | `if` 圆括号内添加空格 |
| `clionCMakeFormatter.spaceInsideForeachParentheses` | `false` | `foreach` 圆括号内添加空格 |
| `clionCMakeFormatter.spaceInsideWhileParentheses` | `false` | `while` 圆括号内添加空格 |

### 对齐 (多行)

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `clionCMakeFormatter.alignMultiLineArguments` | `false` | 多行时对齐参数 |
| `clionCMakeFormatter.alignMultiLineParentheses` | `false` | 多行时对齐圆括号 |
| `clionCMakeFormatter.alignControlFlowParentheses` | `false` | 多行时对齐控制流圆括号 |

`settings.json` 示例:

```json
{
  "clionCMakeFormatter.commandCase": "lowercase",
  "clionCMakeFormatter.indentSize": 4,
  "clionCMakeFormatter.spaceBeforeIfParentheses": false,
  "clionCMakeFormatter.lineLength": 100
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
├── package.nls.json       # 英文语言包
├── package.nls.zh-cn.json # 中文语言包
├── tsconfig.json
└── README.md
```

### 调试扩展

1. 在 VSCode 中打开此项目
2. 按 `F5` 或进入 "运行和调试" (Ctrl+Shift+D)
3. 从下拉菜单选择 "Launch Extension"
4. 一个新的 VSCode 窗口将打开，并加载该扩展
5. 打开一个 `CMakeLists.txt` 文件并测试格式化功能

对于持续开发，在终端运行 `npm run watch` 后，使用 "Launch Extension (Watch Mode)"。

## 格式化规则

此扩展实现以下 CLion 兼容的格式化规则:

1. **命令大小写**: 可配置 (不变/小写/大写，默认: 不变)
2. **缩进**: 每层 4 个空格 (可配置)
3. **行长度**: 最大 120 字符 (可配置)，智能换行
4. **块缩进**: `if`、`function`、`macro`、`foreach`、`while` 块的内容会被缩进
5. **多行保持**: 已经是多行的命令保持每行一个参数
6. **参数格式化**: 参数之间单个空格，无尾随空格
7. **注释保留**: 保留内联注释和尾随注释
8. **空行**: 在逻辑部分之间保留 (受 maxBlankLines 设置限制)

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
