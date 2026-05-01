/**
 * db.js — SQLite database initialization
 *
 * Opens (or creates) database.db and ensures both tables exist.
 * Safe to run on every startup — CREATE TABLE IF NOT EXISTS is idempotent.
 * Exports the db instance for use in server.js.
 */

const Database = require('better-sqlite3');

const db = new Database('database.db');

// Enable foreign key enforcement (SQLite disables it by default)
db.pragma('foreign_keys = ON');

db.prepare(`
  CREATE TABLE IF NOT EXISTS albums (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    name       TEXT     NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS images (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    filename      TEXT     NOT NULL,
    original_name TEXT     NOT NULL,
    album_id      INTEGER  NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

module.exports = db;
