const fs = require('fs');
const content = fs.readFileSync('server/mathNotes.ts', 'utf8');
const keys = [...content.matchAll(/"([a-zA-Z0-9_-]+)":\s*`/g)].map(m => m[1]);
console.log('Total notes count in mathNotes.ts:', keys.length);
console.log('First 25 keys:', keys.slice(0, 25));
