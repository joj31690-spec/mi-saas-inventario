const fs = require('fs');
const path = require('path');
const dir = './src/routes';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.js')) {
    let p = path.join(dir, file);
    let c = fs.readFileSync(p, 'utf8');
    
    let changed = false;
    
    // Pattern 1: , requireRole('admin')
    if (c.includes(", requireRole('admin')")) {
      c = c.replace(/, requireRole\('admin'\)/g, '');
      changed = true;
    }
    
    // Pattern 2: requireRole('admin'), 
    if (c.includes("requireRole('admin'), ")) {
      c = c.replace(/requireRole\('admin'\), /g, '');
      changed = true;
    }
    
    // Pattern 3: requireRole('admin') (e.g. at the end of router.use)
    if (c.includes("requireRole('admin')")) {
      c = c.replace(/requireRole\('admin'\)/g, '');
      changed = true;
    }
    
    // Fix trailing commas if they appeared like router.use(verifyToken, )
    if (c.includes("verifyToken, )")) {
      c = c.replace(/verifyToken, \)/g, 'verifyToken)');
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(p, c);
      console.log('Fixed', file);
    }
  }
});
