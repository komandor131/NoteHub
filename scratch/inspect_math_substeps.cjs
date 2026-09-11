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
  
  const stmt = db.prepare("SELECT title, canvas_data FROM roadmaps WHERE title LIKE '1. %' LIMIT 1");
  if (stmt.step()) {
    const row = stmt.getAsObject();
    console.log(`Roadmap Title: ${row.title}`);
    const canvas = JSON.parse(row.canvas_data);
    const nodes = canvas.nodes || [];
    
    // Print the first 10 nodes
    console.log('\n--- First 10 Nodes in Mathematics Canvas ---');
    nodes.slice(0, 10).forEach(node => {
      console.log(`Node ID: ${node.id} | Title: ${node.title}`);
      console.log(`Text: ${node.text}`);
      console.log('-------------------------------------------');
    });
  } else {
    console.log('Math roadmap not found in DB.');
  }
  stmt.free();
}

main().catch(console.error);
