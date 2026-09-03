import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { rooms, setRooms } from '../state';
import { isAdmin, signAdminJWT } from '../middleware/auth';
import { listBans, addBan, removeBan } from '../db/bans';
import { listRoomConfigs, getRoomConfig, getRoomConfigBySlug, createRoomConfig, updateRoomConfig, deleteRoomConfig, listRoomInstances } from '../db/rooms';
import { listChatMessages, listChatMessagesByRoom, addChatMessage } from '../db/chat';
import { syncBanFile } from '../utils/banfile';
import { startRoom, stopRoom, isRunning } from '../roomManager';
import { listAllUsers } from '../db/users';
import { broadcastChat, broadcastNotification } from '../ws';
import { listLobbyRooms } from '../db/lobby';
import { listChatMessagesByRoomId } from '../db/chat';

const router = Router();

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_TOKEN) {
    console.error("CRITICAL: ADMIN_TOKEN is not defined in the environment variables!");
    console.error("The server refuses to start in production with the default password 'changeme'.");
    process.exit(1);
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const ADMIN_JWT_EXPIRY: string = process.env.ADMIN_JWT_EXPIRY || '1h';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: 'Too many login attempts from this IP, please try again in 15 minutes.'
});

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'room';
}

router.post('/admin/login', loginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_TOKEN) {
        const jwtToken = signAdminJWT();
        console.log('[Admin] Login successful');
        res.json({ token: jwtToken, expiresIn: ADMIN_JWT_EXPIRY });
    } else {
        res.status(403).send('Forbidden');
    }
});

router.get('/admin/session', (req, res) => {
    if (isAdmin(req)) {
        res.json({ valid: true });
    } else {
        res.status(401).send('Unauthorized');
    }
});

router.get('/admin/bans', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    try {
        const bans = await listBans();
        res.json({
            usernames: bans.filter(b => b.type === 'username').map(b => b.value),
            ips: bans.filter(b => b.type === 'ip').map(b => b.value),
            details: bans
        });
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

router.post('/admin/ban', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const { type, value, reason } = req.body;

    if (!type || !value) return res.status(400).send('type and value required');

    try {
        await addBan(type, value, reason, 'admin');
        await syncBanFile();
        console.log(`[Admin] Banned ${type}: ${value}`);
        broadcastNotification(`Banned ${type}: ${value}${reason ? ` (${reason})` : ''}`);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

router.delete('/admin/ban', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const { type, value } = req.body;

    if (!type || !value) return res.status(400).send('type and value required');

    try {
        await removeBan(type, value);
        await syncBanFile();
        console.log(`[Admin] Unbanned ${type}: ${value}`);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

router.get('/admin/chat', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const limit = parseInt(String(req.query.limit || '500'), 10);
    const room = req.query.room as string | undefined;
    let messages;
    if (room) {
        messages = await listChatMessagesByRoom(room, limit);
    } else {
        messages = await listChatMessages(limit);
    }
    messages.reverse();
    res.json(messages);
});

router.post('/admin/chat/:roomSlug', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const { roomSlug } = req.params;
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).send('message required');
    }
    const cleanMessage = message.trim().slice(0, 500);
    await addChatMessage(null, roomSlug, '[ADMIN]', cleanMessage);
    console.log(`[Admin] Chat in ${roomSlug}: ${cleanMessage}`);
    broadcastChat(roomSlug, null, '[ADMIN]', cleanMessage, Date.now());
    res.json({ success: true });
});

router.get('/admin/players', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const players = await listAllUsers();
    res.json(players);
});

router.get('/admin/lobby-rooms', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const status = req.query.status as 'live' | 'gone' | undefined;
    const rows = await listLobbyRooms(status);
    res.json(rows);
});

router.get('/admin/lobby-rooms/:id/chat', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const { id } = req.params;
    const messages = await listChatMessagesByRoomId(id, parseInt(String(req.query.limit || '200'), 10));
    messages.reverse();
    res.json(messages);
});

