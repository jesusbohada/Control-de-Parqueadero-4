const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /localStorage\.(?:getItem|setItem|removeItem)\(['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        results.push(match[1]);
      }
    }
  }
  return results;
}

const keys = Array.from(new Set(walk('src'))).sort();
console.log(JSON.stringify(keys, null, 2));
