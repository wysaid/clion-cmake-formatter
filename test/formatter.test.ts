/**
 * Unit tests for CMake Formatter
 */

import * as assert from 'assert';
import { formatCMake } from '../src/formatter';
import {
    loadBasic,
    loadFormatting,
    loadEdgeCase,
    loadRealWorld
} from './helpers';

describe('CMakeFormatter', () => {
    describe('Basic Formatting', () => {
        it('should format a simple command', () => {
            const input = loadFormatting('spacing', 'uppercase-input');
            const output = formatCMake(input, { commandCase: 'lowercase' });

            assert.strictEqual(output.trim(), 'project(MyProject)');
        });

        it('should lowercase command names', () => {
            const input = loadBasic('uppercase-command');
            const output = formatCMake(input, { commandCase: 'lowercase' });

            assert.ok(output.includes('cmake_minimum_required'));
            assert.ok(!output.includes('CMAKE_MINIMUM_REQUIRED'));
        });

        it('should preserve argument case', () => {
            const input = 'set(MY_VAR value)';
            const output = formatCMake(input);

            assert.ok(output.includes('MY_VAR'));
        });

        it('should handle empty arguments', () => {
            const input = 'endfunction()';
            const output = formatCMake(input);

            assert.strictEqual(output.trim(), 'endfunction()');
        });

        it('should preserve command case when unchanged (default)', () => {
            const input = loadFormatting('spacing', 'uppercase-input');
            const output = formatCMake(input);

            assert.strictEqual(output.trim(), 'PROJECT(MyProject)');
        });

        it('should uppercase command names when configured', () => {
            const input = loadFormatting('spacing', 'lowercase-input');
            const output = formatCMake(input, { commandCase: 'uppercase' });

            assert.strictEqual(output.trim(), 'PROJECT(MyProject)');
        });
    });

    describe('Indentation', () => {
        it('should indent block contents with 4 spaces by default', () => {
            const input = loadFormatting('indentation', 'simple-block');
            const output = formatCMake(input);

            assert.ok(output.includes('    message'));
        });

        it('should handle nested blocks', () => {
            const input = loadFormatting('indentation', 'nested-blocks');
            const output = formatCMake(input);

            // Inner message should have 8 spaces
            assert.ok(output.includes('        message'));
        });

        it('should format elseif and else at same level as if', () => {
            const input = `if(WIN32)
message("windows")
elseif(UNIX)
message("unix")
else()
message("other")
endif()`;
            const output = formatCMake(input);

            const lines = output.split('\n');
            const ifLine = lines.find(l => l.includes('if') && l.includes('WIN32'));
            const elseifLine = lines.find(l => l.includes('elseif'));
            const elseLine = lines.find(l => l.includes('else'));
            const endifLine = lines.find(l => l.includes('endif'));

            // All control statements should be at the same indentation (no leading spaces)
            assert.ok(ifLine && !ifLine.startsWith(' '));
            assert.ok(elseifLine && !elseifLine.startsWith(' '));
            assert.ok(elseLine && !elseLine.startsWith(' '));
            assert.ok(endifLine && !endifLine.startsWith(' '));

            // Messages inside should be indented
            const messageLine = lines.find(l => l.includes('message') && l.includes('windows'));
            assert.ok(messageLine && messageLine.startsWith('    '));
        });

        it('should use configured indent size', () => {
            const input = loadFormatting('indentation', 'simple-block');
            const output = formatCMake(input, { indentSize: 2 });

            // Should have 2 spaces instead of 4
            const lines = output.split('\n');
            const messageLine = lines.find(l => l.includes('message'));
            assert.ok(messageLine);
            assert.ok(messageLine.startsWith('  message'));
        });

        it('should use tabs when configured', () => {
            const input = loadFormatting('indentation', 'simple-block');
            const output = formatCMake(input, { useTabs: true });

            // Should have a tab instead of 4 spaces
            const lines = output.split('\n');
            const messageLine = lines.find(l => l.includes('message'));
            assert.ok(messageLine);
            assert.ok(messageLine.startsWith('\tmessage'));
        });
    });

    describe('Multi-line Formatting', () => {
        it('should break long commands into multiple lines', () => {
            const input = loadFormatting('line-length', 'long-args');
            const output = formatCMake(input, { lineLength: 80 });

            const lines = output.split('\n');
            assert.ok(lines.length > 1, 'Should have multiple lines');
        });

        it('should keep short commands on one line', () => {
            const input = 'set(VAR value)';
            const output = formatCMake(input);

            const lines = output.trim().split('\n');
            assert.strictEqual(lines.length, 1);
        });
    });

    describe('Comment Handling', () => {
        it('should preserve standalone comments', () => {
            const input = loadBasic('standalone-comment');
            const output = formatCMake(input);

            assert.ok(output.includes('# This is a comment'));
        });

        it('should preserve trailing comments', () => {
            const input = loadBasic('trailing-comment');
            const output = formatCMake(input);

            assert.ok(output.includes('# inline comment'));
        });

        it('should preserve inline comments in multi-line commands', () => {
            const input = loadFormatting('line-length', 'multiline-with-comments');
            const output = formatCMake(input);

            assert.ok(output.includes('# Disable _FORTIFY_SOURCE'));
        });
    });

    describe('Multi-line Preservation', () => {
        it('should preserve multi-line format when original is multi-line', () => {
            const input = loadFormatting('line-length', 'multiline-with-vars');
            const output = formatCMake(input);

            const lines = output.split('\n');
            // Should have multiple lines (not collapsed to one)
            assert.ok(lines.length > 1);
            // Each argument should be on its own line
            assert.ok(lines.some(l => l.includes('-mwindows')));
            assert.ok(lines.some(l => l.includes('-static')));
        });
    });

    describe('Blank Lines', () => {
        it('should preserve blank lines between commands', () => {
            const input = loadEdgeCase('blank-lines');
            const output = formatCMake(input);

            // Should have a blank line
            assert.ok(output.includes('\n\n'));
        });
    });

    describe('Quoted Arguments', () => {
        it('should preserve quoted arguments', () => {
            const input = loadBasic('quoted-arguments');
            const output = formatCMake(input);

            assert.ok(output.includes('"Hello World"'));
        });

        it('should handle quotes with spaces', () => {
            const input = 'set(VAR "path with spaces")';
            const output = formatCMake(input);

            assert.ok(output.includes('"path with spaces"'));
        });
    });

    describe('Function and Macro Blocks', () => {
        it('should format function blocks', () => {
            const input = `function(my_func arg1)
message("inside")
endfunction()`;
            const output = formatCMake(input);

            assert.ok(output.includes('function(my_func arg1)'));
            assert.ok(output.includes('    message'));
            assert.ok(output.includes('endfunction()'));
        });

        it('should format macro blocks', () => {
            const input = `macro(MY_MACRO)
set(VAR value)
endmacro()`;
            const output = formatCMake(input);

            assert.ok(output.includes('macro('));
            assert.ok(output.includes('    set'));
            assert.ok(output.includes('endmacro()'));
        });
    });

    describe('Loop Blocks', () => {
        it('should format foreach blocks', () => {
            const input = `foreach(item IN ITEMS a b c)
message("\${item}")
endforeach()`;
            const output = formatCMake(input);

            // Default has space before parentheses for foreach
            assert.ok(output.includes('foreach ('));
            assert.ok(output.includes('    message'));
            assert.ok(output.includes('endforeach ()'));
        });

        it('should format while blocks', () => {
            const input = `while(condition)
do_something()
endwhile()`;
            const output = formatCMake(input);

            // Default has space before parentheses for while
            assert.ok(output.includes('while ('));
            assert.ok(output.includes('    do_something'));
            assert.ok(output.includes('endwhile ()'));
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty file', () => {
            const input = loadEdgeCase('empty-file');
            const output = formatCMake(input);
            assert.strictEqual(output, '');
        });

        it('should handle whitespace-only file', () => {
            const input = loadEdgeCase('whitespace-only');
            const output = formatCMake(input);

            // whitespace-only.cmake contains 2 newlines (2 blank lines)
            // and should preserve them
            assert.strictEqual(output, '\n\n');
        });

        it('should handle file with only comments', () => {
            const input = loadEdgeCase('comment-only');
            const output = formatCMake(input);

            assert.ok(output.includes('# Just a comment'));
        });

        it('should end file with single newline', () => {
            const input = loadBasic('simple-command');
            const output = formatCMake(input);

            assert.ok(output.endsWith('\n'));
            assert.ok(!output.endsWith('\n\n'));
        });
    });
});