router.get('/admin/rooms', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const configs = await listRoomConfigs();
    const instances = await listRoomInstances();
    const live = rooms.filter(r => Date.now() - r.lastUpdate < 120000);
    const result = configs.map(c => {
        const inst = instances.find(i => i.config_id === c.id);
        const liveRoom = live.find(r => r.port === c.port);
        return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            port: c.port,
            max_members: c.max_members,
            preferred_game_name: c.preferred_game_name,
            preferred_game_id: c.preferred_game_id,
            description: c.description,
            status: isRunning(c.id) ? 'running' : c.status,
            auto_start: c.auto_start,
            pid: inst?.pid ?? null,
            announced_room_id: liveRoom?.id ?? inst?.announced_room_id ?? null,
            players: liveRoom?.players?.length ?? 0,
        };
    });
    res.json(result);
});

router.post('/admin/rooms', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const { name, port, max_members, preferred_game_name, preferred_game_id, description, auto_start } = req.body;
    if (!name || !port) return res.status(400).send('name and port required');

    const existing = await listRoomConfigs();
    if (existing.some(c => c.port === Number(port))) {
        return res.status(409).send(`Port ${port} already used`);
    }

    const cfg = await getRoomConfigBySlug(slugify(name));
    if (cfg) return res.status(409).send('Room with this name already exists');

    const id = await createRoomConfig({
        name,
        slug: slugify(name),
        port: Number(port),
        max_members: Number(max_members || 16),
        preferred_game_name: preferred_game_name || 'Any Game',
        preferred_game_id: preferred_game_id || 1125899906842624,
        description: description || '',
        auto_start: auto_start ? 1 : 0,
    });

    console.log(`[Admin] Room config created: ${name} (id=${id})`);
    res.json({ success: true, id });
});

router.patch('/admin/rooms/:id', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const { id } = req.params;
    const cfg = await getRoomConfig(Number(id));
    if (!cfg) return res.status(404).send('Not found');

    const { name, max_members, preferred_game_name, preferred_game_id, description, auto_start } = req.body;
    await updateRoomConfig(Number(id), {
        name: name ?? cfg.name,
        max_members: max_members ?? cfg.max_members,
        preferred_game_name: preferred_game_name ?? cfg.preferred_game_name,
        preferred_game_id: preferred_game_id ?? cfg.preferred_game_id,
        description: description ?? cfg.description,
        auto_start: auto_start !== undefined ? (auto_start ? 1 : 0) : cfg.auto_start,
    });
    res.json({ success: true });
});

router.delete('/admin/rooms/:id', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const cfg = await getRoomConfig(Number(req.params.id));
    if (!cfg) return res.status(404).send('Not found');
    if (cfg.status === 'running' || isRunning(cfg.id)) {
        await stopRoom(cfg);
    }
    await deleteRoomConfig(cfg.id);
    console.log(`[Admin] Room config deleted: ${cfg.name}`);
    res.json({ success: true });
});

router.post('/admin/rooms/:id/start', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const cfg = await getRoomConfig(Number(req.params.id));
    if (!cfg) return res.status(404).send('Not found');
    const result = await startRoom(cfg);
    res.json(result);
});

router.post('/admin/rooms/:id/stop', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const cfg = await getRoomConfig(Number(req.params.id));
    if (!cfg) return res.status(404).send('Not found');
    const result = await stopRoom(cfg);
    setRooms(rooms.filter(r => r.port !== cfg.port));
    res.json(result);
});

router.post('/admin/restart', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).send('Unauthorized');
    const configs = await listRoomConfigs();
    for (const cfg of configs) {
        if (isRunning(cfg.id)) await stopRoom(cfg);
    }
    for (const cfg of configs) {
        if (cfg.auto_start) await startRoom(cfg);
    }
    res.json({ success: true });
});

export default router;