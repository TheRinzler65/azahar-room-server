import { RowDataPacket } from "mysql2/promise";
import pool from "./index";

export async function addChatMessage(
  roomId: string | null,
  roomSlug: string | null,
  username: string,
  message: string,
  timestamp?: number,
) {
  await pool.query(
    "INSERT INTO chat_messages (room_id, room_slug, username, message, timestamp) VALUES (?, ?, ?, ?, ?)",
    [roomId, roomSlug, username, message, timestamp || Date.now()],
  );
}

export async function listChatMessages(limit: number = 500): Promise<
  {
    id: number;
    room_id: string | null;
    room_slug: string | null;
    username: string;
    message: string;
    timestamp: number;
  }[]
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT ?",
    [Math.min(limit, 5000)],
  );
  return rows as unknown as any[];
}

export async function listChatMessagesByRoom(
  roomSlug: string,
  limit: number = 200,
): Promise<
  {
    id: number;
    room_id: string | null;
    room_slug: string | null;
    username: string;
    message: string;
    timestamp: number;
  }[]
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM chat_messages WHERE room_slug = ? ORDER BY timestamp DESC LIMIT ?",
    [roomSlug, Math.min(limit, 2000)],
  );
  return rows as unknown as any[];
}

export async function listChatMessagesByRoomId(
  roomId: string,
  limit: number = 200,
): Promise<
  {
    id: number;
    room_id: string | null;
    room_slug: string | null;
    username: string;
    message: string;
    timestamp: number;
  }[]
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM chat_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT ?",
    [roomId, Math.min(limit, 2000)],
  );
  return rows as unknown as any[];
}
