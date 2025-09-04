const fs = require('fs');
const content = fs.readFileSync('src/components/DicomViewer.tsx', 'utf8');
const lines = content.split('\n');

// Check lines around 4970
for (let i = 4960; i < 4980; i++) {
  if (lines[i]) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}

// Check for unclosed brackets/braces
let openBraces = 0;
let openBrackets = 0;
let openParens = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const char of line) {
    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
    else if (char === '(') openParens++;
    else if (char === ')') openParens--;
  }
  
  if (i === 4969) { // Line 4970 (0-indexed)
    console.log(`\nAt line 4970:`);
    console.log(`Open braces: ${openBraces}`);
    console.log(`Open brackets: ${openBrackets}`);
    console.log(`Open parentheses: ${openParens}`);
  }
}