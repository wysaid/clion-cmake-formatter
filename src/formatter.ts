/**
 * CMake Formatter - Formats CMake files with CLion-compatible style
 * 
 * Implements CLion's formatting rules:
 * - Indentation: 4 spaces per level (configurable)
 * - Line width: 120 characters (configurable)
 * - Command case: lowercase
 * - Multi-line commands: break long argument lists intelligently
 * - Parameter alignment: align subsequent lines for readability
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
 * Formatter configuration options
 */
export interface FormatterOptions {
    /** Maximum line length (default: 120) */
    lineLength: number;
    /** Number of spaces for indentation (default: 4) */
    indentSize: number;
    /** Use spaces for indentation, false for tabs (default: true) */
    useSpaces: boolean;
}

/**
 * Default formatter options matching CLion defaults
 */
export const DEFAULT_OPTIONS: FormatterOptions = {
    lineLength: 120,
    indentSize: 4,
    useSpaces: true
};

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
        const char = this.options.useSpaces ? ' ' : '\t';
        const size = this.options.useSpaces ? this.options.indentSize : 1;
        return char.repeat(size * this.indentLevel);
    }

    /**
     * Format a file node (root of AST)
     */
    private formatFile(node: FileNode): string {
        const lines: string[] = [];
        
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const formatted = this.formatNode(child);
            if (formatted !== null) {
                lines.push(formatted);
            }
        }
        
        // Join lines and ensure single trailing newline
        let result = lines.join('\n');
        
        // Ensure file ends with exactly one newline
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
     * Format a command node
     */
    private formatCommand(node: CommandNode): string {
        const indent = this.getIndent();
        const commandName = node.name.toLowerCase();
        
        if (node.arguments.length === 0) {
            const line = `${indent}${commandName}()`;
            return this.addTrailingComment(line, node.trailingComment);
        }
        
        // Try to format on a single line first
        const singleLine = this.formatCommandSingleLine(commandName, node.arguments, indent);
        if (singleLine.length <= this.options.lineLength) {
            return this.addTrailingComment(singleLine, node.trailingComment);
        }
        
        // Format as multi-line
        return this.formatCommandMultiLine(commandName, node.arguments, indent, node.trailingComment);
    }

    /**
     * Format a command on a single line
     */
    private formatCommandSingleLine(name: string, args: ArgumentInfo[], indent: string): string {
        const formattedArgs = args.map(arg => this.formatArgument(arg)).join(' ');
        return `${indent}${name}(${formattedArgs})`;
    }

    /**
     * Format a command as multi-line
     */
    private formatCommandMultiLine(
        name: string, 
        args: ArgumentInfo[], 
        indent: string,
        trailingComment?: string
    ): string {
        const lines: string[] = [];
        // Use the same character for continuation indent as the main indent
        const indentChar = this.options.useSpaces ? ' ' : '\t';
        const indentUnit = this.options.useSpaces ? this.options.indentSize : 1;
        const continuationIndent = indent + indentChar.repeat(indentUnit);
        
        // Start with command name and opening paren
        let currentLine = `${indent}${name}(`;
        let firstArg = true;
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const formattedArg = this.formatArgument(arg);
            
            if (firstArg) {
                // First argument on the same line as the command
                if (currentLine.length + formattedArg.length + 1 <= this.options.lineLength) {
                    currentLine += formattedArg;
                    firstArg = false;
                } else {
                    // Argument too long, start on new line
                    lines.push(currentLine);
                    currentLine = continuationIndent + formattedArg;
                    firstArg = false;
                }
            } else {
                // Subsequent arguments
                const testLine = currentLine + ' ' + formattedArg;
                if (testLine.length <= this.options.lineLength) {
                    currentLine = testLine;
                } else {
                    // Start a new line
                    lines.push(currentLine);
                    currentLine = continuationIndent + formattedArg;
                }
            }
        }
        
        // Close the command
        currentLine += ')';
        lines.push(currentLine);
        
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
                if (cmdNode.name === 'elseif' || cmdNode.name === 'else') {
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
