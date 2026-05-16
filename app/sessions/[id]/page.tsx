import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Player, type Session } from "@/lib/db";
import { settle, type Balance } from "@/lib/settle";
import { money, signedMoney, formatDate } from "@/lib/format";
import {
  updateSessionEntries,
  addPlayerToSession,
  removeEntry,
  setSessionStatus,
  deleteSession,
} from "@/app/actions";

export const dynamic = "force-dynamic";

type EntryRow = {
  id: number;
  player_id: number;
  player_name: string;
  buy_ins: number;
  cashout: number;
};

export default async function SessionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  const d = db();

  const session = d
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId) as Session | undefined;
  if (!session) notFound();

  const entries = d
    .prepare(
      `SELECT se.id, se.player_id, p.name AS player_name, se.buy_ins, se.cashout
         FROM session_entries se
         JOIN players p ON p.id = se.player_id
        WHERE se.session_id = ?
        ORDER BY p.name COLLATE NOCASE`
    )
    .all(sessionId) as EntryRow[];

  const allPlayers = d.prepare("SELECT * FROM players ORDER BY name").all() as Player[];
  const inSet = new Set(entries.map((e) => e.player_id));
  const availablePlayers = allPlayers.filter((p) => !inSet.has(p.id));

  const totalBuyIns = entries.reduce((s, e) => s + e.buy_ins, 0);
  const pot = totalBuyIns * session.buy_in;
  const totalCashout = entries.reduce((s, e) => s + e.cashout, 0);
  const drift = totalCashout - pot;

  const balances: Balance[] = entries.map((e) => ({
    playerId: e.player_id,
    name: e.player_name,
    net: e.cashout - e.buy_ins * session.buy_in,
  }));
  const transfers = settle(balances);
  const isOpen = session.status === "open";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/sessions" className="text-sm text-neutral-400 hover:text-white">
            ← All sessions
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {session.name || `Session #${session.id}`}{" "}
            {isOpen ? (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 align-middle">
                OPEN
              </span>
            ) : (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-neutral-700/40 text-neutral-300 align-middle">
                CLOSED
              </span>
            )}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {formatDate(session.played_at)} · buy-in {money(session.buy_in)}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={setSessionStatus}>
            <input type="hidden" name="session_id" value={session.id} />
            <input
              type="hidden"
              name="status"
              value={isOpen ? "closed" : "open"}
            />
            <button
              type="submit"
              className={`text-sm font-medium px-3 py-1.5 rounded ${
                isOpen
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              }`}
            >
              {isOpen ? "Close Session" : "Reopen"}
            </button>
          </form>
          <form action={deleteSession}>
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              className="text-sm text-rose-400 hover:text-rose-300 px-2 py-1.5"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <form action={updateSessionEntries} className="space-y-4">
        <input type="hidden" name="session_id" value={session.id} />
        <div className="rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Player</th>
                <th className="text-right px-3 py-2 font-medium w-24">Buy-ins</th>
                <th className="text-right px-3 py-2 font-medium w-32">Cashout ($)</th>
                <th className="text-right px-3 py-2 font-medium w-28">Net</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const net = e.cashout - e.buy_ins * session.buy_in;
                return (
                  <tr key={e.id} className="border-t border-neutral-800">
                    <td className="px-3 py-2 font-medium">{e.player_name}</td>
                    <td className="px-3 py-2">
                      <input
                        name={`buy_ins_${e.id}`}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={e.buy_ins}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name={`cashout_${e.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={e.cashout}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-semibold ${
                        net > 0 ? "text-emerald-400" : net < 0 ? "text-rose-400" : "text-neutral-400"
                      }`}
                    >
                      {signedMoney(net)}
                    </td>
                    <td className="px-2">
                      <RemoveEntryButton entryId={e.id} sessionId={session.id} />
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-neutral-500 py-6">
                    No players in this session yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-neutral-900/60 text-neutral-300">
              <tr className="border-t border-neutral-800">
                <td className="px-3 py-2 font-medium">Totals</td>
                <td className="px-3 py-2 text-right tabular-nums">{totalBuyIns}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(totalCashout)}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-semibold ${
                    Math.abs(drift) < 0.01 ? "text-neutral-400" : "text-amber-400"
                  }`}
                  title={`Pot ${money(pot)} vs cashout ${money(totalCashout)}`}
                >
                  {Math.abs(drift) < 0.01 ? "balanced" : signedMoney(drift)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Pot: {money(pot)} ({totalBuyIns} × {money(session.buy_in)}). If totals don't balance, check the cashouts.
          </p>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </form>

      {availablePlayers.length > 0 && (
        <form action={addPlayerToSession} className="flex gap-2 items-end">
          <input type="hidden" name="session_id" value={session.id} />
          <div className="flex-1">
            <label className="block text-xs text-neutral-400 mb-1">
              Add player to session
            </label>
            <select
              name="player_id"
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Choose a player…
              </option>
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm font-medium px-4 py-2 rounded"
          >
            Add
          </button>
        </form>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">Session Settlements</h2>
        {transfers.length === 0 ? (
          <p className="text-neutral-400 text-sm">Nobody owes anyone for this session.</p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-2"
              >
                <span>
                  <span className="text-rose-400 font-medium">{t.from}</span> pays{" "}
                  <span className="text-emerald-400 font-medium">{t.to}</span>
                </span>
                <span className="font-semibold tabular-nums">{money(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {isOpen && (
          <p className="text-xs text-amber-300/80 mt-3">
            This session is still open, so it isn't counted in lifetime standings. Close it once you've entered final cashouts.
          </p>
        )}
      </section>
    </div>
  );
}

function RemoveEntryButton({
  entryId,
  sessionId,
}: {
  entryId: number;
  sessionId: number;
}) {
  return (
    <form action={removeEntry}>
      <input type="hidden" name="entry_id" value={entryId} />
      <input type="hidden" name="session_id" value={sessionId} />
      <button
        type="submit"
        className="text-neutral-500 hover:text-rose-400 text-xs"
        title="Remove player from session"
      >
        ✕
      </button>
    </form>
  );
}
