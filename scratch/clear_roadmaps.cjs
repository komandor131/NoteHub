const Database = require('better-sqlite3');
const db = new Database('database/notehub.sqlite');
db.prepare('DELETE FROM roadmaps').run();
console.log('Cleared all roadmaps from database!');
