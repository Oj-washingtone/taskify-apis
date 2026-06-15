const path = require('path');
const { runSqlFile, closeDb } = require('./database');

const migrationPath = path.join(__dirname, '../../sql/migrations/001_initial_schema.sql');

try {
  runSqlFile(migrationPath);
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  closeDb();
}
