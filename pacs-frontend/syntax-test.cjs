// Simple syntax test for DicomViewer.tsx
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'src', 'components', 'DicomViewer.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for common syntax issues
  const lines = content.split('\n');
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;
  let inTemplate = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count braces, parentheses, and brackets
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j-1] : '';
      
      if (char === '`' && prevChar !== '\\') {
        inTemplate = !inTemplate;
      }
      
      if (!inTemplate) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '(') openParens++;
        if (char === ')') openParens--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }
    
    // Report line if brackets are severely unbalanced
    if (Math.abs(openBraces) > 10 || Math.abs(openParens) > 10) {
      console.log(`Potential issue at line ${i + 1}: ${line.trim()}`);
      console.log(`Braces: ${openBraces}, Parens: ${openParens}, Brackets: ${openBrackets}`);
    }
  }
  
  console.log('Final counts:');
  console.log(`Braces: ${openBraces}`);
  console.log(`Parentheses: ${openParens}`);
  console.log(`Brackets: ${openBrackets}`);
  console.log(`Template literal state: ${inTemplate}`);
  
  if (openBraces === 0 && openParens === 0 && openBrackets === 0 && !inTemplate) {
    console.log('✅ Basic syntax check passed');
  } else {
    console.log('❌ Syntax issues detected');
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
}