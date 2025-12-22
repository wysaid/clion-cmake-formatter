/**
 * CMake Formatter - Formats CMake files with CLion-compatible style
 *
 * Implements CLion's formatting rules with extensive configuration options
 * inspired by cmake_format (https://github.com/cheshirekow/cmake_format)
 */

import {
    ASTNode,
    FileNode,
    CommandNode,
    BlockNode,
    CommentNode,
    BlankLineNode,
    NodeType,
    ArgumentInfo,
    parseCMake
} from './parser';

/**
 * Command case options
 */
export type CommandCase = 'unchanged' | 'lowercase' | 'uppercase';

/**
 * Formatter configuration options - CLion compatible
 */
export interface FormatterOptions {
    // === Tab and Indent Settings ===
    /** Use tabs for indentation instead of spaces (default: false) */
    useTabs: boolean;
    /** Number of spaces equivalent to one tab (default: 4) */
    tabSize: number;
    /** Number of spaces for indentation (default: 4) */
    indentSize: number;
    /** Number of spaces for continuation indent (default: 4) */
    continuationIndentSize: number;
    /** Keep indent on empty lines (default: false) */
    keepIndentOnEmptyLines: boolean;

    // === Spacing Settings - Before Parentheses ===
    /** Space before command definition parentheses (default: false) */
    spaceBeforeCommandDefinitionParentheses: boolean;
    /** Space before command call parentheses (default: false) */
    spaceBeforeCommandCallParentheses: boolean;
    /** Space before 'if' parentheses (default: true) */
    spaceBeforeIfParentheses: boolean;
    /** Space before 'foreach' parentheses (default: true) */
    spaceBeforeForeachParentheses: boolean;
    /** Space before 'while' parentheses (default: true) */
    spaceBeforeWhileParentheses: boolean;

    // === Spacing Settings - Inside Parentheses ===
    /** Space inside command definition parentheses (default: false) */
    spaceInsideCommandDefinitionParentheses: boolean;
    /** Space inside command call parentheses (default: false) */
    spaceInsideCommandCallParentheses: boolean;
    /** Space inside 'if' parentheses (default: false) */
    spaceInsideIfParentheses: boolean;
    /** Space inside 'foreach' parentheses (default: false) */
    spaceInsideForeachParentheses: boolean;
    /** Space inside 'while' parentheses (default: false) */
    spaceInsideWhileParentheses: boolean;

    // === Blank Lines ===
    /** Maximum consecutive blank lines (default: 2) */
    maxBlankLines: number;
    /** Maximum trailing blank lines at end of file (default: 0, max: 1) */
    maxTrailingBlankLines: number;

    // === Command Case ===
    /** Force command case (default: 'unchanged') */
    commandCase: CommandCase;

    // === Wrapping and Alignment ===
    /** Maximum line length, 0 means unlimited (default: 0) */
    lineLength: number;
    /** Align arguments when multi-line (default: false) */
    alignMultiLineArguments: boolean;
    /** Align parentheses when multi-line (default: false) */
    alignMultiLineParentheses: boolean;
    /** Align control flow parentheses when multi-line (default: false) */
    alignControlFlowParentheses: boolean;
}

/**
 * Default formatter options matching CLion defaults
 */
export const DEFAULT_OPTIONS: FormatterOptions = {
    // Tab and Indent
    useTabs: false,
    tabSize: 4,
    indentSize: 4,
    continuationIndentSize: 8,
    keepIndentOnEmptyLines: false,

    // Spacing - Before Parentheses
    spaceBeforeCommandDefinitionParentheses: false,
    spaceBeforeCommandCallParentheses: false,
    spaceBeforeIfParentheses: true,
    spaceBeforeForeachParentheses: true,
    spaceBeforeWhileParentheses: true,

    // Spacing - Inside Parentheses
    spaceInsideCommandDefinitionParentheses: false,
    spaceInsideCommandCallParentheses: false,
    spaceInsideIfParentheses: false,
    spaceInsideForeachParentheses: false,
    spaceInsideWhileParentheses: false,

    // Blank Lines
    maxBlankLines: 2,
    maxTrailingBlankLines: 1,

    // Command Case
    commandCase: 'unchanged',

    // Wrapping
    lineLength: 0,
    alignMultiLineArguments: false,
    alignMultiLineParentheses: false,
    alignControlFlowParentheses: false,
};

