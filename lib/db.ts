import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

function getClient() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL or DATABASE_URL env var is required");
  return neon(url);
}

export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const sql = getClient();
  const rows = await sql(strings, ...values);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(strings, ...values);
  return rows[0];
}

export async function ensureSchema() {
  const sql = getClient();
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      name TEXT,
      played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      buy_in DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS session_entries (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      buy_ins INTEGER NOT NULL DEFAULT 1,
      cashout DOUBLE PRECISION NOT NULL DEFAULT 0,
      UNIQUE(session_id, player_id)
    )
  `;
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
