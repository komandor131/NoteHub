const fs = require('fs');
const initSqlJs = require('sql.js');

async function dump() {
  const fileBuffer = fs.readFileSync('database/notehub.sqlite');
  const init = await initSqlJs();
  const db = new init.Database(fileBuffer);
  
  console.log("=== PROJECTS ===");
  const projects = db.exec("SELECT id, title, description, canvas_data FROM projects");
  console.log(JSON.stringify(projects, null, 2));

  console.log("=== TASKS ===");
  const tasks = db.exec("SELECT id, title, projectId FROM tasks");
  console.log(JSON.stringify(tasks, null, 2));
}

dump().catch(console.error);
