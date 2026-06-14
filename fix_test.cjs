const fs = require('fs');
const path = require('path');

const targetFile = path.join(process.cwd(), 'src/contexts/__tests__/AuthContext.test.tsx');
if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  content = content.replace(/unknown/g, 'any');
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Reverted unknown to any in AuthContext.test.tsx');
} else {
  console.log('AuthContext.test.tsx not found');
}
