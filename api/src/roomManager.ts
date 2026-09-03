import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Tail } from 'tail';
import { loadEnv } from './env';
import {
    RoomConfigRow,
    listRoomConfigs, listRoomInstances, getRoomInstanceByConfig,
    setRoomConfigStatus, createRoomInstance, updateRoomInstance, deleteRoomInstance,
} from './db/rooms';
import { broadcastNotification } from './ws';

loadEnv();

const running: Map<number, { proc: ChildProcess; instanceId: number }> = new Map();
const watchers: Map<number, Tail> = new Map();
const announcedRoom: Map<number, string> = new Map();

// Match azahar-room chat lines: [ timestamp] Network <Info> ...:HandleChatPacket:NUM: username: message
const chatRegex = /HandleChatPacket:\d+:\s*([^:]+):\s*(.*)$/;

function postChat(roomId: string, username: string, message: string) {
    const body = JSON.stringify({ username, message });
    const req = http.request({
        hostname: '127.0.0.1', port: 3000, path: `/chat/${roomId}`,
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.on('error', (e) => console.error(`[chatRelay] postChat error: ${e.message}`));
    req.on('response', (r) => r.resume());
    req.write(body);
    req.end();
}

function getBanFile(slug: string): string {
    return '/opt/azahar/banlist.txt';
}

export function formatGameId(id: number): string {
    return `0x${BigInt(id).toString(16).padStart(16, '0')}`;
}

if (require.main === module) {
    const cases: [number, string][] = [
        [1125899906842624, '0x0004000000000000'],
        [0, '0x0000000000000000'],
        [255, '0x00000000000000ff'],
    ];
    for (const [n, want] of cases) {
        const got = formatGameId(n);
        if (got !== want) { console.error(`FAIL formatGameId(${n}): got ${got}, want ${want}`); process.exit(1); }
        console.log(`ok formatGameId(${n}) -> ${got}`);
    }
}

function ensureLogFile(slug: string): string {
    const logFile = path.join('/opt/azahar', 'logs', `${slug}.log`);
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '');
    return logFile;
}

function parseChatStream(cfg: RoomConfigRow, chunk: Buffer) {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
        if (!line) continue;
        const match = line.match(chatRegex);
        if (match) {
            const username = match[1].trim();
            const message = match[2].trim();
            if (username && message) {
                console.log(`[chatRelay] SEND slug=${cfg.slug} user=${username} msg=${message}`);
                postChat(cfg.slug, username, message);
            }
        }
    }
}

function attachChatWatcher(cfg: RoomConfigRow) {
    if (watchers.has(cfg.id)) return;
    const logFile = ensureLogFile(cfg.slug);
    const tail = new Tail(logFile);
    watchers.set(cfg.id, tail);
    tail.on('line', (line: string) => {
        const match = line.match(chatRegex);
        if (match) {
            const roomId = announcedRoom.get(cfg.id);
            const username = match[1].trim();
            const message = match[2].trim();
            console.log(`[chatRelay] match: room=${cfg.slug} roomId=${roomId} user=${username} msg=${message}`);
            if (roomId && username && message) postChat(roomId, username, message);
        }
    });
    tail.on('error', (e: any) => console.error(`[chatRelay] tail error on ${logFile}: ${e.message}`));
}

function buildArgs(cfg: RoomConfigRow): string[] {
    const logFile = ensureLogFile(cfg.slug);
    
    const username = process.env.ROOM_USERNAME || 'Rinzler';
    const token = process.env.ROOM_TOKEN || '';
    const apiUrl = process.env.ROOM_API_URL || 'http://127.0.0.1:3000';

    console.log(`[RoomManager Debug] Launching room with User: "${username}" and Token: "${token}"`);

    const args = [
        '--room-name', cfg.name,
        '--port', String(cfg.port),
        '--max_members', String(cfg.max_members),
        '--preferred-app', cfg.preferred_game_name,
        '--preferred-app-id', formatGameId(cfg.preferred_game_id),
        '--ban-list-file', getBanFile(cfg.slug),
        '--username', username,
        '--token', token,
        '--web-api-url', apiUrl,
        '--log-file', logFile,
    ];
    if (cfg.description) args.push('--room-description', cfg.description);
    return args;
}

