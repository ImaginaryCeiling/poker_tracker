import Link from "next/link";
import { query, ensureSchema } from "@/lib/db";
import { settle, type Balance } from "@/lib/settle";
import { signedMoney, money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type LifetimeRow = {
  id: number;
  name: string;
  sessions_played: number;
  total_buyin: number | null;
  total_cashout: number | null;
  net: number | null;
};

type RecentSession = {
  id: number;
  name: string | null;
  played_at: string;
  buy_in: number;
  status: string;
  player_count: number;
};

export default async function Dashboard() {
  await ensureSchema();

  const lifetime = await query<LifetimeRow>`
    SELECT p.id, p.name,
           COUNT(DISTINCT se.session_id)::int AS sessions_played,
           COALESCE(SUM(se.buy_ins * s.buy_in), 0) AS total_buyin,
           COALESCE(SUM(se.cashout), 0) AS total_cashout,
           COALESCE(SUM(se.cashout - se.buy_ins * s.buy_in), 0) AS net
      FROM players p
      LEFT JOIN session_entries se ON se.player_id = p.id
      LEFT JOIN sessions s ON s.id = se.session_id AND s.status = 'closed'
     GROUP BY p.id, p.name
     ORDER BY net DESC
  `;

  const recent = await query<RecentSession>`
    SELECT s.id, s.name, s.played_at, s.buy_in, s.status,
           COUNT(se.id)::int AS player_count
      FROM sessions s
      LEFT JOIN session_entries se ON se.session_id = s.id
     GROUP BY s.id
     ORDER BY s.played_at DESC
     LIMIT 8
  `;

  const balances: Balance[] = lifetime.map((p) => ({
    playerId: p.id,
    name: p.name,
    net: Number(p.net) ?? 0,
  }));
  const transfers = settle(balances);

  const hasPlayers = lifetime.length > 0;

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-end justify-between mb-3">
          <h1 className="text-2xl font-semibold">Lifetime Standings</h1>
          <p className="text-sm text-neutral-400">Closed sessions only</p>
        </div>
        {!hasPlayers ? (
          <EmptyHint />
        ) : (
          <div className="rounded-lg border border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Player</th>
                  <th className="text-right px-4 py-2 font-medium">Sessions</th>
                  <th className="text-right px-4 py-2 font-medium">Bought in</th>
                  <th className="text-right px-4 py-2 font-medium">Cashed out</th>
                  <th className="text-right px-4 py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {lifetime.map((p) => (
                  <tr key={p.id} className="border-t border-neutral-800">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{p.sessions_played}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-400">
                      {money(Number(p.total_buyin) ?? 0)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-400">
                      {money(Number(p.total_cashout) ?? 0)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-semibold ${
                        Number(p.net) > 0
                          ? "text-emerald-400"
                          : Number(p.net) < 0
                          ? "text-rose-400"
                          : "text-neutral-400"
                      }`}
                    >
                      {signedMoney(Number(p.net) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Suggested Settlements</h2>
        {transfers.length === 0 ? (
          <p className="text-neutral-400 text-sm">
            All squared up — nobody owes anyone.
          </p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-2"
              >
                <span>
                  <span className="text-rose-400 font-medium">{t.from}</span>{" "}
                  pays{" "}
                  <span className="text-emerald-400 font-medium">{t.to}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  {money(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xl font-semibold">Recent Sessions</h2>
          <Link
            href="/sessions"
            className="text-sm text-neutral-400 hover:text-white"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-neutral-400 text-sm">No sessions yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900"
                >
                  <div>
                    <div className="font-medium">
                      {s.name || `Session #${s.id}`}{" "}
                      {s.status === "open" && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          OPEN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {formatDate(s.played_at)} · {s.player_count} players · buy-in {money(s.buy_in)}
                    </div>
                  </div>
                  <span className="text-neutral-500">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
      No players yet.{" "}
      <Link href="/players" className="text-emerald-400 hover:underline">
        Add your friends
      </Link>{" "}
      to get started, then{" "}
      <Link href="/sessions/new" className="text-emerald-400 hover:underline">
        start a session
      </Link>
      .
    </div>
  );
}
