/**
 * Unit tests for CMake Parser
 */

import * as assert from 'assert';
import {
    CMakeTokenizer,
    TokenType,
    parseCMake,
    NodeType,
    CommandNode,
    BlockNode,
    CommentNode
} from '@cc-format/core';
import {
    loadBasic,
    loadParsing
} from './helpers';

describe('CMakeTokenizer', () => {
    describe('Basic Tokenization', () => {
        it('should tokenize a simple command', () => {
            const tokenizer = new CMakeTokenizer('project(MyProject)');
            const tokens = tokenizer.tokenize();

            assert.strictEqual(tokens.length, 5); // command, (, arg, ), EOF
            assert.strictEqual(tokens[0].type, TokenType.Argument);
            assert.strictEqual(tokens[0].value, 'project');
            assert.strictEqual(tokens[1].type, TokenType.LeftParen);
            assert.strictEqual(tokens[2].type, TokenType.Argument);
            assert.strictEqual(tokens[2].value, 'MyProject');
            assert.strictEqual(tokens[3].type, TokenType.RightParen);
            assert.strictEqual(tokens[4].type, TokenType.EOF);
        });

        it('should tokenize multiple arguments', () => {
            const tokenizer = new CMakeTokenizer('set(VAR value1 value2)');
            const tokens = tokenizer.tokenize();

            const args = tokens.filter(t => t.type === TokenType.Argument);
            assert.strictEqual(args.length, 4); // set, VAR, value1, value2
        });

        it('should tokenize quoted arguments', () => {
            const tokenizer = new CMakeTokenizer('message("Hello World")');
            const tokens = tokenizer.tokenize();

            const quoted = tokens.find(t => t.type === TokenType.QuotedArgument);
            assert.ok(quoted);
            assert.strictEqual(quoted.value, 'Hello World');
        });

        it('should tokenize comments', () => {
            const tokenizer = new CMakeTokenizer('# This is a comment');
            const tokens = tokenizer.tokenize();

            const comment = tokens.find(t => t.type === TokenType.Comment);
            assert.ok(comment);
            assert.strictEqual(comment.value, '# This is a comment');
        });

        it('should tokenize newlines', () => {
            const tokenizer = new CMakeTokenizer('a()\nb()');
            const tokens = tokenizer.tokenize();

            const newlines = tokens.filter(t => t.type === TokenType.Newline);
            assert.strictEqual(newlines.length, 1);
        });

        it('should handle escaped characters in quoted strings', () => {
            const input = loadBasic('escaped-chars');
            const tokenizer = new CMakeTokenizer(input);
            const tokens = tokenizer.tokenize();

            const quoted = tokens.find(t => t.type === TokenType.QuotedArgument);
            assert.ok(quoted);
            assert.ok(quoted.value.includes('\\'));
        });
    });

    describe('Bracket Arguments', () => {
        it('should tokenize bracket arguments', () => {
            const input = loadParsing('special-syntax', 'bracket-arg');
            const tokenizer = new CMakeTokenizer(input);
            const tokens = tokenizer.tokenize();

            const bracket = tokens.find(t => t.type === TokenType.BracketArgument);
            assert.ok(bracket);
            assert.strictEqual(bracket.value, '[[literal content]]');
        });

        it('should tokenize bracket arguments with equals', () => {
            const input = loadParsing('special-syntax', 'bracket-arg-equals');
            const tokenizer = new CMakeTokenizer(input);
            const tokens = tokenizer.tokenize();

            const bracket = tokens.find(t => t.type === TokenType.BracketArgument);
            assert.ok(bracket);
            assert.strictEqual(bracket.value, '[=[literal with = inside]=]');
        });
    });

    describe('Bracket Comments', () => {
        it('should tokenize bracket comments', () => {
            const input = loadParsing('special-syntax', 'bracket-comment');
            const tokenizer = new CMakeTokenizer(input);
            const tokens = tokenizer.tokenize();

            const comment = tokens.find(t => t.type === TokenType.BracketComment);
            assert.ok(comment);
            assert.ok(comment.value.includes('bracket comment'));
        });
    });
});

