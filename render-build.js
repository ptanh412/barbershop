#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Render build process...');

try {
  // Ensure node_modules exists and install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm ci --production=false', { stdio: 'inherit' });
  
  // Check if @types/node is installed
  const typesPath = path.join(__dirname, 'node_modules', '@types', 'node');
  if (!fs.existsSync(typesPath)) {
    console.log('⚠️  @types/node not found, installing...');
    execSync('npm install @types/node --save', { stdio: 'inherit' });
  }
  
  // Run TypeScript compilation
  console.log('🔨 Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
