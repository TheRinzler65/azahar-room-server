import fs from 'fs';
import { listBans, addBan } from '../db/bans';
import { loadEnv } from '../env';

loadEnv();

const ban_file = process.env.BAN_FILE ||'/opt/azahar/banlist.txt';

export async function syncBanFile() {
    try {
        const bans = await listBans();
        const usernames = bans.filter(b => b.type === 'username').map(b => b.value);
        const ips = bans.filter(b => b.type === 'ip').map(b => b.value);
        const content = `CitraRoom-BanList-1\n${usernames.join('\n')}\n\n${ips.join('\n')}\n`;
        fs.writeFileSync(ban_file, content);
        console.log(`[BanSync] wrote ${usernames.length} usernames, ${ips.length} ips`);
    } catch (e: any) { console.log(`[BanSync] fail: ${e.message}`); }
}

export async function addBanDB(type: 'username' | 'ip', value: string, reason?: string, bannedBy?: string) {
    await addBan(type, value, reason, bannedBy);
    await syncBanFile();
}