// Command definition commands for spacing rules
const COMMAND_DEFINITION_COMMANDS = ['function', 'endfunction', 'macro', 'endmacro'];

/**
 * CMake Formatter class
 */
export class CMakeFormatter {
    private options: FormatterOptions;
    private indentLevel: number = 0;
    private inputEndsWithNewline: boolean = false;

    constructor(options: Partial<FormatterOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Format CMake source code
     */
    format(source: string): string {
        // Track whether input ends with newline
        this.inputEndsWithNewline = source.endsWith('\n') || source.endsWith('\r\n');
        const ast = parseCMake(source);
        return this.formatFile(ast);
    }

    /**
     * Get the indentation string for the current level
     */
    private getIndent(): string {
        if (this.options.useTabs) {
            return '\t'.repeat(this.indentLevel);
        }
        return ' '.repeat(this.options.indentSize * this.indentLevel);
    }

    /**
     * Get continuation indent string
     */
    private getContinuationIndent(): string {
        if (this.options.useTabs) {
            return '\t';
        }
        return ' '.repeat(this.options.continuationIndentSize);
    }

    /**
     * Format a file node (root of AST)
     */
    private formatFile(node: FileNode): string {
        const lines: string[] = [];
        let consecutiveBlankLines = 0;
        let trailingBlankLines = 0;
        let hasContent = false;
        const maxBlankLines = Math.max(0, this.options.maxBlankLines);

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];

            if (child.type === NodeType.BlankLine) {
                const blankNode = child as BlankLineNode;
                const isLastChild = i === node.children.length - 1;

                // Add up to maxBlankLines from the count in this node
                const remaining = Math.max(0, maxBlankLines - consecutiveBlankLines);
                const linesToAdd = Math.min(blankNode.count, remaining);

                if (isLastChild) {
                    // Track trailing blank lines separately - don't add to lines array
                    trailingBlankLines = linesToAdd;
                } else {
                    // Add blank lines (even at start of file to preserve leading blank lines)
                    for (let j = 0; j < linesToAdd; j++) {
                        lines.push(this.options.keepIndentOnEmptyLines ? this.getIndent() : '');
                    }
                }
                consecutiveBlankLines += linesToAdd;
                continue;
            }

            consecutiveBlankLines = 0;
            trailingBlankLines = 0;
            hasContent = true;
            const formatted = this.formatNode(child);
            if (formatted !== null) {
                lines.push(formatted);
            }
        }

        // If no content (empty file or only blank lines), match CLion behavior
        if (!hasContent && lines.length === 0) {
            // For truly empty file (no children), return empty string
            if (node.children.length === 0) {
                return '';
            }
            // For whitespace-only file with trailing blank lines, preserve them
            if (trailingBlankLines > 0) {
                return '\n'.repeat(trailingBlankLines);
            }
            return '';
        }

        // Join lines
        let result = lines.join('\n');

        // Only add trailing newline if:
        // 1. Input ended with newline, OR
        // 2. There are trailing blank lines to add
        const hasTrailingNewline = this.inputEndsWithNewline || trailingBlankLines > 0;
        
        if (hasTrailingNewline && !result.endsWith('\n')) {
            result += '\n';
        }

        // Add trailing blank lines (each blank line = one extra newline)
        // Limited by maxTrailingBlankLines (default: 1)
        const maxTrailingLines = Math.max(0, this.options.maxTrailingBlankLines);
        const allowedTrailingLines = Math.min(trailingBlankLines, maxTrailingLines);
        for (let i = 0; i < allowedTrailingLines; i++) {
            result += '\n';
        }

