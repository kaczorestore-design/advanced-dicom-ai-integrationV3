const fs = require('fs');
const path = require('path');

// Read the DicomViewer.tsx file
const filePath = path.join(__dirname, 'src', 'components', 'DicomViewer.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Simple brace matching
function checkBraces(content) {
  const lines = content.split('\n');
  let braceStack = [];
  let parenStack = [];
  let bracketStack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j-1] : '';
      const nextChar = j < line.length - 1 ? line[j+1] : '';
      
      // Skip strings and comments
      if (char === '"' || char === "'" || char === '`') {
        // Skip string content
        let quote = char;
        j++;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++; // Skip escaped characters
          j++;
        }
        continue;
      }
      
      if (char === '/' && nextChar === '/') {
        break; // Skip rest of line comment
      }
      
      if (char === '/' && nextChar === '*') {
        // Skip block comment
        j += 2;
        while (j < line.length - 1) {
          if (line[j] === '*' && line[j+1] === '/') {
            j += 2;
            break;
          }
          j++;
        }
        continue;
      }
      
      switch (char) {
        case '{':
          braceStack.push({char, line: lineNum, col: j+1});
          break;
        case '}':
          if (braceStack.length === 0) {
            console.log(`Unmatched closing brace at line ${lineNum}:${j+1}`);
          } else {
            braceStack.pop();
          }
          break;
        case '(':
          parenStack.push({char, line: lineNum, col: j+1});
          break;
        case ')':
          if (parenStack.length === 0) {
            console.log(`Unmatched closing parenthesis at line ${lineNum}:${j+1}`);
          } else {
            parenStack.pop();
          }
          break;
        case '[':
          bracketStack.push({char, line: lineNum, col: j+1});
          break;
        case ']':
          if (bracketStack.length === 0) {
            console.log(`Unmatched closing bracket at line ${lineNum}:${j+1}`);
          } else {
            bracketStack.pop();
          }
          break;
      }
    }
  }
  
  // Check for unmatched opening braces
  if (braceStack.length > 0) {
    console.log('Unmatched opening braces:');
    braceStack.forEach(brace => {
      console.log(`  Opening brace at line ${brace.line}:${brace.col}`);
    });
  }
  
  if (parenStack.length > 0) {
    console.log('Unmatched opening parentheses:');
    parenStack.forEach(paren => {
      console.log(`  Opening parenthesis at line ${paren.line}:${paren.col}`);
    });
  }
  
  if (bracketStack.length > 0) {
    console.log('Unmatched opening brackets:');
    bracketStack.forEach(bracket => {
      console.log(`  Opening bracket at line ${bracket.line}:${bracket.col}`);
    });
  }
  
  if (braceStack.length === 0 && parenStack.length === 0 && bracketStack.length === 0) {
    console.log('All braces, parentheses, and brackets are properly matched!');
  }
}

console.log('Checking syntax for DicomViewer.tsx...');
checkBraces(content);