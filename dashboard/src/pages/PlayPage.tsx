import { useState } from 'react';
import { Window } from '../components/Window';

const EMU_API_URL = 'http://api-rinzler-azahar.duckdns.org';

export const PlayPage = () => {
    const [copied, setCopied] = useState('');
    const playerName = sessionStorage.getItem('azahar_player_name') || 'your_username';

const copy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 1500); 
    };

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-4">
            <Window title="HOW TO PLAY">
                <div className="space-y-6 font-mono text-xs">

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
                            <div className="text-neutral-500">Once configured, go to <span className="text-neutral-300">Multiplayer</span> in Azahar. Active rooms will appear automatically.</div>
                        </div>
                    </div>

                </div>
            </Window>
        </div>
    );
};
