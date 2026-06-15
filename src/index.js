const app = require('./app');
const config = require('./config');
const { runMigrations } = require('./db/database');

try {
  runMigrations();
} catch (error) {
  console.error('Failed to run database migration on startup:', error.message);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`Taskify API listening on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
