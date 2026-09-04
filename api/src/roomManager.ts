import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Tail } from 'tail';
import { loadEnv } from './env';
import {
    RoomConfigRow,
    listRoomConfigs, listRoomInstances, getRoomInstanceByConfig,
    setRoomConfigStatus, createRoomInstance, updateRoomInstance, deleteRoomInstance,
} from './db/rooms';
import { broadcastChat, broadcastNotification } from './ws';
import { filterChatMessage } from './utils/chatFilter';
import { notifyRoomCrash } from './utils/discord';
import { chatLogs } from './state';
import { addChatMessage } from './db/chat';

loadEnv();

const running: Map<number, { proc: ChildProcess; instanceId: number }> = new Map();
const watchers: Map<number, Tail> = new Map();
const announcedRoom: Map<number, string> = new Map();

interface RestartTracker {
    attempts: number;
    firstCrashAt: number;
    timer?: NodeJS.Timeout;
}
const restartTrackers: Map<number, RestartTracker> = new Map();
const intentionalStops: Set<number> = new Set();

const MAX_RESTART_ATTEMPTS = 3;
const CRASH_WINDOW_MS = 60_000;
const BASE_RESTART_DELAY_MS = 3_000;

const chatRegexes = [
    /HandleChatPacket:\d+:\s*([^:]+):\s*(.*)$/,
    /HandleChatPacket.*?:\s*([^:]+):\s*(.*)$/,
    /\[Chat\]\s*([^:]+):\s*(.*)$/,
    /Received chat message from\s+([^:]+):\s*(.*)$/,
    /RoomMember::SendChatMessage:\s*([^:]+):\s*(.*)$/
];

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../..');

function dispatchChat(cfg: RoomConfigRow, rawUsername: string, rawMessage: string) {
    const username = rawUsername.trim();
    const text = rawMessage.trim();
    if (!username || !text) return;

    const { clean: message, flagged } = filterChatMessage(text);
    if (flagged) {
        console.log(`[chatRelay] [Automod] Message assaini pour slug=${cfg.slug} user=${username}`);
    }

    const roomId = announcedRoom.get(cfg.id) || null;
    const now = Date.now();

    const entry = { username, message, timestamp: now };
    if (!chatLogs[cfg.slug]) chatLogs[cfg.slug] = [];
    chatLogs[cfg.slug].push(entry);
    if (chatLogs[cfg.slug].length > 100) chatLogs[cfg.slug].shift();

    if (roomId) {
        if (!chatLogs[roomId]) chatLogs[roomId] = [];
        chatLogs[roomId].push(entry);
        if (chatLogs[roomId].length > 100) chatLogs[roomId].shift();
    }

    addChatMessage(roomId || cfg.slug, cfg.slug, username, message);

    console.log(`[chatRelay] BROADCAST room=${cfg.slug} (id=${roomId}) user=${username} msg="${message}"`);
    broadcastChat(cfg.slug, roomId, username, message, now);
}

function getBanFile(slug: string): string {
    if (process.env.BANLIST_PATH) return process.env.BANLIST_PATH;
    const localBan = path.join(PROJECT_ROOT, 'banlist.txt');
    if (fs.existsSync(localBan)) return localBan;
    return path.join(process.cwd(), 'banlist.txt');
}

export function formatGameId(id: number): string {
    return `0x${BigInt(id).toString(16).padStart(16, '0')}`;
}

function ensureLogFile(slug: string): string {
    const logDir = process.env.LOGS_DIR || (fs.existsSync('/opt/azahar') ? '/opt/azahar/logs' : path.join(PROJECT_ROOT, 'logs'));
    const logFile = path.join(logDir, `${slug}.log`);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '');
    return logFile;
}

function parseChatStream(cfg: RoomConfigRow, chunk: Buffer) {
    const lines = chunk.toString().split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        for (const regex of chatRegexes) {
            const match = line.match(regex);
            if (match) {
                dispatchChat(cfg, match[1], match[2]);
                break;
            }
        }
    }
}

function attachChatWatcher(cfg: RoomConfigRow) {
    if (watchers.has(cfg.id)) return;
    const logFile = ensureLogFile(cfg.slug);
    const tail = new Tail(logFile);
    watchers.set(cfg.id, tail);

    tail.on('line', (rawLine: string) => {
        const line = rawLine.trim();
        if (!line) return;
        for (const regex of chatRegexes) {
            const match = line.match(regex);
            if (match) {
                dispatchChat(cfg, match[1], match[2]);
                break;
            }
        }
    });

    tail.on('error', (e: any) => console.error(`[chatRelay] tail error on ${logFile}: ${e.message}`));
}

