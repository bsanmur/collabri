const fs = require('fs');
const path = require('path');
const { getDB } = require('./auth/db');

async function runMigration(db) {
  const migrationPath = path.join(__dirname, '../migrations/001_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  await db.exec(sql);
}

async function runSeed(db) {
  const seedPath = path.join(__dirname, '../seeds/seed.sql');
  if (!fs.existsSync(seedPath)) return;
  const sql = fs.readFileSync(seedPath, 'utf-8');
  await db.exec(sql);
}

async function ensureDatabase() {
  const db = await getDB();
  const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (!row) {
    await runMigration(db);
  }
  // seed solo si no hay usuarios
  const userCountRow = await db.get('SELECT COUNT(1) as c FROM users');
  if (userCountRow && userCountRow.c === 0) {
    await runSeed(db);
  }
}

module.exports = { ensureDatabase };
