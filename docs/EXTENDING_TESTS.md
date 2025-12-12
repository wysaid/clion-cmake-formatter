# 扩展测试集指南

## 背景

当前 `test/datasets/well-formatted/default/` 包含 8 个测试用例。为了更全面地验证格式化器的幂等性和正确性，可以从 CMake 官方测试集中选取更多有代表性的测试用例。

## CMake 官方测试资源

### 官方仓库
- **主仓库**: https://github.com/Kitware/CMake
- **测试目录**: https://github.com/Kitware/CMake/tree/master/Tests
- **许可证**: BSD 3-Clause (与本项目兼容)

### 推荐的测试类别

| 类别 | 路径 | 说明 | 适合度 |
|------|------|------|--------|
| 基础语法 | `Tests/CMakeOnly/` | 纯 CMake 语法，不涉及编译 | ⭐⭐⭐⭐⭐ |
| 命令测试 | `Tests/RunCMake/` | 各种 CMake 命令的测试 | ⭐⭐⭐⭐⭐ |
| 复杂项目 | `Tests/Complex/` | 复杂项目示例 | ⭐⭐⭐⭐ |
| 教程示例 | `Tests/Tutorial/` | 官方教程代码 | ⭐⭐⭐ |
| 真实案例 | `Tests/CMakeLists.txt` | CMake 自己的构建文件 | ⭐⭐⭐⭐ |

## 使用工具

### 方法 1: 自动选择脚本 (推荐)

```bash
# 运行 Python 脚本自动分析和选择测试文件
python3 scripts/select-cmake-tests.py
```

**脚本功能**:
- 自动克隆 CMake 官方仓库 (sparse checkout，只下载 Tests 目录)
- 分析所有 CMake 测试文件的复杂度和特性
- 根据多样性原则选择 20 个代表性文件
- 将选中的文件复制到 `test/datasets/cmake-official/`
- 生成包含选择标准的 README

**选择标准**:
- **简单** (5个): ≤50 行，复杂度 ≤20
- **中等** (8个): 50-200 行，复杂度 20-100
- **复杂** (7个): ≥200 行，复杂度 ≥100

### 方法 2: 手动选择

```bash
# 1. 克隆 CMake 仓库 (sparse checkout)
git clone --depth 1 --filter=blob:none --sparse https://github.com/Kitware/CMake.git /tmp/cmake-tests
cd /tmp/cmake-tests
git sparse-checkout set Tests

# 2. 浏览并选择感兴趣的测试文件
ls -R Tests/

# 3. 复制到测试集
cp Tests/CMakeOnly/SomeTest/CMakeLists.txt test/datasets/cmake-official/
```

## 集成到测试套件

### 选项 A: 单独的测试类别

在 `test/well-formated.test.ts` 中添加新的测试类别:

```typescript
describe('CMake Official Tests', () => {
    const officialDir = path.join(__dirname, 'datasets', 'cmake-official');
    const files = fs.readdirSync(officialDir).filter(f => f.endsWith('.cmake'));

    files.forEach(file => {
        it(`should format ${file} correctly`, () => {
            const content = fs.readFileSync(path.join(officialDir, file), 'utf-8');
            const formatted1 = formatCMake(content, defaultConfig);
            const formatted2 = formatCMake(formatted1, defaultConfig);
            assert.strictEqual(formatted1, formatted2, 'Should be idempotent');
        });
    });
});
```

### 选项 B: 添加到现有风格

```bash
# 复制选中的文件到 well-formatted/default/
cp test/datasets/cmake-official/interesting-file.cmake \
   test/datasets/well-formatted/default/
```

## 建议的工作流程

### 第一阶段: 评估和筛选

1. **运行自动选择脚本**
   ```bash
   python3 scripts/select-cmake-tests.py
   ```

2. **审查选中的文件**
   ```bash
   cd test/datasets/cmake-official
   ls -lh
   ```

3. **手动测试部分文件**
   ```bash
   # 测试单个文件的格式化
   npm run compile
   node -e "
   const {formatCMake} = require('./dist/src/formatter');
   const fs = require('fs');
   const content = fs.readFileSync('test/datasets/cmake-official/some-file.cmake', 'utf-8');
   const formatted = formatCMake(content, {});
   console.log(formatted);
   "
   ```

### 第二阶段: 集成测试

1. **创建新的测试类别**
   ```bash
   # 编辑 test/well-formated.test.ts
   # 添加 CMake Official Tests 部分
   ```

2. **运行测试**
   ```bash
   npm run test:unit
   ```

3. **分析失败的测试**
   - 记录格式化器的问题
   - 确定是否需要修复或排除特定文件

### 第三阶段: 优化

1. **排除不适合的文件**
   - 包含特殊语法的文件
   - 测试错误情况的文件
   - 过于复杂或特殊的文件

2. **选择最有代表性的文件**
   - 覆盖常见的 CMake 模式
   - 包含多种复杂度级别
   - 真实项目的典型用法

3. **记录测试覆盖范围**
   - 更新 README
   - 记录每个文件测试的特性

## 预期成果

- **当前**: 8 个 well-formatted 测试用例 + 20 个 CMake 官方测试用例
- **覆盖范围**:
  - ✅ 基础命令 (add_executable, set, etc.)
  - ✅ 控制流 (if, foreach, while)
  - ✅ 函数和宏
  - ✅ 多行命令
  - ✅ 注释处理
  - ✅ 复杂嵌套
  - ✅ 真实项目结构
  - ✅ CMake 官方测试用例 (从 8899 个文件中选出 20 个代表性文件)

## 测试结果

运行 `node scripts/test-cmake-official.js` 验证 CMake 官方测试文件：

```
✅ Passed: 20/20
❌ Failed: 0/20
⚠️  Errors: 0/20

📊 Statistics:
  - Total lines tested: 6,302
  - Average lines per file: 315
  - Complexity range: 4-2504
```

所有官方测试文件都通过了幂等性测试！ ✨

## 注意事项

### ⚠️ 重要原则

1. **不修改测试数据**: 测试文件应保持原样，即使看起来"不标准"
2. **关注幂等性**: 主要目标是验证 `format(format(x)) == format(x)`
3. **记录问题**: 如果某些文件无法正确格式化，记录问题而不是修改测试数据

### 🔍 排除标准

以下类型的文件不适合作为格式化测试:
- 故意包含语法错误的测试
- 测试特定 CMake 版本功能的文件
- 包含平台特定语法的文件
- 测试错误处理的文件

## 参考资源

- CMake 官方文档: https://cmake.org/documentation/
- CMake 测试指南: https://github.com/Kitware/CMake/blob/master/Help/dev/testing.rst
- CMake 语法规范: https://cmake.org/cmake/help/latest/manual/cmake-language.7.html

## 更新历史

- 2025-12-12: 创建本指南，提供自动选择脚本
