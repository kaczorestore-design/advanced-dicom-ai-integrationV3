const fs = require('fs');

const content = fs.readFileSync('src/components/DicomViewer.tsx', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
let openParens = 0;
let inTemplate = false;
let templateDepth = 0;
let braceStack = [];
let parenStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prevChar = j > 0 ? line[j-1] : '';
    
    if (char === '`') {
      inTemplate = !inTemplate;
    }
    
    if (inTemplate && char === '{' && prevChar === '$') {
      templateDepth++;
    } else if (inTemplate && char === '}' && templateDepth > 0) {
      templateDepth--;
    } else if (!inTemplate || templateDepth === 0) {
      if (char === '{') {
        openBraces++;
        braceStack.push({line: i + 1, char: j + 1, content: line.trim()});
      } else if (char === '}') {
        openBraces--;
        if (braceStack.length > 0) {
          braceStack.pop();
        }
      } else if (char === '(') {
        openParens++;
        parenStack.push({line: i + 1, char: j + 1, content: line.trim()});
      } else if (char === ')') {
        openParens--;
        if (parenStack.length > 0) {
          parenStack.pop();
        }
      }
    }
    
    if (openBraces < 0 || openParens < 0) {
      console.log(`Unmatched closing at line ${i + 1}, char ${j + 1}: '${char}'`);
      console.log(`Line: ${line}`);
      break;
    }
  }
}

console.log(`Final counts:`);
console.log(`Open braces: ${openBraces}`);
console.log(`Open parentheses: ${openParens}`);

if (openBraces > 0) {
  console.log('\nUnmatched opening braces:');
  braceStack.slice(-Math.min(5, braceStack.length)).forEach(brace => {
    console.log(`  Line ${brace.line}: ${brace.content}`);
  });
}

if (openParens > 0) {
  console.log('\nUnmatched opening parentheses:');
  parenStack.slice(-Math.min(5, parenStack.length)).forEach(paren => {
    console.log(`  Line ${paren.line}: ${paren.content}`);
  });
}