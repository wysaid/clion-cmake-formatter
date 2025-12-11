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
    continuationIndentSize: 4,
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

    constructor(options: Partial<FormatterOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Format CMake source code
     */
    format(source: string): string {
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

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];

            if (child.type === NodeType.BlankLine) {
                consecutiveBlankLines++;
                if (consecutiveBlankLines <= this.options.maxBlankLines) {
                    lines.push(this.options.keepIndentOnEmptyLines ? this.getIndent() : '');
                }
                continue;
            }

            consecutiveBlankLines = 0;
            const formatted = this.formatNode(child);
            if (formatted !== null) {
                lines.push(formatted);
            }
        }

        // Join lines and ensure single trailing newline
        let result = lines.join('\n');
        result = result.trimEnd() + '\n';

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
            case NodeType.BlankLine:
                return '';
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
        // foreach/endforeach follow the same rule
        if (lowerName === 'foreach' || lowerName === 'endforeach') {
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

        // If the original command was multi-line, preserve multi-line format with one arg per line
        if (node.isMultiLine || hasInlineComments) {
            return this.formatCommandPreserveMultiLine(commandName, node.arguments, indent, spaceBeforeParen, innerPadding, node.trailingComment);
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
        const formattedArgs = args.map(arg => this.formatArgument(arg)).join(' ');
        return `${indent}${name}${spaceBeforeParen}(${innerPadding}${formattedArgs}${innerPadding})`;
    }

    /**
     * Format a command preserving multi-line style (one argument per line)
     * Used when original input was already multi-line
     */
    private formatCommandPreserveMultiLine(
        name: string,
        args: ArgumentInfo[],
        indent: string,
        spaceBeforeParen: string,
        _innerPadding: string,
        trailingComment?: string
    ): string {
        const lines: string[] = [];
        const continuationIndent = indent + this.getContinuationIndent();

        // Start with command name and opening paren
        lines.push(`${indent}${name}${spaceBeforeParen}(`);

        // Format each argument on its own line
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const formattedArg = this.formatArgument(arg);
            let line = continuationIndent + formattedArg;

            // Add inline comment if present
            if (arg.inlineComment) {
                line += ' ' + arg.inlineComment;
            }

            lines.push(line);
        }

        // Add closing paren at the correct indentation level
        lines.push(`${indent})`);

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

        // Start with command name and opening paren, first arg on same line if fits
        const commandStart = `${indent}${name}${spaceBeforeParen}(${innerPadding}`;
        let currentLine = commandStart;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const formattedArg = this.formatArgument(arg);
            const hasComment = !!arg.inlineComment;
            const isFirst = i === 0;
            const isLast = i === args.length - 1;

            // Check if we can add this arg to the current line
            const separator = isFirst ? '' : ' ';
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
                currentLine += ' ' + arg.inlineComment;
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

        // Format start command
        lines.push(this.formatCommand(node.startCommand));

        // Increase indentation for body
        this.indentLevel++;

        // Format body
        for (const child of node.body) {
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
