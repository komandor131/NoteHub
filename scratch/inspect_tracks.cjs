const fs = require('fs');
const content = fs.readFileSync('server/database.ts', 'utf8');

// Use regular expression to find the Tracks array definition and inspect it
const startIdx = content.indexOf('const tracks: Track[] = [');
if (startIdx !== -1) {
  // Let's parse the tracks array from the code by counting braces
  let braceCount = 0;
  let tracksCode = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = startIdx + 'const tracks: Track[] = '.length; i < content.length; i++) {
    const char = content[i];
    
    if ((char === '"' || char === "'" || char === '`') && content[i-1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '[') braceCount++;
      if (char === ']') braceCount--;
    }
    
    tracksCode += char;
    if (braceCount === 0 && tracksCode.length > 5) {
      break;
    }
  }
  
  // Now evaluate the tracks using a safe eval-like approach or parse it
  // Since tracksCode is a valid JS array literal, we can write a JS file that exports it and require it!
  const tmpFile = 'scratch/tmp_tracks.cjs';
  fs.writeFileSync(tmpFile, 'module.exports = ' + tracksCode + ';');
  const parsedTracks = require('./tmp_tracks.cjs');
  
  console.log('Total roadmaps:', parsedTracks.length);
  parsedTracks.forEach((t, idx) => {
    console.log(`${idx + 1}. ID: ${t.id} | Title: ${t.title}`);
    console.log(`   Desc: ${t.text}`);
  });
  
  // Clean up
  if (fs.existsSync(tmpFile)) {
    fs.unlinkSync(tmpFile);
  }
} else {
  console.log('Could not find tracks array.');
}
