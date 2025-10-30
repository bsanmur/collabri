// Collabrí - helper SQLite
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbFile = process.env.DB_PATH || path.join(__dirname, '../../dev.db');

async function getDB() {
  return open({
    filename: dbFile,
    driver: sqlite3.Database
  });
}

module.exports = { getDB };
