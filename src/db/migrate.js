const { runMigrations, closeDb } = require('./database');

try {
  runMigrations();
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  closeDb();
}
