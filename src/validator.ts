import * as fs from 'fs';
import * as path from 'path';
import { formatCMake, DEFAULT_OPTIONS as FORMATTER_DEFAULT_OPTIONS, FormatterOptions } from './formatter';
import { loadConfigFile, findConfigFile } from './config';

/**
 * Types of formatting rule violations that can be detected
 */
export type RuleViolationType =
    | 'indentation'
    | 'useTabs'
    | 'tabSize'
    | 'indentSize'
    | 'continuationIndentSize'
    | 'keepIndentOnEmptyLines'
    | 'spaceBeforeCommandDefinitionParentheses'
    | 'spaceBeforeCommandCallParentheses'
    | 'spaceBeforeIfParentheses'
    | 'spaceBeforeForeachParentheses'
    | 'spaceBeforeWhileParentheses'
    | 'spaceInsideCommandDefinitionParentheses'
    | 'spaceInsideCommandCallParentheses'
    | 'spaceInsideIfParentheses'
    | 'spaceInsideForeachParentheses'
    | 'spaceInsideWhileParentheses'
    | 'maxBlankLines'
    | 'commandCase'
    | 'lineLength'
    | 'trailingWhitespace'
    | 'trailingNewline'
    | 'unknown';

/**
 * Represents a single rule violation at a specific location
 */
export interface RuleViolation {
    /** The type of rule that was violated */
    rule: RuleViolationType;
    /** Line number where the violation occurred (1-based) */
    line: number;
    /** Column number where the violation occurred (1-based, optional) */
    column?: number;
    /** Description of the violation */
    message: string;
    /** The original content at this location */
    originalContent?: string;
    /** The expected content at this location */
    expectedContent?: string;
}

export interface ValidationResult {
    ok: boolean;
    filePath: string;
    original: string;
    formatted: string;
    reason?: string;
    /** Detailed list of rule violations found */
    violations?: RuleViolation[];
}

/**
 * Load formatter options for a given document. If a project config file exists it is used.
 */
export function loadOptionsForDocument(documentPath: string, workspaceRoot?: string): FormatterOptions {
    const configPath = findConfigFile(documentPath, workspaceRoot);
    if (configPath) {
        const cfg = loadConfigFile(configPath);
        if (cfg && cfg.options) {
            return { ...FORMATTER_DEFAULT_OPTIONS, ...cfg.options } as FormatterOptions;
        }
    }
    return { ...FORMATTER_DEFAULT_OPTIONS } as FormatterOptions;
}

// Command definition commands for rule detection
const COMMAND_DEFINITION_COMMANDS = ['function', 'endfunction', 'macro', 'endmacro'];

// Control flow commands for rule detection
const IF_COMMANDS = ['if', 'elseif', 'else', 'endif'];
const FOREACH_COMMANDS = ['foreach', 'endforeach', 'break', 'continue'];
const WHILE_COMMANDS = ['while', 'endwhile'];

/**
 * Detect which rule violations exist by analyzing the difference between original and formatted content.
 * This function examines line-by-line differences and attempts to categorize them.
 */
