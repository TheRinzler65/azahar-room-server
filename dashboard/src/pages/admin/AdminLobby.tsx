import { useEffect, useState } from "react";
import { Window } from "../../components/Window";
import { DataTable } from "../../components/DataTable";
import { API } from "../../config";
import { authHeaders } from "../../utils/auth";
import { fromGameIdNumber } from "../../utils/gameId";

interface LobbyRoom {
  id: string;
  name: string;
  owner: string | null;
  port: number;
  max_players: number;
  preferred_game_name: string | null;
  preferred_game_id: number | null;
  address: string | null;
  has_password: number;
  first_seen: number;
  last_seen: number;
  status: string;
}

export const AdminLobby = () => {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [filter, setFilter] = useState<"live" | "all" | "gone">("all");
  const [search, setSearch] = useState("");

  const fetchRooms = () => {
    const url =
      filter === "all"
        ? `${API}/admin/lobby-rooms`
        : `${API}/admin/lobby-rooms?status=${filter}`;
    fetch(url, { headers: authHeaders() })
      .then((res) => res.json())
      .then(setRooms)
      .catch(console.error);
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Window
        title={`EMULATOR ROOMS (${rooms.filter((r) => r.status === "live").length} LIVE / ${rooms.length} TOTAL)`}
      >
        <div className="flex gap-2 mb-3 items-center">
          <select
            className="bg-muted-900 text-muted-200 border border-border p-1.5 font-mono text-xs focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">ALL</option>
            <option value="live">LIVE</option>
            <option value="gone">HISTORY</option>
          </select>
          <input
            className="bg-muted-900 text-muted-200 border border-border p-1.5 font-mono text-xs flex-1 focus:outline-none"
            placeholder="Search room name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DataTable
          columns={[
            "NAME",
            "OWNER",
            "PORT",
            "GAME",
            "GAME ID",
            "PLAYERS",
            "PASSWORD",
            "LAST SEEN",
            "STATUS",
          ]}
          data={filtered.map((r) => ({
            name: <span className="text-muted-200">{r.name}</span>,
            owner: <span className="text-primary-400">{r.owner || "-"}</span>,
            port: <span className="text-warning-400">{r.port}</span>,
            game: (
              <span className="text-warning-400">
                {r.preferred_game_name || "-"}
              </span>
            ),
            "game id": (
              <span className="text-muted-500 text-[10px]">
                {r.preferred_game_id
                  ? fromGameIdNumber(r.preferred_game_id)
                  : "-"}
              </span>
            ),
            players: <span className="text-success-500">{r.max_players}</span>,
            password: (
              <span
                className={
                  r.has_password ? "text-warning-400" : "text-muted-600"
                }
              >
                {r.has_password ? "yes" : "no"}
              </span>
            ),
            "last seen": (
              <span className="text-muted-500 text-[10px]">
                {new Date(r.last_seen).toLocaleString()}
              </span>
            ),
            status: (
              <span
                className={
                  r.status === "live" ? "text-success-500" : "text-muted-500"
                }
              >
                {r.status}
              </span>
            ),
          }))}
        />
        {filtered.length === 0 && (
          <div className="text-muted-600 p-4 text-center font-mono text-xs">
            No rooms
          </div>
        )}
      </Window>
    </div>
  );
};
