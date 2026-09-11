const initSqlJs = require('sql.js');
const fs = require('fs');

async function listRoadmaps() {
  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync('database/notehub.sqlite');
  const db = new SQL.Database(filebuffer);

  const res = db.exec("SELECT id, ownerId, title FROM roadmaps LIMIT 15");
  if (!res.length || !res[0].values.length) {
    console.log('No roadmaps found in sqlite file');
    return;
  }
  console.log('Roadmaps in sqlite:', res[0].values);
}

listRoadmaps();
