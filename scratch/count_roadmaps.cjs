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
    
    const stmt = db.prepare("SELECT COUNT(*) as count FROM roadmaps");
    if (stmt.step()) {
      const res = stmt.getAsObject();
      console.log("Total seeded roadmaps in DB:", res.count);
    }
    stmt.free();
    
    // Let's also verify their titles to make sure they are correct
    const stmt2 = db.prepare("SELECT title FROM roadmaps ORDER BY id ASC");
    while (stmt2.step()) {
      console.log(" -", stmt2.getAsObject().title);
    }
    stmt2.free();
  } else {
    console.log("No database found.");
  }
}

main();
