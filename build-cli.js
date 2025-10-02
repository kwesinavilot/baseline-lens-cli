const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Baseline Lens CLI...');

try {
    // Clean dist directory
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true, force: true });
    }

    // Build TypeScript
    console.log('📦 Compiling TypeScript...');
    execSync('npx tsc -p tsconfig.cli.json', { stdio: 'inherit' });

    // Copy package.json for CLI
    console.log('📋 Copying package.json...');
    const cliPackageJson = JSON.parse(fs.readFileSync('cli-package.json', 'utf8'));
    fs.writeFileSync('dist/package.json', JSON.stringify(cliPackageJson, null, 2));

    // Copy README and LICENSE
    if (fs.existsSync('README.md')) {
        fs.copyFileSync('README.md', 'dist/README.md');
    }
    if (fs.existsSync('LICENSE')) {
        fs.copyFileSync('LICENSE', 'dist/LICENSE');
    }

    // Make CLI executable
    const cliPath = path.join('dist', 'index.js');
    if (fs.existsSync(cliPath)) {
        const content = fs.readFileSync(cliPath, 'utf8');
        if (!content.startsWith('#!/usr/bin/env node')) {
            fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
        }
        
        // Set executable permissions on Unix-like systems
        try {
            fs.chmodSync(cliPath, '755');
        } catch (e) {
            // Ignore on Windows
        }
    }

    console.log('✅ CLI build completed successfully!');
    console.log('📁 Output directory: ./dist');
    console.log('🚀 Test with: node dist/index.js --help');

} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}