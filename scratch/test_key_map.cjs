const fs = require('fs');
const content = fs.readFileSync('server/mathNotes.ts', 'utf8');
const allKeys = [...content.matchAll(/"([a-zA-Z0-9_-]+)":\s*`/g)].map(m => m[1]);

function findNoteKey(nodeId) {
  if (allKeys.includes(nodeId)) return nodeId;

  // e.g. math_1_2 -> prefix "math_1_", suffix "2"
  const parts = nodeId.split('_');
  if (parts.length === 3) {
    const [prefix, num1, num2] = parts;
    const regex = new RegExp(`^${prefix}_${num1}_[a-zA-Z0-9_]+_${num2}$`);
    const match = allKeys.find(k => regex.test(k));
    if (match) return match;
  }
  if (parts.length === 2) {
    const [prefix, num1] = parts;
    const regex = new RegExp(`^${prefix}_${num1}_[a-zA-Z0-9_]+$`);
    const match = allKeys.find(k => regex.test(k) && !k.endsWith('_1') && !k.endsWith('_2') && !k.endsWith('_3') && !k.endsWith('_4'));
    if (match) return match;
  }
  return null;
}

console.log('math_1 ->', findNoteKey('math_1'));
console.log('math_1_1 ->', findNoteKey('math_1_1'));
console.log('math_1_2 ->', findNoteKey('math_1_2'));
console.log('math_1_3 ->', findNoteKey('math_1_3'));
console.log('math_2_1 ->', findNoteKey('math_2_1'));
console.log('math_3_2 ->', findNoteKey('math_3_2'));
console.log('excel_1_2 ->', findNoteKey('excel_1_2'));
