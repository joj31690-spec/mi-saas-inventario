const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const frontendSrcDir = path.join(__dirname, 'frontend/src');
const files = walk(frontendSrcDir);

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace 'http://localhost:3000/api' to `import.meta.env.VITE_API_BASE_URL` inside regular quotes
  content = content.replace(/'http:\/\/localhost:3000\/api(.*?)'/g, '`${import.meta.env.VITE_API_BASE_URL}$1`');
  
  // Replace "http://localhost:3000/api" to `import.meta.env.VITE_API_BASE_URL` inside double quotes
  content = content.replace(/"http:\/\/localhost:3000\/api(.*?)"/g, '`${import.meta.env.VITE_API_BASE_URL}$1`');
  
  // Replace http://localhost:3000/api inside backticks
  content = content.replace(/http:\/\/localhost:3000\/api/g, '${import.meta.env.VITE_API_BASE_URL}');
  
  // Clean up cases where we might have generated `${import.meta.env.VITE_API_BASE_URL}` inside an already existing template literal
  // E.g., `${import.meta.env.VITE_API_BASE_URL}${someVar}` -> actually this is valid JS inside backticks!

  // For the images: http://localhost:3000
  // Ex: `http://localhost:3000${logo}` -> `${import.meta.env.VITE_BACKEND_URL}${logo}`
  content = content.replace(/http:\/\/localhost:3000/g, '${import.meta.env.VITE_BACKEND_URL}');

  // In api.js we have: baseURL: 'http://localhost:3000/api'
  // My first regex changes it to baseURL: `${import.meta.env.VITE_API_BASE_URL}` which is fine.

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Updated:', file);
  }
});

console.log(`Refactored ${count} files.`);
