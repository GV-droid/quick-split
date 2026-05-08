import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import * as schema from './schema.js';

const dataDir = path.resolve('data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'quicksplit.sqlite');
const require = createRequire(import.meta.url);
const wasmPath = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));
const SQL = await initSqlJs({
  locateFile: (file) => path.join(wasmPath, file),
});

const existingDatabase = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;

export const sqlite = new SQL.Database(existingDatabase);
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export function persist() {
  fs.writeFileSync(dbPath, Buffer.from(sqlite.export()));
}

export function migrate() {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_veg INTEGER NOT NULL DEFAULT 0,
      is_nonveg INTEGER NOT NULL DEFAULT 0,
      drinks INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('veg', 'nonveg', 'drink', 'shared')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_charges (
      session_id TEXT PRIMARY KEY,
      tax REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      tip REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  persist();
}