export function detectRuleViolations(original: string, formatted: string, options: FormatterOptions): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const originalLines = original.split('\n');
    const formattedLines = formatted.split('\n');

    // First pass: check for maxBlankLines violations by scanning for blank line sequences in original
    let consecutiveBlankCount = 0;
    let blankSequenceStart = -1;
    for (let i = 0; i < originalLines.length; i++) {
        const line = originalLines[i];
        if (line.trim() === '') {
            consecutiveBlankCount++;
            if (blankSequenceStart < 0) {
                blankSequenceStart = i;
            }
        } else {
            if (consecutiveBlankCount > options.maxBlankLines) {
                // There were too many blank lines
                const excessCount = consecutiveBlankCount - options.maxBlankLines;
                for (let j = 0; j < excessCount; j++) {
                    violations.push({
                        rule: 'maxBlankLines',
                        line: blankSequenceStart + options.maxBlankLines + j + 1,
                        message: `Exceeded maximum blank lines (max: ${options.maxBlankLines}, found: ${consecutiveBlankCount})`,
                        originalContent: '',
                        expectedContent: ''
                    });
                }
            }
            consecutiveBlankCount = 0;
            blankSequenceStart = -1;
        }
    }
    // Check trailing blank lines
    if (consecutiveBlankCount > options.maxBlankLines) {
        const excessCount = consecutiveBlankCount - options.maxBlankLines;
        for (let j = 0; j < excessCount; j++) {
            violations.push({
                rule: 'maxBlankLines',
                line: blankSequenceStart + options.maxBlankLines + j + 1,
                message: `Exceeded maximum blank lines (max: ${options.maxBlankLines}, found: ${consecutiveBlankCount})`,
                originalContent: '',
                expectedContent: ''
            });
        }
    }

    // Second pass: use a diff-like approach to match lines
    // Create indices of non-blank, non-comment lines for alignment
    const origContentLines: { index: number; content: string; line: string }[] = [];
    const fmtContentLines: { index: number; content: string; line: string }[] = [];

    for (let i = 0; i < originalLines.length; i++) {
        const line = originalLines[i];
        const content = line.trim();
        if (content !== '') {
            origContentLines.push({ index: i, content, line });
        }
    }

    for (let i = 0; i < formattedLines.length; i++) {
        const line = formattedLines[i];
        const content = line.trim();
        if (content !== '') {
            fmtContentLines.push({ index: i, content, line });
        }
    }

    // Match content lines and check for differences
    for (let i = 0; i < Math.max(origContentLines.length, fmtContentLines.length); i++) {
        const origEntry = i < origContentLines.length ? origContentLines[i] : undefined;
        const fmtEntry = i < fmtContentLines.length ? fmtContentLines[i] : undefined;

        if (!origEntry || !fmtEntry) {
            continue;
        }

        const origLine = origEntry.line;
        const fmtLine = fmtEntry.line;
        const lineNum = origEntry.index + 1;

        if (origLine === fmtLine) {
            continue;
        }

        // Detect trailing whitespace issues
        const origTrimmed = origLine.trimEnd();
        const fmtTrimmed = fmtLine.trimEnd();
        if (origTrimmed === fmtTrimmed && origLine !== fmtLine) {
            violations.push({
                rule: 'trailingWhitespace',
                line: lineNum,
                message: 'Line has trailing whitespace',
                originalContent: origLine,
                expectedContent: fmtLine
            });
            continue;
        }

        // Detect indentation issues
        const origIndent = getLeadingWhitespace(origLine);
        const fmtIndent = getLeadingWhitespace(fmtLine);
        const origContent = origLine.trimStart();
        const fmtContent = fmtLine.trimStart();

        if (origIndent !== fmtIndent && origContent === fmtContent) {
            // Pure indentation difference
            const violation = detectIndentationViolation(origIndent, fmtIndent, options, lineNum, origLine, fmtLine);
            violations.push(violation);
            continue;
        }

        // Detect spacing before/inside parentheses violations
        const spacingViolation = detectSpacingViolation(origLine, fmtLine, options, lineNum);
        if (spacingViolation) {
            violations.push(spacingViolation);
            continue;
        }

        // Detect command case violations
        const caseViolation = detectCommandCaseViolation(origLine, fmtLine, options, lineNum);
        if (caseViolation) {
            violations.push(caseViolation);
            continue;
        }

        // Detect line length violations (lines that were wrapped)
        if (options.lineLength > 0 && origLine.length > options.lineLength && fmtLine.length <= options.lineLength) {
            violations.push({
                rule: 'lineLength',
                line: lineNum,
                message: `Line exceeds maximum length (${origLine.length} > ${options.lineLength})`,
                originalContent: origLine,
                expectedContent: fmtLine
            });
            continue;
        }

        // If we can't categorize the difference, mark as unknown
        violations.push({
            rule: 'unknown',
            line: lineNum,
            message: 'Line differs from expected formatted output',
            originalContent: origLine,
            expectedContent: fmtLine
        });
    }

    // Check for trailing newline issues
    if (original.length > 0 && !original.endsWith('\n')) {
        violations.push({
            rule: 'trailingNewline',
            line: originalLines.length,
            message: 'File should end with a newline'
        });
    }

    return violations;
}

