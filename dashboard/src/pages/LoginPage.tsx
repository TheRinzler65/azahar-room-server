import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Window } from '../components/Window';
import { API } from '../config';

export const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                sessionStorage.setItem('azahar_player_jwt', data.token);
                sessionStorage.setItem('azahar_player_name', data.username);
                navigate('/');
            } else {
                setError('Invalid credentials');
            }
        } catch {
            setError('Connection error');
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 mt-10">
            <Window title="PLAYER LOGIN">
                <form onSubmit={submit} className="space-y-4 font-mono text-xs">
                    <div>
                        <label className="text-neutral-400">username</label>
                        <input
                            className="bg-neutral-900 text-neutral-200 border border-border p-2 w-full mt-1 focus:outline-none focus:border-sky-500"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-neutral-400">password</label>
                        <input
                            type="password"
                            className="bg-neutral-900 text-neutral-200 border border-border p-2 w-full mt-1 focus:outline-none focus:border-sky-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <div className="text-red-400">{error}</div>}
                    <button className="bg-sky-900 hover:bg-sky-800 text-sky-100 px-4 py-2 border border-sky-700 w-full">
                        SIGN IN
                    </button>
                    <div className="text-center text-neutral-500">
                        No account? <Link to="/register" className="text-sky-400 hover:underline">register</Link>
                    </div>
                </form>
            </Window>
        </div>
    );
};
