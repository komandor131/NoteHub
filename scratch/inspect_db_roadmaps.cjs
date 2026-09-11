const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '../database/notehub.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.log('Database file does not exist yet at:', dbPath);
    return;
  }
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  
  const stmt = db.prepare('SELECT id, title, description FROM roadmaps');
  console.log('--- Seeded Roadmaps in SQLite Database ---');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log(`Title: ${row.title}`);
    console.log(`Description: ${row.description}`);
    console.log('-----------------------------------------');
  }
  stmt.free();
}

main().catch(console.error);
