import { useEffect, useState, useRef } from 'react';
import { Window } from '../../components/Window';
import { API } from '../../config';
import { authHeaders } from '../../utils/auth';

interface ChatMsg {
    id: number;
    room_id: string | null;
    room_slug: string | null;
    username: string;
    message: string;
    timestamp: number;
}

interface RoomConfig {
    id: number;
    name: string;
    slug: string;
}

export const AdminChat = () => {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [rooms, setRooms] = useState<RoomConfig[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const selectedRoomRef = useRef(selectedRoom);
    selectedRoomRef.current = selectedRoom;

    useEffect(() => {
        fetch(`${API}/admin/rooms`, { headers: authHeaders() })
            .then(res => res.json())
            .then(setRooms)
            .catch(console.error);
    }, []);

    useEffect(() => {
        const fetchChat = () => {
            const url = selectedRoom
                ? `${API}/admin/chat?room=${selectedRoom}&limit=200`
                : `${API}/admin/chat?limit=300`;
            fetch(url, { headers: authHeaders() })
                .then(res => res.json())
                .then(setMessages)
                .catch(console.error);
        };
        fetchChat();
        // Live updates via WebSocket (fallback to polling if ws unavailable)
        let ws: WebSocket | null = null;
        let alive = true;
        const connectWs = () => {
            if (!alive) return;
            try {
                const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
                ws = new WebSocket(`${proto}://${window.location.host}/ws`);
                ws.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        if (data.type === 'chat') {
                            const filter = selectedRoomRef.current;
                            if (!filter || data.roomSlug === filter) {
                                setMessages(prev => [...prev.slice(-200), {
                                    id: data.timestamp, room_id: data.roomId, room_slug: data.roomSlug,
                                    username: data.username, message: data.message, timestamp: data.timestamp
                                }]);
                            }
                        }
                    } catch {}
                };
                ws.onclose = () => { if (alive) setTimeout(connectWs, 3000); };
                ws.onerror = () => { ws?.close(); };
            } catch {}
        };
        connectWs();
        const interval = setInterval(fetchChat, 5000);
        return () => { alive = false; clearInterval(interval); if (ws) ws.close(); };
    }, [selectedRoom]);

    const send = async () => {
        if (!input.trim() || !selectedRoom) return;
        setSending(true);
        const room = rooms.find(r => r.slug === selectedRoom);
        const slug = room?.slug || selectedRoom;
        await fetch(`${API}/admin/chat/${slug}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ message: input.trim() })
        });
        setInput('');
        setSending(false);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <div className="space-y-3">
            <Window title="CHAT MONITOR">
                <div className="flex gap-2 mb-3 items-center">
                    <select
                        className="bg-neutral-900 text-neutral-200 border border-border p-1.5 font-mono text-xs focus:outline-none"
                        value={selectedRoom}
                        onChange={e => setSelectedRoom(e.target.value)}
                    >
                        <option value="">ALL ROOMS</option>
                        {rooms.map(r => (
                            <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>
                        ))}
                    </select>
                    <span className="text-neutral-500 font-mono text-xs">
                        {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="max-h-[55vh] overflow-y-auto p-2 bg-main font-mono text-xs space-y-1 border border-border">
                    {messages.map((msg, i) => (
                        <div key={msg.id ?? i} className="leading-tight">
                            <span className="text-neutral-600">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                            <span className="text-sky-400 text-[10px] ml-1">({msg.room_slug || msg.room_id})</span>
                            <span className={`ml-1 font-bold ${msg.username === '[ADMIN]' ? 'text-red-400' : 'text-orange-400'}`}>&lt;{msg.username}&gt;</span>
                            <span className="text-neutral-300 ml-1">{msg.message}</span>
                        </div>
                    ))}
                    {messages.length === 0 && <div className="text-neutral-600 p-4 text-center">No messages yet</div>}
                </div>

                {selectedRoom && (
                    <div className="flex gap-2 mt-2">
                        <input
                            className="bg-neutral-900 text-neutral-200 border border-border p-2 font-mono text-xs flex-1 focus:outline-none"
                            placeholder={`Message to ${selectedRoom}...`}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={sending}
                        />
                        <button
                            className="bg-red-900 hover:bg-red-800 text-red-200 px-4 border border-red-700 font-mono text-xs disabled:opacity-50"
                            onClick={send}
                            disabled={sending || !input.trim()}
                        >
                            SEND
                        </button>
                    </div>
                )}
            </Window>
        </div>
    );
};
