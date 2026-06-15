const path = require('path');
const app = require('./app');
const config = require('./config');
const { runSqlFile } = require('./db/database');

const migrationPath = path.join(__dirname, '../sql/migrations/001_initial_schema.sql');

try {
  runSqlFile(migrationPath);
} catch (error) {
  console.error('Failed to run database migration on startup:', error.message);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`Taskify API listening on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
