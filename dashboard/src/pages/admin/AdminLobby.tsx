import { useEffect, useState, useRef } from 'react';
import { Window } from '../../components/Window';
import { DataTable } from '../../components/DataTable';
import { API } from '../../config';
import { authHeaders } from '../../utils/auth';

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

interface ChatMsg {
    id: number;
    room_slug: string | null;
    username: string;
    message: string;
    timestamp: number;
}

interface RoomConfig {
    id: number;
    name: string;
    slug: string;
    port: number;
}

export const AdminLobby = () => {
    const [rooms, setRooms] = useState<LobbyRoom[]>([]);
    const [configs, setConfigs] = useState<RoomConfig[]>([]);
    const [filter, setFilter] = useState<'live' | 'all' | 'gone'>('all');
    const [selected, setSelected] = useState<LobbyRoom | null>(null);
    const [chat, setChat] = useState<ChatMsg[]>([]);
    const [search, setSearch] = useState('');
    const [chatSource, setChatSource] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

    const fetchRooms = () => {
        const url = filter === 'all' ? `${API}/admin/lobby-rooms` : `${API}/admin/lobby-rooms?status=${filter}`;
        fetch(url, { headers: authHeaders() })
            .then(res => res.json())
            .then(setRooms)
            .catch(console.error);
    };

    useEffect(() => {
        fetch(`${API}/admin/rooms`, { headers: authHeaders() })
            .then(res => res.json())
            .then(setConfigs)
            .catch(console.error);
        fetchRooms();
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, [filter]);

    useEffect(() => () => stopPoll(), []);

    const loadChat = (lobby: LobbyRoom) => {
        stopPoll();
        setSelected(lobby);
        // Chat is keyed by the config slug when the lobby is backed by a managed room (same port).
        const cfg = configs.find(c => c.port === lobby.port);
        if (cfg) {
            setChatSource(cfg.slug);
            const load = () => {
                fetch(`${API}/admin/chat?room=${cfg.slug}&limit=200`, { headers: authHeaders() })
                    .then(res => res.json())
                    .then(setChat)
                    .catch(console.error);
            };
            load();
            pollRef.current = setInterval(load, 5000);
        } else {
            setChatSource('');
            setChat([]);
        }
    };

    const closeChat = () => { stopPoll(); setSelected(null); setChat([]); };

    const filtered = rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <Window title={`EMULATOR ROOMS (${rooms.filter(r => r.status === 'live').length} LIVE / ${rooms.length} TOTAL)`}>
                <div className="flex gap-2 mb-3 items-center">
                    <select className="bg-neutral-900 text-neutral-200 border border-border p-1.5 font-mono text-xs focus:outline-none" value={filter} onChange={e => setFilter(e.target.value as any)}>
                        <option value="all">ALL</option>
                        <option value="live">LIVE</option>
                        <option value="gone">HISTORY</option>
                    </select>
                    <input className="bg-neutral-900 text-neutral-200 border border-border p-1.5 font-mono text-xs flex-1 focus:outline-none" placeholder="Search room name..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <DataTable
                    columns={['NAME', 'OWNER', 'PORT', 'GAME', 'PLAYERS', 'PASSWORD', 'LAST SEEN', 'STATUS', '']}
                    data={filtered.map(r => ({
                        name: <span className="text-neutral-200">{r.name}</span>,
                        owner: <span className="text-sky-400">{r.owner || '-'}</span>,
                        port: <span className="text-orange-400">{r.port}</span>,
                        game: <span className="text-orange-400">{r.preferred_game_name || '-'}</span>,
                        players: <span className="text-green-500">{r.max_players}</span>,
                        password: <span className={r.has_password ? 'text-orange-400' : 'text-neutral-600'}>{r.has_password ? 'yes' : 'no'}</span>,
                        'last seen': <span className="text-neutral-500 text-[10px]">{new Date(r.last_seen).toLocaleString()}</span>,
                        status: <span className={r.status === 'live' ? 'text-green-500' : 'text-neutral-500'}>{r.status}</span>,
                        '': <button className="text-sky-400 hover:underline" onClick={() => loadChat(r)}>[view]</button>
                    }))}
                />
                {filtered.length === 0 && <div className="text-neutral-600 p-4 text-center font-mono text-xs">No rooms</div>}
            </Window>

            {selected && (
                <Window title={`CHAT - ${selected.name.toUpperCase()}`}>
                    <div className="max-h-[50vh] overflow-y-auto p-2 bg-main font-mono text-xs space-y-1 border border-border">
                        {chatSource && <div className="text-neutral-600 pb-1 border-b border-border">Linked config slug: {chatSource}</div>}
                        {chat.map((msg, i) => (
                            <div key={msg.id ?? i} className="leading-tight">
                                <span className="text-neutral-600">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                                <span className={`ml-1 font-bold ${msg.username === '[ADMIN]' ? 'text-red-400' : 'text-orange-400'}`}>&lt;{msg.username}&gt;</span>
                                <span className="text-neutral-300 ml-1">{msg.message}</span>
                            </div>
                        ))}
                        {chat.length === 0 && <div className="text-neutral-600 p-4 text-center">No messages</div>}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button className="text-neutral-500 hover:text-neutral-300 font-mono text-xs" onClick={closeChat}>[close]</button>
                    </div>
                </Window>
            )}
        </div>
    );
};