/**
 * Get the leading whitespace from a line
 */
function getLeadingWhitespace(line: string): string {
    const match = line.match(/^[\t ]*/);
    return match ? match[0] : '';
}

/**
 * Detect the specific type of indentation violation
 */
function detectIndentationViolation(
    origIndent: string,
    fmtIndent: string,
    options: FormatterOptions,
    lineNum: number,
    origLine: string,
    fmtLine: string
): RuleViolation {
    // Check if it's a tabs vs spaces issue
    const origHasTabs = origIndent.includes('\t');
    const fmtHasTabs = fmtIndent.includes('\t');

    if (options.useTabs && !origHasTabs && fmtHasTabs) {
        return {
            rule: 'useTabs',
            line: lineNum,
            message: 'Expected tabs for indentation, found spaces',
            originalContent: origLine,
            expectedContent: fmtLine
        };
    }

    if (!options.useTabs && origHasTabs && !fmtHasTabs) {
        return {
            rule: 'useTabs',
            line: lineNum,
            message: 'Expected spaces for indentation, found tabs',
            originalContent: origLine,
            expectedContent: fmtLine
        };
    }

    // Check if it's about indent size
    const origIndentLevel = calculateIndentLevel(origIndent, options);
    const fmtIndentLevel = calculateIndentLevel(fmtIndent, options);

    if (origIndentLevel !== fmtIndentLevel) {
        // Check if this could be a continuation indent issue
        const indentDiff = Math.abs(fmtIndent.length - origIndent.length);
        if (!options.useTabs && indentDiff === options.continuationIndentSize) {
            return {
                rule: 'continuationIndentSize',
                line: lineNum,
                message: `Incorrect continuation indent (expected ${options.continuationIndentSize} spaces)`,
                originalContent: origLine,
                expectedContent: fmtLine
            };
        }

        return {
            rule: 'indentSize',
            line: lineNum,
            message: `Incorrect indentation level (expected ${fmtIndentLevel}, found ${origIndentLevel})`,
            originalContent: origLine,
            expectedContent: fmtLine
        };
    }

    // Check for keepIndentOnEmptyLines
    if (origLine.trim() === '' && fmtLine.trim() === '') {
        if (options.keepIndentOnEmptyLines && origIndent.length < fmtIndent.length) {
            return {
                rule: 'keepIndentOnEmptyLines',
                line: lineNum,
                message: 'Empty line should preserve indentation',
                originalContent: origLine,
                expectedContent: fmtLine
            };
        }
        if (!options.keepIndentOnEmptyLines && origIndent.length > 0) {
            return {
                rule: 'keepIndentOnEmptyLines',
                line: lineNum,
                message: 'Empty line should not have indentation',
                originalContent: origLine,
                expectedContent: fmtLine
            };
        }
    }

    return {
        rule: 'indentation',
        line: lineNum,
        message: 'Incorrect indentation',
        originalContent: origLine,
        expectedContent: fmtLine
    };
}

/**
 * Calculate the indentation level from whitespace string
 */
function calculateIndentLevel(whitespace: string, options: FormatterOptions): number {
    let spaces = 0;
    for (const char of whitespace) {
        if (char === '\t') {
            spaces += options.tabSize;
        } else {
            spaces += 1;
        }
    }
    return Math.floor(spaces / options.indentSize);
}

/**
 * Detect spacing violations around parentheses
 */
