const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, runSqlFile, closeDb } = require('./database');
const path = require('path');

const seedSqlPath = path.join(__dirname, '../../sql/seeds/001_seed_data.sql');
const SEED_PASSWORD = 'Password123!';

async function seedUsersWithPasswords() {
  const db = getDb();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const users = [
    {
      id: 'seed-user-001',
      email: 'alice@example.com',
      name: 'Alice Johnson',
    },
    {
      id: 'seed-user-002',
      email: 'bob@example.com',
      name: 'Bob Smith',
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name, auth_provider)
    VALUES (@id, @email, @passwordHash, @name, 'local')
  `);

  for (const user of users) {
    insertUser.run({ ...user, passwordHash });
  }
}

async function seed() {
  try {
    runSqlFile(path.join(__dirname, '../../sql/migrations/001_initial_schema.sql'));

    await seedUsersWithPasswords();

    const db = getDb();
    const tasks = [
      {
        id: 'seed-task-001',
        userId: 'seed-user-001',
        title: 'Review project requirements',
        description: 'Go through the API specification and confirm endpoints.',
        completed: 1,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'seed-task-002',
        userId: 'seed-user-001',
        title: 'Set up development environment',
        description: 'Install dependencies, run migrations, and verify health check.',
        completed: 0,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
      {
        id: 'seed-task-003',
        userId: 'seed-user-002',
        title: 'Draft onboarding docs',
        description: 'Write README with setup and authentication examples.',
        completed: 0,
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      },
    ];

    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, user_id, title, description, completed, due_date)
      VALUES (@id, @userId, @title, @description, @completed, @dueDate)
    `);

    for (const task of tasks) {
      insertTask.run(task);
    }

    console.log('Seed completed successfully.');
    console.log(`Seeded users can log in with password: ${SEED_PASSWORD}`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
}

seed();
