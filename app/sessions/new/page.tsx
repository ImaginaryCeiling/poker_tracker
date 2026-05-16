import Link from "next/link";
import { query, type Player } from "@/lib/db";
import { createSession } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewSessionPage() {
  const players = await query<Player>`
    SELECT * FROM players ORDER BY LOWER(name)
  `;

  if (players.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">New Session</h1>
        <p className="text-neutral-400">
          You need to add players first.{" "}
          <Link href="/players" className="text-emerald-400 hover:underline">
            Add players →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">New Session</h1>
      <form action={createSession} className="space-y-5">
        <div>
          <label className="block text-sm text-neutral-300 mb-1">
            Session name (optional)
          </label>
          <input
            name="name"
            placeholder="Friday night @ Arnav's"
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-300 mb-1">
            Buy-in amount ($)
          </label>
          <input
            name="buy_in"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue="20"
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-neutral-500 mt-1">
            The cost per buy-in for this session. Each player will start at 1 buy-in; edit on the next page.
          </p>
        </div>

        <div>
          <label className="block text-sm text-neutral-300 mb-2">
            Players in this session
          </label>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2 cursor-pointer hover:bg-neutral-900"
              >
                <input
                  type="checkbox"
                  name="player_ids"
                  value={p.id}
                  defaultChecked
                  className="accent-emerald-500"
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded"
          >
            Start Session
          </button>
          <Link
            href="/sessions"
            className="text-sm text-neutral-400 hover:text-white px-4 py-2"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
