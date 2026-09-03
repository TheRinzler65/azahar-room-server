import { RowDataPacket } from 'mysql2/promise';
import pool from './index';

export async function listBans(): Promise<{ type: string; value: string; reason?: string; banned_by?: string; created_at: number }[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT type, value, reason, banned_by, created_at FROM bans ORDER BY created_at DESC');
    return rows as unknown as any[];
}

export async function addBan(type: string, value: string, reason?: string, banned_by?: string) {
    await pool.query(
        'INSERT IGNORE INTO bans (type, value, reason, banned_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [type, value, reason || null, banned_by || null, Date.now()]
    );
}

export async function removeBan(type: string, value: string) {
    await pool.query('DELETE FROM bans WHERE type = ? AND value = ?', [type, value]);
}