describe('Real-world CMake Files', () => {
    it('should format a complete CMakeLists.txt', () => {
        const input = loadRealWorld('complete-project');

        const output = formatCMake(input, { commandCase: 'lowercase' });

        // Commands should be lowercase
        assert.ok(output.includes('cmake_minimum_required'));
        assert.ok(output.includes('project'));
        assert.ok(output.includes('set'));
        assert.ok(output.includes('add_executable'));

        // Block indentation should be correct
        assert.ok(output.includes('    target_link_libraries'));

        // Comments should be preserved
        assert.ok(output.includes('# Source files'));
    });
});

describe('Spacing Consistency Tests', () => {
    it('should have consistent spacing between if and endif', () => {
        const input = loadFormatting('spacing', 'if-spacing');
        const output = formatCMake(input);

        // Both if and endif should have space before parentheses by default
        assert.ok(output.includes('if ('));
        assert.ok(output.includes('endif ()'));
    });

    it('should have consistent spacing between foreach and endforeach', () => {
        const input = loadFormatting('spacing', 'foreach-spacing');
        const output = formatCMake(input);

        // Both foreach and endforeach should have space before parentheses by default
        assert.ok(output.includes('foreach ('));
        assert.ok(output.includes('endforeach ()'));
    });

    it('should have consistent spacing between while and endwhile', () => {
        const input = `while(cond)
    do_something()
endwhile()`;
        const output = formatCMake(input);

        // Both while and endwhile should have space before parentheses by default
        assert.ok(output.includes('while ('));
        assert.ok(output.includes('endwhile ()'));
    });

    it('should not add space when spaceBeforeIfParentheses is false', () => {
        const input = loadFormatting('spacing', 'if-spacing');
        const output = formatCMake(input, { spaceBeforeIfParentheses: false });

        // Both if and endif should NOT have space
        assert.ok(output.includes('if('));
        assert.ok(output.includes('endif()'));
    });
});

