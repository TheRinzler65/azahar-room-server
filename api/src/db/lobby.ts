import { RowDataPacket } from "mysql2/promise";
import pool from "./index";

export interface LobbyRoomRow {
  id: string;
  name: string;
  owner: string | null;
  port: number;
  max_players: number;
  preferred_game_name: string | null;
  preferred_game_id: number | null;
  address: string | null;
  has_password: number;
  first_seen: number;
  last_seen: number;
  status: string;
}

export async function upsertLobbyRoom(room: {
  id: string;
  name: string;
  owner?: string;
  port: number;
  maxPlayers: number;
  preferredGameName?: string;
  preferredGameId?: number;
  address?: string;
  hasPassword?: boolean;
}) {
  const now = Date.now();
  await pool.query(
    `INSERT INTO lobby_rooms (id, name, owner, port, max_players, preferred_game_name, preferred_game_id, address, has_password, first_seen, last_seen, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live')
         ON DUPLICATE KEY UPDATE
            name = VALUES(name), owner = VALUES(owner), max_players = VALUES(max_players),
            preferred_game_name = VALUES(preferred_game_name), preferred_game_id = VALUES(preferred_game_id),
            address = VALUES(address), has_password = VALUES(has_password),
            last_seen = VALUES(last_seen), status = 'live'`,
    [
      room.id,
      room.name,
      room.owner || null,
      room.port,
      room.maxPlayers,
      room.preferredGameName || null,
      room.preferredGameId ?? null,
      room.address || null,
      room.hasPassword ? 1 : 0,
      now,
      now,
    ],
  );
}

export async function markLobbyRoomGone(id: string) {
  await pool.query(
    `UPDATE lobby_rooms SET status = 'gone' WHERE id = ? AND status = 'live'`,
    [id],
  );
}

export async function touchLobbyRoom(id: string) {
  await pool.query(`UPDATE lobby_rooms SET last_seen = ? WHERE id = ?`, [
    Date.now(),
    id,
  ]);
}

export async function expireLobbyRooms(maxAgeMs: number) {
  const cutoff = Date.now() - maxAgeMs;
  const [r] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lobby_rooms WHERE status = 'live' AND last_seen < ?`,
    [cutoff],
  );
  const ids = (r as unknown as { id: string }[]).map((x) => x.id);
  if (ids.length) {
    await pool.query(
      `UPDATE lobby_rooms SET status = 'gone' WHERE id IN (?) AND status = 'live'`,
      [ids],
    );
  }
  return ids;
}

export async function listLobbyRooms(
  status?: "live" | "gone",
): Promise<LobbyRoomRow[]> {
  const q = status
    ? "SELECT * FROM lobby_rooms WHERE status = ? ORDER BY last_seen DESC"
    : "SELECT * FROM lobby_rooms ORDER BY last_seen DESC";
  const params = status ? [status] : [];
  const [rows] = await pool.query<RowDataPacket[]>(q, params);
  return rows as unknown as LobbyRoomRow[];
}