function detectSpacingViolation(
    origLine: string,
    fmtLine: string,
    options: FormatterOptions,
    lineNum: number
): RuleViolation | null {
    // Extract command name if this line starts with a command
    const cmdMatch = origLine.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (!cmdMatch) {
        return null;
    }

    const cmdName = cmdMatch[1].toLowerCase();
    const origTrimmed = origLine.trim();
    const fmtTrimmed = fmtLine.trim();

    // Check space before parentheses
    const origHasSpaceBefore = /^[a-zA-Z_][a-zA-Z0-9_]*\s+\(/.test(origTrimmed);
    const fmtHasSpaceBefore = /^[a-zA-Z_][a-zA-Z0-9_]*\s+\(/.test(fmtTrimmed);

    if (origHasSpaceBefore !== fmtHasSpaceBefore) {
        const rule = getSpaceBeforeRule(cmdName);
        if (rule) {
            return {
                rule,
                line: lineNum,
                message: fmtHasSpaceBefore
                    ? `Expected space before parentheses for '${cmdName}'`
                    : `Unexpected space before parentheses for '${cmdName}'`,
                originalContent: origLine,
                expectedContent: fmtLine
            };
        }
    }

    // Check space inside parentheses
    const origInnerMatch = origTrimmed.match(/\(\s*(.+?)\s*\)$/);
    const fmtInnerMatch = fmtTrimmed.match(/\(\s*(.+?)\s*\)$/);

    if (origInnerMatch && fmtInnerMatch) {
        const origHasSpaceInside = origTrimmed.match(/\(\s+/) !== null || origTrimmed.match(/\s+\)$/) !== null;
        const fmtHasSpaceInside = fmtTrimmed.match(/\(\s+/) !== null || fmtTrimmed.match(/\s+\)$/) !== null;

        if (origHasSpaceInside !== fmtHasSpaceInside) {
            const rule = getSpaceInsideRule(cmdName);
            if (rule) {
                return {
                    rule,
                    line: lineNum,
                    message: fmtHasSpaceInside
                        ? `Expected space inside parentheses for '${cmdName}'`
                        : `Unexpected space inside parentheses for '${cmdName}'`,
                    originalContent: origLine,
                    expectedContent: fmtLine
                };
            }
        }
    }

    return null;
}

/**
 * Get the appropriate "space before" rule type for a command
 */
function getSpaceBeforeRule(cmdName: string): RuleViolationType | null {
    if (IF_COMMANDS.includes(cmdName)) {
        return 'spaceBeforeIfParentheses';
    }
    if (FOREACH_COMMANDS.includes(cmdName)) {
        return 'spaceBeforeForeachParentheses';
    }
    if (WHILE_COMMANDS.includes(cmdName)) {
        return 'spaceBeforeWhileParentheses';
    }
    if (COMMAND_DEFINITION_COMMANDS.includes(cmdName)) {
        return 'spaceBeforeCommandDefinitionParentheses';
    }
    return 'spaceBeforeCommandCallParentheses';
}

/**
 * Get the appropriate "space inside" rule type for a command
 */
function getSpaceInsideRule(cmdName: string): RuleViolationType | null {
    if (IF_COMMANDS.includes(cmdName)) {
        return 'spaceInsideIfParentheses';
    }
    if (FOREACH_COMMANDS.includes(cmdName)) {
        return 'spaceInsideForeachParentheses';
    }
    if (WHILE_COMMANDS.includes(cmdName)) {
        return 'spaceInsideWhileParentheses';
    }
    if (COMMAND_DEFINITION_COMMANDS.includes(cmdName)) {
        return 'spaceInsideCommandDefinitionParentheses';
    }
    return 'spaceInsideCommandCallParentheses';
}

/**
 * Detect command case violations
 */
function detectCommandCaseViolation(
    origLine: string,
    fmtLine: string,
    options: FormatterOptions,
    lineNum: number
): RuleViolation | null {
    if (options.commandCase === 'unchanged') {
        return null;
    }

    // Extract command names
    const origMatch = origLine.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    const fmtMatch = fmtLine.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);

    if (!origMatch || !fmtMatch) {
        return null;
    }

    const origCmd = origMatch[1];
    const fmtCmd = fmtMatch[1];

    if (origCmd !== fmtCmd && origCmd.toLowerCase() === fmtCmd.toLowerCase()) {
        const expectedCase = options.commandCase === 'lowercase' ? 'lowercase' : 'uppercase';
        return {
            rule: 'commandCase',
            line: lineNum,
            message: `Command '${origCmd}' should be ${expectedCase}`,
            originalContent: origLine,
            expectedContent: fmtLine
        };
    }

    return null;
}

/**
 * Validate whether a CMake file is already in well-formatted state according to config.
 * Strict comparison is used after normalizing newlines and ensuring trailing newline.
 */
export function validateFile(filePath: string, workspaceRoot?: string): ValidationResult {
    let originalRaw: string;
    try {
        originalRaw = fs.readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            filePath,
            original: '',
            formatted: '',
            reason: `error reading file: ${message}`
        };
    }

    // Normalize input newlines to LF
    let original = originalRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!original.endsWith('\n')) {
        original += '\n';
    }

    const options = loadOptionsForDocument(filePath, workspaceRoot);

    const formatted = formatCMake(original, options);

    const ok = formatted === original;
    const result: ValidationResult = {
        ok,
        filePath,
        original,
        formatted
    };

    if (!ok) {
        // Detect detailed rule violations
        const violations = detectRuleViolations(original, formatted, options);
        result.violations = violations;

        // Generate a summary reason with rule types
        if (violations.length > 0) {
            const ruleTypes = [...new Set(violations.map(v => v.rule))];
            const violationCounts = ruleTypes.map(rule => {
                const count = violations.filter(v => v.rule === rule).length;
                return `${rule}(${count})`;
            });
            result.reason = `Rule violations: ${violationCounts.join(', ')}`;
        } else {
            result.reason = `formatted output differs from original`;
        }
    }

    return result;
}