function buildArgs(cfg: RoomConfigRow): string[] {
    const logFile = ensureLogFile(cfg.slug);
    
    const username = process.env.ROOM_USERNAME || 'Rinzler';
    const token = process.env.ROOM_TOKEN || '';
    const apiUrl = process.env.ROOM_API_URL || 'http://127.0.0.1:3000';

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

function handleAutoRestart(cfg: RoomConfigRow) {
    const now = Date.now();
    let tracker = restartTrackers.get(cfg.id);

    if (!tracker || now - tracker.firstCrashAt > CRASH_WINDOW_MS) {
        tracker = { attempts: 1, firstCrashAt: now };
    } else {
        tracker.attempts += 1;
    }

    notifyRoomCrash(cfg.name, tracker.attempts, MAX_RESTART_ATTEMPTS);

    if (tracker.attempts > MAX_RESTART_ATTEMPTS) {
        console.error(`[RoomManager] Room "${cfg.name}" a crashé trop souvent (${tracker.attempts} fois). Auto-restart désactivé.`);
        broadcastNotification(`Room "${cfg.name}" a crashé de manière répétée. Auto-restart désactivé.`);
        restartTrackers.delete(cfg.id);
        return;
    }

    const delay = BASE_RESTART_DELAY_MS * Math.pow(2, tracker.attempts - 1);
    console.log(`[RoomManager] Tentative de relance pour "${cfg.name}" (${tracker.attempts}/${MAX_RESTART_ATTEMPTS}) dans ${delay / 1000}s...`);
    broadcastNotification(`Room "${cfg.name}" s'est arrêtée. Relance automatique dans ${delay / 1000}s.`);

    tracker.timer = setTimeout(async () => {
        const configs = await listRoomConfigs();
        const freshCfg = configs.find(c => c.id === cfg.id);
        if (freshCfg && freshCfg.auto_start && !running.has(freshCfg.id)) {
            await startRoom(freshCfg);
        }
    }, delay);

    restartTrackers.set(cfg.id, tracker);
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
    const cwd = process.env.ROOM_CWD || (fs.existsSync(PROJECT_ROOT) ? PROJECT_ROOT : process.cwd());
    
    intentionalStops.delete(cfg.id);

    const proc = spawn(binary, args, {
        cwd,
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

        const wasIntentional = intentionalStops.has(cfg.id);
        intentionalStops.delete(cfg.id);

        if (!wasIntentional && cfg.auto_start) {
            handleAutoRestart(cfg);
        } else if (!wasIntentional && code !== 0) {
            broadcastNotification(`Room "${cfg.name}" exited unexpectedly (code=${code})`);
        }
    });

    proc.on('error', async (err) => {
        running.delete(cfg.id);
        const t = watchers.get(cfg.id);
        if (t) { try { t.unwatch(); } catch {} watchers.delete(cfg.id); }
        await deleteRoomInstance(cfg.id);
        await setRoomConfigStatus(cfg.id, 'stopped');
        console.log(`[RoomManager] ${cfg.slug} spawn error: ${err.message}`);
        broadcastNotification(`Room "${cfg.name}" spawn error: ${err.message}`);

        const wasIntentional = intentionalStops.has(cfg.id);
        intentionalStops.delete(cfg.id);

        if (!wasIntentional && cfg.auto_start) {
            handleAutoRestart(cfg);
        }
    });

    console.log(`[RoomManager] Started ${cfg.slug} (pid=${proc.pid})`);
    return { ok: true, pid: proc.pid };
}

export async function stopRoom(cfg: RoomConfigRow): Promise<{ ok: boolean; error?: string }> {
    intentionalStops.add(cfg.id);

    const tracker = restartTrackers.get(cfg.id);
    if (tracker?.timer) {
        clearTimeout(tracker.timer);
        restartTrackers.delete(cfg.id);
    }

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
    const configs = await listRoomConfigs();
    const cfg = configs.find(c => c.port === port && running.has(c.id));
    if (!cfg) {
        console.log(`[chatRelay] registerAnnouncedRoom: no running config for port ${port}`);
        return;
    }
    announcedRoom.set(cfg.id, roomId);
    const inst = await getRoomInstanceByConfig(cfg.id);
    if (!inst) return;
    try {
        await updateRoomInstance(inst.id, { announced_room_id: roomId, announced_name: name, last_seen: Date.now() });
        console.log(`[chatRelay] announced room: cfg=${cfg.slug} roomId=${roomId}`);
    } catch (err: any) {
        console.error(`[chatRelay] Failed to update room instance: ${err.message}`);
    }
}

export async function bindPing(roomId: string, players: any[]) {
    const instances = await listRoomInstances();
    const inst = instances.find(i => i.announced_room_id === roomId);
    if (inst) {
        try {
            await updateRoomInstance(inst.id, { last_seen: Date.now() });
        } catch (err: any) {
            console.error(`[bindPing] Failed to update last_seen: ${err.message}`);
        }
    }
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