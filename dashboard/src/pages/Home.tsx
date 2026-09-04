import { useEffect, useState } from 'react';
import { Window } from '../components/Window';
import { Skeleton, StatCardSkeleton } from '../components/Skeleton';
import { API } from '../config';

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

const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <div className="border border-border bg-panel rounded-sm px-3 py-2 font-mono text-xs">
        <div className="text-neutral-500 mb-1">{label}</div>
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
                .then(res => res.json())
                .then(data => {
                    const roomList = Array.isArray(data) ? data : (data.rooms || []);
                    setRooms(roomList);
                    setLoading(false);
                })
                .catch(() => { setLoading(false); console.error; });
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, []);

    const totalPlayers = rooms.reduce((sum, r) => sum + (r.players?.length ?? 0), 0);
    const activeRooms = rooms.length;
    const topGame = (() => {
        const counts: Record<string, number> = {};
        rooms.forEach(r => {
            if (r.preferredGameName) counts[r.preferredGameName] = (counts[r.preferredGameName] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || '-';
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
                        <StatCard label="PLAYERS ONLINE" value={totalPlayers} color="text-green-500" />
                        <StatCard label="ACTIVE ROOMS" value={activeRooms} color="text-sky-400" />
                        <StatCard label="TOP GAME" value={topGame} color="text-orange-400" />
                        <StatCard label="PING" value="--" color="text-neutral-500" />
                    </>
                )}
            </div>

            <Window title="LIVE ROOMS">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-2 space-y-2">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                        </div>
                    ) : (
                    <table className="w-full text-xs text-left border-collapse border border-border font-mono">
                        <thead>
                            <tr className="bg-neutral-800 text-neutral-400">
                                <th className="p-2 border border-border">ROOM</th>
                                <th className="p-2 border border-border hidden sm:table-cell">HOST</th>
                                <th className="p-2 border border-border">GAME</th>
                                <th className="p-2 border border-border">PLAYERS</th>
                                <th className="p-2 border border-border text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.map((r, i) => {
                                const host = r.address || window.location.hostname;
                                const deepLink = `azahar://${host}:${r.port}`;
                                const targetAddr = `${host}:${r.port}`;

                                return (
                                    <tr key={i} className={`${i % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-950'} hover:bg-sky-900/30 transition-colors`}>
                                        <td className="p-2 border border-border text-neutral-200 font-bold">{r.name}</td>
                                        <td className="p-2 border border-border text-sky-400 hidden sm:table-cell">{r.owner || '-'}</td>
                                        <td className="p-2 border border-border text-orange-400">{r.preferredGameName}</td>
                                        <td className="p-2 border border-border">
                                            <div className="flex flex-wrap items-center gap-1">
                                                {(r.players ?? []).length > 0
                                                    ? r.players!.map((p, pi) => (
                                                        <span key={pi} className="bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded text-[10px]">
                                                            {p.nickname || p.username || '?'}
                                                        </span>
                                                      ))
                                                    : <span className="text-neutral-600">empty</span>
                                                }
                                                <span className="text-neutral-500 ml-1 text-[11px]">({(r.players ?? []).length}/{r.maxPlayers})</span>
                                            </div>
                                        </td>
                                        <td className="p-2 border border-border">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <a
                                                    href={deepLink}
                                                    className="bg-sky-900 hover:bg-sky-800 text-sky-100 px-2.5 py-1 border border-sky-700 font-bold text-[10px] text-center"
                                                    title={`Join via azahar://${targetAddr}`}
                                                >
                                                    JOIN
                                                </a>
                                                <button
                                                    onClick={() => copyAddress(targetAddr, i)}
                                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 border border-border text-[10px]"
                                                    title="Copy Host:Port"
                                                >
                                                    {copiedIndex === i ? 'COPIED' : 'COPY'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {rooms.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-neutral-600 font-mono text-xs">No active rooms</td>
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