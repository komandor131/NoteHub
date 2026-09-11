const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function main() {
  const dataDir = path.resolve('database');
  const dbPath = path.join(dataDir, 'notehub.sqlite');
  
  const sql = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });
  
  if (fs.existsSync(dbPath)) {
    const source = fs.readFileSync(dbPath);
    const db = new sql.Database(source);
    
    db.run("DELETE FROM roadmaps");
    console.log("Deleted all roadmaps!");
    
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log("Database written successfully!");
  } else {
    console.log("No notehub.sqlite database found.");
  }
}

main();
