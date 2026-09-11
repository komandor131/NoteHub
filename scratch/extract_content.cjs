const fs = require('fs');

const fileData = fs.readFileSync('C:\\Users\\Олександр\\.gemini\\antigravity\\brain\\fe898e34-bf50-4dfe-b56b-90eeee0e6e6b\\scratch\\recovered_metadata_full.json', 'utf8');
const obj = JSON.parse(fileData);
const replacementContent = obj.tool_calls[0].args.ReplacementContent;
fs.writeFileSync('C:\\Users\\Олександр\\.gemini\\antigravity\\brain\\fe898e34-bf50-4dfe-b56b-90eeee0e6e6b\\scratch\\metadata_only.ts', replacementContent);
console.log('Saved to metadata_only.ts');
