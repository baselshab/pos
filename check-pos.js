const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/pos/page.tsx', 'utf8');
const lines = code.split('\n');

// Find lines with potential issues around line 635
for (let i = 630; i < Math.min(640, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

console.log('\n--- Checking for unmatched tags ---');
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Match opening tags like <div, </div, <Card, </Card, etc.
  const tagRegex = /<\/?([A-Za-z][A-Za-z0-9]*)[^>]*>/g;
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    if (fullTag.startsWith('</')) {
      if (stack.length > 0 && stack[stack.length - 1] === tagName) {
        stack.pop();
      } else {
        console.log(`Line ${i+1}: Unexpected closing </${tagName}>, stack top: ${stack[stack.length-1] || 'empty'}`);
      }
    } else if (!fullTag.endsWith('/>') && !['input', 'br', 'hr', 'img', 'meta', 'link'].includes(tagName)) {
      stack.push(tagName);
    }
  }
}

console.log('Remaining open tags:', stack);
