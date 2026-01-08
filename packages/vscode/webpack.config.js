/**
 * Webpack configuration for VS Code extension
 * Bundles all code (including @cc-format/core) into a single extension.js file
 */

const path = require('path');

/** @type {import('webpack').Configuration} */
const config = {
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        clean: true
    },
    externals: {
        vscode: 'commonjs vscode' // The vscode-module is created on-the-fly and must be excluded
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            // Resolve @cc-format/core to local source (development) or installed package
            '@cc-format/core': path.resolve(__dirname, '../core/src')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                module: 'esnext',
                                moduleResolution: 'node'
                            },
                            transpileOnly: true
                        }
                    }
                ]
            }
        ]
    },
    devtool: 'source-map',
    infrastructureLogging: {
        level: 'log'
    }
};

module.exports = config;
