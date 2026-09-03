import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: http.Server) {
    wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (socket) => {
        socket.send(JSON.stringify({ type: 'ready' }));
    });
    return wss;
}

export function broadcastChat(roomSlug: string, roomId: string | null, username: string, message: string, timestamp: number) {
    if (!wss) return;
    const payload = JSON.stringify({ type: 'chat', roomSlug, roomId, username, message, timestamp });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

export function broadcastNotification(message: string) {
    if (!wss) return;
    const payload = JSON.stringify({ type: 'notification', message, timestamp: Date.now() });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}
