const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

let db;

function ensureDataDirectory() {
  const dir = path.dirname(path.resolve(config.databasePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDb() {
  if (!db) {
    ensureDataDirectory();
    db = new Database(path.resolve(config.databasePath));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function runSqlFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`SQL file not found: ${absolutePath}`);
  }

  const sql = fs.readFileSync(absolutePath, 'utf8');
  getDb().exec(sql);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  runSqlFile,
  closeDb,
};
