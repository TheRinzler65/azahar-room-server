import { useEffect, useState } from 'react';
import { Window } from '../components/Window';
import { API } from '../config';

const EMU_API_URL = 'http://api-rinzler-azahar.duckdns.org';

interface ActiveRoom {
    id: string;
    name: string;
    port: number;
    address?: string;
    players?: any[];
    max_members?: number;
    maxPlayers?: number;
    preferred_game_name?: string;
    preferredGameName?: string;
}

export const PlayPage = () => {
    const [copied, setCopied] = useState('');
    const [rooms, setRooms] = useState<ActiveRoom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const playerName = sessionStorage.getItem('azahar_player_name') || 'your_username';

    const copy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 1500); 
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API}/rooms`);
            if (res.ok) {
                const data = await res.json();
                setRooms(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to load active rooms', e);
        } finally {
            setLoadingRooms(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        const timer = setInterval(fetchRooms, 15000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-4 font-mono text-xs">
            <Window title="LIVE ROOMS">
                <div className="space-y-3">
                    <div className="text-neutral-400">
                        Copy the direct room address and connect via <span className="text-sky-400 font-bold">Multiplayer → Direct Connect</span> in Azahar.
                    </div>

                    {loadingRooms ? (
                        <div className="text-neutral-500 py-3">Scanning active rooms...</div>
                    ) : rooms.length === 0 ? (
                        <div className="text-neutral-500 py-3 border border-dashed border-border text-center">
                            No active rooms online right now. Rooms will appear automatically once started.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {rooms.map((r, idx) => {
                                const host = r.address || window.location.hostname;
                                const targetAddr = `${host}:${r.port}`;
                                const gameTitle = r.preferred_game_name || r.preferredGameName || 'Any Game';
                                const currentPlayers = r.players?.length ?? 0;
                                const maxCap = r.max_members || r.maxPlayers || 16;
                                const isCopied = copied === `room-${idx}`;

                                return (
                                    <div key={r.id || idx} className="border border-border bg-neutral-900/60 p-3 space-y-2 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-neutral-200 text-sm">{r.name}</div>
                                                <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-800 px-1.5 py-0.5">
                                                    {currentPlayers}/{maxCap} PLAYERS
                                                </span>
                                            </div>
                                            <div className="text-neutral-400 text-[11px] mt-0.5">{gameTitle}</div>
                                            <div className="text-neutral-500 text-[10px] mt-1 font-mono">
                                                Port: {r.port} | Host: {host}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-neutral-800/80">
                                            <button
                                                onClick={() => copy(targetAddr, `room-${idx}`)}
                                                className={`w-full py-1.5 border text-center font-bold text-[11px] transition-colors ${
                                                    isCopied
                                                        ? 'bg-green-900/60 border-green-700 text-green-200'
                                                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-border'
                                                }`}
                                            >
                                                {isCopied ? 'COPIED TO CLIPBOARD!' : `COPY ADDRESS (${targetAddr})`}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Window>

            <Window title="HOW TO PLAY">
                <div className="space-y-6">
                    <div className="flex gap-3 border-b border-border pb-4">
                        <span className="text-sky-400 font-bold text-lg shrink-0">01</span>
                        <div className="space-y-1">
                            <div className="text-neutral-200 font-bold">Download Azahar</div>
                            <div className="text-neutral-500">Get the latest Azahar build for your platform.</div>
                            <a
                                href="https://github.com/TheRinzler65/azahar-room-server"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline"
                            >
                                azahar-emu.org/pages/download/
                            </a>
                        </div>
                    </div>

                    <div className="flex gap-3 border-b border-border pb-4">
                        <span className="text-sky-400 font-bold text-lg shrink-0">02</span>
                        <div className="space-y-1">
                            <div className="text-neutral-200 font-bold">Register an Account</div>
                            <div className="text-neutral-500">Create your player account on this dashboard.</div>
                            <a href="/register" className="text-sky-400 hover:underline">Register here</a>
                        </div>
                    </div>

                    <div className="flex gap-3 border-b border-border pb-4">
                        <span className="text-sky-400 font-bold text-lg shrink-0">03</span>
                        <div className="space-y-2">
                            <div className="text-neutral-200 font-bold">Configure Network</div>
                            <div className="text-neutral-500">In Azahar: <span className="text-neutral-300">Emulation → Configure… → General → Network</span></div>
                            <div className="space-y-2 mt-2">
                                <div>
                                    <div className="text-neutral-400 mb-1">Network Web API URL :</div>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={EMU_API_URL}
                                            className="bg-neutral-900 text-sky-400 border border-border px-2 py-1 flex-1 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => copy(EMU_API_URL, 'url')}
                                            className="bg-sky-900 hover:bg-sky-800 text-sky-100 px-3 py-1 border border-sky-700 shrink-0"
                                        >
                                            {copied === 'url' ? 'Copied!' : 'COPY'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-neutral-400 mb-1">Network Token :</div>
                                    <div className="text-neutral-500">Your citra_token (shown after registration in your Profile).</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 border-b border-border pb-4">
                        <span className="text-sky-400 font-bold text-lg shrink-0">04</span>
                        <div className="space-y-2">
                            <div className="text-neutral-200 font-bold">Set Your Username</div>
                            <div className="text-neutral-500">In Azahar: <span className="text-neutral-300">Emulation → Configure… → System → System</span></div>
                            <div className="mt-2">
                                <div className="text-neutral-400 mb-1">Username :</div>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={playerName}
                                        className="bg-neutral-900 text-orange-400 border border-border px-2 py-1 flex-1 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => copy(playerName, 'username')}
                                        className="bg-sky-900 hover:bg-sky-800 text-sky-100 px-3 py-1 border border-sky-700 shrink-0"
                                    >
                                        {copied === 'username' ? 'Copied!' : 'COPY'}
                                    </button>
                                </div>
                                <div className="text-red-400 text-[10px] mt-1">⚠ Must match your registered username on this site</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <span className="text-green-500 font-bold text-lg shrink-0">✓</span>
                        <div className="space-y-1">
                            <div className="text-neutral-200 font-bold">Connect to a Room</div>
                            <div className="text-neutral-500">In Azahar: go to <span className="text-neutral-300">Multiplayer → Direct Connect</span> and paste the room address copied above.</div>
                        </div>
                    </div>
                </div>
            </Window>
        </div>
    );
};