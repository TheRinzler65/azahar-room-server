import { RowDataPacket } from 'mysql2/promise';
import pool from './index';

export interface BanRow {
    type: 'username' | 'ip' | string;
    value: string;
    reason?: string | null;
    banned_by?: string | null;
    created_at: number;
    expires_at?: number | null;
}

export async function listBans(): Promise<BanRow[]> {
    const now = Date.now();
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT type, value, reason, banned_by, created_at, expires_at FROM bans WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC',
        [now]
    );
    return rows as unknown as BanRow[];
}

export async function isBanned(type: string, value: string): Promise<boolean> {
    const now = Date.now();
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM bans WHERE type = ? AND LOWER(value) = LOWER(?) AND (expires_at IS NULL OR expires_at > ?) LIMIT 1',
        [type, value, now]
    );
    return rows.length > 0;
}

export async function addBan(
    type: string,
    value: string,
    reason?: string,
    banned_by?: string,
    durationMinutes?: number
): Promise<void> {
    const now = Date.now();
    const expiresAt = durationMinutes && durationMinutes > 0 ? now + durationMinutes * 60 * 1000 : null;

    await pool.query(
        `INSERT INTO bans (type, value, reason, banned_by, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            reason = VALUES(reason),
            banned_by = VALUES(banned_by),
            created_at = VALUES(created_at),
            expires_at = VALUES(expires_at)`,
        [type, value, reason || null, banned_by || null, now, expiresAt]
    );
}

export async function removeBan(type: string, value: string): Promise<void> {
    await pool.query('DELETE FROM bans WHERE type = ? AND LOWER(value) = LOWER(?)', [type, value]);
}