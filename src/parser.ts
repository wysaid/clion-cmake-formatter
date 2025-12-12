/**
 * CMake Parser - Tokenizes and parses CMakeLists.txt content
 *
 * This module provides tokenization and AST building for CMake files,
 * supporting commands, arguments, comments, blank lines, and nested blocks.
 */

/**
 * Token types for CMake lexical analysis
 */
export enum TokenType {
    Command = 'Command',
    LeftParen = 'LeftParen',
    RightParen = 'RightParen',
    Argument = 'Argument',
    QuotedArgument = 'QuotedArgument',
    BracketArgument = 'BracketArgument',
    Comment = 'Comment',
    BracketComment = 'BracketComment',
    Newline = 'Newline',
    Whitespace = 'Whitespace',
    EOF = 'EOF'
}

/**
 * A token from the CMake lexer
 */
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

/**
 * AST Node types
 */
export enum NodeType {
    File = 'File',
    Command = 'Command',
    Block = 'Block',
    Comment = 'Comment',
    BlankLine = 'BlankLine'
}

/**
 * Base AST Node interface
 */
export interface ASTNode {
    type: NodeType;
    startLine: number;
    endLine: number;
}

/**
 * Command node representing a CMake command call
 */
export interface CommandNode extends ASTNode {
    type: NodeType.Command;
    name: string;
    arguments: ArgumentInfo[];
    trailingComment?: string;
    /** Whether the original command spans multiple lines */
    isMultiLine: boolean;
    /** Whether the first argument is on the same line as the opening paren */
    hasFirstArgOnSameLine?: boolean;
    /** Whether the closing paren is on the same line as the last argument */
    hasClosingParenOnSameLine?: boolean;
}

/**
 * Argument information with original formatting
 */
export interface ArgumentInfo {
    value: string;
    quoted: boolean;
    bracket: boolean;
    bracketLevel?: number;
    /** Comment attached to this argument (inline comment after the argument) */
    inlineComment?: string;
    /** Line number of the inline comment */
    inlineCommentLine?: number;
    /** Line number of this argument */
    line?: number;
    /** Number of blank lines before this argument (within command arguments) */
    blankLinesBefore?: number;
}

/**
 * Block node for nested structures (if, function, macro, foreach, while)
 */
export interface BlockNode extends ASTNode {
    type: NodeType.Block;
    blockType: string;
    startCommand: CommandNode;
    body: ASTNode[];
    endCommand: CommandNode;
}

/**
 * Comment node for standalone comments
 */
export interface CommentNode extends ASTNode {
    type: NodeType.Comment;
    value: string;
    isBracket: boolean;
}

/**
 * Blank line node
 */
export interface BlankLineNode extends ASTNode {
    type: NodeType.BlankLine;
    /** Number of consecutive blank lines */
    count: number;
}

/**
 * File node - root of the AST
 */
export interface FileNode extends ASTNode {
    type: NodeType.File;
    children: ASTNode[];
}

/**
 * CMake Tokenizer - Converts CMake source to tokens
 */
export class CMakeTokenizer {
    private source: string;
    private pos: number = 0;
    private line: number = 1;
    private column: number = 1;

    constructor(source: string) {
        this.source = source;
    }

