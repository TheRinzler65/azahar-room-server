import { useEffect, useState } from "react";
import { Window } from "../components/Window";
import { Skeleton, StatCardSkeleton } from "../components/Skeleton";
import { API } from "../config";

interface PlayerCount {
  username?: string;
  nickname?: string;
}

interface Room {
  id: string;
  name: string;
  preferredGameName: string;
  maxPlayers: number;
  players?: PlayerCount[];
  address?: string;
  port: number;
  owner?: string;
}

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="border border-border bg-panel rounded-sm px-3 py-2 font-mono text-xs">
    <div className="text-muted-500 mb-1">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

export const Home = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyAddress = (addressText: string, index: number) => {
    navigator.clipboard.writeText(addressText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  useEffect(() => {
    const fetchRooms = () => {
      fetch(`${API}/rooms`)
        .then((res) => res.json())
        .then((data) => {
          const roomList = Array.isArray(data) ? data : data.rooms || [];
          setRooms(roomList);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          console.error;
        });
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalPlayers = rooms.reduce(
    (sum, r) => sum + (r.players?.length ?? 0),
    0,
  );
  const activeRooms = rooms.length;
  const topGame = (() => {
    const counts: Record<string, number> = {};
    rooms.forEach((r) => {
      if (r.preferredGameName)
        counts[r.preferredGameName] = (counts[r.preferredGameName] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "-";
  })();

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="PLAYERS ONLINE"
              value={totalPlayers}
              color="text-success-500"
            />
            <StatCard
              label="ACTIVE ROOMS"
              value={activeRooms}
              color="text-primary-400"
            />
            <StatCard
              label="TOP GAME"
              value={topGame}
              color="text-warning-400"
            />
            <StatCard label="PING" value="--" color="text-muted-500" />
          </>
        )}
      </div>

      <Window title="LIVE ROOMS">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-2 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse border border-border font-mono">
              <thead>
                <tr className="bg-muted-800 text-muted-400">
                  <th className="p-2 border border-border">ROOM</th>
                  <th className="p-2 border border-border hidden sm:table-cell">
                    HOST
                  </th>
                  <th className="p-2 border border-border">GAME</th>
                  <th className="p-2 border border-border">PLAYERS</th>
                  <th className="p-2 border border-border text-center">
                    CONNECT
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r, i) => {
                  const host = r.address || window.location.hostname;
                  const targetAddr = `${host}:${r.port}`;

                  return (
                    <tr
                      key={i}
                      className={`${i % 2 === 0 ? "bg-muted-900" : "bg-muted-950"} hover:bg-primary-900/30 transition-colors`}
                    >
                      <td className="p-2 border border-border text-muted-200 font-bold">
                        {r.name}
                      </td>
                      <td className="p-2 border border-border text-primary-400 hidden sm:table-cell">
                        {r.owner || "-"}
                      </td>
                      <td className="p-2 border border-border text-warning-400">
                        {r.preferredGameName}
                      </td>
                      <td className="p-2 border border-border">
                        <div className="flex flex-wrap items-center gap-1">
                          {(r.players ?? []).length > 0 ? (
                            r.players!.map((p, pi) => (
                              <span
                                key={pi}
                                className="bg-success-900/50 text-success-400 px-1.5 py-0.5 rounded text-[10px]"
                              >
                                {p.nickname || p.username || "?"}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-600">empty</span>
                          )}
                          <span className="text-muted-500 ml-1 text-[11px]">
                            ({(r.players ?? []).length}/{r.maxPlayers})
                          </span>
                        </div>
                      </td>
                      <td className="p-2 border border-border text-center">
                        <button
                          onClick={() => copyAddress(targetAddr, i)}
                          className={`px-3 py-1 border text-[10px] font-mono transition-colors ${
                            copiedIndex === i
                              ? "bg-success-900/60 border-success-700 text-success-200"
                              : "bg-muted-800 hover:bg-muted-700 text-muted-300 border-border"
                          }`}
                          title="Copy Host:Port to clipboard"
                        >
                          {copiedIndex === i
                            ? "COPIED!"
                            : `COPY IP (${r.port})`}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rooms.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-4 text-center text-muted-600 font-mono text-xs"
                    >
                      No active rooms
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Window>
    </div>
  );
};
