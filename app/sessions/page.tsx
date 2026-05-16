import Link from "next/link";
import { query } from "@/lib/db";
import { money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string | null;
  played_at: string;
  buy_in: number;
  status: "open" | "closed";
  player_count: number;
  total_pot: number | null;
};

export default async function SessionsPage() {
  const rows = await query<Row>`
    SELECT s.id, s.name, s.played_at, s.buy_in, s.status,
           COUNT(se.id)::int AS player_count,
           COALESCE(SUM(se.buy_ins * s.buy_in), 0) AS total_pot
      FROM sessions s
      LEFT JOIN session_entries se ON se.session_id = s.id
     GROUP BY s.id
     ORDER BY s.played_at DESC
  `;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Link
          href="/sessions/new"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded"
        >
          + New Session
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-neutral-400 text-sm">No sessions yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900"
              >
                <div>
                  <div className="font-medium">
                    {s.name || `Session #${s.id}`}{" "}
                    {s.status === "open" ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        OPEN
                      </span>
                    ) : (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-neutral-700/40 text-neutral-300">
                        CLOSED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {formatDate(s.played_at)} · {s.player_count} players · buy-in {money(s.buy_in)} · pot {money(Number(s.total_pot) ?? 0)}
                  </div>
                </div>
                <span className="text-neutral-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
