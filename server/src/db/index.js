import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import * as schema from './schema.js';

const dbPath = process.env.QUICK_SPLIT_DB_PATH || path.resolve('data', 'quicksplit.sqlite');
const dataDir = path.dirname(dbPath);
fs.mkdirSync(dataDir, { recursive: true });

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
      dessert INTEGER NOT NULL DEFAULT 0,
      alcohol INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_charges (
      session_id TEXT PRIMARY KEY,
      tax REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      tip REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared', 'unknown')),
      aliases TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS custom_menu_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared', 'unknown')),
      aliases TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
  `);

  const participantColumns = sqlite.exec('PRAGMA table_info(participants);')[0]?.values || [];
  const participantColumnNames = new Set(participantColumns.map((column) => column[1]));
  if (!participantColumnNames.has('dessert')) {
    sqlite.run('ALTER TABLE participants ADD COLUMN dessert INTEGER NOT NULL DEFAULT 0;');
  }
  if (!participantColumnNames.has('alcohol')) {
    sqlite.run('ALTER TABLE participants ADD COLUMN alcohol INTEGER NOT NULL DEFAULT 0;');
  }

  const itemTableSql = sqlite
    .exec("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'items';")[0]
    ?.values?.[0]?.[0];
  if (itemTableSql && !itemTableSql.includes("'dessert'")) {
    sqlite.run('PRAGMA foreign_keys = OFF;');
    sqlite.run(`
      CREATE TABLE items_next (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);
    sqlite.run(`
      INSERT INTO items_next (id, session_id, name, amount, category)
      SELECT id, session_id, name, amount, category FROM items;
    `);
    sqlite.run('DROP TABLE items;');
    sqlite.run('ALTER TABLE items_next RENAME TO items;');
    sqlite.run('PRAGMA foreign_keys = ON;');
  }

  for (const tableName of ['menu_items', 'custom_menu_mappings']) {
    const tableSql = sqlite
      .exec(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = '${tableName}';`)[0]
      ?.values?.[0]?.[0];
    if (tableSql && (tableSql.includes("'non_veg'") || tableSql.includes("'drinks'"))) {
      const updatedAtColumn =
        tableName === 'custom_menu_mappings' ? ', updated_at TEXT NOT NULL' : '';
      const updatedAtInsert = tableName === 'custom_menu_mappings' ? ', updated_at' : '';
      const updatedAtSelect = tableName === 'custom_menu_mappings' ? ', updated_at' : '';

      sqlite.run(`
        CREATE TABLE ${tableName}_next (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_name TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL CHECK(category IN ('veg', 'nonveg', 'drink', 'dessert', 'alcohol', 'shared', 'unknown')),
          aliases TEXT NOT NULL DEFAULT '[]'
          ${updatedAtColumn}
        );
      `);
      sqlite.run(`
        INSERT INTO ${tableName}_next (id, item_name, category, aliases${updatedAtInsert})
        SELECT id, item_name,
          CASE category
            WHEN 'non_veg' THEN 'nonveg'
            WHEN 'drinks' THEN 'drink'
            ELSE category
          END,
          aliases${updatedAtSelect}
        FROM ${tableName};
      `);
      sqlite.run(`DROP TABLE ${tableName};`);
      sqlite.run(`ALTER TABLE ${tableName}_next RENAME TO ${tableName};`);
    }
  }
  persist();
}
