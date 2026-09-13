import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// PERSIST 模式：日志文件留在磁盘上而不是被删除，
// 避免 Windows 上 Docker bind mount 出现 SQLITE_IOERR_DELETE
db.pragma('journal_mode = PERSIST');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '新对话',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );
`);

export default db;

export interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface SessionRow {
  token: string;
  created_at: string;
}

// ---- settings 读写 ----

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingRow | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}
