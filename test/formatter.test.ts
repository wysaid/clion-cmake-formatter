/**
 * Unit tests for CMake Formatter
 */

import * as assert from 'assert';
import { formatCMake, CMakeFormatter } from '../src/formatter';

describe('CMakeFormatter', () => {
    describe('Basic Formatting', () => {
        it('should format a simple command', () => {
            const input = 'PROJECT(MyProject)';
            const output = formatCMake(input);
            
            assert.strictEqual(output.trim(), 'project(MyProject)');
        });

        it('should lowercase command names', () => {
            const input = 'CMAKE_MINIMUM_REQUIRED(VERSION 3.10)';
            const output = formatCMake(input);
            
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
    });

    describe('Indentation', () => {
        it('should indent block contents with 4 spaces by default', () => {
            const input = `if(TRUE)
message("hello")
endif()`;
            const output = formatCMake(input);
            
            assert.ok(output.includes('    message'));
        });

        it('should handle nested blocks', () => {
            const input = `if(TRUE)
if(FALSE)
message("nested")
endif()
endif()`;
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
            const ifLine = lines.find(l => l.includes('if(WIN32)'));
            const elseifLine = lines.find(l => l.includes('elseif(UNIX)'));
            const elseLine = lines.find(l => l.includes('else()'));
            const endifLine = lines.find(l => l.includes('endif()'));
            
            // All control statements should be at the same indentation (no leading spaces)
            assert.ok(ifLine && !ifLine.startsWith(' '));
            assert.ok(elseifLine && !elseifLine.startsWith(' '));
            assert.ok(elseLine && !elseLine.startsWith(' '));
            assert.ok(endifLine && !endifLine.startsWith(' '));
            
            // Messages inside should be indented
            const messageLine = lines.find(l => l.includes('message("windows")'));
            assert.ok(messageLine && messageLine.startsWith('    '));
        });

        it('should use configured indent size', () => {
            const input = `if(TRUE)
message("hello")
endif()`;
            const output = formatCMake(input, { indentSize: 2 });
            
            // Should have 2 spaces instead of 4
            const lines = output.split('\n');
            const messageLine = lines.find(l => l.includes('message'));
            assert.ok(messageLine);
            assert.ok(messageLine.startsWith('  message'));
        });

        it('should use tabs when configured', () => {
            const input = `if(TRUE)
message("hello")
endif()`;
            const output = formatCMake(input, { useSpaces: false });
            
            // Should have a tab instead of 4 spaces
            const lines = output.split('\n');
            const messageLine = lines.find(l => l.includes('message'));
            assert.ok(messageLine);
            assert.ok(messageLine.startsWith('\tmessage'));
        });
    });

    describe('Multi-line Formatting', () => {
        it('should break long commands into multiple lines', () => {
            const longArgs = Array(20).fill('very_long_argument_name').join(' ');
            const input = `set(SOURCES ${longArgs})`;
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
            const input = `# This is a comment
project(Test)`;
            const output = formatCMake(input);
            
            assert.ok(output.includes('# This is a comment'));
        });

        it('should preserve trailing comments', () => {
            const input = 'set(VAR value) # inline comment';
            const output = formatCMake(input);
            
            assert.ok(output.includes('# inline comment'));
        });
    });

    describe('Blank Lines', () => {
        it('should preserve blank lines between commands', () => {
            const input = `project(Test)

set(VAR value)`;
            const output = formatCMake(input);
            
            // Should have a blank line
            assert.ok(output.includes('\n\n'));
        });
    });

    describe('Quoted Arguments', () => {
        it('should preserve quoted arguments', () => {
            const input = 'message(STATUS "Hello World")';
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
            
            assert.ok(output.includes('foreach('));
            assert.ok(output.includes('    message'));
            assert.ok(output.includes('endforeach()'));
        });

        it('should format while blocks', () => {
            const input = `while(condition)
do_something()
endwhile()`;
            const output = formatCMake(input);
            
            assert.ok(output.includes('while('));
            assert.ok(output.includes('    do_something'));
            assert.ok(output.includes('endwhile()'));
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty file', () => {
            const output = formatCMake('');
            assert.strictEqual(output, '\n');
        });

        it('should handle whitespace-only file', () => {
            const output = formatCMake('   \n  \n  ');
            assert.strictEqual(output, '\n');
        });

        it('should handle file with only comments', () => {
            const input = '# Just a comment';
            const output = formatCMake(input);
            
            assert.ok(output.includes('# Just a comment'));
        });

        it('should end file with single newline', () => {
            const input = 'project(Test)';
            const output = formatCMake(input);
            
            assert.ok(output.endsWith('\n'));
            assert.ok(!output.endsWith('\n\n'));
        });
    });
});

describe('Real-world CMake Files', () => {
    it('should format a complete CMakeLists.txt', () => {
        const input = `CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(MyProject)

SET(CMAKE_CXX_STANDARD 17)
SET(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
SET(SOURCES
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
)

ADD_EXECUTABLE(myapp \${SOURCES})

IF(WIN32)
    TARGET_LINK_LIBRARIES(myapp ws2_32)
ENDIF()`;
        
        const output = formatCMake(input);
        
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
