import { Router } from 'express';
import { rooms, chatLogs } from '../state';
import { addChatMessage } from '../db/chat';
import { listRoomConfigs } from '../db/rooms';
import { broadcastChat } from '../ws';
import { filterChatMessage } from '../utils/chatFilter';

const router = Router();

router.post('/chat/:id', async (req, res) => {
    const addr = req.socket.remoteAddress ?? '';
    const isLocal = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
    
    if (!isLocal) {
        return res.status(403).send('Forbidden: Internal network only');
    }

    const { id } = req.params;
    const { username, message } = req.body;

    if (typeof username !== 'string' || typeof message !== 'string') {
        return res.status(400).send('Invalid payload: string required');
    }

    const cleanUsername = username.trim();
    const rawMessage = message.trim();

    if (!cleanUsername || cleanUsername.length > 32) {
        return res.status(400).send('Invalid username length');
    }
    
    if (!rawMessage || rawMessage.length > 512) {
        return res.status(400).send('Invalid message length');
    }

    const { clean: cleanMessage, flagged } = filterChatMessage(rawMessage);
    if (flagged) {
        console.log(`[ChatRoute] [Automod] Message assaini pour room=${id} user=${cleanUsername}`);
    }

    if (!chatLogs[id]) chatLogs[id] = [];
    chatLogs[id].push({ username: cleanUsername, message: cleanMessage, timestamp: Date.now() });
    if (chatLogs[id].length > 100) chatLogs[id].shift();

    const room = rooms.find(r => r.id === id);
    const configs = await listRoomConfigs();
    const cfg = configs.find(c => c.port === (room?.port ?? -1));
    const slug = cfg?.slug ?? room?.name ?? id;
    addChatMessage(id, slug, cleanUsername, cleanMessage);
    broadcastChat(slug, id, cleanUsername, cleanMessage, Date.now());

    res.sendStatus(200);
});

router.get('/chat/:id', (req, res) => {
    res.json(chatLogs[req.params.id] || []);
});

export default router;