import Database from "better-sqlite3";
import path from "node:path";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const file = process.env.POKER_DB_PATH || path.join(process.cwd(), "poker.db");
  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      played_at TEXT NOT NULL DEFAULT (datetime('now')),
      buy_in REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS session_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      buy_ins INTEGER NOT NULL DEFAULT 1,
      cashout REAL NOT NULL DEFAULT 0,
      UNIQUE(session_id, player_id)
    );
  `);
  _db = d;
  return d;
}

export type Player = { id: number; name: string; created_at: string };
export type Session = {
  id: number;
  name: string | null;
  played_at: string;
  buy_in: number;
  status: "open" | "closed";
  notes: string | null;
};
export type Entry = {
  id: number;
  session_id: number;
  player_id: number;
  buy_ins: number;
  cashout: number;
};
