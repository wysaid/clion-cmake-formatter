/**
 * Configuration file support for cc-format
 *
 * Provides loading/saving of .cc-format.jsonc configuration files
 * with support for comments and automatic project URL header.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FormatterOptions, DEFAULT_OPTIONS as FORMATTER_DEFAULT_OPTIONS, CommandCase } from './formatter';

// Re-export DEFAULT_OPTIONS for convenience
export { FORMATTER_DEFAULT_OPTIONS as DEFAULT_OPTIONS };

/**
 * The project URL that identifies cc-format configuration files
 */
export const PROJECT_URL = 'https://github.com/wysaid/clion-cmake-format';

/**
 * The configuration file names (in order of priority)
 */
export const CONFIG_FILE_NAMES = ['.cc-format.jsonc', '.cc-format'];

/**
 * Interface for configuration file content
 */
export interface ConfigFileContent {
    /** Path to the configuration file */
    filePath: string;
    /** The parsed configuration options */
    options: Partial<FormatterOptions>;
    /** Last modified timestamp */
    mtime: number;
}

/**
 * Maximum number of cached configuration files
 * This prevents unbounded memory growth in large projects with many config files
 */
const MAX_CACHE_SIZE = 50;

/**
 * Cache for loaded configuration files
 * Using Map to maintain insertion order for LRU eviction
 */
const configCache = new Map<string, ConfigFileContent>();

/**
 * Set of watched file paths
 */
const watchedFiles = new Set<string>();

/**
 * File system watchers
 */
const watchers = new Map<string, fs.FSWatcher>();

/**
 * Evict oldest entry from cache when size limit is reached
 */
function evictOldestCacheEntry(): void {
    // Get the first (oldest) entry
    const firstKey = configCache.keys().next().value;
    if (firstKey) {
        invalidateConfigCache(firstKey);
    }
}

/**
 * Strip comments from JSON content (JSONC to JSON)
 * Supports // line comments and /* block comments
 */
export function stripJsonComments(content: string): string {
    let result = '';
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;
    let i = 0;

    while (i < content.length) {
        const char = content[i];
        const nextChar = content[i + 1];

        // Handle string state
        if (!inLineComment && !inBlockComment) {
            if (char === '"') {
                // Count preceding backslashes to check if quote is escaped
                let backslashCount = 0;
                let j = i - 1;
                while (j >= 0 && content[j] === '\\') {
                    backslashCount++;
                    j--;
                }
                // Quote is escaped only if preceded by odd number of backslashes
                if (backslashCount % 2 === 0) {
                    inString = !inString;
                }
                result += char;
                i++;
                continue;
            }
        }

        // Inside string - just copy
        if (inString) {
            result += char;
            i++;
            continue;
        }

        // Check for line comment start
        if (!inBlockComment && char === '/' && nextChar === '/') {
            inLineComment = true;
            i += 2;
            continue;
        }

        // Check for block comment start
        if (!inLineComment && char === '/' && nextChar === '*') {
            inBlockComment = true;
            i += 2;
            continue;
        }

        // Check for line comment end
        if (inLineComment && (char === '\n' || char === '\r')) {
            inLineComment = false;
            result += char;
            i++;
            continue;
        }

        // Check for block comment end
        if (inBlockComment && char === '*' && nextChar === '/') {
            inBlockComment = false;
            i += 2;
            // Add a space to prevent tokens from merging
            result += ' ';
            continue;
        }

        // Skip content in comments
        if (inLineComment || inBlockComment) {
            i++;
            continue;
        }

        result += char;
        i++;
    }

    return result;
}

/**
 * Parse the first line to extract the project URL header
 */
function parseFirstLine(content: string): { hasValidHeader: boolean; remainingContent: string } {
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) {
        return { hasValidHeader: false, remainingContent: content };
    }

    const firstLine = lines[0].trim();

    // Check if first line is a comment with our project URL
    // Remove all whitespace for comparison
    const normalizedLine = firstLine.replace(/\s+/g, '');
    const normalizedUrl = `//${PROJECT_URL}`.replace(/\s+/g, '');

    if (normalizedLine === normalizedUrl) {
        return {
            hasValidHeader: true,
            remainingContent: lines.slice(1).join('\n')
        };
    }

    return { hasValidHeader: false, remainingContent: content };
}

