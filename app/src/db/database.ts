import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * 获取数据库实例（单例）
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('museum_note.db');
  }
  return db;
}

/**
 * 初始化数据库：创建表（幂等，可重复执行）
 */
export function initDatabase(): void {
  const database = getDatabase();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS exhibitions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      museum      TEXT    NOT NULL,
      visit_date  TEXT    NOT NULL,
      description TEXT,
      created_at  TEXT    NOT NULL
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      year           INTEGER NOT NULL,
      dynasty        TEXT    NOT NULL,
      exhibition_id  INTEGER NOT NULL REFERENCES exhibitions(id),
      photos         TEXT,
      description    TEXT,
      note           TEXT,
      tags           TEXT,
      created_at     TEXT    NOT NULL
    );
  `);

  // 迁移：为 exhibitions 表添加 cover_photo 列
  try {
    database.execSync(`ALTER TABLE exhibitions ADD COLUMN cover_photo TEXT`);
  } catch {
    // 列已存在，忽略
  }

  console.log('[DB] 数据库初始化完成：exhibitions、artifacts 表已就绪');
}
