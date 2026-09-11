const fs = require('fs');
const content = fs.readFileSync('server/mathNotes.ts', 'utf8');
const keys = [...content.matchAll(/"([a-zA-Z0-9_-]+)":\s*`/g)].map(m => m[1]);
console.log('Keys matching math_1:', keys.filter(k => k.startsWith('math_1')));
console.log('All 30 prefix families:', [...new Set(keys.map(k => k.split('_').slice(0, 3).join('_')))].slice(0, 30));
