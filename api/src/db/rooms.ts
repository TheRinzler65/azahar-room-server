import { RowDataPacket } from "mysql2/promise";
import pool from "./index";

export interface RoomConfigRow {
  id: number;
  name: string;
  slug: string;
  port: number;
  max_members: number;
  preferred_game_name: string;
  preferred_game_id: number;
  description: string;
  status: string;
  auto_start: number;
  created_at: number;
  updated_at: number;
}

export async function listRoomConfigs(): Promise<RoomConfigRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM room_configs ORDER BY id ASC",
  );
  return rows as unknown as RoomConfigRow[];
}

export async function getRoomConfig(id: number): Promise<RoomConfigRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM room_configs WHERE id = ?",
    [id],
  );
  return rows.length ? (rows[0] as unknown as RoomConfigRow) : null;
}

export async function getRoomConfigBySlug(
  slug: string,
): Promise<RoomConfigRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM room_configs WHERE slug = ?",
    [slug],
  );
  return rows.length ? (rows[0] as unknown as RoomConfigRow) : null;
}

export async function createRoomConfig(cfg: {
  name: string;
  slug: string;
  port: number;
  max_members: number;
  preferred_game_name: string;
  preferred_game_id: number;
  description: string;
  auto_start: number;
}): Promise<number> {
  const now = Date.now();
  const [res] = await pool.query(
    `INSERT INTO room_configs (name, slug, port, max_members, preferred_game_name, preferred_game_id, description, auto_start, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cfg.name,
      cfg.slug,
      cfg.port,
      cfg.max_members,
      cfg.preferred_game_name,
      cfg.preferred_game_id,
      cfg.description,
      cfg.auto_start,
      now,
      now,
    ],
  );
  return (res as any).insertId as number;
}

export async function updateRoomConfig(
  id: number,
  patch: Partial<RoomConfigRow>,
) {
  const allowed = [
    "name",
    "slug",
    "port",
    "max_members",
    "preferred_game_name",
    "preferred_game_id",
    "description",
    "auto_start",
  ];
  const set: string[] = [];
  const vals: any[] = [];
  if (patch.slug !== undefined && patch.slug !== patch.slug) {
    /* skip */
  }
  for (const k of allowed) {
    if ((patch as any)[k] !== undefined) {
      set.push(`${k} = ?`);
      vals.push((patch as any)[k]);
    }
  }
  if (set.length) {
    set.push("updated_at = ?");
    vals.push(Date.now());
    await pool.query(`UPDATE room_configs SET ${set.join(", ")} WHERE id = ?`, [
      ...vals,
      id,
    ]);
  }
}

export async function setRoomConfigStatus(id: number, status: string) {
  await pool.query(
    "UPDATE room_configs SET status = ?, updated_at = ? WHERE id = ?",
    [status, Date.now(), id],
  );
}

export async function deleteRoomConfig(id: number) {
  await pool.query("DELETE FROM room_configs WHERE id = ?", [id]);
}

export interface RoomInstanceRow {
  id: number;
  config_id: number;
  pid: number | null;
  announced_room_id: string | null;
  announced_name: string | null;
  last_seen: number | null;
  created_at: number;
}

export async function listRoomInstances(): Promise<RoomInstanceRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM room_instances ORDER BY config_id ASC",
  );
  return rows as unknown as RoomInstanceRow[];
}

export async function getRoomInstanceByConfig(
  configId: number,
): Promise<RoomInstanceRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM room_instances WHERE config_id = ? LIMIT 1",
    [configId],
  );
  return rows.length ? (rows[0] as unknown as RoomInstanceRow) : null;
}

export async function createRoomInstance(
  configId: number,
  pid: number | null,
): Promise<number> {
  const [res] = await pool.query(
    "INSERT INTO room_instances (config_id, pid, created_at) VALUES (?, ?, ?)",
    [configId, pid, Date.now()],
  );
  return (res as any).insertId as number;
}

export async function updateRoomInstance(
  id: number,
  patch: Partial<RoomInstanceRow>,
) {
  const set: string[] = [];
  const vals: any[] = [];
  for (const k of ["pid", "announced_room_id", "announced_name", "last_seen"]) {
    if ((patch as any)[k] !== undefined) {
      set.push(`${k} = ?`);
      vals.push((patch as any)[k]);
    }
  }
  if (set.length)
    await pool.query(
      `UPDATE room_instances SET ${set.join(", ")} WHERE id = ?`,
      [...vals, id],
    );
}

export async function deleteRoomInstance(configId: number) {
  await pool.query("DELETE FROM room_instances WHERE config_id = ?", [
    configId,
  ]);
}
