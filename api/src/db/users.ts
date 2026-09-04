import { RowDataPacket } from "mysql2/promise";
import pool from "./index";

export interface UserRow {
  username: string;
  salt: string;
  hash: string;
  citra_token?: string | null;
  created_at: number;
}

export async function findUserByUsername(
  username: string,
): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
    [username],
  );
  return rows.length ? (rows[0] as unknown as UserRow) : null;
}

export async function createUser(
  username: string,
  salt: string,
  hash: string,
  citraToken?: string,
) {
  await pool.query(
    "INSERT INTO users (username, salt, hash, citra_token, created_at) VALUES (?, ?, ?, ?, ?)",
    [username, salt, hash, citraToken || null, Date.now()],
  );
}

export async function countReports(target: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM reports WHERE LOWER(target) = LOWER(?)",
    [target],
  );
  return rows[0].c as number;
}

export async function addReport(
  target: string,
  reporter: string,
): Promise<boolean> {
  await pool.query(
    "INSERT IGNORE INTO reports (target, reporter, created_at) VALUES (?, ?, ?)",
    [target, reporter, Date.now()],
  );
  return true;
}

export async function deleteReports(target: string) {
  await pool.query("DELETE FROM reports WHERE LOWER(target) = LOWER(?)", [
    target,
  ]);
}

export async function getPlayerMinutes(username: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT minutes FROM player_presence WHERE LOWER(nickname) = LOWER(?)",
    [username],
  );
  return rows.length ? Number(rows[0].minutes) : 0;
}

export async function listAllUsers(): Promise<
  { username: string; created_at: number; minutes: number }[]
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT u.username, u.created_at, COALESCE(p.minutes, 0) AS minutes FROM users u LEFT JOIN player_presence p ON LOWER(u.username) = LOWER(p.nickname) ORDER BY u.created_at DESC",
  );
  return rows as unknown as any[];
}
