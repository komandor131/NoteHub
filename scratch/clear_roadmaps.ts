import * as db from '../server/database';

async function main() {
  await db.initDatabase();
  const conn = db.ensureDb();
  
  // Clear roadmaps and tasks to trigger re-seeding
  conn.run('DELETE FROM roadmaps');
  conn.run('DELETE FROM tasks');
  
  db.persist();
  console.log('Cleared roadmaps and tasks from database file.');
}

main().catch(console.error);
