"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";

export async function createPlayer(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await query`INSERT INTO players (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
  revalidatePath("/players");
  revalidatePath("/");
}

export async function deletePlayer(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await query`DELETE FROM players WHERE id = ${id}`;
  revalidatePath("/players");
  revalidatePath("/");
}

export async function createSession(formData: FormData) {
  const name = String(formData.get("name") || "").trim() || null;
  const buyIn = Number(formData.get("buy_in"));
  const playerIds = formData.getAll("player_ids").map((v) => Number(v));
  if (!buyIn || buyIn <= 0 || playerIds.length === 0) return;

  const row = await queryOne<{ id: number }>`
    INSERT INTO sessions (name, buy_in, status) VALUES (${name}, ${buyIn}, 'open')
    RETURNING id
  `;
  const newId = row!.id;

  for (const pid of playerIds) {
    await query`
      INSERT INTO session_entries (session_id, player_id, buy_ins, cashout)
      VALUES (${newId}, ${pid}, 1, 0)
    `;
  }

  revalidatePath("/sessions");
  redirect(`/sessions/${newId}`);
}

export async function updateSessionEntries(formData: FormData) {
  const sessionId = Number(formData.get("session_id"));
  if (!sessionId) return;

  const entries = await query<{ id: number }>`
    SELECT id FROM session_entries WHERE session_id = ${sessionId}
  `;

  for (const e of entries) {
    const bi = Math.max(0, Number(formData.get(`buy_ins_${e.id}`) ?? 1));
    const co = Math.max(0, Number(formData.get(`cashout_${e.id}`) ?? 0));
    await query`
      UPDATE session_entries SET buy_ins = ${bi}, cashout = ${co} WHERE id = ${e.id}
    `;
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/");
  revalidatePath("/sessions");
}

export async function addPlayerToSession(formData: FormData) {
  const sessionId = Number(formData.get("session_id"));
  const playerId = Number(formData.get("player_id"));
  if (!sessionId || !playerId) return;
  await query`
    INSERT INTO session_entries (session_id, player_id, buy_ins, cashout)
    VALUES (${sessionId}, ${playerId}, 1, 0)
    ON CONFLICT DO NOTHING
  `;
  revalidatePath(`/sessions/${sessionId}`);
}

export async function removeEntry(formData: FormData) {
  const entryId = Number(formData.get("entry_id"));
  const sessionId = Number(formData.get("session_id"));
  if (!entryId) return;
  await query`DELETE FROM session_entries WHERE id = ${entryId}`;
  revalidatePath(`/sessions/${sessionId}`);
}

export async function setSessionStatus(formData: FormData) {
  const sessionId = Number(formData.get("session_id"));
  const status = String(formData.get("status"));
  if (!sessionId || (status !== "open" && status !== "closed")) return;
  await query`UPDATE sessions SET status = ${status} WHERE id = ${sessionId}`;
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
}

export async function deleteSession(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await query`DELETE FROM sessions WHERE id = ${id}`;
  revalidatePath("/sessions");
  revalidatePath("/");
  redirect("/sessions");
}
