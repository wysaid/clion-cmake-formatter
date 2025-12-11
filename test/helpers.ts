/**
 * Test helper functions for loading datasets and managing test data
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the absolute path to a dataset file
 * @param category - The dataset category (basic, parsing, formatting, edge-cases, real-world)
 * @param subcategory - Optional subcategory (e.g., control-flow, indentation)
 * @param filename - The filename (with or without .cmake extension)
 */
export function getDatasetPath(category: string, subcategory: string | null, filename: string): string {
    if (!filename.endsWith('.cmake')) {
        filename = `${filename}.cmake`;
    }

    if (subcategory) {
        return path.join(__dirname, 'datasets', category, subcategory, filename);
    } else {
        return path.join(__dirname, 'datasets', category, filename);
    }
}

/**
 * Load the content of a dataset file
 * @param category - The dataset category
 * @param subcategory - Optional subcategory
 * @param filename - The filename
 */
export function loadDataset(category: string, subcategory: string | null, filename: string): string {
    const filePath = getDatasetPath(category, subcategory, filename);
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to load dataset: ${filePath}\n${error}`);
    }
}

/**
 * Load expected output for a test case
 * Expected files should have the same name with .expected suffix
 * @param category - The dataset category
 * @param subcategory - Optional subcategory
 * @param filename - The base filename (without .expected)
 */
export function loadExpected(category: string, subcategory: string | null, filename: string): string {
    // Remove .cmake if present, add .expected.cmake
    const baseName = filename.replace(/\.cmake$/, '');
    const expectedFilename = `${baseName}.expected.cmake`;

    return loadDataset(category, subcategory, expectedFilename);
}

/**
 * Check if an expected output file exists
 */
export function hasExpected(category: string, subcategory: string | null, filename: string): boolean {
    const baseName = filename.replace(/\.cmake$/, '');
    const expectedFilename = `${baseName}.expected.cmake`;
    const filePath = getDatasetPath(category, subcategory, expectedFilename);

    return fs.existsSync(filePath);
}

/**
 * Convenience function for loading basic datasets (most common case)
 */
export function loadBasic(filename: string): string {
    return loadDataset('basic', null, filename);
}

/**
 * Convenience function for loading parsing test data
 */
export function loadParsing(subcategory: string, filename: string): string {
    return loadDataset('parsing', subcategory, filename);
}

/**
 * Convenience function for loading formatting test data
 */
export function loadFormatting(subcategory: string, filename: string): string {
    return loadDataset('formatting', subcategory, filename);
}

/**
 * Convenience function for loading edge case test data
 */
export function loadEdgeCase(filename: string): string {
    return loadDataset('edge-cases', null, filename);
}

/**
 * Convenience function for loading real-world test data
 */
export function loadRealWorld(filename: string): string {
    return loadDataset('real-world', null, filename);
}

/**
 * List all dataset files in a category
 */
export function listDatasets(category: string, subcategory: string | null = null): string[] {
    const dirPath = subcategory
        ? path.join(__dirname, 'datasets', category, subcategory)
        : path.join(__dirname, 'datasets', category);

    try {
        const files = fs.readdirSync(dirPath);
        return files.filter(f => f.endsWith('.cmake') && !f.endsWith('.expected.cmake'));
    } catch (error) {
        return [];
    }
}

/**
 * Get the path to the well-formatted directory (well-formated)
 */
export function getWellFormatedPath(): string {
    return path.join(__dirname, 'datasets', 'well-formated');
}

/**
 * List all subdirectories in the well-formatted category (well-formated)
 * Each subdirectory represents a different format style
 */
export function listWellFormatedStyles(): string[] {
    const wellFormatedPath = getWellFormatedPath();

    try {
        const entries = fs.readdirSync(wellFormatedPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    } catch (error) {
        return [];
    }
}

/**
 * List all cmake files in a well-formatted style directory
 * @param style - The style directory name (e.g., 'default')
 */
export function listWellFormatedFiles(style: string): string[] {
    const stylePath = path.join(getWellFormatedPath(), style);

    try {
        const files = fs.readdirSync(stylePath);
        return files.filter(f => f.endsWith('.cmake'));
    } catch (error) {
        return [];
    }
}

/**
 * Load a well-formatted cmake file
 * @param style - The style directory name (e.g., 'default')
 * @param filename - The cmake filename
 */
export function loadWellFormated(style: string, filename: string): string {
    if (!filename.endsWith('.cmake')) {
        filename = `${filename}.cmake`;
    }
    const filePath = path.join(getWellFormatedPath(), style, filename);
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to load well-formatted file: ${filePath}\n${error}`);
    }
}

/**
 * Load the .cc-format.jsonc config file for a well-formatted style
 * @param style - The style directory name (e.g., 'default')
 */
export function loadWellFormatedConfig(style: string): string {
    const configPath = path.join(getWellFormatedPath(), style, '.cc-format.jsonc');
    try {
        return fs.readFileSync(configPath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to load config file for style '${style}': ${configPath}\n${error}`);
    }
}
