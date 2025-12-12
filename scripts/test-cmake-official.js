#!/usr/bin/env node

/**
 * 批量测试 CMake 官方测试文件的格式化幂等性
 */

const fs = require('fs');
const path = require('path');
const { formatCMake } = require('../dist/src/formatter');

const OFFICIAL_DIR = path.join(__dirname, '../test/datasets/cmake-official');
const README_FILE = path.join(OFFICIAL_DIR, 'README.md');

// 读取所有 .cmake 和 CMakeLists.txt 文件
const files = fs.readdirSync(OFFICIAL_DIR)
    .filter(f => f !== 'README.md')
    .filter(f => f.endsWith('.cmake') || f.includes('CMakeLists.txt'));

console.log('============================================================');
console.log('Testing CMake Official Files');
console.log('============================================================');
console.log(`📁 Found ${files.length} test files\n`);

const results = {
    passed: [],
    failed: [],
    errors: []
};

// 测试每个文件
files.forEach((file, index) => {
    const filePath = path.join(OFFICIAL_DIR, file);
    process.stdout.write(`[${index + 1}/${files.length}] ${file}... `);

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const formatted1 = formatCMake(content, {});
        const formatted2 = formatCMake(formatted1, {});

        if (formatted1 === formatted2) {
            console.log('✅ PASS');
            results.passed.push({
                file,
                originalLines: content.split('\n').length,
                formattedLines: formatted1.split('\n').length
            });
        } else {
            console.log('❌ NOT IDEMPOTENT');
            results.failed.push({
                file,
                reason: 'Formatting not idempotent'
            });
        }
    } catch (e) {
        console.log(`❌ ERROR: ${e.message}`);
        results.errors.push({
            file,
            error: e.message
        });
    }
});

// 输出汇总
console.log('\n============================================================');
console.log('Summary');
console.log('============================================================');
console.log(`✅ Passed: ${results.passed.length}/${files.length}`);
console.log(`❌ Failed: ${results.failed.length}/${files.length}`);
console.log(`⚠️  Errors: ${results.errors.length}/${files.length}`);

// 输出失败的详情
if (results.failed.length > 0) {
    console.log('\n❌ Failed tests:');
    results.failed.forEach(({ file, reason }) => {
        console.log(`  - ${file}: ${reason}`);
    });
}

// 输出错误的详情
if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    results.errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`);
    });
}

// 输出统计信息
if (results.passed.length > 0) {
    console.log('\n📊 Statistics (passed tests):');
    const totalOriginal = results.passed.reduce((sum, r) => sum + r.originalLines, 0);
    const totalFormatted = results.passed.reduce((sum, r) => sum + r.formattedLines, 0);
    console.log(`  - Total original lines: ${totalOriginal}`);
    console.log(`  - Total formatted lines: ${totalFormatted}`);
    console.log(`  - Average lines per file: ${Math.round(totalOriginal / results.passed.length)}`);
}

// 退出码
process.exit(results.failed.length + results.errors.length);
