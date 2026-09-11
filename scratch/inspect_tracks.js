const fs = require('fs');
const content = fs.readFileSync('server/database.ts', 'utf8');

// Find all matches for tracks
const matches = [...content.matchAll(/id:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g)];
matches.forEach((m, idx) => {
  console.log(`${idx}: ${m[1]} -> ${m[2]}`);
});
