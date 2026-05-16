"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function createPlayer(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  db()
    .prepare("INSERT OR IGNORE INTO players (name) VALUES (?)")
    .run(name);
  revalidatePath("/players");
  revalidatePath("/");
}

export async function deletePlayer(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  db().prepare("DELETE FROM players WHERE id = ?").run(id);
  revalidatePath("/players");
  revalidatePath("/");
}

export async function createSession(formData: FormData) {
  const name = String(formData.get("name") || "").trim() || null;
  const buyIn = Number(formData.get("buy_in"));
  const playerIds = formData.getAll("player_ids").map((v) => Number(v));
  if (!buyIn || buyIn <= 0 || playerIds.length === 0) return;

  const d = db();
  const insertSession = d.prepare(
    "INSERT INTO sessions (name, buy_in, status) VALUES (?, ?, 'open')"
  );
  const insertEntry = d.prepare(
    "INSERT INTO session_entries (session_id, player_id, buy_ins, cashout) VALUES (?, ?, 1, 0)"
  );
  let newId: number | bigint = 0;
  d.transaction(() => {
    const info = insertSession.run(name, buyIn);
    newId = info.lastInsertRowid;
    for (const pid of playerIds) insertEntry.run(newId, pid);
  })();
  revalidatePath("/sessions");
  redirect(`/sessions/${newId}`);
}

export async function updateSessionEntries(formData: FormData) {
  const sessionId = Number(formData.get("session_id"));
  if (!sessionId) return;

  const d = db();
  const entries = d
    .prepare("SELECT id FROM session_entries WHERE session_id = ?")
    .all(sessionId) as { id: number }[];

  const upd = d.prepare(
    "UPDATE session_entries SET buy_ins = ?, cashout = ? WHERE id = ?"
  );
  d.transaction(() => {
    for (const e of entries) {
      const bi = Math.max(0, Number(formData.get(`buy_ins_${e.id}`) ?? 1));
      const co = Math.max(0, Number(formData.get(`cashout_${e.id}`) ?? 0));
      upd.run(bi, co, e.id);
    }
  })();
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/");
  revalidatePath("/sessions");
}

export async function addPlayerToSession(formData: FormData) {
  const sessionId = Number(formData.get("session_id"));
  const playerId = Number(formData.get("player_id"));
  if (!sessionId || !playerId) return;
  db()
    .prepare(
      "INSERT OR IGNORE INTO session_entries (session_id, player_id, buy_ins, cashout) VALUES (?, ?, 1, 0)"
    )
    .run(sessionId, playerId);
  revalidatePath(`/sessions/${sessionId}`);
}

export async function removeEntry(formData: FormData) {
  const entryId = Number(formData.get("entry_id"));
  const sessionId = Number(formData.get("session_id"));
  if (!entryId) return;
  db().prepare("DELETE FROM session_entries WHERE id = ?").run(entryId);
  revalidatePath(`/sessions/${sessionId}`);
}

export async function setSessionStatus(formData: FormData) {
  const sessionId = Number(formData.get("session_id"));
  const status = String(formData.get("status"));
  if (!sessionId || (status !== "open" && status !== "closed")) return;
  db()
    .prepare("UPDATE sessions SET status = ? WHERE id = ?")
    .run(status, sessionId);
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
}

export async function deleteSession(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  db().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  revalidatePath("/sessions");
  revalidatePath("/");
  redirect("/sessions");
}
