# 贡献指南

感谢您对本项目的关注！本文档提供开发、测试和贡献的指南。

[English Version](CONTRIBUTING.md)

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+
- npm

### 开始

```bash
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
npm install
npm run compile
npm run test:unit
```

## 📜 可用脚本

| 脚本 | 描述 |
|------|------|
| `npm run compile` | 编译 TypeScript 到 JavaScript |
| `npm run watch` | 监听模式编译（自动重新编译） |
| `npm run lint` | 运行 ESLint 检查代码质量 |
| `npm run test:unit` | 运行所有单元测试（提交前必须通过） |
| `npm run test:clion` | 与 CLion 对比格式化（需要安装 CLion） |
| `npm run test:cmake-official` | 在 CMake 官方文件上测试幂等性 |
| `npm run package` | 打包扩展为 `.vsix` 文件 |

## 📂 项目结构

```
clion-cmake-format/
├── src/
│   ├── parser.ts      # CMake 分词器和 AST 构建器
│   ├── formatter.ts   # 格式化逻辑和规则
│   ├── config.ts      # 配置文件加载和验证器
│   └── extension.ts   # VS Code 扩展集成
├── test/
│   ├── parser.test.ts      # 解析器单元测试
│   ├── formatter.test.ts   # 格式化器单元测试
│   ├── config.test.ts      # 配置单元测试
│   ├── well-formated.test.ts  # 幂等性测试
│   └── datasets/           # 测试数据
│       ├── basic/          # 基本语法测试
│       ├── cmake-official/ # CMake 仓库示例（20 个文件，6302 行）
│       ├── edge-cases/     # 边缘情况测试
│       ├── formatting/     # 格式化功能测试
│       ├── parsing/        # 解析器测试
│       ├── real-world/     # 真实世界示例
│       └── well-formatted/ # 幂等性验证
├── resources/
│   ├── cc-format.schema.json  # 配置验证的 JSON Schema
│   ├── sample-input.cmake     # 示例输入文件
│   └── sample.cc-format.jsonc # 示例配置文件
└── docs/
    └── CLION_INTEGRATION_TESTING.md # CLion 集成测试指南
```

## 🐛 调试

### 在 VS Code 中调试

1. 在 VS Code 中打开此项目
2. 按 `F5` 或进入 **运行和调试** 面板
3. 选择 **Launch Extension**
4. 一个新的 VS Code 窗口（扩展开发主机）将打开并加载扩展
5. 根据需要在源代码中设置断点

### 调试配置

项目包含 `.vscode/launch.json` 配置：
- **Extension**: 在调试模式下启动扩展
- **Extension Tests**: 在调试模式下运行测试

## ✅ 测试指南

### 提交前

提交前始终运行这些命令：

```bash
npm run lint      # 检查代码质量
npm run test:unit # 运行所有测试
```

所有测试必须通过（要求 100% 通过率）。

### 添加测试用例

修复错误或添加功能时，您应该：

1. **添加测试用例** 重现错误或验证新功能
2. 将测试文件放在适当的 `test/datasets/` 子目录中：
   - `basic/` — 基本 CMake 语法
   - `edge-cases/` — 边缘情况（空文件、空行等）
   - `formatting/` — 格式化特定测试
   - `parsing/` — 解析器特定测试
   - `real-world/` — 真实世界示例

添加 CMake 官方测试用例，请参阅 `test/datasets/cmake-official/README.md` 并使用 `scripts/select-cmake-tests.py`。

### 幂等性测试

格式化器必须是**幂等的** — 格式化两次应该产生相同的结果：

```
原始 → 格式化 → 输出1
输出1  → 格式化 → 输出2
输出2 === 输出1  ✅
```

`test/datasets/well-formatted/default/` 中的测试文件会进行幂等性验证。

### CLion 对比测试

为确保与 CLion 原生格式化器的兼容性，您可以运行对比测试：

```bash
# 需要安装 CLion
npm run test:clion
```

此测试使用 CLion 和本插件分别格式化文件，然后比较结果。详情请参阅 [docs/CLION_INTEGRATION_TESTING.md](docs/CLION_INTEGRATION_TESTING.md)（英文）。

## 📝 代码指南

### 通用规则

- **使用英文** 编写所有代码注释和提交消息
- **使用英文** 编写 `docs/` 目录中的所有 `.md` 文件
- 遵循 **TypeScript** 最佳实践
- 保持函数 **专注且可测试**
- 为公共 API 添加 **JSDoc 注释**

### 提交消息格式

使用清晰、简洁的英文提交消息：

```
✅ 好的：
- Fix: Handle empty command arguments correctly
- Add: Support for CMAKE_MINIMUM_REQUIRED command
- Docs: Update configuration reference

❌ 不好的：
- fix bug
- update
- 修复了一个问题
```

### 代码风格

遵循现有代码风格：
- **缩进**: 4 个空格
- **引号**: 优先使用单引号
- **分号**: 必需
- **行长度**: ~120 字符（软限制）

运行 `npm run lint` 检查风格违规。

## 🧪 测试开发

### 测试结构

测试按类别组织：

```typescript
describe('Parser', () => {
    it('should parse simple command', () => {
        // 测试代码
    });
});
```

### 运行特定测试

```bash
# 运行所有测试
npm run test:unit

# 运行特定测试文件（使用 ts-node）
npx mocha --require ts-node/register test/parser.test.ts
```

## 📋 Pull Request 指南

1. **Fork 仓库** 并创建功能分支
2. **为您的更改添加测试**
3. **确保所有测试通过**: `npm run test:unit`
4. **确保代码质量**: `npm run lint`
5. **编写清晰的 PR 描述**，说明：
   - 它解决了什么问题？
   - 有哪些更改？
   - 是否有破坏性更改？
6. **保持 PR 专注** — 每个 PR 一个功能或修复

## 🔧 格式化幂等性约束

修改格式化器时，确保：

- ✅ **第二次格式化匹配第一次**: `format(format(input)) === format(input)`
- ✅ **`well-formatted/` 中的示例在格式化后保持不变**
- ✅ **保留必要的空格和注释**
- ✅ **多行格式稳定**
- ✅ **添加新配置键时评估向后兼容性**
- ✅ **命令大小写风格** 匹配现有测试数据

## 📚 其他文档

- [CLion 集成测试](docs/CLION_INTEGRATION_TESTING.md)（英文）

## 🙏 有问题？

- 为错误开启 [issue](https://github.com/wysaid/clion-cmake-format/issues)
- 为问题开启 [讨论](https://github.com/wysaid/clion-cmake-format/discussions)

感谢您的贡献！🎉