export async function startRoom(cfg: RoomConfigRow): Promise<{ ok: boolean; error?: string; pid?: number }> {
    if (running.has(cfg.id)) return { ok: false, error: 'Room already running' };

    const configs = await listRoomConfigs();
    const other = configs.find(c => c.id !== cfg.id && c.port === cfg.port && c.status === 'running');
    if (other) return { ok: false, error: `Port ${cfg.port} already used by room "${other.name}"` };

    const binary = process.env.ROOM_BINARY || '/opt/azahar/azahar-room';
    const username = process.env.ROOM_USERNAME || 'Rinzler';
    const token = process.env.ROOM_TOKEN || '';

    const args = buildArgs(cfg);
    
    // FIX: Passing environment variables explicitly to the spawned process
    const proc = spawn(binary, args, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            ROOM_USERNAME: username,
            ROOM_TOKEN: token,
        }
    });

    const instanceId = await createRoomInstance(cfg.id, proc.pid || null);
    running.set(cfg.id, { proc, instanceId });
    await setRoomConfigStatus(cfg.id, 'running');
    announcedRoom.set(cfg.id, '');
    attachChatWatcher(cfg);

    proc.stdout.on('data', (d: Buffer) => {
        process.stdout.write(`[room:${cfg.slug}] ${d}`);
        parseChatStream(cfg, d);
    });
    proc.stderr.on('data', (d: Buffer) => {
        process.stderr.write(`[room:${cfg.slug}] ${d}`);
        parseChatStream(cfg, d);
    });

    proc.on('exit', async (code, signal) => {
        running.delete(cfg.id);
        const t = watchers.get(cfg.id);
        if (t) { try { t.unwatch(); } catch {} watchers.delete(cfg.id); }
        await deleteRoomInstance(cfg.id);
        await setRoomConfigStatus(cfg.id, 'stopped');
        console.log(`[RoomManager] ${cfg.slug} exited (code=${code} signal=${signal})`);
        if (code !== 0) broadcastNotification(`Room "${cfg.name}" exited unexpectedly (code=${code})`);
    });

    proc.on('error', async (err) => {
        running.delete(cfg.id);
        const t = watchers.get(cfg.id);
        if (t) { try { t.unwatch(); } catch {} watchers.delete(cfg.id); }
        await deleteRoomInstance(cfg.id);
        await setRoomConfigStatus(cfg.id, 'stopped');
        console.log(`[RoomManager] ${cfg.slug} spawn error: ${err.message}`);
        broadcastNotification(`Room "${cfg.name}" spawn error: ${err.message}`);
    });

    console.log(`[RoomManager] Started ${cfg.slug} (pid=${proc.pid})`);
    return { ok: true, pid: proc.pid };
}

export async function stopRoom(cfg: RoomConfigRow): Promise<{ ok: boolean; error?: string }> {
    const entry = running.get(cfg.id);
    if (!entry) {
        const t = watchers.get(cfg.id);
        if (t) { try { t.unwatch(); } catch {} watchers.delete(cfg.id); }
        await deleteRoomInstance(cfg.id);
        await setRoomConfigStatus(cfg.id, 'stopped');
        return { ok: true };
    }
    try { entry.proc.kill('SIGTERM'); } catch {}
    running.delete(cfg.id);
    const t = watchers.get(cfg.id);
    if (t) { try { t.unwatch(); } catch {} watchers.delete(cfg.id); }
    await deleteRoomInstance(cfg.id);
    await setRoomConfigStatus(cfg.id, 'stopped');
    console.log(`[RoomManager] Stopped ${cfg.slug}`);
    return { ok: true };
}

export async function startAutoRooms() {
    const configs = await listRoomConfigs();
    for (const cfg of configs) {
        if (cfg.auto_start && cfg.status === 'stopped') {
            try { await startRoom(cfg); } catch (e: any) { console.log(`[RoomManager] auto-start ${cfg.slug} failed: ${e.message}`); }
        }
    }
}

export async function registerAnnouncedRoom(name: string, port: number, roomId: string) {
    // Match against a config by port among currently-running rooms.
    const configs = await listRoomConfigs();
    const cfg = configs.find(c => c.port === port && running.has(c.id));
    if (!cfg) {
        console.log(`[chatRelay] registerAnnouncedRoom: no running config for port ${port}`);
        return;
    }
    announcedRoom.set(cfg.id, roomId);
    const inst = await getRoomInstanceByConfig(cfg.id);
    if (!inst) return;
    await updateRoomInstance(inst.id, { announced_room_id: roomId, announced_name: name, last_seen: Date.now() });
    console.log(`[chatRelay] announced room: cfg=${cfg.slug} roomId=${roomId}`);
}

export async function bindPing(roomId: string, players: any[]) {
    const instances = await listRoomInstances();
    const inst = instances.find(i => i.announced_room_id === roomId);
    if (inst) await updateRoomInstance(inst.id, { last_seen: Date.now() });
}

export function isRunning(configId: number): boolean {
    return running.has(configId);
}

export function runningCount(): number {
    return running.size;
}

export function getRunning(): { configId: number; pid: number | null }[] {
    const out: { configId: number; pid: number | null }[] = [];
    for (const [configId, entry] of running) out.push({ configId, pid: entry.proc.pid || null });
    return out;
}