describe('CMakeParser', () => {
    describe('Basic Parsing', () => {
        it('should parse a simple command', () => {
            const input = loadBasic('simple-command');
            const ast = parseCMake(input);

            assert.strictEqual(ast.type, NodeType.File);
            assert.strictEqual(ast.children.length, 1);

            const cmd = ast.children[0] as CommandNode;
            assert.strictEqual(cmd.type, NodeType.Command);
            assert.strictEqual(cmd.name, 'project');
            assert.strictEqual(cmd.arguments.length, 1);
            assert.strictEqual(cmd.arguments[0].value, 'MyProject');
        });

        it('should parse multiple commands', () => {
            const input = loadBasic('multiple-commands');
            const ast = parseCMake(input);

            // Filter out blank lines and get commands
            const commands = ast.children.filter(c => c.type === NodeType.Command);
            assert.strictEqual(commands.length, 2);
        });

        it('should parse commands with multiple arguments', () => {
            const input = loadBasic('command-with-args');
            const ast = parseCMake(input);

            const cmd = ast.children[0] as CommandNode;
            assert.strictEqual(cmd.arguments.length, 4);
        });

        it('should parse quoted arguments', () => {
            const input = loadBasic('quoted-arguments');
            const ast = parseCMake(input);

            const cmd = ast.children[0] as CommandNode;
            assert.strictEqual(cmd.arguments.length, 2);
            assert.strictEqual(cmd.arguments[1].quoted, true);
            assert.strictEqual(cmd.arguments[1].value, 'Hello World');
        });
    });

    describe('Comment Parsing', () => {
        it('should parse standalone comments', () => {
            const input = loadBasic('standalone-comment');
            const ast = parseCMake(input);

            const comment = ast.children.find(c => c.type === NodeType.Comment) as CommentNode;
            assert.ok(comment);
            assert.strictEqual(comment.value, '# This is a comment');
        });

        it('should parse trailing comments', () => {
            const input = loadBasic('trailing-comment');
            const ast = parseCMake(input);

            const cmd = ast.children[0] as CommandNode;
            assert.ok(cmd.trailingComment);
            assert.ok(cmd.trailingComment.includes('inline comment'));
        });
    });

    describe('Block Parsing', () => {
        it('should parse if blocks', () => {
            const input = loadParsing('control-flow', 'if-block');
            const ast = parseCMake(input);

            const block = ast.children.find(c => c.type === NodeType.Block) as BlockNode;
            assert.ok(block);
            assert.strictEqual(block.blockType, 'if');
            assert.ok(block.startCommand);
            assert.ok(block.endCommand);
        });

        it('should parse function blocks', () => {
            const input = loadParsing('functions', 'function-def');
            const ast = parseCMake(input);

            const block = ast.children.find(c => c.type === NodeType.Block) as BlockNode;
            assert.ok(block);
            assert.strictEqual(block.blockType, 'function');
        });

        it('should parse foreach blocks', () => {
            const input = loadParsing('control-flow', 'foreach-loop');
            const ast = parseCMake(input);

            const block = ast.children.find(c => c.type === NodeType.Block) as BlockNode;
            assert.ok(block);
            assert.strictEqual(block.blockType, 'foreach');
        });

        it('should parse nested blocks', () => {
            const input = loadParsing('control-flow', 'nested-if');
            const ast = parseCMake(input);

            const outerBlock = ast.children.find(c => c.type === NodeType.Block) as BlockNode;
            assert.ok(outerBlock);

            const innerBlock = outerBlock.body.find(c => c.type === NodeType.Block) as BlockNode;
            assert.ok(innerBlock);
            assert.strictEqual(innerBlock.blockType, 'if');
        });
    });
});
