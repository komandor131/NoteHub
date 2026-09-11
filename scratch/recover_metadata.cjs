const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function main() {
  const logFile = 'C:\\Users\\Олександр\\.gemini\\antigravity\\brain\\fe898e34-bf50-4dfe-b56b-90eeee0e6e6b\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('tracksMetadata') && line.includes('steps') && line.includes('math')) {
      console.log('Found matching line length:', line.length);
      fs.writeFileSync('C:\\Users\\Олександр\\.gemini\\antigravity\\brain\\fe898e34-bf50-4dfe-b56b-90eeee0e6e6b\\scratch\\recovered_metadata.json', line);
      console.log('Saved to scratch/recovered_metadata.json');
      break;
    }
  }
}
main();
