import { useEffect, useState } from 'react';
import { Window } from '../../components/Window';
import { API } from '../../config';
import { authHeaders } from '../../utils/auth';

interface BanDetail {
    type: string;
    value: string;
    reason?: string;
    banned_by?: string;
    created_at: number;
}

interface Bans {
    usernames: string[];
    ips: string[];
    details: BanDetail[];
}

export const AdminBans = () => {
    const [bans, setBans] = useState<Bans>({ usernames: [], ips: [], details: [] });
    const [value, setValue] = useState('');
    const [type, setType] = useState<'username' | 'ip'>('username');
    const [reason, setReason] = useState('');
    const [msg, setMsg] = useState('');

    const fetchBans = () => {
        fetch(`${API}/admin/bans`, { headers: authHeaders() })
            .then(res => res.json())
            .then(setBans)
            .catch(console.error);
    };

    useEffect(() => { fetchBans(); }, []);

    const ban = async () => {
        if (!value.trim()) return;
        const res = await fetch(`${API}/admin/ban`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ type, value: value.trim(), reason: reason.trim() || undefined })
        });
        if (res.ok) {
            setMsg(`Banned: ${value}${reason ? ` (${reason})` : ''}`);
            setValue('');
            setReason('');
            fetchBans();
        } else {
            setMsg('Error');
        }
    };

    const unban = async (type: 'username' | 'ip', value: string) => {
        const res = await fetch(`${API}/admin/ban`, {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ type, value })
        });
        if (res.ok) fetchBans();
    };

    const findDetail = (type: string, value: string) =>
        bans.details.find(d => d.type === type && d.value === value);

    return (
        <Window title="BAN MANAGEMENT">
            <div className="space-y-4 font-mono text-xs">
                <div className="flex gap-2">
                    <select
                        className="bg-neutral-900 text-neutral-200 border border-border p-2 focus:outline-none"
                        value={type}
                        onChange={e => setType(e.target.value as any)}
                    >
                        <option value="username">username</option>
                        <option value="ip">ip</option>
                    </select>
                    <input
                        className="bg-neutral-900 text-neutral-200 border border-border p-2 w-full focus:outline-none"
                        placeholder="target..."
                        value={value}
                        onChange={e => setValue(e.target.value)}
                    />
                    <button className="bg-red-900 hover:bg-red-800 text-red-200 px-4 border border-red-700" onClick={ban}>
                        BAN
                    </button>
                </div>
                <input
                    className="bg-neutral-900 text-neutral-200 border border-border p-2 w-full focus:outline-none"
                    placeholder="reason (optional)"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />

                {msg && <div className="text-sky-400">{msg}</div>}

                <div className="grid grid-cols-2 gap-4">
                    <div className="border border-border">
                        <div className="bg-title px-2 py-1 border-b border-border text-neutral-300">BANNED USERNAMES</div>
                        <div className="p-2 max-h-60 overflow-y-auto text-red-400">
                            {bans.usernames.map((u, i) => {
                                const detail = findDetail('username', u);
                                return (
                                    <div key={i} className="p-0.5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span>{u}</span>
                                            {detail?.reason && <span className="text-neutral-500 text-[10px]">reason: {detail.reason}</span>}
                                            {detail?.banned_by && <span className="text-neutral-600 text-[10px]">by: {detail.banned_by}</span>}
                                        </div>
                                        <button onClick={() => unban('username', u)} className="text-neutral-500 hover:text-neutral-300 ml-2">[x]</button>
                                    </div>
                                );
                            })}
                            {bans.usernames.length === 0 && <div className="text-neutral-600">none</div>}
                        </div>
                    </div>
                    <div className="border border-border">
                        <div className="bg-title px-2 py-1 border-b border-border text-neutral-300">BANNED IPS</div>
                        <div className="p-2 max-h-60 overflow-y-auto text-red-400">
                            {bans.ips.map((u, i) => {
                                const detail = findDetail('ip', u);
                                return (
                                    <div key={i} className="p-0.5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span>{u}</span>
                                            {detail?.reason && <span className="text-neutral-500 text-[10px]">reason: {detail.reason}</span>}
                                            {detail?.banned_by && <span className="text-neutral-600 text-[10px]">by: {detail.banned_by}</span>}
                                        </div>
                                        <button onClick={() => unban('ip', u)} className="text-neutral-500 hover:text-neutral-300 ml-2">[x]</button>
                                    </div>
                                );
                            })}
                            {bans.ips.length === 0 && <div className="text-neutral-600">none</div>}
                        </div>
                    </div>
                </div>
            </div>
        </Window>
    );
};
