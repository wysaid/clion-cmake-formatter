/**
 * Script to generate well-formatted expected output files for different style configurations
 * 
 * This script:
 * 1. Reads input files from test/datasets/{category}
 * 2. Formats them with each style configuration
 * 3. Saves the formatted output to test/datasets/well-formatted/{style}/{category}/
 * 
 * Usage: npx ts-node scripts/generate-well-formatted.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { formatCMake } from '../src/formatter';
import { parseConfigContent } from '../src/config';

const DATASETS_DIR = path.join(__dirname, '..', 'test', 'datasets');
const WELL_FORMATTED_DIR = path.join(DATASETS_DIR, 'well-formatted');

// Categories to process (excluding well-formatted itself)
const INPUT_CATEGORIES = ['basic', 'cmake-official', 'edge-cases', 'formatting', 'parsing', 'real-world'];

// Styles to generate (including default for consistency)
const STYLES_TO_GENERATE = ['default', 'lowercase', 'uppercase', 'compact', 'jetbrains'];

/**
 * Recursively find all .cmake files in a directory
 */
function findCMakeFiles(dir: string, basePath: string = dir): string[] {
    const results: string[] = [];
    
    if (!fs.existsSync(dir)) {
        return results;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            results.push(...findCMakeFiles(fullPath, basePath));
        } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
            const relativePath = path.relative(basePath, fullPath);
            results.push(relativePath);
        }
    }
    
    return results;
}

/**
 * Load and parse a .cc-format.jsonc config file
 */
function loadStyleConfig(style: string): Record<string, unknown> {
    const configPath = path.join(WELL_FORMATTED_DIR, style, '.cc-format.jsonc');
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = parseConfigContent(content);
    if (!config) {
        throw new Error(`Failed to parse config for style: ${style}`);
    }
    return config;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Process a single category for a style
 */
function processCategory(style: string, category: string, config: Record<string, unknown>): number {
    const categoryPath = path.join(DATASETS_DIR, category);
    const outputDir = path.join(WELL_FORMATTED_DIR, style, category);
    
    const files = findCMakeFiles(categoryPath);
    let processed = 0;
    
    for (const file of files) {
        const inputPath = path.join(categoryPath, file);
        const outputPath = path.join(outputDir, file);
        
        // Read input
        const input = fs.readFileSync(inputPath, 'utf-8');
        
        // Format with style config
        const formatted = formatCMake(input, config);
        
        // Ensure output directory exists
        ensureDir(path.dirname(outputPath));
        
        // Write formatted output
        fs.writeFileSync(outputPath, formatted);
        processed++;
    }
    
    return processed;
}

/**
 * Main function
 */
function main(): void {
    console.log('Generating well-formatted expected output files...\n');
    
    for (const style of STYLES_TO_GENERATE) {
        console.log(`Style: ${style}`);
        const config = loadStyleConfig(style);
        
        let totalFiles = 0;
        for (const category of INPUT_CATEGORIES) {
            const count = processCategory(style, category, config);
            if (count > 0) {
                console.log(`  - ${category}: ${count} files`);
                totalFiles += count;
            }
        }
        console.log(`  Total: ${totalFiles} files\n`);
    }
    
    console.log('Done!');
}

main();
