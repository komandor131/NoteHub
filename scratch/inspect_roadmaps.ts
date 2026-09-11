import * as db from '../server/database';

async function main() {
  await db.initDatabase();
  
  const conn = db.ensureDb();
  
  const taskStmt = conn.prepare('SELECT id, ownerId, title FROM tasks');
  const tasks: any[] = [];
  while (taskStmt.step()) {
    tasks.push(taskStmt.getAsObject());
  }
  taskStmt.free();
  console.log('All Tasks:', tasks);
}

main().catch(console.error);