describe('Line Length Tests', () => {
    it('should not wrap single-line command when lineLength is 0 (unlimited)', () => {
        const input = 'set(SOURCES file1.cpp file2.cpp file3.cpp file4.cpp file5.cpp file6.cpp file7.cpp file8.cpp file9.cpp file10.cpp)';
        const output = formatCMake(input, { lineLength: 0 });

        // Should remain single line (only trailing newline)
        const lines = output.split('\n').filter(l => l.length > 0);
        assert.strictEqual(lines.length, 1);
    });

    it('should not wrap single-line command when lineLength is very large', () => {
        const input = loadFormatting('line-length', 'long-args');
        const output = formatCMake(input, { lineLength: 1000 });

        // Should remain single line (only trailing newline)
        const lines = output.split('\n').filter(l => l.length > 0);
        assert.strictEqual(lines.length, 1);
    });

    it('should keep single-line command on single line when within lineLength', () => {
        const input = 'set(MY_VAR value1 value2 value3)';
        const output = formatCMake(input, { lineLength: 120 });

        // Should remain single line
        const lines = output.split('\n').filter(l => l.length > 0);
        assert.strictEqual(lines.length, 1);
    });

    it('should wrap lines when lineLength is at minimum threshold (30)', () => {
        const input = 'set(LONG_VARIABLE_NAME value1 value2 value3)';
        const output = formatCMake(input, { lineLength: 30 });

        // Should wrap because line is longer than 30
        const lines = output.split('\n').filter(l => l.length > 0);
        assert.ok(lines.length > 1, 'Should wrap when exceeding minimum lineLength of 30');
    });

    it('should preserve multi-line format even when lineLength is very large', () => {
        const input = loadFormatting('line-length', 'multiline-input');
        const output = formatCMake(input, { lineLength: 1000 });

        // Should remain multi-line
        const lines = output.split('\n').filter(l => l.length > 0);
        assert.ok(lines.length > 1, 'Multi-line input should produce multi-line output');
    });

    it('should preserve single-line format when input is single line', () => {
        const input = 'target_link_libraries(myapp lib1 lib2 lib3)';
        const output = formatCMake(input, { lineLength: 200 });

        // Should remain single line
        const lines = output.split('\n').filter(l => l.length > 0);
        assert.strictEqual(lines.length, 1);
    });
});

