#!/usr/bin/env node

/**
 * Check if pnpm is being used (not npm or yarn)
 * This script is run as a preinstall hook to ensure the project uses pnpm
 */

const userAgent = process.env.npm_config_user_agent || '';

if (!userAgent.includes('pnpm')) {
    console.error('\n\x1b[31m╔════════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ Please use pnpm instead of npm or yarn!                   ║');
    console.error('║                                                                ║');
    console.error('║  This project has migrated to pnpm for better dependency      ║');
    console.error('║  management. Install pnpm first:                              ║');
    console.error('║                                                                ║');
    console.error('║    npm install -g pnpm                                         ║');
    console.error('║    # or                                                        ║');
    console.error('║    curl -fsSL https://get.pnpm.io/install.sh | sh -           ║');
    console.error('║                                                                ║');
    console.error('║  Then run:                                                     ║');
    console.error('║                                                                ║');
    console.error('║    pnpm install                                                ║');
    console.error('║                                                                ║');
    console.error('╚════════════════════════════════════════════════════════════════╝\x1b[0m\n');
    process.exit(1);
}
