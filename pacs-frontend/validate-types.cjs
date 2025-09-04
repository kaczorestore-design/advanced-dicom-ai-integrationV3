#!/usr/bin/env node

// TypeScript validation script to identify and categorize 'any' type issues
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting comprehensive TypeScript validation...');

// Run ESLint with JSON output to get structured error data
try {
  console.log('📋 Running ESLint analysis...');
  const eslintOutput = execSync('npx eslint . --ext .ts,.tsx --format json', {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  
  const results = JSON.parse(eslintOutput);
  
  // Categorize errors by type and file
  const errorsByType = {};
  const errorsByFile = {};
  let totalErrors = 0;
  let totalWarnings = 0;
  
  results.forEach(file => {
    if (file.messages.length > 0) {
      errorsByFile[file.filePath] = file.messages;
      
      file.messages.forEach(message => {
        if (message.severity === 2) totalErrors++;
        if (message.severity === 1) totalWarnings++;
        
        const ruleId = message.ruleId || 'unknown';
        if (!errorsByType[ruleId]) {
          errorsByType[ruleId] = [];
        }
        errorsByType[ruleId].push({
          file: file.filePath,
          line: message.line,
          column: message.column,
          message: message.message
        });
      });
    }
  });
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Total Warnings: ${totalWarnings}`);
  console.log(`   Files with issues: ${Object.keys(errorsByFile).length}`);
  
  console.log(`\n🏷️  Error Types:`);
  Object.entries(errorsByType)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 10)
    .forEach(([rule, errors]) => {
      console.log(`   ${rule}: ${errors.length} occurrences`);
    });
  
  console.log(`\n📁 Most Problematic Files:`);
  Object.entries(errorsByFile)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 10)
    .forEach(([file, errors]) => {
      const fileName = path.basename(file);
      console.log(`   ${fileName}: ${errors.length} issues`);
    });
  
  // Focus on @typescript-eslint/no-explicit-any errors
  const anyTypeErrors = errorsByType['@typescript-eslint/no-explicit-any'] || [];
  if (anyTypeErrors.length > 0) {
    console.log(`\n🎯 'any' Type Issues (${anyTypeErrors.length} total):`);
    
    // Group by file
    const anyErrorsByFile = {};
    anyTypeErrors.forEach(error => {
      const fileName = path.basename(error.file);
      if (!anyErrorsByFile[fileName]) {
        anyErrorsByFile[fileName] = [];
      }
      anyErrorsByFile[fileName].push(error);
    });
    
    Object.entries(anyErrorsByFile)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 5)
      .forEach(([file, errors]) => {
        console.log(`\n   📄 ${file} (${errors.length} 'any' types):`);
        errors.slice(0, 5).forEach(error => {
          console.log(`      Line ${error.line}: ${error.message}`);
        });
        if (errors.length > 5) {
          console.log(`      ... and ${errors.length - 5} more`);
        }
      });
  }
  
  // Save detailed report
  const report = {
    summary: {
      totalErrors,
      totalWarnings,
      filesWithIssues: Object.keys(errorsByFile).length
    },
    errorsByType,
    errorsByFile,
    anyTypeErrors
  };
  
  fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to validation-report.json`);
  
} catch (error) {
  console.error('❌ ESLint analysis failed:', error.message);
  
  // Fallback: Try TypeScript compiler check
  try {
    console.log('\n🔄 Falling back to TypeScript compiler check...');
    execSync('npx tsc --noEmit', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log('✅ TypeScript compilation check passed!');
  } catch (tscError) {
    console.error('❌ TypeScript compilation failed');
    process.exit(1);
  }
}

console.log('\n🎯 Next Steps:');
console.log('1. Fix @typescript-eslint/no-explicit-any errors first');
console.log('2. Address other TypeScript errors');
console.log('3. Run validation again to verify fixes');
console.log('4. Ensure build still passes: npm run build');