import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Title, Tooltip, Legend } from 'chart.js';
import { Window } from './Window';
import { DataTable } from './DataTable';
import { API } from '../config';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Title, Tooltip, Legend);

interface ActivityPoint { timestamp: number; players: number }
interface TopCount { game?: string; nickname?: string; minutes: number }

export const StatsView = ({ compact = false }: { compact?: boolean }) => {
    const [activity, setActivity] = useState<ActivityPoint[]>([]);
    const [topGames, setTopGames] = useState<TopCount[]>([]);
    const [topPlayers, setTopPlayers] = useState<TopCount[]>([]);

    useEffect(() => {
        const fetchAll = () => {
            fetch(`${API}/stats/activity`).then(r => r.json()).then(setActivity).catch(console.error);
            fetch(`${API}/stats/top-games`).then(r => r.json()).then(setTopGames).catch(console.error);
            fetch(`${API}/stats/top-players`).then(r => r.json()).then(setTopPlayers).catch(console.error);
        };
        fetchAll();
        const interval = setInterval(fetchAll, 15000);
        return () => clearInterval(interval);
    }, []);

    const points = activity.slice(-200);
    const chartData = {
        labels: points.map(p => new Date(p.timestamp).toLocaleTimeString()),
        datasets: [{
            label: 'Players online',
            data: points.map(p => p.players),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56,189,248,0.1)',
            fill: true,
            tension: 0.3,
        }]
    };

    return (
        <div className={compact ? 'space-y-4' : 'max-w-6xl mx-auto p-4 space-y-4'}>
            <Window title="ACTIVITY - PLAYERS ONLINE (LAST 200 SAMPLES)">
                <div className="h-64">
                    <Line data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a3a3a3' } } }, scales: { x: { ticks: { color: '#737373' } }, y: { ticks: { color: '#737373' } } } }} />
                </div>
            </Window>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Window title="TOP GAMES (heartbeat activity)">
                    <DataTable
                        columns={['GAME', 'MINUTES']}
                        data={topGames.map(g => ({ game: <span className="text-orange-400">{g.game}</span>, minutes: <span className="text-neutral-300">{g.minutes}</span> }))}
                    />
                </Window>
                <Window title="TOP PLAYERS (heartbeat activity)">
                    <DataTable
                        columns={['NICKNAME', 'MINUTES']}
                        data={topPlayers.map(p => ({ nickname: <span className="text-sky-400">{p.nickname}</span>, minutes: <span className="text-neutral-300">{p.minutes}</span> }))}
                    />
                </Window>
            </div>
        </div>
    );
};
