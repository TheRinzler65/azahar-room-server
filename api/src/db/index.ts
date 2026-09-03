import mysql, { Pool } from 'mysql2/promise';
import { loadEnv } from '../env';

loadEnv();

let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'azahar_master',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool;
}

export async function initDB() {
    const db = getPool();
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            salt VARCHAR(64) NOT NULL,
            hash VARCHAR(64) NOT NULL,
            citra_token VARCHAR(255),
            created_at BIGINT NOT NULL
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            target VARCHAR(64) NOT NULL,
            reporter VARCHAR(64) NOT NULL,
            created_at BIGINT NOT NULL,
            UNIQUE KEY unique_report (target, reporter)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS bans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(16) NOT NULL,
            value VARCHAR(255) NOT NULL,
            reason VARCHAR(255),
            banned_by VARCHAR(64),
            created_at BIGINT NOT NULL,
            UNIQUE KEY unique_ban (type, value)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS room_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(64) NOT NULL,
            slug VARCHAR(64) NOT NULL UNIQUE,
            port INT NOT NULL,
            max_members INT NOT NULL DEFAULT 16,
            preferred_game_name VARCHAR(64) DEFAULT 'Any Game',
            preferred_game_id BIGINT NOT NULL DEFAULT 1125899906842624,
            description VARCHAR(255) DEFAULT '',
            status VARCHAR(16) NOT NULL DEFAULT 'stopped',
            auto_start TINYINT(1) NOT NULL DEFAULT 0,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS room_instances (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_id INT NOT NULL,
            pid INT,
            announced_room_id VARCHAR(32),
            announced_name VARCHAR(64),
            last_seen BIGINT,
            created_at BIGINT NOT NULL
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id VARCHAR(36),
            room_slug VARCHAR(64),
            username VARCHAR(64) NOT NULL,
            message TEXT NOT NULL,
            timestamp BIGINT NOT NULL
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS lobby_rooms (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(64) NOT NULL,
            owner VARCHAR(64),
            port INT NOT NULL,
            max_players INT NOT NULL DEFAULT 16,
            preferred_game_name VARCHAR(64),
            preferred_game_id BIGINT,
            address VARCHAR(255),
            has_password TINYINT(1) NOT NULL DEFAULT 0,
            first_seen BIGINT NOT NULL,
            last_seen BIGINT NOT NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'live',
            UNIQUE KEY unique_lobby_port (port, name)
        )
    `);
    // Migrations pour les tables existantes (anciennes colonnes VARCHAR(32))
    try { await db.query(`ALTER TABLE lobby_rooms MODIFY id VARCHAR(36)`); } catch {}
    try { await db.query(`ALTER TABLE chat_messages MODIFY room_id VARCHAR(36)`); } catch {}
    await db.query(`
        CREATE TABLE IF NOT EXISTS activity_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp BIGINT NOT NULL,
            players INT NOT NULL
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS player_presence (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nickname VARCHAR(64) NOT NULL,
            minutes DECIMAL(10,2) NOT NULL DEFAULT 0,
            UNIQUE KEY unique_nick (nickname)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS game_presence (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game VARCHAR(64) NOT NULL,
            minutes DECIMAL(10,2) NOT NULL DEFAULT 0,
            UNIQUE KEY unique_game (game)
        )
    `);
    console.log('[DB] Tables prêtes');
}

export interface UserRow {
    username: string;
    salt: string;
    hash: string;
    citra_token?: string | null;
    created_at: number;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
    const db = getPool();
    const [rows] = await db.query<import('mysql2/promise').RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]
    );
    return rows.length ? rows[0] as unknown as UserRow : null;
}

export async function createUser(username: string, salt: string, hash: string, citraToken?: string | null) {
    const db = getPool();
    await db.query(
        'INSERT INTO users (username, salt, hash, citra_token, created_at) VALUES (?, ?, ?, ?, ?)',
        [username, salt, hash, citraToken || null, Date.now()]
    );
}

export async function countReports(target: string): Promise<number> {
    const db = getPool();
    const [rows] = await db.query<import('mysql2/promise').RowDataPacket[]>(
        'SELECT COUNT(*) AS c FROM reports WHERE LOWER(target) = LOWER(?)', [target]
    );
    return rows[0].c as number;
}

export async function addReport(target: string, reporter: string): Promise<boolean> {
    const db = getPool();
    await db.query(
        'INSERT IGNORE INTO reports (target, reporter, created_at) VALUES (?, ?, ?)',
        [target, reporter, Date.now()]
    );
    return true;
}

export async function deleteReports(target: string) {
    const db = getPool();
    await db.query('DELETE FROM reports WHERE LOWER(target) = LOWER(?)', [target]);
}

const poolProxy = new Proxy({} as Pool, {
    get(target, prop) {
        const actualPool = getPool();
        const value = Reflect.get(actualPool, prop);
        if (typeof value === 'function') {
            return value.bind(actualPool);
        }
        return value;
    }
});

export { getPool };
export default poolProxy;