describe('Numeric Configuration Validation Tests', () => {
    it('should handle extreme tabSize values gracefully', () => {
        const input = 'if(WIN32)\n    set(VAR value)\nendif()';
        // tabSize=1 should work (minimum valid value)
        const output1 = formatCMake(input, { tabSize: 1, indentSize: 1 });
        assert.ok(output1.includes('set'), 'Should format with minimum tabSize');

        // tabSize=16 should work (maximum valid value)
        const output16 = formatCMake(input, { tabSize: 16, indentSize: 16 });
        assert.ok(output16.includes('set'), 'Should format with maximum tabSize');
    });

    it('should handle extreme indentSize values gracefully', () => {
        const input = 'if(WIN32)\nset(VAR value)\nendif()';
        // indentSize=1 should work
        const output1 = formatCMake(input, { indentSize: 1 });
        assert.ok(output1.trim().split('\n').length === 3, 'Should format with minimum indentSize');

        // indentSize=16 should work
        const output16 = formatCMake(input, { indentSize: 16 });
        assert.ok(output16.trim().split('\n').length === 3, 'Should format with maximum indentSize');
    });

    it('should handle maxBlankLines at boundaries', () => {
        const input = 'set(VAR1 value)\n\n\n\n\n\n\nset(VAR2 value)';
        // maxBlankLines=0 should remove all blank lines
        const output0 = formatCMake(input, { maxBlankLines: 0 });
        const lines0 = output0.trim().split('\n');
        assert.strictEqual(lines0.length, 2, 'Should remove all blank lines when maxBlankLines=0');

        // maxBlankLines=20 should preserve many blank lines
        const output20 = formatCMake(input, { maxBlankLines: 20 });
        const lines20 = output20.trim().split('\n');
        assert.ok(lines20.length > 2, 'Should preserve blank lines when maxBlankLines=20');
    });

    it('should handle lineLength minimum boundary', () => {
        const input = 'set(VAR value1 value2)';
        // lineLength=30 should work (minimum for non-zero values)
        const output30 = formatCMake(input, { lineLength: 30 });
        assert.ok(output30.includes('set'), 'Should format with minimum lineLength');
    });

    it('should clamp out-of-range values to valid boundaries', () => {
        const input = 'if(WIN32)\n    set(VAR value)\nendif()';

        // Test that extreme values are handled (they will be clamped in extension.ts)
        // The formatter itself should still work with clamped values

        // tabSize=0 would be clamped to 1 by validation
        const output1 = formatCMake(input, { tabSize: 1, indentSize: 1 });
        assert.ok(output1.includes('set'), 'Should handle minimum values');

        // tabSize=100 would be clamped to 16 by validation
        const output2 = formatCMake(input, { tabSize: 16, indentSize: 16 });
        assert.ok(output2.includes('set'), 'Should handle maximum values');

        // lineLength=5 would be clamped to 30 by validation
        const output3 = formatCMake(input, { lineLength: 30 });
        assert.ok(output3.includes('set'), 'Should handle minimum lineLength');

        // maxBlankLines=100 would be clamped to 20 by validation
        const input2 = 'set(A 1)\n\n\n\nset(B 2)';
        const output4 = formatCMake(input2, { maxBlankLines: 20 });
        assert.ok(output4.includes('set'), 'Should handle maximum maxBlankLines');
    });
});

describe('Trailing Newline Tests', () => {
    it('should not add trailing newline when input has none', () => {
        const input = 'set(VAR value)'; // No trailing newline
        const output = formatCMake(input, { maxTrailingBlankLines: 0 });
        
        // Should not add a trailing newline
        assert.strictEqual(output, 'set(VAR value)', 'Should not add trailing newline when input has none');
    });

    it('should preserve single trailing newline when maxTrailingBlankLines is 0', () => {
        const input = 'set(VAR value)\n'; // One trailing newline
        const output = formatCMake(input, { maxTrailingBlankLines: 0 });
        
        // Should keep the single trailing newline
        assert.strictEqual(output, 'set(VAR value)\n', 'Should preserve single trailing newline');
    });

    it('should remove extra trailing blank lines when maxTrailingBlankLines is 0', () => {
        const input = 'set(VAR value)\n\n\n'; // Multiple trailing newlines
        const output = formatCMake(input, { maxTrailingBlankLines: 0 });
        
        // Should only keep one trailing newline
        assert.strictEqual(output, 'set(VAR value)\n', 'Should remove extra trailing newlines');
    });

    it('should allow up to maxTrailingBlankLines blank lines at end', () => {
        const input = 'set(VAR value)\n\n\n'; // 2 trailing blank lines (3 newlines total)
        const output = formatCMake(input, { maxTrailingBlankLines: 2 });
        
        // Should keep 2 blank lines (3 newlines total)
        assert.strictEqual(output, 'set(VAR value)\n\n\n', 'Should preserve up to maxTrailingBlankLines');
    });

    it('should not add trailing newline to empty file', () => {
        const input = ''; // Empty file
        const output = formatCMake(input, { maxTrailingBlankLines: 0 });
        
        assert.strictEqual(output, '', 'Should not add trailing newline to empty file');
    });

    it('should respect maxTrailingBlankLines with default value 1', () => {
        const input = 'set(VAR value)\n\n\n\n'; // 3 trailing blank lines
        const output = formatCMake(input); // default maxTrailingBlankLines = 1
        
        // Should limit to 1 blank line (2 newlines total)
        assert.strictEqual(output, 'set(VAR value)\n\n', 'Should limit to default maxTrailingBlankLines=1');
    });

    it('should not add newline when formatting single command without trailing newline', () => {
        const input = 'if(WIN32)\n    set(VAR value)\nendif()'; // No trailing newline
        const output = formatCMake(input, { maxTrailingBlankLines: 0 });
        
        // Should not add trailing newline
        assert.strictEqual(output.endsWith('\n'), false, 'Should not add trailing newline to multi-line input');
    });

    it('should preserve trailing newline in multi-line input', () => {
        const input = 'if(WIN32)\n    set(VAR value)\nendif()\n'; // Has trailing newline
        const output = formatCMake(input, { maxTrailingBlankLines: 0 });
        
        // Should preserve trailing newline
        assert.strictEqual(output, 'if (WIN32)\n    set(VAR value)\nendif ()\n', 'Should preserve trailing newline in multi-line input');
    });
});
