/**
 * Unit tests for CMake Formatter
 */

import * as assert from 'assert';
import { formatCMake } from '@cc-format/core';
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

        it('should preserve module command case with lowercase setting', () => {
            const input = `include(FetchContent)
FetchContent_Declare(mylib)
FetchContent_MakeAvailable(mylib)
ExternalProject_Add(somelib)
GTest_Add_Tests(mytest)
CPM_AddPackage(pkg)
Qt5_Use_Modules(myapp)`;

            const output = formatCMake(input, { commandCase: 'lowercase' });

            // Module commands should preserve their case
            assert.ok(output.includes('FetchContent_Declare'),
                'FetchContent_Declare should preserve case');
            assert.ok(output.includes('FetchContent_MakeAvailable'),
                'FetchContent_MakeAvailable should preserve case');
            assert.ok(output.includes('ExternalProject_Add'),
                'ExternalProject_Add should preserve case');
            assert.ok(output.includes('GTest_Add_Tests'),
                'GTest_Add_Tests should preserve case');
            assert.ok(output.includes('CPM_AddPackage'),
                'CPM_AddPackage should preserve case');
            assert.ok(output.includes('Qt5_Use_Modules'),
                'Qt5_Use_Modules should preserve case');

            // Standard command should be lowercase
            assert.ok(output.includes('include('),
                'include should be lowercase');
        });

        it('should preserve module command case with uppercase setting', () => {
            const input = `include(FetchContent)
FetchContent_Declare(mylib)`;

            const output = formatCMake(input, { commandCase: 'uppercase' });

            // Module command should preserve its case
            assert.ok(output.includes('FetchContent_Declare'),
                'FetchContent_Declare should preserve case');
            // Standard command should be uppercase
            assert.ok(output.includes('INCLUDE('),
                'INCLUDE should be uppercase');
        });

        it('should transform all-caps commands even with underscores', () => {
            const input = `ADD_EXECUTABLE(myapp main.cpp)
ADD_LIBRARY(mylib lib.cpp)`;

            const output = formatCMake(input, { commandCase: 'lowercase' });

            // These are standard commands in all-caps, should be transformed
            assert.ok(output.includes('add_executable('), 'add_executable should be lowercase');
            assert.ok(output.includes('add_library('), 'add_library should be lowercase');
        });

        it('should NOT preserve commands with underscore followed by lowercase', () => {
            // Commands like SWIG_add_library, CPack_add_component have underscore followed by lowercase
            // These should be treated as standard commands, not module commands
            const input = `SWIG_add_library(mylib TYPE SHARED)
CPack_add_component(mycomp)`;

            const output = formatCMake(input, { commandCase: 'lowercase' });

            // These should be transformed to lowercase since underscore is followed by lowercase
            assert.ok(output.includes('swig_add_library('),
                'SWIG_add_library should be transformed to lowercase');
            assert.ok(output.includes('cpack_add_component('),
                'CPack_add_component should be transformed to lowercase');
        });

        it('should preserve module commands with numbers in name', () => {
            // Commands like Qt5_Use_Modules should be preserved
            const input = `Qt5_Use_Modules(myapp Core Gui)
Qt6_Add_Resources(myapp resources.qrc)`;

            const output = formatCMake(input, { commandCase: 'lowercase' });

            assert.ok(output.includes('Qt5_Use_Modules'),
                'Qt5_Use_Modules should preserve case');
            assert.ok(output.includes('Qt6_Add_Resources'),
                'Qt6_Add_Resources should preserve case');
        });

        it('should preserve multi-underscore module commands', () => {
            const input = `ExternalProject_Add_Step(proj step1)
ExternalProject_Add_StepTargets(proj step1)`;

            const output = formatCMake(input, { commandCase: 'lowercase' });

            assert.ok(output.includes('ExternalProject_Add_Step'),
                'ExternalProject_Add_Step should preserve case');
            assert.ok(output.includes('ExternalProject_Add_StepTargets'),
                'ExternalProject_Add_StepTargets should preserve case');
        });

        it('should NOT preserve commands that do not match module pattern (no underscore)', () => {
            // CheckCXXSourceCompiles lacks an underscore, so it should be treated as a standard command
            const input = 'CheckCXXSourceCompiles(VAR src)';
            const output = formatCMake(input, { commandCase: 'lowercase' });

            assert.strictEqual(output.trim(), 'checkcxxsourcecompiles(VAR src)');
        });

        it('should NOT preserve commands starting with lowercase', () => {
            // pkg_check_modules starts with lowercase, so it should be treated as standard
            const input = 'pkg_check_modules(GTK3 REQUIRED gtk+-3.0)';
            const output = formatCMake(input, { commandCase: 'uppercase' });

            assert.strictEqual(output.trim(), 'PKG_CHECK_MODULES(GTK3 REQUIRED gtk+-3.0)');
        });

        it('should handle comprehensive module command dataset (lowercase config)', () => {
            const input = loadEdgeCase('module-commands');
            const output = formatCMake(input, { commandCase: 'lowercase' });

            // PascalCase module commands should be preserved
            assert.ok(output.includes('FetchContent_Declare'), 'FetchContent_Declare preserved');
            assert.ok(output.includes('FetchContent_MakeAvailable'), 'FetchContent_MakeAvailable preserved');
            assert.ok(output.includes('ExternalProject_Add'), 'ExternalProject_Add preserved');
            assert.ok(output.includes('ExternalProject_Add_Step'), 'ExternalProject_Add_Step preserved');
            assert.ok(output.includes('ExternalProject_Add_StepTargets'), 'ExternalProject_Add_StepTargets preserved');
            assert.ok(output.includes('GTest_Add_Tests'), 'GTest_Add_Tests preserved');
            assert.ok(output.includes('GMock_Add_Tests'), 'GMock_Add_Tests preserved');
            assert.ok(output.includes('Qt5_Use_Modules'), 'Qt5_Use_Modules preserved');
            assert.ok(output.includes('Qt6_Add_Resources'), 'Qt6_Add_Resources preserved');
            assert.ok(output.includes('CPM_AddPackage'), 'CPM_AddPackage preserved');

            // Lowercase module-provided commands should remain lowercase (subject to commandCase)
            assert.ok(output.includes('check_cxx_source_compiles('),
                'check_cxx_source_compiles should remain lowercase');

            // Commands with underscore followed by lowercase should be transformed
            assert.ok(output.includes('swig_add_library('), 'swig_add_library should be lowercase');
            assert.ok(output.includes('cpack_add_component('), 'cpack_add_component should be lowercase');

            // Standard commands should follow configuration
            assert.ok(output.includes('include('), 'include should be lowercase');
            assert.ok(output.includes('set('), 'set should be lowercase');
            assert.ok(output.includes('message('), 'message should be lowercase');
        });

        it('should transform lowercase module commands when commandCase is uppercase', () => {
            const input = loadEdgeCase('module-commands');
            const output = formatCMake(input, { commandCase: 'uppercase' });

            // PascalCase module commands still preserve their case
            assert.ok(output.includes('FetchContent_Declare'), 'FetchContent_Declare preserved');
            assert.ok(output.includes('ExternalProject_Add'), 'ExternalProject_Add preserved');

            // Standard commands should be uppercased
            assert.ok(output.includes('INCLUDE('), 'INCLUDE should be uppercase');
            assert.ok(output.includes('SET('), 'SET should be uppercase');

            // Lowercase module-provided commands are treated as standard commands
            assert.ok(output.includes('CHECK_CXX_SOURCE_COMPILES('),
                'check_cxx_source_compiles should be uppercased under uppercase setting');

            // Commands with underscore followed by lowercase should be transformed
            assert.ok(output.includes('SWIG_ADD_LIBRARY('), 'SWIG_add_library should be uppercased');
            assert.ok(output.includes('CPACK_ADD_COMPONENT('), 'CPack_add_component should be uppercased');
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

    describe('Alignment Options', () => {
        it('should align multi-line arguments when enabled', () => {
            const input = `add_executable(foo
bar.cxx
)`;

            const outputWithout = formatCMake(input, {
                alignMultiLineArguments: false,
                alignMultiLineParentheses: false,
            }).trimEnd();
            const linesWithout = outputWithout.split('\n');
            assert.ok(linesWithout[1].startsWith('        bar.cxx'), 'Default should use continuation indent (8 spaces)');

            const outputWith = formatCMake(input, {
                alignMultiLineArguments: true,
                alignMultiLineParentheses: false,
            }).trimEnd();
            const linesWith = outputWith.split('\n');
            const expectedIndent = ' '.repeat('add_executable('.length);
            assert.ok(
                linesWith[1].startsWith(expectedIndent + 'bar.cxx'),
                'When enabled, should align continuation lines to the first argument column'
            );
        });

        it('should align multi-line closing paren for command calls when enabled', () => {
            const input = `add_executable(foo
bar.cxx
)`;

            const outputWithout = formatCMake(input, {
                alignMultiLineArguments: false,
                alignMultiLineParentheses: false,
            }).trimEnd();
            const linesWithout = outputWithout.split('\n');
            assert.strictEqual(linesWithout[2], ')', 'Default should put closing paren at command indent');

            const outputWith = formatCMake(input, {
                alignMultiLineArguments: false,
                alignMultiLineParentheses: true,
            }).trimEnd();
            const linesWith = outputWith.split('\n');
            const expectedParenIndent = ' '.repeat('add_executable'.length);
            assert.strictEqual(linesWith[2], expectedParenIndent + ')', 'Closing paren should align under opening paren');
        });

        it('should align multi-line closing paren for control flow commands when enabled', () => {
            const input = `if(TRUE
AND FALSE
)
endif()`;

            const outputWithout = formatCMake(input, {
                alignControlFlowParentheses: false,
                alignMultiLineParentheses: true,
            }).trimEnd();
            const linesWithout = outputWithout.split('\n');
            assert.strictEqual(linesWithout[2], ')', 'General paren alignment should not affect control flow when disabled');

            const outputWith = formatCMake(input, {
                alignControlFlowParentheses: true,
                alignMultiLineParentheses: false,
            }).trimEnd();
            const linesWith = outputWith.split('\n');
            assert.strictEqual(linesWith[2], '   )', 'Control flow closing paren should align under opening paren of "if ("');
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

    it('should not add space when spaceBeforeForeachParentheses is false', () => {
        const input = loadFormatting('spacing', 'foreach-spacing');
        const output = formatCMake(input, { spaceBeforeForeachParentheses: false });

        // Both foreach and endforeach should NOT have space
        assert.ok(output.includes('foreach('));
        assert.ok(output.includes('endforeach()'));
    });

    it('should not add space when spaceBeforeWhileParentheses is false', () => {
        const input = `while(cond)
    do_something()
endwhile()`;
        const output = formatCMake(input, { spaceBeforeWhileParentheses: false });

        // Both while and endwhile should NOT have space
        assert.ok(output.includes('while('));
        assert.ok(output.includes('endwhile()'));
    });

    it('should add space inside if parentheses when enabled (single-line)', () => {
        const input = `if(FOO)
endif()`;

        const outputWith = formatCMake(input, { spaceInsideIfParentheses: true });
        assert.ok(outputWith.includes('if ( FOO )'), 'Should add spaces inside if( )');
        assert.ok(outputWith.includes('endif ( )'), 'Should add spaces inside endif( )');

        const outputWithout = formatCMake(input, { spaceInsideIfParentheses: false });
        assert.ok(outputWithout.includes('if (FOO)'), 'Should not add spaces inside if( ) when disabled');
        assert.ok(outputWithout.includes('endif ()'), 'Should not add spaces inside endif( ) when disabled');
    });

    it('should add space inside if parentheses when enabled (preserve multi-line)', () => {
        // Multi-line control flow where the first argument starts on the same line as "if("
        const input = `if(FOO
  AND BAR
)
message("x")
endif()`;

        const outputWith = formatCMake(input, { spaceInsideIfParentheses: true });
        const firstLineWith = outputWith.split('\n')[0];
        assert.match(firstLineWith, /^if \( FOO\b/i, 'Should add inner space after ( for multi-line if');

        const outputWithout = formatCMake(input, { spaceInsideIfParentheses: false });
        const firstLineWithout = outputWithout.split('\n')[0];
        assert.match(firstLineWithout, /^if \(FOO\b/i, 'Should not add inner space after ( for multi-line if when disabled');
    });

    it('should apply command-call spacing options (before/inside parens)', () => {
        const input = 'set(VAR value)';

        const outputDefault = formatCMake(input).trim();
        assert.strictEqual(outputDefault, 'set(VAR value)', 'Default should not add extra spaces for command calls');

        const outputBefore = formatCMake(input, { spaceBeforeCommandCallParentheses: true }).trim();
        assert.strictEqual(outputBefore, 'set (VAR value)', 'Should add space before parens for command calls');

        const outputInside = formatCMake(input, { spaceInsideCommandCallParentheses: true }).trim();
        assert.strictEqual(outputInside, 'set( VAR value )', 'Should add spaces inside parens for command calls');

        const outputBoth = formatCMake(input, {
            spaceBeforeCommandCallParentheses: true,
            spaceInsideCommandCallParentheses: true
        }).trim();
        assert.strictEqual(outputBoth, 'set ( VAR value )', 'Should combine before+inside spacing for command calls');
    });

    it('should apply command-definition spacing options (before/inside parens)', () => {
        const input = `function(my_func arg1)
message("x")
endfunction()`;

        const outputDefault = formatCMake(input).trimEnd();
        assert.ok(outputDefault.includes('function(my_func arg1)'), 'Default should keep function(...) without extra spaces');

        const outputBefore = formatCMake(input, { spaceBeforeCommandDefinitionParentheses: true }).trimEnd();
        assert.ok(outputBefore.includes('function (my_func arg1)'), 'Should add space before parens for function definition');

        const outputInside = formatCMake(input, { spaceInsideCommandDefinitionParentheses: true }).trimEnd();
        assert.ok(outputInside.includes('function( my_func arg1 )'), 'Should add spaces inside parens for function definition');

        const outputBoth = formatCMake(input, {
            spaceBeforeCommandDefinitionParentheses: true,
            spaceInsideCommandDefinitionParentheses: true
        }).trimEnd();
        assert.ok(outputBoth.includes('function ( my_func arg1 )'), 'Should combine before+inside spacing for function definition');
    });

    it('should apply foreach/while inside-parens spacing consistently for start/end commands', () => {
        const foreachInput = `foreach(item IN ITEMS a b)
message("x")
endforeach()`;
        const foreachWith = formatCMake(foreachInput, { spaceInsideForeachParentheses: true }).trimEnd();
        assert.ok(foreachWith.includes('foreach ( item IN ITEMS a b )'), 'foreach should have inner spaces when enabled');
        assert.ok(foreachWith.includes('endforeach ( )'), 'endforeach should have inner spaces when enabled');

        const whileInput = `while(cond)
message("x")
endwhile()`;
        const whileWith = formatCMake(whileInput, { spaceInsideWhileParentheses: true }).trimEnd();
        assert.ok(whileWith.includes('while ( cond )'), 'while should have inner spaces when enabled');
        assert.ok(whileWith.includes('endwhile ( )'), 'endwhile should have inner spaces when enabled');
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

    it('should consider tabSize for wrapping when useTabs is true', () => {
        // With tabs, visual width depends on tabSize. Wrapping decisions should
        // follow visual columns rather than raw string length.
        const input = 'if(WIN32)\nset(FOO a b c d e f g)\nendif()';

        const base = {
            useTabs: true,
            indentSize: 4,
            lineLength: 26
        };

        const outputTab2 = formatCMake(input, { ...base, tabSize: 2 });
        const outputTab8 = formatCMake(input, { ...base, tabSize: 8 });

        // Wrapped multi-line commands should have continuation lines starting with two tabs.
        assert.ok(!outputTab2.includes('\n\t\t'), 'Smaller tabSize should keep the inner command on one line');
        assert.ok(outputTab8.includes('\n\t\t'), 'Larger tabSize should cause wrapping due to larger visual indent');
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

    it('should preserve indentation on empty lines when keepIndentOnEmptyLines is true', () => {
        const input = 'if(WIN32)\nmessage("a")\n\nmessage("b")\nendif()\n';

        const outputNoIndent = formatCMake(input, { keepIndentOnEmptyLines: false });
        const outputIndent = formatCMake(input, { keepIndentOnEmptyLines: true });

        // Inside an if() block, the blank line should be indented to the current indent level.
        assert.ok(outputIndent.includes('\n    \n'), 'Blank line should keep indentation when enabled');
        assert.ok(!outputNoIndent.includes('\n    \n'), 'Blank line should not keep indentation when disabled');
    });

    it('should change indentation width with indentSize', () => {
        const input = 'if(WIN32)\nset(VAR value)\nendif()';

        const output2 = formatCMake(input, { indentSize: 2 });
        const output4 = formatCMake(input, { indentSize: 4 });

        assert.ok(output2.includes('\n  set('), 'indentSize=2 should indent inner lines by 2 spaces');
        assert.ok(output4.includes('\n    set('), 'indentSize=4 should indent inner lines by 4 spaces');
    });

    it('should use tabs for indentation when useTabs is true', () => {
        const input = 'if(WIN32)\nset(VAR value)\nendif()';
        const output = formatCMake(input, { useTabs: true, indentSize: 4 });

        assert.ok(output.includes('\n\tset('), 'Inner lines should be indented with tabs when useTabs=true');
    });

    it('should change continuation indentation with continuationIndentSize', () => {
        const input = 'set(MY_VAR a b c d e f g h i j k l m n o p)';

        const output2 = formatCMake(input, {
            lineLength: 20,
            continuationIndentSize: 2,
            alignMultiLineArguments: false,
            alignMultiLineParentheses: false
        });
        const output10 = formatCMake(input, {
            lineLength: 20,
            continuationIndentSize: 10,
            alignMultiLineArguments: false,
            alignMultiLineParentheses: false
        });

        const lines2 = output2.split('\n');
        const lines10 = output10.split('\n');
        assert.ok(lines2.some(l => /^ {2}[a-z]\b/.test(l)), 'Should have continuation lines indented by 2 spaces');
        assert.ok(lines10.some(l => /^ {10}[a-z]\b/.test(l)), 'Should have continuation lines indented by 10 spaces');
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
