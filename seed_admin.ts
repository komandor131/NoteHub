import { registerUser, ensureDb, initDatabase } from './server/database.ts';

async function seed() {
  try {
    await initDatabase();
    
    const email = process.env.NOTEHUB_ADMIN_EMAIL || 'admin@notehub.local';
    const password = process.env.NOTEHUB_ADMIN_PASSWORD || 'admin12345';
    const name = process.env.NOTEHUB_ADMIN_NAME || 'NoteHub Admin';
    
    const existing = ensureDb().prepare('SELECT * FROM users WHERE email = ?').getAsObject([email]);
    if (existing && existing.email) {
      console.log('User already exists, promoting to admin...');
      ensureDb().prepare('UPDATE users SET role = ? WHERE email = ?').run(['admin', email]);
      console.log('Done!');
      return;
    }

    console.log('Registering user...');
    registerUser({
      email,
      password,
      name
    });
    
    console.log('Promoting to admin...');
    ensureDb().prepare('UPDATE users SET role = ? WHERE email = ?').run(['admin', email]);
    console.log('Admin user seeded successfully!');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

seed();
