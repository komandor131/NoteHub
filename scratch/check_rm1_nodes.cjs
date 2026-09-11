const initSqlJs = require('sql.js');
const fs = require('fs');

async function checkRoadmapNodes() {
  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync('database/notehub.sqlite');
  const db = new SQL.Database(filebuffer);

  const res = db.exec("SELECT id, title, canvas_data FROM roadmaps WHERE id = 230 LIMIT 1");
  if (!res.length || !res[0].values.length) {
    console.log('No roadmap 230 found');
    return;
  }
  const [id, title, canvas_data] = res[0].values[0];
  console.log('Roadmap:', id, title);
  const data = JSON.parse(canvas_data || '{}');
  const nodes = data.nodes || [];
  console.log('Nodes count:', nodes.length);
  console.log('First 15 nodes:', nodes.slice(0, 15).map(n => ({ id: n.id, title: n.title })));
}

checkRoadmapNodes();
