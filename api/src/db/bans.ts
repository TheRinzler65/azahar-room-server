import { RowDataPacket } from "mysql2/promise";
import fs from "fs";
import path from "path";
import pool from "./index";

const PROJECT_ROOT =
  process.env.PROJECT_ROOT || path.resolve(__dirname, "../../..");

function getBanFilePath(): string {
  if (process.env.BANLIST_PATH) return process.env.BANLIST_PATH;
  const localBan = path.join(PROJECT_ROOT, "banlist.txt");
  if (fs.existsSync(localBan)) return localBan;
  return path.join(process.cwd(), "banlist.txt");
}

export interface BanRow {
  type: "username" | "ip" | string;
  value: string;
  reason?: string | null;
  banned_by?: string | null;
  created_at: number;
  expires_at?: number | null;
}

export async function syncBanlistFile(): Promise<void> {
  try {
    const bans = await listBans();
    const filePath = getBanFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const lines = bans.map((b) => b.value.trim()).filter(Boolean);
    fs.writeFileSync(
      filePath,
      lines.join("\n") + (lines.length > 0 ? "\n" : ""),
      "utf8",
    );
    console.log(`[Bans] Synchronized ${lines.length} entries to ${filePath}`);
  } catch (err: any) {
    console.error(`[Bans] Failed to write banlist file: ${err.message}`);
  }
}

export async function listBans(): Promise<BanRow[]> {
  const now = Date.now();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT type, value, reason, banned_by, created_at, expires_at FROM bans WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC",
    [now],
  );
  return rows as unknown as BanRow[];
}

export async function isBanned(type: string, value: string): Promise<boolean> {
  if (!value) return false;
  const now = Date.now();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM bans WHERE type = ? AND LOWER(value) = LOWER(?) AND (expires_at IS NULL OR expires_at > ?) LIMIT 1",
    [type, value.trim(), now],
  );
  return rows.length > 0;
}

export async function isUserBanned(
  username?: string,
  ip?: string,
): Promise<boolean> {
  const now = Date.now();
  const checks: Promise<boolean>[] = [];

  if (username) {
    checks.push(isBanned("username", username));
  }
  if (ip) {
    const cleanIp = ip.replace(/^.*:/, "");
    checks.push(isBanned("ip", ip));
    if (cleanIp !== ip) checks.push(isBanned("ip", cleanIp));
  }

  const results = await Promise.all(checks);
  return results.some((b) => b === true);
}

export async function addBan(
  type: string,
  value: string,
  reason?: string,
  banned_by?: string,
  durationMinutes?: number,
): Promise<void> {
  const now = Date.now();
  const expiresAt =
    durationMinutes && durationMinutes > 0
      ? now + durationMinutes * 60 * 1000
      : null;

  await pool.query(
    `INSERT INTO bans (type, value, reason, banned_by, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            reason = VALUES(reason),
            banned_by = VALUES(banned_by),
            created_at = VALUES(created_at),
            expires_at = VALUES(expires_at)`,
    [type, value.trim(), reason || null, banned_by || null, now, expiresAt],
  );

  await syncBanlistFile();
}

export async function removeBan(type: string, value: string): Promise<void> {
  await pool.query(
    "DELETE FROM bans WHERE type = ? AND LOWER(value) = LOWER(?)",
    [type, value.trim()],
  );
  await syncBanlistFile();
}