    /**
     * Tokenize the entire source
     */
    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isAtEnd()) {
            const token = this.nextToken();
            if (token) {
                tokens.push(token);
            }
        }

        tokens.push({
            type: TokenType.EOF,
            value: '',
            line: this.line,
            column: this.column
        });

        return tokens;
    }

    private isAtEnd(): boolean {
        return this.pos >= this.source.length;
    }

    private peek(offset: number = 0): string {
        const idx = this.pos + offset;
        return idx < this.source.length ? this.source[idx] : '';
    }

    private advance(): string {
        const char = this.source[this.pos++];
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    private nextToken(): Token | null {
        const startLine = this.line;
        const startColumn = this.column;

        // Handle newlines
        if (this.peek() === '\n') {
            this.advance();
            return {
                type: TokenType.Newline,
                value: '\n',
                line: startLine,
                column: startColumn
            };
        }

        // Handle carriage return (Windows line endings)
        if (this.peek() === '\r') {
            this.advance();
            if (this.peek() === '\n') {
                this.advance();
            }
            return {
                type: TokenType.Newline,
                value: '\n',
                line: startLine,
                column: startColumn
            };
        }

        // Handle whitespace (spaces and tabs, not newlines)
        if (this.isWhitespace(this.peek())) {
            let value = '';
            while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
                value += this.advance();
            }
            return {
                type: TokenType.Whitespace,
                value,
                line: startLine,
                column: startColumn
            };
        }

        // Handle bracket comments #[[ ... ]]
        if (this.peek() === '#' && this.peek(1) === '[') {
            return this.readBracketComment(startLine, startColumn);
        }

        // Handle line comments
        if (this.peek() === '#') {
            let value = '';
            while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
                value += this.advance();
            }
            return {
                type: TokenType.Comment,
                value,
                line: startLine,
                column: startColumn
            };
        }

        // Handle parentheses
        if (this.peek() === '(') {
            this.advance();
            return {
                type: TokenType.LeftParen,
                value: '(',
                line: startLine,
                column: startColumn
            };
        }

        if (this.peek() === ')') {
            this.advance();
            return {
                type: TokenType.RightParen,
                value: ')',
                line: startLine,
                column: startColumn
            };
        }

        // Handle bracket arguments [[ ... ]] or [=[ ... ]=]
        if (this.peek() === '[') {
            const bracketLevel = this.countBracketLevel();
            if (bracketLevel >= 0) {
                return this.readBracketArgument(startLine, startColumn, bracketLevel);
            }
        }

        // Handle quoted arguments
        if (this.peek() === '"') {
            return this.readQuotedArgument(startLine, startColumn);
        }

        // Handle unquoted arguments (includes commands)
        if (this.isUnquotedArgumentChar(this.peek())) {
            return this.readUnquotedArgument(startLine, startColumn);
        }

        // Skip unknown characters
        this.advance();
        return null;
    }

    private isWhitespace(char: string): boolean {
        return char === ' ' || char === '\t';
    }

    private isUnquotedArgumentChar(char: string): boolean {
        // CMake unquoted argument characters
        const special = '()#"\\';
        return char !== '' && !this.isWhitespace(char) && char !== '\n' && char !== '\r' && !special.includes(char);
    }

    private countBracketLevel(): number {
        let level = 0;
        let offset = 1;

        while (this.peek(offset) === '=') {
            level++;
            offset++;
        }

        if (this.peek(offset) === '[') {
            return level;
        }

        return -1;
    }

    private readBracketArgument(startLine: number, startColumn: number, level: number): Token {
        let value = '[';
        this.advance(); // [

        for (let i = 0; i < level; i++) {
            value += this.advance(); // =
        }
        value += this.advance(); // [

        const closingBracket = ']' + '='.repeat(level) + ']';

        while (!this.isAtEnd()) {
            // Use startsWith with position parameter to avoid creating substrings
            if (this.source.startsWith(closingBracket, this.pos)) {
                for (let i = 0; i < closingBracket.length; i++) {
                    value += this.advance();
                }
                break;
            }
            value += this.advance();
        }

        return {
            type: TokenType.BracketArgument,
            value,
            line: startLine,
            column: startColumn
        };
    }

    private readBracketComment(startLine: number, startColumn: number): Token {
        let value = '#';
        this.advance(); // #

        // Count bracket level
        let level = 0;

        this.advance(); // [
        value += '[';

        while (this.peek() === '=') {
            value += this.advance();
            level++;
        }

        if (this.peek() === '[') {
            value += this.advance();
        }

        const closingBracket = ']' + '='.repeat(level) + ']';

        while (!this.isAtEnd()) {
            // Use startsWith with position parameter to avoid creating substrings
            if (this.source.startsWith(closingBracket, this.pos)) {
                for (let i = 0; i < closingBracket.length; i++) {
                    value += this.advance();
                }
                break;
            }
            value += this.advance();
        }

        return {
            type: TokenType.BracketComment,
            value,
            line: startLine,
            column: startColumn
        };
    }

    private readQuotedArgument(startLine: number, startColumn: number): Token {
        let value = '';
        this.advance(); // opening "

        while (!this.isAtEnd() && this.peek() !== '"') {
            if (this.peek() === '\\' && this.peek(1) !== '') {
                value += this.advance(); // backslash
                value += this.advance(); // escaped char
            } else {
                value += this.advance();
            }
        }

        if (this.peek() === '"') {
            this.advance(); // closing "
        }

        return {
            type: TokenType.QuotedArgument,
            value,
            line: startLine,
            column: startColumn
        };
    }

    private readUnquotedArgument(startLine: number, startColumn: number): Token {
        let value = '';

        while (!this.isAtEnd() && this.isUnquotedArgumentChar(this.peek())) {
            value += this.advance();
        }

        return {
            type: TokenType.Argument,
            value,
            line: startLine,
            column: startColumn
        };
    }
}

