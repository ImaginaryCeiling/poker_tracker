import { db, type Player } from "@/lib/db";
import { createPlayer, deletePlayer } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function PlayersPage() {
  const players = db()
    .prepare("SELECT * FROM players ORDER BY name COLLATE NOCASE")
    .all() as Player[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Players</h1>

      <form action={createPlayer} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Player name"
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded"
        >
          Add Player
        </button>
      </form>

      {players.length === 0 ? (
        <p className="text-neutral-400 text-sm">No players yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium">{p.name}</span>
              <form action={deletePlayer}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-500">
        Removing a player deletes their session history. To preserve history, leave them in the roster.
      </p>
    </div>
  );
}
