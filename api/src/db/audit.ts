import { RowDataPacket } from "mysql2/promise";
import pool from "./index";

export interface AuditLogRow {
  id: number;
  admin_username: string;
  action: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: number;
}

export async function logAdminAction(
  adminUsername: string,
  action: string,
  target?: string | null,
  details?: string | null,
  ipAddress?: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (admin_username, action, target, details, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [
      adminUsername,
      action,
      target || null,
      details || null,
      ipAddress || null,
      Date.now(),
    ],
  );
}

export async function listAuditLogs(
  limit: number = 100,
): Promise<AuditLogRow[]> {
  const safeLimit = Math.max(1, Math.min(500, limit));
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
    [safeLimit],
  );
  return rows as unknown as AuditLogRow[];
}