/**
 * Validate CMake content directly (without reading from file)
 * Useful for testing and programmatic use
 */
export function validateContent(content: string, options: FormatterOptions = FORMATTER_DEFAULT_OPTIONS): ValidationResult {
    // Normalize input newlines to LF
    let original = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!original.endsWith('\n')) {
        original += '\n';
    }

    const formatted = formatCMake(original, options);

    const ok = formatted === original;
    const result: ValidationResult = {
        ok,
        filePath: '<content>',
        original,
        formatted
    };

    if (!ok) {
        // Detect detailed rule violations
        const violations = detectRuleViolations(original, formatted, options);
        result.violations = violations;

        // Generate a summary reason with rule types
        if (violations.length > 0) {
            const ruleTypes = [...new Set(violations.map(v => v.rule))];
            const violationCounts = ruleTypes.map(rule => {
                const count = violations.filter(v => v.rule === rule).length;
                return `${rule}(${count})`;
            });
            result.reason = `Rule violations: ${violationCounts.join(', ')}`;
        } else {
            result.reason = `formatted output differs from original`;
        }
    }

    return result;
}

/**
 * Recursively validate all cmake-like files under a directory using the nearest config in that dataset.
 */
export function validateDirectory(directory: string, workspaceRoot?: string): ValidationResult[] {
    const results: ValidationResult[] = [];

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(directory, e.name);
        if (e.isDirectory()) {
            results.push(...validateDirectory(full, workspaceRoot));
            continue;
        }

        // Skip config files
        if (e.name === '.cc-format.jsonc' || e.name === '.cc-format') { continue; }

        // Consider common cmake filenames
        if (e.name.endsWith('.cmake') || e.name === 'CMakeLists.txt') {
            try {
                results.push(validateFile(full, workspaceRoot));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                results.push({ ok: false, filePath: full, original: '', formatted: '', reason: `error reading file: ${message}` });
            }
        }
    }

    return results;
}

export default validateFile;