/**
 * Generate the configuration file header
 */
export function generateConfigHeader(): string {
    return `// ${PROJECT_URL}`;
}

/**
 * Parse JSONC content to FormatterOptions
 */
export function parseConfigContent(content: string): Partial<FormatterOptions> | null {
    const { hasValidHeader, remainingContent } = parseFirstLine(content);

    if (!hasValidHeader) {
        // Configuration file must have valid header
        return null;
    }

    try {
        const jsonContent = stripJsonComments(remainingContent);
        const parsed = JSON.parse(jsonContent);
        return validateConfigOptions(parsed);
    } catch {
        // Failed to parse configuration file - return null to use default options
        return null;
    }
}

/**
 * Validate and extract FormatterOptions from parsed JSON
 */
function validateConfigOptions(parsed: Record<string, unknown>): Partial<FormatterOptions> {
    const options: Partial<FormatterOptions> = {};

    // Tab and Indent
    if (typeof parsed.useTabs === 'boolean') {
        options.useTabs = parsed.useTabs;
    }
    if (typeof parsed.tabSize === 'number' && parsed.tabSize >= 1 && parsed.tabSize <= 16) {
        options.tabSize = Math.floor(parsed.tabSize);
    }
    if (typeof parsed.indentSize === 'number' && parsed.indentSize >= 1 && parsed.indentSize <= 16) {
        options.indentSize = Math.floor(parsed.indentSize);
    }
    if (typeof parsed.continuationIndentSize === 'number' && parsed.continuationIndentSize >= 0 && parsed.continuationIndentSize <= 16) {
        options.continuationIndentSize = Math.floor(parsed.continuationIndentSize);
    }
    if (typeof parsed.keepIndentOnEmptyLines === 'boolean') {
        options.keepIndentOnEmptyLines = parsed.keepIndentOnEmptyLines;
    }

    // Spacing - Before Parentheses
    if (typeof parsed.spaceBeforeCommandDefinitionParentheses === 'boolean') {
        options.spaceBeforeCommandDefinitionParentheses = parsed.spaceBeforeCommandDefinitionParentheses;
    }
    if (typeof parsed.spaceBeforeCommandCallParentheses === 'boolean') {
        options.spaceBeforeCommandCallParentheses = parsed.spaceBeforeCommandCallParentheses;
    }
    if (typeof parsed.spaceBeforeIfParentheses === 'boolean') {
        options.spaceBeforeIfParentheses = parsed.spaceBeforeIfParentheses;
    }
    if (typeof parsed.spaceBeforeForeachParentheses === 'boolean') {
        options.spaceBeforeForeachParentheses = parsed.spaceBeforeForeachParentheses;
    }
    if (typeof parsed.spaceBeforeWhileParentheses === 'boolean') {
        options.spaceBeforeWhileParentheses = parsed.spaceBeforeWhileParentheses;
    }

    // Spacing - Inside Parentheses
    if (typeof parsed.spaceInsideCommandDefinitionParentheses === 'boolean') {
        options.spaceInsideCommandDefinitionParentheses = parsed.spaceInsideCommandDefinitionParentheses;
    }
    if (typeof parsed.spaceInsideCommandCallParentheses === 'boolean') {
        options.spaceInsideCommandCallParentheses = parsed.spaceInsideCommandCallParentheses;
    }
    if (typeof parsed.spaceInsideIfParentheses === 'boolean') {
        options.spaceInsideIfParentheses = parsed.spaceInsideIfParentheses;
    }
    if (typeof parsed.spaceInsideForeachParentheses === 'boolean') {
        options.spaceInsideForeachParentheses = parsed.spaceInsideForeachParentheses;
    }
    if (typeof parsed.spaceInsideWhileParentheses === 'boolean') {
        options.spaceInsideWhileParentheses = parsed.spaceInsideWhileParentheses;
    }

    // Blank Lines
    if (typeof parsed.maxBlankLines === 'number' && parsed.maxBlankLines >= 0 && parsed.maxBlankLines <= 20) {
        options.maxBlankLines = Math.floor(parsed.maxBlankLines);
    }
    if (typeof parsed.maxTrailingBlankLines === 'number' && parsed.maxTrailingBlankLines >= 0) {
        options.maxTrailingBlankLines = Math.floor(parsed.maxTrailingBlankLines);
    }

    // Command Case
    if (typeof parsed.commandCase === 'string') {
        const validCases: CommandCase[] = ['unchanged', 'lowercase', 'uppercase'];
        if (validCases.includes(parsed.commandCase as CommandCase)) {
            options.commandCase = parsed.commandCase as CommandCase;
        }
    }

    // Wrapping and Alignment
    if (typeof parsed.lineLength === 'number' && parsed.lineLength >= 0 && parsed.lineLength <= 500) {
        options.lineLength = Math.floor(parsed.lineLength);
    }
    if (typeof parsed.alignMultiLineArguments === 'boolean') {
        options.alignMultiLineArguments = parsed.alignMultiLineArguments;
    }
    if (typeof parsed.alignMultiLineParentheses === 'boolean') {
        options.alignMultiLineParentheses = parsed.alignMultiLineParentheses;
    }
    if (typeof parsed.alignControlFlowParentheses === 'boolean') {
        options.alignControlFlowParentheses = parsed.alignControlFlowParentheses;
    }

    return options;
}

