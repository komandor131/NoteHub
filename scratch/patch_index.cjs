const fs = require('fs');

function main() {
  const indexFile = 'server/index.ts';
  let content = fs.readFileSync(indexFile, 'utf8');

  // Read the raw endpoint code from scratch/endpoint_code.txt
  const newEndpoint = fs.readFileSync('scratch/endpoint_code.txt', 'utf8');

  // Locate route start
  const startKey = "app.get('/api/roadmaps/notes/:nodeId'";
  const endKey = "function parseId";

  const startIndex = content.indexOf(startKey);
  const endIndex = content.indexOf(endKey);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Keys not found!', startIndex, endIndex);
    process.exit(1);
  }

  const beforeText = content.substring(0, startIndex);
  const afterText = content.substring(endIndex);

  content = beforeText + newEndpoint + "\n" + afterText;
  fs.writeFileSync(indexFile, content, 'utf8');
  console.log('Index file successfully patched with complete math details!');
}

main();
