const fs = require('fs');
const content = fs.readFileSync('server/mathNotes.ts', 'utf8');

// Let's check matching for math_1_1, math_1_2 etc.
console.log('mathNotes has math_1_2?', content.includes('"math_1_2":'));
console.log('mathNotes has math_1_desc_2?', content.includes('"math_1_desc_2":'));