/**
 * Load configuration from a file
 */
export function loadConfigFile(filePath: string): ConfigFileContent | null {
    try {
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const options = parseConfigContent(content);

        if (options === null) {
            return null;
        }

        return {
            filePath,
            options,
            mtime: stat.mtimeMs
        };
    } catch (error) {
        return null;
    }
}

/**
 * Find configuration file by searching up the directory tree
 * @param documentPath Path to the document being formatted
 * @param workspaceRoot Optional workspace root to stop searching at
 */
export function findConfigFile(documentPath: string, workspaceRoot?: string): string | null {
    let currentDir = path.dirname(documentPath);
    const root = workspaceRoot ? path.resolve(workspaceRoot) : path.parse(currentDir).root;

    while (currentDir.length >= root.length) {
        for (const configName of CONFIG_FILE_NAMES) {
            const configPath = path.join(currentDir, configName);
            if (fs.existsSync(configPath)) {
                // Resolve symbolic links to prevent issues with links pointing outside workspace
                try {
                    const resolvedPath = fs.realpathSync(configPath);
                    // Verify the resolved path is still within the workspace boundaries
                    if (workspaceRoot) {
                        // Also resolve workspace root to handle symlinks (e.g., /var -> /private/var on macOS)
                        const rootNormalized = fs.realpathSync(root);
                        if (!resolvedPath.startsWith(rootNormalized + path.sep) && resolvedPath !== rootNormalized) {
                            // Config file resolves to outside workspace - skip it
                            continue;
                        }
                    }
                    return resolvedPath;
                } catch (e) {
                    // Could not resolve symbolic link - skip this file
                    continue;
                }
            }
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    return null;
}

/**
 * Get cached configuration or load from file
 * @param configPath Path to the configuration file
 */
export function getCachedConfig(configPath: string): ConfigFileContent | null {
    const cached = configCache.get(configPath);

    if (cached) {
        // Move to end (most recently used) for LRU
        configCache.delete(configPath);
        configCache.set(configPath, cached);
        return cached;
    }

    const config = loadConfigFile(configPath);
    if (config) {
        // Evict oldest entry if cache is full
        if (configCache.size >= MAX_CACHE_SIZE) {
            evictOldestCacheEntry();
        }
        configCache.set(configPath, config);
        watchConfigFile(configPath);
    }

    return config;
}

/**
 * Start watching a configuration file for changes
 */
function watchConfigFile(filePath: string): void {
    if (watchedFiles.has(filePath)) {
        return;
    }

    try {
        const watcher = fs.watch(filePath, (eventType) => {
            try {
                if (eventType === 'change') {
                    // File was modified - invalidate cache
                    invalidateConfigCache(filePath);
                } else if (eventType === 'rename') {
                    // File may have been deleted or renamed
                    // Check if file still exists before invalidating
                    if (!fs.existsSync(filePath)) {
                        invalidateConfigCache(filePath);
                    }
                }
            } catch (err) {
                // Silently handle errors in watcher callback
                // Most common errors are ENOENT (file deleted) or permission issues
                invalidateConfigCache(filePath);
            }
        });

        watcher.on('error', () => {
            invalidateConfigCache(filePath);
        });

        watchers.set(filePath, watcher);
        watchedFiles.add(filePath);
    } catch {
        // File watching not available - cache will still work but won't update
        // automatically when file changes. This is an acceptable fallback.
    }
}

/**
 * Invalidate cached configuration for a file
 */
export function invalidateConfigCache(filePath: string): void {
    configCache.delete(filePath);
    watchedFiles.delete(filePath);

    const watcher = watchers.get(filePath);
    if (watcher) {
        watcher.close();
        watchers.delete(filePath);
    }
}

/**
 * Clear all cached configurations
 */
export function clearConfigCache(): void {
    for (const watcher of watchers.values()) {
        watcher.close();
    }
    configCache.clear();
    watchedFiles.clear();
    watchers.clear();
}

/**
 * Get configuration for a document
 * @param documentPath Path to the document being formatted
 * @param workspaceRoot Optional workspace root
 * @param globalOptions Global/workspace configuration from VS Code
 */
export function getConfigForDocument(
    documentPath: string,
    workspaceRoot?: string,
    globalOptions: Partial<FormatterOptions> = {}
): Partial<FormatterOptions> {
    const configPath = findConfigFile(documentPath, workspaceRoot);

    if (!configPath) {
        return globalOptions;
    }

    const config = getCachedConfig(configPath);

    if (!config) {
        return globalOptions;
    }

    // Merge: defaults < global options < project config file
    return {
        ...globalOptions,
        ...config.options
    };
}

/**
 * Generate a sample configuration file content
 */
export function generateSampleConfig(options: Partial<FormatterOptions> = {}): string {
    const config = { ...FORMATTER_DEFAULT_OPTIONS, ...options };

    const lines = [
        generateConfigHeader(),
        '{',
        '    // Tab and Indentation',
        `    "useTabs": ${config.useTabs},`,
        `    "tabSize": ${config.tabSize},`,
        `    "indentSize": ${config.indentSize},`,
        `    "continuationIndentSize": ${config.continuationIndentSize},`,
        `    "keepIndentOnEmptyLines": ${config.keepIndentOnEmptyLines},`,
        '',
        '    // Spacing Before Parentheses',
        `    "spaceBeforeCommandDefinitionParentheses": ${config.spaceBeforeCommandDefinitionParentheses},`,
        `    "spaceBeforeCommandCallParentheses": ${config.spaceBeforeCommandCallParentheses},`,
        `    "spaceBeforeIfParentheses": ${config.spaceBeforeIfParentheses},`,
        `    "spaceBeforeForeachParentheses": ${config.spaceBeforeForeachParentheses},`,
        `    "spaceBeforeWhileParentheses": ${config.spaceBeforeWhileParentheses},`,
        '',
        '    // Spacing Inside Parentheses',
        `    "spaceInsideCommandDefinitionParentheses": ${config.spaceInsideCommandDefinitionParentheses},`,
        `    "spaceInsideCommandCallParentheses": ${config.spaceInsideCommandCallParentheses},`,
        `    "spaceInsideIfParentheses": ${config.spaceInsideIfParentheses},`,
        `    "spaceInsideForeachParentheses": ${config.spaceInsideForeachParentheses},`,
        `    "spaceInsideWhileParentheses": ${config.spaceInsideWhileParentheses},`,
        '',
        '    // Blank Lines',
        `    "maxBlankLines": ${config.maxBlankLines},`,
        `    "maxTrailingBlankLines": ${config.maxTrailingBlankLines},`,
        '',
        '    // Command Case: "unchanged", "lowercase", or "uppercase"',
        `    "commandCase": "${config.commandCase}",`,
        '',
        '    // Line Wrapping and Alignment',
        `    "lineLength": ${config.lineLength},`,
        `    "alignMultiLineArguments": ${config.alignMultiLineArguments},`,
        `    "alignMultiLineParentheses": ${config.alignMultiLineParentheses},`,
        `    "alignControlFlowParentheses": ${config.alignControlFlowParentheses}`,
        '}'
    ];

    return lines.join('\n') + '\n';
}

/**
 * Save configuration to a file
 * @param filePath Path to save the configuration to
 * @param options Configuration options to save
 */
export function saveConfigFile(filePath: string, options: Partial<FormatterOptions>): void {
    const content = generateSampleConfig(options);
    fs.writeFileSync(filePath, content, 'utf-8');
}