        return result;
    }

    /**
     * Format any AST node
     */
    private formatNode(node: ASTNode): string | null {
        switch (node.type) {
            case NodeType.Command:
                return this.formatCommand(node as CommandNode);
            case NodeType.Block:
                return this.formatBlock(node as BlockNode);
            case NodeType.Comment:
                return this.formatComment(node as CommentNode);
            case NodeType.BlankLine: {
                // Generate blank lines for blocks
                // When lines.join('\n') is used:
                //   - For 1 blank line: return '' (join adds 1 newline)
                //   - For 2 blank lines: return '\n' (join adds 1, we add 1 = 2 newlines)
                //   - For N blank lines: return '\n'.repeat(N-1)
                const blankNode = node as BlankLineNode;
                if (blankNode.count <= 1) {
                    return this.options.keepIndentOnEmptyLines ? this.getIndent() : '';
                }
                // For N > 1, generate N-1 newlines
                const indent = this.options.keepIndentOnEmptyLines ? this.getIndent() : '';
                if (indent) {
                    // Need to add indent to each blank line
                    return Array(blankNode.count - 1).fill(indent).join('\n');
                }
                return '\n'.repeat(blankNode.count - 1);
            }
            default:
                return null;
        }
    }

    /**
     * Apply command case transformation
     */
    private transformCommandCase(name: string): string {
        switch (this.options.commandCase) {
            case 'lowercase':
                return name.toLowerCase();
            case 'uppercase':
                return name.toUpperCase();
            case 'unchanged':
            default:
                return name;
        }
    }

    /**
     * Check if command should have space before parentheses
     */
    private shouldHaveSpaceBeforeParen(commandName: string): boolean {
        const lowerName = commandName.toLowerCase();

        // if/elseif/else/endif all follow the same rule
        if (lowerName === 'if' || lowerName === 'elseif' || lowerName === 'else' || lowerName === 'endif') {
            return this.options.spaceBeforeIfParentheses;
        }
        // foreach/endforeach and loop control commands (break/continue) follow the same rule
        if (lowerName === 'foreach' || lowerName === 'endforeach' || lowerName === 'break' || lowerName === 'continue') {
            return this.options.spaceBeforeForeachParentheses;
        }
        // while/endwhile follow the same rule
        if (lowerName === 'while' || lowerName === 'endwhile') {
            return this.options.spaceBeforeWhileParentheses;
        }
        if (COMMAND_DEFINITION_COMMANDS.includes(lowerName)) {
            return this.options.spaceBeforeCommandDefinitionParentheses;
        }
        return this.options.spaceBeforeCommandCallParentheses;
    }

    /**
     * Check if command should have space inside parentheses
     */
    private shouldHaveSpaceInsideParen(commandName: string): boolean {
        const lowerName = commandName.toLowerCase();

        // if/elseif/else/endif all follow the same rule
        if (lowerName === 'if' || lowerName === 'elseif' || lowerName === 'else' || lowerName === 'endif') {
            return this.options.spaceInsideIfParentheses;
        }
        // foreach/endforeach follow the same rule
        if (lowerName === 'foreach' || lowerName === 'endforeach') {
            return this.options.spaceInsideForeachParentheses;
        }
        // while/endwhile follow the same rule
        if (lowerName === 'while' || lowerName === 'endwhile') {
            return this.options.spaceInsideWhileParentheses;
        }
        // break/continue are loop control commands, follow foreach rule
        if (lowerName === 'break' || lowerName === 'continue') {
            return this.options.spaceInsideForeachParentheses;
        }
        if (COMMAND_DEFINITION_COMMANDS.includes(lowerName)) {
            return this.options.spaceInsideCommandDefinitionParentheses;
        }
        return this.options.spaceInsideCommandCallParentheses;
    }

    /**
     * Format a command node
     */
    private formatCommand(node: CommandNode): string {
        const indent = this.getIndent();
        const commandName = this.transformCommandCase(node.name);
        const spaceBeforeParen = this.shouldHaveSpaceBeforeParen(node.name) ? ' ' : '';
        const spaceInsideParen = this.shouldHaveSpaceInsideParen(node.name);
        const innerPadding = spaceInsideParen ? ' ' : '';

        if (node.arguments.length === 0) {
            const line = `${indent}${commandName}${spaceBeforeParen}()`;
            return this.addTrailingComment(line, node.trailingComment);
        }

        // Check if any argument has an inline comment - if so, must be multi-line
        const hasInlineComments = node.arguments.some(arg => arg.inlineComment);

        // If the original command was multi-line, preserve multi-line format
        if (node.isMultiLine || hasInlineComments) {
            return this.formatCommandPreserveMultiLine(
                commandName,
                node.arguments,
                indent,
                spaceBeforeParen,
                innerPadding,
                node.trailingComment,
                node.hasFirstArgOnSameLine,
                node.hasClosingParenOnSameLine
            );
        }

        // Try to format on a single line first
        const singleLine = this.formatCommandSingleLine(commandName, node.arguments, indent, spaceBeforeParen, innerPadding);
        if (this.options.lineLength === 0 || singleLine.length <= this.options.lineLength) {
            return this.addTrailingComment(singleLine, node.trailingComment);
        }

        // Format as multi-line (wrapping long lines)
        return this.formatCommandMultiLine(commandName, node.arguments, indent, spaceBeforeParen, innerPadding, node.trailingComment);
    }

    /**
     * Format a command on a single line
     */
    private formatCommandSingleLine(
        name: string,
        args: ArgumentInfo[],
        indent: string,
        spaceBeforeParen: string,
        innerPadding: string
    ): string {
        const formattedArgs = args.map((arg, i) => {
            const formatted = this.formatArgument(arg);
            // Don't add space if previous arg ends with '=' (but is not just '=' or '==') and current arg is quoted
            const prevArg = i > 0 ? args[i - 1] : null;
            if (prevArg && prevArg.value.endsWith('=') && prevArg.value.length > 1 && prevArg.value !== '==' && arg.quoted) {
                return formatted;
            }
            return i === 0 ? formatted : ' ' + formatted;
        }).join('');
        return `${indent}${name}${spaceBeforeParen}(${innerPadding}${formattedArgs}${innerPadding})`;
    }

    /**
     * Format a command preserving multi-line style
     * Used when original input was already multi-line
     * Preserves the original grouping of arguments on lines
     */
    private formatCommandPreserveMultiLine(
        name: string,
        args: ArgumentInfo[],
        indent: string,
        spaceBeforeParen: string,
        _innerPadding: string,
        trailingComment?: string,
        hasFirstArgOnSameLine?: boolean,
        hasClosingParenOnSameLine?: boolean
    ): string {
        const lines: string[] = [];
        const continuationIndent = indent + this.getContinuationIndent();
        const maxBlankLines = Math.max(0, this.options.maxBlankLines);

        if (args.length === 0) {
            lines.push(`${indent}${name}${spaceBeforeParen}(`);
            lines.push(`${indent})`);
            if (trailingComment) {
                lines[lines.length - 1] += ' ' + trailingComment;
            }
            return lines.join('\n');
        }

        // Group arguments by their original line numbers
        // This preserves the original multi-line structure
        const lineGroups: ArgumentInfo[][] = [];
        let currentGroup: ArgumentInfo[] = [];
        let previousArgEndLine: number | undefined;

        for (const arg of args) {
            const argLine = arg.line ?? 1;
            const argEndLine = arg.endLine ?? argLine;

            // Start a new group if this arg starts on a different line than the previous arg ended
            if (currentGroup.length > 0 && previousArgEndLine !== undefined && argLine !== previousArgEndLine) {
                lineGroups.push(currentGroup);
                currentGroup = [arg];
            } else {
                currentGroup.push(arg);
            }

            previousArgEndLine = argEndLine;
        }
        if (currentGroup.length > 0) {
            lineGroups.push(currentGroup);
        }

        // Format each group
        for (let groupIndex = 0; groupIndex < lineGroups.length; groupIndex++) {
            const group = lineGroups[groupIndex];
            const isFirstGroup = groupIndex === 0;
            const isLastGroup = groupIndex === lineGroups.length - 1;

            // Add blank lines before this group if needed (from first arg in group)
            const firstArgInGroup = group[0];
            if (firstArgInGroup.blankLinesBefore && firstArgInGroup.blankLinesBefore > 0) {
                const blankLinesToAdd = Math.min(firstArgInGroup.blankLinesBefore, maxBlankLines);
                for (let i = 0; i < blankLinesToAdd; i++) {
                    lines.push('');
                }
            }

            // Format arguments in this group, applying CLion-style indentation for nested parens
            const formattedArgs = group.map((arg, i) => {
                let formatted: string;
                // Check if this is a nested parentheses argument that needs re-indentation
                if (!arg.quoted && !arg.bracket && arg.value.includes('\n') && arg.value.includes('(')) {
                    formatted = this.reformatNestedParenArg(arg, indent, continuationIndent);
                } else {
                    formatted = this.formatArgument(arg);
                }
                // Don't add space if previous arg ends with '=' (but is not just '=' or '==') and current arg is quoted
                const prevArg = i > 0 ? group[i - 1] : null;
                if (prevArg && prevArg.value.endsWith('=') && prevArg.value.length > 1 && prevArg.value !== '==' && arg.quoted) {
                    return formatted;
                }
                return i === 0 ? formatted : ' ' + formatted;
            }).join('');

            // Get the inline comment from the last arg in the group
            const lastArgInGroup = group[group.length - 1];
            const inlineComment = lastArgInGroup.inlineComment;
            const inlineCommentLine = lastArgInGroup.inlineCommentLine;
            const lastArgLine = lastArgInGroup.line;

            let line: string;
            if (isFirstGroup && hasFirstArgOnSameLine) {
                // First group goes on same line as command name
                line = `${indent}${name}${spaceBeforeParen}(${formattedArgs}`;
            } else if (isFirstGroup) {
                // Opening paren on its own, first group is continuation
                lines.push(`${indent}${name}${spaceBeforeParen}(`);
                // For unquoted arguments with newlines (nested parens), check if all subsequent lines start with '('
                // If yes, use command indent; otherwise use continuation indent (CMake official style)
                if (formattedArgs.includes('\n') && group.every(arg => !arg.quoted && !arg.bracket)) {
                    const argLines = formattedArgs.split('\n');
                    // Check if all lines (after first) start with '(' after trimming
                    const allLinesStartWithParen = argLines.slice(1).every(l => l.trimStart().startsWith('('));
                    if (allLinesStartWithParen) {
                        // All lines use the same indent as the command itself
                        line = argLines.map((argLine) => {
                            return `${indent}${argLine.trimStart()}`;
                        }).join('\n');
                    } else {
                        line = `${continuationIndent}${formattedArgs}`;
                    }
                } else {
                    line = `${continuationIndent}${formattedArgs}`;
                }
            } else {
                // Not first group - check if this group starts with '(' (nested parens)
                // CLion uses command indent for lines starting with '(', continuation indent otherwise
                const trimmedArgs = formattedArgs.trimStart();
                if (trimmedArgs.startsWith('(')) {
                    // Use command indent for nested parens
                    line = `${indent}${trimmedArgs}`;
                } else {
                    line = `${continuationIndent}${trimmedArgs}`;
                }
            }

            // Add inline comment if present
            if (inlineComment) {
                // Check if comment is on the same line as the last argument
                if (inlineCommentLine !== undefined && lastArgLine !== undefined &&
                    inlineCommentLine === lastArgLine) {
                    // Comment is on the same line, add it to the end of the line
                    // Preserve original spacing before the comment (for alignment)
                    const spaces = lastArgInGroup.inlineCommentSpaces ?? 1;
                    line += ' '.repeat(spaces) + inlineComment;
                } else {
                    // Comment is on a different line, output it as a separate line
                    lines.push(line);
                    // Add blank lines before the comment if needed
                    if (lastArgInGroup.blankLinesBefore && lastArgInGroup.blankLinesBefore > 0) {
                        const blankLinesToAdd = Math.min(lastArgInGroup.blankLinesBefore, maxBlankLines);
                        for (let i = 0; i < blankLinesToAdd; i++) {
                            lines.push('');
                        }
                    }
                    lines.push(`${continuationIndent}${inlineComment}`);
                    line = ''; // Mark this line as added
                }
            }

            // Add closing paren if this is the last group and it should be on same line
            if (isLastGroup && hasClosingParenOnSameLine) {
                line = line ? (line + ')') : `${indent})`;
            }

            if (line) { // Only push if line is not empty
                lines.push(line);
            }
        }

        // Add closing paren on separate line if needed
        if (!hasClosingParenOnSameLine) {
            lines.push(`${indent})`);
        }

        // Add trailing comment to the last line
        if (trailingComment) {
            lines[lines.length - 1] += ' ' + trailingComment;
        }

        return lines.join('\n');
    }

    /**
     * Format a command as multi-line (when single line exceeds line length)
     * Wraps arguments intelligently across lines
     */
    private formatCommandMultiLine(
        name: string,
        args: ArgumentInfo[],
        indent: string,
        spaceBeforeParen: string,
        innerPadding: string,
        trailingComment?: string
    ): string {
        const lines: string[] = [];
        const continuationIndent = indent + this.getContinuationIndent();
        const maxBlankLines = Math.max(0, this.options.maxBlankLines);

        // Start with command name and opening paren, first arg on same line if fits
        const commandStart = `${indent}${name}${spaceBeforeParen}(${innerPadding}`;
        let currentLine = commandStart;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const formattedArg = this.formatArgument(arg);
            const hasComment = !!arg.inlineComment;
            const isFirst = i === 0;
            const isLast = i === args.length - 1;

            // Add blank lines before this argument if needed
            if (arg.blankLinesBefore && arg.blankLinesBefore > 0 && currentLine !== commandStart) {
                // Finish current line first if it has content
                if (currentLine !== commandStart && currentLine !== continuationIndent) {
                    lines.push(currentLine);
                    currentLine = continuationIndent;
                }
                const blankLinesToAdd = Math.min(arg.blankLinesBefore, maxBlankLines);
                for (let j = 0; j < blankLinesToAdd; j++) {
                    lines.push('');
                }
            }

            // Check if we can add this arg to the current line
            // Don't add separator if previous arg ends with '=' (but is not just '=' or '==') and current arg is quoted
            // This handles cases like -DVAR="value" where we want -DVAR="value" not -DVAR= "value"
            const prevArg = i > 0 ? args[i - 1] : null;
            const shouldOmitSeparator = prevArg && prevArg.value.endsWith('=') && prevArg.value.length > 1 && prevArg.value !== '==' && arg.quoted;
            const separator = isFirst || shouldOmitSeparator ? '' : ' ';
            const testLine = currentLine + separator + formattedArg;

            if ((this.options.lineLength === 0 || testLine.length <= this.options.lineLength) && !hasComment) {
                currentLine = testLine;
            } else {
                // Need to wrap - only push if we have content beyond the command start
                if (currentLine.trim() !== '' && currentLine !== commandStart) {
                    lines.push(currentLine);
                }
                currentLine = continuationIndent + formattedArg;
            }

            // If this argument has an inline comment, end the line here
            if (hasComment) {
                // Check if comment is on the same line as the argument
                if (arg.inlineCommentLine !== undefined && arg.line !== undefined &&
                    arg.inlineCommentLine === arg.line) {
                    // Comment is on the same line, add it to the end of the line
                    // Preserve original spacing before the comment (for alignment)
                    const spaces = arg.inlineCommentSpaces ?? 1;
                    currentLine += ' '.repeat(spaces) + arg.inlineComment;
                } else {
                    // Comment is on a different line, output it as a separate line
                    lines.push(currentLine);
                    currentLine = continuationIndent + arg.inlineComment;
                }
                lines.push(currentLine);
                currentLine = continuationIndent;
            }

            // Handle last argument - add closing paren
            if (isLast && !hasComment) {
                currentLine += `${innerPadding})`;
                lines.push(currentLine);
            }
        }

        // If we ended with a comment on the last arg, we need to add closing paren
        if (args.length > 0 && args[args.length - 1].inlineComment) {
            lines.push(`${indent})`);
        }

        // Add trailing comment to the last line
        if (trailingComment) {
            lines[lines.length - 1] += ' ' + trailingComment;
        }

        return lines.join('\n');
    }

    /**
     * Format an argument
     */
    private formatArgument(arg: ArgumentInfo): string {
        if (arg.bracket) {
            return arg.value;
        }

        if (arg.quoted) {
            return `"${arg.value}"`;
        }

        return arg.value;
    }

    /**
     * Re-indent a nested parentheses argument according to CLion rules.
     * For control flow commands (if/while/elseif), CLion uses:
     * - Command indent for lines starting with '('
     * - Continuation indent for lines starting with other content (AND, OR, etc.)
     */
    private reformatNestedParenArg(arg: ArgumentInfo, commandIndent: string, continuationIndent: string): string {
        const value = arg.value;
        
        // Only process if it contains newlines and looks like nested parens
        if (!value.includes('\n')) {
            return value;
        }

        const lines = value.split('\n');
        const result: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trimStart();

            if (i === 0) {
                // First line keeps its content as-is (no leading indent in the value itself)
                result.push(trimmedLine);
            } else if (trimmedLine.startsWith('(')) {
                // Lines starting with '(' use command indent
                result.push(commandIndent + trimmedLine);
            } else {
                // Other lines (AND, OR, etc.) use continuation indent
                result.push(continuationIndent + trimmedLine);
            }
        }

        return result.join('\n');
    }

    /**
     * Add a trailing comment to a line
     */
    private addTrailingComment(line: string, comment?: string): string {
        if (comment) {
            return `${line} ${comment}`;
        }
        return line;
    }

    /**
     * Format a block node (if, function, macro, foreach, while)
     */
    private formatBlock(node: BlockNode): string {
        const lines: string[] = [];
        const maxBlankLines = Math.max(0, this.options.maxBlankLines);
        let consecutiveBlankLines = 0;

        // Format start command
        lines.push(this.formatCommand(node.startCommand));

        // Increase indentation for body
        this.indentLevel++;

        // Format body
        for (const child of node.body) {
            // Handle blank lines with maxBlankLines limit
            if (child.type === NodeType.BlankLine) {
                const blankNode = child as BlankLineNode;
                // Add up to maxBlankLines from the count in this node
                const remaining = Math.max(0, maxBlankLines - consecutiveBlankLines);
                const linesToAdd = Math.min(blankNode.count, remaining);
                
                for (let j = 0; j < linesToAdd; j++) {
                    lines.push(this.options.keepIndentOnEmptyLines ? this.getIndent() : '');
                }
                consecutiveBlankLines += linesToAdd;
                continue;
            }

            // Reset consecutive blank lines counter when we hit non-blank content
            consecutiveBlankLines = 0;

            // Handle elseif/else at the same level as if
            if (child.type === NodeType.Command) {
                const cmdNode = child as CommandNode;
                const lowerName = cmdNode.name.toLowerCase();
                if (lowerName === 'elseif' || lowerName === 'else') {
                    // Temporarily decrease indent for elseif/else
                    this.indentLevel--;
                    const formatted = this.formatNode(child);
                    this.indentLevel++;
                    if (formatted !== null) {
                        lines.push(formatted);
                    }
                    continue;
                }
            }

            const formatted = this.formatNode(child);
            if (formatted !== null) {
                lines.push(formatted);
            }
        }

        // Decrease indentation for end command
        this.indentLevel--;

        // Format end command
        lines.push(this.formatCommand(node.endCommand));

        return lines.join('\n');
    }

    /**
     * Format a comment node
     */
    private formatComment(node: CommentNode): string {
        const indent = this.getIndent();
        return `${indent}${node.value}`;
    }
}

/**
 * Format CMake source code with the given options
 */
export function formatCMake(source: string, options: Partial<FormatterOptions> = {}): string {
    const formatter = new CMakeFormatter(options);
    return formatter.format(source);
}