/**
 * CMake Parser - Builds AST from tokens
 */
export class CMakeParser {
    private tokens: Token[];
    private pos: number = 0;

    // Block-starting commands (lowercase for comparison)
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static readonly BLOCK_START_COMMANDS: { [key: string]: string } = {
        'if': 'endif',
        'function': 'endfunction',
        'macro': 'endmacro',
        'foreach': 'endforeach',
        'while': 'endwhile',
        'block': 'endblock'
    };

    constructor(source: string) {
        const tokenizer = new CMakeTokenizer(source);
        this.tokens = tokenizer.tokenize();
    }

    /**
     * Parse the CMake source and return the AST
     */
    parse(): FileNode {
        const children: ASTNode[] = [];

        while (!this.isAtEnd()) {
            const node = this.parseElement();
            if (node) {
                children.push(node);
            }
        }

        return {
            type: NodeType.File,
            children,
            startLine: 1,
            endLine: this.tokens.length > 0 ? this.tokens[this.tokens.length - 1].line : 1
        };
    }

    private isAtEnd(): boolean {
        return this.pos >= this.tokens.length || this.tokens[this.pos].type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.pos];
    }

    private advance(): Token {
        return this.tokens[this.pos++];
    }

    private skipWhitespace(): void {
        while (!this.isAtEnd() && this.peek().type === TokenType.Whitespace) {
            this.advance();
        }
    }

    private parseElement(): ASTNode | null {
        this.skipWhitespace();

        if (this.isAtEnd()) {
            return null;
        }

        const token = this.peek();

        // Handle newlines (blank lines)
        if (token.type === TokenType.Newline) {
            const startLine = token.line;
            this.advance();

            // Check if it's a blank line (consecutive newlines)
            if (!this.isAtEnd() && this.peek().type === TokenType.Newline) {
                let count = 0;
                while (!this.isAtEnd() && this.peek().type === TokenType.Newline) {
                    count++;
                    this.advance();
                }
                return {
                    type: NodeType.BlankLine,
                    startLine,
                    endLine: startLine,
                    count
                } as BlankLineNode;
            }

            return null; // Single newline, skip
        }

        // Handle comments
        if (token.type === TokenType.Comment || token.type === TokenType.BracketComment) {
            this.advance();
            return {
                type: NodeType.Comment,
                value: token.value,
                isBracket: token.type === TokenType.BracketComment,
                startLine: token.line,
                endLine: token.line
            } as CommentNode;
        }

        // Handle commands
        if (token.type === TokenType.Argument) {
            return this.parseCommand();
        }

        // Skip unknown tokens
        this.advance();
        return null;
    }

    private parseCommand(): CommandNode | BlockNode {
        const nameToken = this.advance();
        const commandName = nameToken.value; // Preserve original case
        const startLine = nameToken.line;

        this.skipWhitespace();

        // Expect left paren
        if (this.isAtEnd() || this.peek().type !== TokenType.LeftParen) {
            // Return command with no arguments
            return {
                type: NodeType.Command,
                name: commandName,
                arguments: [],
                startLine,
                endLine: startLine,
                isMultiLine: false
            };
        }

        const leftParenLine = this.peek().line;
        this.advance(); // consume (

        // Parse arguments
        const args = this.parseArguments();

        // Expect right paren
        let endLine = startLine;
        let rightParenLine = startLine;
        if (!this.isAtEnd() && this.peek().type === TokenType.RightParen) {
            endLine = this.peek().line;
            rightParenLine = this.peek().line;
            this.advance();
        }

        // Check for trailing comment
        this.skipWhitespace();
        let trailingComment: string | undefined;
        if (!this.isAtEnd() && this.peek().type === TokenType.Comment) {
            trailingComment = this.advance().value;
        }

        // Determine if command spans multiple lines
        const isMultiLine = endLine > startLine;

        // Determine if first arg is on same line as opening paren
        const hasFirstArgOnSameLine = args.length > 0 && args[0].line === leftParenLine;

        // Determine if closing paren is on same line as last arg
        const hasClosingParenOnSameLine = args.length > 0 && args[args.length - 1].line === rightParenLine;

        const command: CommandNode = {
            type: NodeType.Command,
            name: commandName,
            arguments: args,
            startLine,
            endLine,
            trailingComment,
            isMultiLine,
            hasFirstArgOnSameLine,
            hasClosingParenOnSameLine
        };

        // Check if this is a block-starting command (case-insensitive)
        if (CMakeParser.BLOCK_START_COMMANDS[commandName.toLowerCase()]) {
            return this.parseBlock(command);
        }

        return command;
    }

    private parseArguments(): ArgumentInfo[] {
        const args: ArgumentInfo[] = [];
        let consecutiveNewlines = 0;

        while (!this.isAtEnd() && this.peek().type !== TokenType.RightParen) {
            const token = this.peek();

            if (token.type === TokenType.Whitespace) {
                this.advance();
                continue;
            }

            if (token.type === TokenType.Newline) {
                consecutiveNewlines++;
                this.advance();
                continue;
            }

            if (token.type === TokenType.Comment) {
                // Attach comment to the previous argument if there is one
                if (args.length > 0 && !args[args.length - 1].inlineComment) {
                    args[args.length - 1].inlineComment = token.value;
                    args[args.length - 1].inlineCommentLine = token.line;
                    // If there were blank lines before the comment, record them
                    if (consecutiveNewlines > 0) {
                        args[args.length - 1].blankLinesBefore = Math.max(args[args.length - 1].blankLinesBefore || 0, consecutiveNewlines - 1);
                    }
                }
                consecutiveNewlines = 0;  // Reset after comment
                this.advance();
                continue;
            }

            let arg: ArgumentInfo | null = null;

            if (token.type === TokenType.Argument) {
                this.advance();
                arg = {
                    value: token.value,
                    quoted: false,
                    bracket: false,
                    line: token.line,
                    blankLinesBefore: consecutiveNewlines > 0 ? consecutiveNewlines - 1 : 0
                };
            } else if (token.type === TokenType.QuotedArgument) {
                this.advance();
                arg = {
                    value: token.value,
                    quoted: true,
                    bracket: false,
                    line: token.line,
                    blankLinesBefore: consecutiveNewlines > 0 ? consecutiveNewlines - 1 : 0
                };
            } else if (token.type === TokenType.BracketArgument) {
                this.advance();
                arg = {
                    value: token.value,
                    quoted: false,
                    bracket: true,
                    line: token.line,
                    blankLinesBefore: consecutiveNewlines > 0 ? consecutiveNewlines - 1 : 0
                };
            } else {
                break;
            }

            if (arg) {
                args.push(arg);
                consecutiveNewlines = 0;  // Reset after adding argument
            }
        }

        return args;
    }

    private parseBlock(startCommand: CommandNode): BlockNode {
        const blockType = startCommand.name.toLowerCase(); // Use lowercase for block type matching
        const endCommandName = CMakeParser.BLOCK_START_COMMANDS[blockType];
        const body: ASTNode[] = [];

        // Skip newline after start command
        if (!this.isAtEnd() && this.peek().type === TokenType.Newline) {
            this.advance();
        }

        // Parse body until we hit the end command
        while (!this.isAtEnd()) {
            this.skipWhitespace();

            if (this.isAtEnd()) {
                break;
            }

            const token = this.peek();

            // Check for end command
            if (token.type === TokenType.Argument) {
                const nextName = token.value.toLowerCase();

                // Handle elseif, else within if blocks
                if (blockType === 'if' && (nextName === 'elseif' || nextName === 'else')) {
                    // Parse the elseif/else as a command and add to body
                    const elseCommand = this.parseCommand();
                    body.push(elseCommand);
                    continue;
                }

                if (nextName === endCommandName) {
                    const endCommand = this.parseCommand() as CommandNode;
                    return {
                        type: NodeType.Block,
                        blockType,
                        startCommand,
                        body,
                        endCommand,
                        startLine: startCommand.startLine,
                        endLine: endCommand.endLine
                    };
                }
            }

            const node = this.parseElement();
            if (node) {
                body.push(node);
            }
        }

        // If we didn't find an end command, create a synthetic one
        return {
            type: NodeType.Block,
            blockType,
            startCommand,
            body,
            endCommand: {
                type: NodeType.Command,
                name: endCommandName,
                arguments: [],
                startLine: startCommand.endLine,
                endLine: startCommand.endLine,
                isMultiLine: false
            },
            startLine: startCommand.startLine,
            endLine: startCommand.endLine
        };
    }
}

/**
 * Helper function to parse CMake source
 */
export function parseCMake(source: string): FileNode {
    const parser = new CMakeParser(source);
    return parser.parse();
}
