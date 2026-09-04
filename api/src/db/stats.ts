import { RowDataPacket } from "mysql2/promise";
import pool from "./index";

export async function recordActivityDB(timestamp: number, players: number) {
  await pool.query(
    "INSERT INTO activity_history (timestamp, players) VALUES (?, ?)",
    [timestamp, players],
  );
  await pool.query(
    "DELETE FROM activity_history WHERE id NOT IN (SELECT id FROM (SELECT id FROM activity_history ORDER BY id DESC LIMIT 5000) t)",
  );
}

export async function listActivityDB(): Promise<
  { timestamp: number; players: number }[]
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT timestamp, players FROM activity_history ORDER BY timestamp ASC",
  );
  return rows as unknown as any[];
}

export async function addPlayerPresence(nickname: string, minutes: number) {
  await pool.query(
    "INSERT INTO player_presence (nickname, minutes) VALUES (?, ?) ON DUPLICATE KEY UPDATE minutes = minutes + ?",
    [nickname, minutes, minutes],
  );
}

export async function listPlayerPresence(
  limit: number = 10,
): Promise<{ nickname: string; minutes: number }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT nickname, minutes FROM player_presence ORDER BY minutes DESC LIMIT ?",
    [limit],
  );
  return rows as unknown as any[];
}

export async function addGamePresence(game: string, minutes: number) {
  await pool.query(
    "INSERT INTO game_presence (game, minutes) VALUES (?, ?) ON DUPLICATE KEY UPDATE minutes = minutes + ?",
    [game, minutes, minutes],
  );
}

export async function listGamePresence(
  limit: number = 10,
): Promise<{ game: string; minutes: number }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT game, minutes FROM game_presence ORDER BY minutes DESC LIMIT ?",
    [limit],
  );
  return rows as unknown as any[];
}
