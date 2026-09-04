import { useEffect, useState } from 'react';
import { Window } from '../../components/Window';
import { DataTable } from '../../components/DataTable';
import { API } from '../../config';
import { authHeaders } from '../../utils/auth';

interface Player {
    username: string;
    created_at: number;
    minutes: number;
}

export const AdminPlayers = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [search, setSearch] = useState('');
    const [banTarget, setBanTarget] = useState<string | null>(null);
    const [banDuration, setBanDuration] = useState<number>(0);
    const [banReason, setBanReason] = useState('');

    const fetchPlayers = () => {
        fetch(`${API}/admin/players`, { headers: authHeaders() })
            .then(res => res.json())
            .then(setPlayers)
            .catch(console.error);
    };

    useEffect(() => { fetchPlayers(); }, []);

    const handleSelectTarget = (username: string) => {
        setBanTarget(username);
        setBanDuration(0);
        setBanReason('');
    };

    const banPlayer = async (username: string) => {
        await fetch(`${API}/admin/ban`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                type: 'username',
                value: username,
                reason: banReason.trim() || 'banned from player list',
                durationMinutes: banDuration > 0 ? banDuration : undefined,
            })
        });
        setBanTarget(null);
        setBanReason('');
        setBanDuration(0);
    };

    const filtered = players.filter(p =>
        p.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Window title={`PLAYERS - ${players.length} REGISTERED`}>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        className="bg-neutral-900 text-neutral-200 border border-border p-2 font-mono text-xs flex-1 focus:outline-none"
                        placeholder="Search players..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 border border-border font-mono text-xs" onClick={fetchPlayers}>
                        REFRESH
                    </button>
                </div>

                {banTarget && (
                    <div className="border border-red-800 bg-red-950/30 p-3 font-mono text-xs space-y-3">
                        <div className="text-red-400 font-bold">BAN PLAYER: {banTarget}</div>
                        
                        <div className="flex flex-wrap gap-2">
                            <select
                                className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                                value={banDuration}
                                onChange={e => setBanDuration(Number(e.target.value))}
                            >
                                <option value={0}>Permanent</option>
                                <option value={15}>15 minutes</option>
                                <option value={60}>1 heure</option>
                                <option value={1440}>24 heures</option>
                                <option value={4320}>3 jours</option>
                                <option value={10080}>7 jours</option>
                                <option value={43200}>30 jours</option>
                            </select>

                            <input
                                className="bg-neutral-900 text-neutral-200 border border-border p-2 flex-1 min-w-[200px] focus:outline-none"
                                placeholder="reason (optional)"
                                value={banReason}
                                onChange={e => setBanReason(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button className="bg-red-900 hover:bg-red-800 text-red-200 px-4 py-1 border border-red-700 font-bold" onClick={() => banPlayer(banTarget)}>
                                CONFIRM BAN
                            </button>
                            <button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-1 border border-border" onClick={() => setBanTarget(null)}>
                                CANCEL
                            </button>
                        </div>
                    </div>
                )}

                <DataTable
                    columns={['USERNAME', 'REGISTERED', 'PLAYTIME', '']}
                    data={filtered.map(p => ({
                        username: <span className="text-sky-400">{p.username}</span>,
                        registered: <span className="text-neutral-400">{new Date(p.created_at).toLocaleDateString()}</span>,
                        playtime: <span className="text-green-500">{Math.floor(p.minutes / 60)}h {Math.round(p.minutes % 60)}min</span>,
                        '': <button className="text-red-400 hover:text-red-300 hover:underline" onClick={() => handleSelectTarget(p.username)}>[ban]</button>
                    }))}
                />
            </div>
        </Window>
    );
};