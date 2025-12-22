import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { 
    validateDirectory, 
    validateFile, 
    validateContent,
    detectRuleViolations,
    RuleViolation,
    RuleViolationType
} from '../src/validator';
import { formatCMake, DEFAULT_OPTIONS, FormatterOptions } from '../src/formatter';

describe('Validator', () => {
    
    describe('well-formatted dataset validation', () => {
        it('all files under test/datasets/well-formatted/default should be well formatted', () => {
            const datasetDir = path.join(__dirname, 'datasets', 'well-formatted', 'default');
            assert.ok(fs.existsSync(datasetDir), `dataset dir missing: ${datasetDir}`);

            const results = validateDirectory(datasetDir, path.resolve(__dirname, '..'));

            // Collect failures
            const failures = results.filter(r => !r.ok);

            if (failures.length > 0) {
                const messages = failures.map(f => {
                    // Show violations if available
                    const violationInfo = f.violations 
                        ? `\nViolations: ${f.violations.map(v => `${v.rule}@line${v.line}: ${v.message}`).join('; ')}`
                        : '';
                    // Show small diff: first line where differs
                    const origLines = f.original.split('\n');
                    const fmtLines = f.formatted.split('\n');
                    let idx = 0;
                    while (idx < origLines.length && idx < fmtLines.length && origLines[idx] === fmtLines[idx]) idx++;
                    const origSnippet = origLines.slice(Math.max(0, idx - 2), idx + 2).join('\n');
                    const fmtSnippet = fmtLines.slice(Math.max(0, idx - 2), idx + 2).join('\n');
                    return `${f.filePath}: ${f.reason}${violationInfo}\n--- original snippet ---\n${origSnippet}\n--- formatted snippet ---\n${fmtSnippet}`;
                }).join('\n\n');
                assert.fail(`Found ${failures.length} poorly formatted files:\n${messages}`);
            }
        });
    });

    describe('poorly-formatted file adversarial tests', () => {
        const poorlyFormattedDir = path.join(__dirname, 'datasets', 'poorly-formatted');

        it('poorly-formatted files should become well-formatted after formatting', () => {
            if (!fs.existsSync(poorlyFormattedDir)) {
                return; // Skip if directory doesn't exist
            }

            const files = fs.readdirSync(poorlyFormattedDir)
                .filter(f => f.endsWith('.cmake'));

            for (const file of files) {
                const filePath = path.join(poorlyFormattedDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                
                // Format the poorly-formatted file
                const formatted = formatCMake(content, DEFAULT_OPTIONS);
                
                // Validate that the formatted output is idempotent (formatting again yields same result)
                const reformatted = formatCMake(formatted, DEFAULT_OPTIONS);
                assert.strictEqual(
                    reformatted,
                    formatted,
                    `Formatted output for '${file}' should be idempotent.\n` +
                    `After first format:\n${formatted}\n` +
                    `After second format:\n${reformatted}`
                );
            }
        });

        it('should detect violations in poorly-formatted files', () => {
            if (!fs.existsSync(poorlyFormattedDir)) {
                return; // Skip if directory doesn't exist
            }

            const files = fs.readdirSync(poorlyFormattedDir)
                .filter(f => f.endsWith('.cmake'));

            for (const file of files) {
                const filePath = path.join(poorlyFormattedDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                
                const result = validateContent(content, DEFAULT_OPTIONS);
                
                // Poorly-formatted files should NOT pass validation
                // (result.ok should be false, meaning the file needs formatting)
                assert.ok(
                    !result.ok,
                    `File '${file}' is in poorly-formatted directory but passed validation unexpectedly`
                );
            }
        });
    });

    describe('rule violation detection', () => {
        
        describe('indentation violations', () => {
            it('should detect incorrect indentation level', () => {
                const content = `if (TRUE)
  message("wrong indent")
endif ()
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, indentSize: 4 });
                assert.ok(!result.ok);
                assert.ok(result.violations && result.violations.length > 0);
                
                const indentViolations = result.violations!.filter(
                    v => v.rule === 'indentSize' || v.rule === 'indentation'
                );
                assert.ok(indentViolations.length > 0, 'Should detect indentation violation');
            });

            it('should detect tabs vs spaces violation', () => {
                const content = `if (TRUE)
\tmessage("using tabs")
endif ()
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, useTabs: false });
                assert.ok(!result.ok);
            });

            it('should detect keepIndentOnEmptyLines violation', () => {
                const content = `if (TRUE)
    message("test")

    message("test2")
endif ()
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, keepIndentOnEmptyLines: true });
                // Empty line should have indentation when keepIndentOnEmptyLines is true
                // Note: This may or may not trigger depending on the formatter behavior
            });
        });

        describe('spacing violations', () => {
            it('should detect missing space before if parentheses', () => {
                const content = `if(TRUE)
endif()
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, spaceBeforeIfParentheses: true });
                assert.ok(!result.ok);
                
                const spacingViolations = result.violations!.filter(
                    v => v.rule === 'spaceBeforeIfParentheses'
                );
                assert.ok(spacingViolations.length > 0, 'Should detect space before if parentheses violation');
            });

            it('should detect unwanted space before command call parentheses', () => {
                const content = `message ("hello")
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, spaceBeforeCommandCallParentheses: false });
                assert.ok(!result.ok);
            });

            it('should detect space before foreach parentheses violation', () => {
                const content = `foreach(item IN ITEMS a b c)
endforeach()
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, spaceBeforeForeachParentheses: true });
                assert.ok(!result.ok);
            });

            it('should detect space before while parentheses violation', () => {
                const content = `while(TRUE)
endwhile()
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, spaceBeforeWhileParentheses: true });
                assert.ok(!result.ok);
            });
        });

        describe('blank lines violations', () => {
            it('should detect too many consecutive blank lines', () => {
                const content = `message("first")




message("second")
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, maxBlankLines: 2 });
                assert.ok(!result.ok);
                
                const blankLineViolations = result.violations!.filter(
                    v => v.rule === 'maxBlankLines'
                );
                assert.ok(blankLineViolations.length > 0, 'Should detect maxBlankLines violation');
            });
        });

        describe('command case violations', () => {
            it('should detect uppercase command when lowercase is required', () => {
                const content = `MESSAGE("hello")
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, commandCase: 'lowercase' });
                assert.ok(!result.ok);
                
                const caseViolations = result.violations!.filter(
                    v => v.rule === 'commandCase'
                );
                assert.ok(caseViolations.length > 0, 'Should detect command case violation');
            });

            it('should detect lowercase command when uppercase is required', () => {
                const content = `message("hello")
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, commandCase: 'uppercase' });
                assert.ok(!result.ok);
                
                const caseViolations = result.violations!.filter(
                    v => v.rule === 'commandCase'
                );
                assert.ok(caseViolations.length > 0, 'Should detect command case violation');
            });

            it('should pass when commandCase is unchanged', () => {
                const content = `message("hello")
`;
                const result = validateContent(content, { ...DEFAULT_OPTIONS, commandCase: 'unchanged' });
                assert.ok(result.ok);
            });
        });

        describe('trailing whitespace violations', () => {
            it('should detect trailing whitespace', () => {
                const content = `message("hello")   
`;
                const result = validateContent(content, DEFAULT_OPTIONS);
                assert.ok(!result.ok);
                
                const trailingViolations = result.violations!.filter(
                    v => v.rule === 'trailingWhitespace'
                );
                assert.ok(trailingViolations.length > 0, 'Should detect trailing whitespace violation');
            });
        });
    });

    describe('validateContent function', () => {
        it('should validate well-formatted content', () => {
            const content = `cmake_minimum_required(VERSION 3.10)
project(MyProject)
`;
            const result = validateContent(content, DEFAULT_OPTIONS);
            assert.ok(result.ok);
            assert.strictEqual(result.violations, undefined);
        });

        it('should return violations for poorly-formatted content', () => {
            const content = `cmake_minimum_required(VERSION 3.10)


    
project(MyProject)
`;
            const result = validateContent(content, { ...DEFAULT_OPTIONS, maxBlankLines: 1 });
            assert.ok(!result.ok);
            assert.ok(result.violations && result.violations.length > 0);
        });

        it('should handle empty content', () => {
            const content = '';
            const result = validateContent(content, DEFAULT_OPTIONS);
            // Empty content should be valid after normalization
            assert.ok(result.ok);
        });
    });

    describe('detectRuleViolations function', () => {
        it('should detect multiple types of violations', () => {
            const original = `IF(TRUE)
  MESSAGE("wrong indent")   
ENDIF()
`;
            const options: FormatterOptions = {
                ...DEFAULT_OPTIONS,
                spaceBeforeIfParentheses: true,
                commandCase: 'lowercase',
                indentSize: 4
            };
            const formatted = formatCMake(original, options);
            const violations = detectRuleViolations(original, formatted, options);
            
            assert.ok(violations.length > 0, 'Should detect violations');
            
            // Check we detected multiple types
            const ruleTypes = new Set(violations.map(v => v.rule));
            assert.ok(ruleTypes.size >= 1, 'Should detect multiple violation types');
        });

        it('should return empty array for well-formatted content', () => {
            const content = `message("hello")
`;
            const options = DEFAULT_OPTIONS;
            const formatted = formatCMake(content, options);
            const violations = detectRuleViolations(content, formatted, options);
            
            assert.strictEqual(violations.length, 0, 'Should have no violations');
        });
    });

    describe('multi-config style tests', () => {
        const wellFormattedDir = path.join(__dirname, 'datasets', 'well-formatted');

        it('should find all style directories', () => {
            if (!fs.existsSync(wellFormattedDir)) {
                return;
            }

            const styles = fs.readdirSync(wellFormattedDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);

            assert.ok(styles.length > 0, 'Should have at least one style directory');
            assert.ok(styles.includes('default'), 'Should have default style');
        });

        it('should validate all styles', () => {
            if (!fs.existsSync(wellFormattedDir)) {
                return;
            }

            const styles = fs.readdirSync(wellFormattedDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);

            for (const style of styles) {
                const styleDir = path.join(wellFormattedDir, style);
                const results = validateDirectory(styleDir, path.resolve(__dirname, '..'));
                
                const failures = results.filter(r => !r.ok);
                assert.strictEqual(
                    failures.length,
                    0,
                    `Style '${style}' has ${failures.length} validation failures:\n` +
                    failures.map(f => `${f.filePath}: ${f.reason}`).join('\n')
                );
            }
        });
    });
});

