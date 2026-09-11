import * as db from '../server/database';

async function main() {
  await db.initDatabase();
  const conn = db.ensureDb();
  
  // Clear roadmaps and tasks
  conn.run('DELETE FROM roadmaps');
  conn.run('DELETE FROM tasks');
  
  const user = conn.prepare('SELECT id FROM users LIMIT 1');
  let adminId = 1;
  if (user.step()) {
    adminId = user.getAsObject().id as number;
  }
  user.free();
  
  db.seedIfEmpty(adminId);
  
  db.persist();
  console.log('Force re-seeding completed successfully for user:', adminId);
}

main().catch(console.error);
