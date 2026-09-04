import { useEffect, useState } from 'react';

interface Notification {
    id: number;
    message: string;
    timestamp: number;
}

export function useNotifications(enabled: boolean) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!enabled) return;
        let ws: WebSocket | null = null;

        try {
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            ws = new WebSocket(`${proto}://${window.location.host}/ws`);

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'notification') {
                        setNotifications(prev => [
                            { id: Date.now() + Math.random(), message: data.message, timestamp: Date.now() },
                            ...prev
                        ].slice(0, 20));
                    }
                } catch {}
            };
        } catch {}

        return () => {
            if (!ws) return;

            ws.onmessage = null;

            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => {
                    ws?.close();
                };
            }
        };
    }, [enabled]);

    const dismiss = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));
    const clear = () => setNotifications([]);

    return { notifications, dismiss, clear };
}