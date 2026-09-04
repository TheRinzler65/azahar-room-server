import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { rooms, setRooms } from "../state";
import { isAdmin, signAdminJWT } from "../middleware/auth";
import { listBans, addBan, removeBan } from "../db/bans";
import {
  listRoomConfigs,
  getRoomConfig,
  getRoomConfigBySlug,
  createRoomConfig,
  updateRoomConfig,
  deleteRoomConfig,
  listRoomInstances,
} from "../db/rooms";
import {
  listChatMessages,
  listChatMessagesByRoom,
} from "../db/chat";
import { syncBanFile } from "../utils/banfile";
import { startRoom, stopRoom, isRunning } from "../roomManager";
import { listAllUsers } from "../db/users";
import { broadcastNotification } from "../ws";
import { listLobbyRooms } from "../db/lobby";
import { logAdminAction, listAuditLogs } from "../db/audit";
import { notifyBan, notifyRoomStatus } from "../utils/discord";

const router = Router();

if (process.env.NODE_ENV === "production" && !process.env.ADMIN_TOKEN) {
  console.error(
    "CRITICAL: ADMIN_TOKEN is not defined in the environment variables!",
  );
  console.error(
    "The server refuses to start in production with the default password 'changeme'.",
  );
  process.exit(1);
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "changeme";
const ADMIN_JWT_EXPIRY: string = process.env.ADMIN_JWT_EXPIRY || "1h";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many login attempts from this IP, please try again in 15 minutes.",
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "room"
  );
}

function getClientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

router.post("/admin/login", loginLimiter, async (req, res) => {
  const { password } = req.body;
  const ip = getClientIp(req);

  if (password === ADMIN_TOKEN) {
    const jwtToken = signAdminJWT();
    console.log("[Admin] Login successful");
    await logAdminAction(
      "admin",
      "LOGIN",
      "auth",
      "Successful admin login",
      ip,
    );
    res.json({ token: jwtToken, expiresIn: ADMIN_JWT_EXPIRY });
  } else {
    await logAdminAction(
      "unknown",
      "LOGIN_FAILED",
      "auth",
      "Failed login attempt",
      ip,
    );
    res.status(403).send("Forbidden");
  }
});

router.get("/admin/session", (req, res) => {
  if (isAdmin(req)) {
    res.json({ valid: true });
  } else {
    res.status(401).send("Unauthorized");
  }
});

router.get("/admin/audit-logs", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  try {
    const limit = parseInt(String(req.query.limit || "100"), 10);
    const logs = await listAuditLogs(limit);
    res.json(logs);
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

router.get("/admin/bans", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  try {
    const bans = await listBans();
    res.json({
      usernames: bans.filter((b) => b.type === "username").map((b) => b.value),
      ips: bans.filter((b) => b.type === "ip").map((b) => b.value),
      details: bans,
    });
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

router.post("/admin/ban", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const { type, value, reason, durationMinutes, duration } = req.body;
  const ip = getClientIp(req);

  if (!type || !value) return res.status(400).send("type and value required");

  const minutes =
    durationMinutes !== undefined
      ? Number(durationMinutes)
      : duration !== undefined
        ? Number(duration)
        : undefined;

  try {
    await addBan(type, value, reason, "admin", minutes);
    await syncBanFile();
    const durationText =
      minutes && minutes > 0 ? ` for ${minutes} minute(s)` : " (permanent)";
    console.log(`[Admin] Banned ${type}: ${value}${durationText}`);

    await logAdminAction(
      "admin",
      "BAN_ADD",
      `${type}:${value}`,
      JSON.stringify({
        reason: reason || null,
        durationMinutes: minutes ?? null,
      }),
      ip,
    );

    await notifyBan(
      type,
      value,
      reason,
      minutes && minutes > 0 ? `${minutes} minute(s)` : "Permanent",
      "admin",
    );

    broadcastNotification(
      `Banned ${type}: ${value}${durationText}${reason ? ` (${reason})` : ""}`,
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

router.delete("/admin/ban", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const { type, value } = req.body;
  const ip = getClientIp(req);

  if (!type || !value) return res.status(400).send("type and value required");

  try {
    await removeBan(type, value);
    await syncBanFile();
    console.log(`[Admin] Unbanned ${type}: ${value}`);

    await logAdminAction("admin", "BAN_REMOVE", `${type}:${value}`, null, ip);

    broadcastNotification(`Unbanned ${type}: ${value}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

router.get("/admin/chat", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const limit = parseInt(String(req.query.limit || "500"), 10);
  const room = req.query.room as string | undefined;
  let messages;
  if (room) {
    messages = await listChatMessagesByRoom(room, limit);
  } else {
    messages = await listChatMessages(limit);
  }
  messages.reverse();
  res.json(messages);
});

router.get("/admin/players", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const players = await listAllUsers();
  res.json(players);
});

router.get("/admin/lobby-rooms", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const status = req.query.status as "live" | "gone" | undefined;
  const rows = await listLobbyRooms(status);
  res.json(rows);
});

router.get("/admin/rooms", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const configs = await listRoomConfigs();
  const instances = await listRoomInstances();
  const live = rooms.filter((r) => Date.now() - r.lastUpdate < 120000);
  const result = configs.map((c) => {
    const inst = instances.find((i) => i.config_id === c.id);
    const liveRoom = live.find((r) => r.port === c.port);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      port: c.port,
      max_members: c.max_members,
      preferred_game_name: c.preferred_game_name,
      preferred_game_id: c.preferred_game_id,
      description: c.description,
      status: isRunning(c.id) ? "running" : c.status,
      auto_start: c.auto_start,
      pid: inst?.pid ?? null,
      announced_room_id: liveRoom?.id ?? inst?.announced_room_id ?? null,
      players: liveRoom?.players?.length ?? 0,
    };
  });
  res.json(result);
});

router.post("/admin/rooms", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const {
    name,
    port,
    max_members,
    preferred_game_name,
    preferred_game_id,
    description,
    auto_start,
  } = req.body;
  const ip = getClientIp(req);

  if (!name || !port) return res.status(400).send("name and port required");

  const existing = await listRoomConfigs();
  if (existing.some((c) => c.port === Number(port))) {
    return res.status(409).send(`Port ${port} already used`);
  }

  const cfg = await getRoomConfigBySlug(slugify(name));
  if (cfg) return res.status(409).send("Room with this name already exists");

  const id = await createRoomConfig({
    name,
    slug: slugify(name),
    port: Number(port),
    max_members: Number(max_members || 16),
    preferred_game_name: preferred_game_name || "Any Game",
    preferred_game_id: preferred_game_id || 1125899906842624,
    description: description || "",
    auto_start: auto_start ? 1 : 0,
  });

  console.log(`[Admin] Room config created: ${name} (id=${id})`);
  await logAdminAction(
    "admin",
    "ROOM_CREATE",
    name,
    JSON.stringify({ id, port }),
    ip,
  );
  res.json({ success: true, id });
});

router.patch("/admin/rooms/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const ip = getClientIp(req);
  const cfg = await getRoomConfig(Number(id));
  if (!cfg) return res.status(404).send("Not found");

  const {
    name,
    max_members,
    preferred_game_name,
    preferred_game_id,
    description,
    auto_start,
  } = req.body;
  await updateRoomConfig(Number(id), {
    name: name ?? cfg.name,
    max_members: max_members ?? cfg.max_members,
    preferred_game_name: preferred_game_name ?? cfg.preferred_game_name,
    preferred_game_id: preferred_game_id ?? cfg.preferred_game_id,
    description: description ?? cfg.description,
    auto_start:
      auto_start !== undefined ? (auto_start ? 1 : 0) : cfg.auto_start,
  });

  await logAdminAction(
    "admin",
    "ROOM_UPDATE",
    cfg.name,
    JSON.stringify(req.body),
    ip,
  );
  res.json({ success: true });
});

router.delete("/admin/rooms/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const cfg = await getRoomConfig(Number(req.params.id));
  const ip = getClientIp(req);
  if (!cfg) return res.status(404).send("Not found");

  if (cfg.status === "running" || isRunning(cfg.id)) {
    await stopRoom(cfg);
  }
  await deleteRoomConfig(cfg.id);
  console.log(`[Admin] Room config deleted: ${cfg.name}`);

  await logAdminAction(
    "admin",
    "ROOM_DELETE",
    cfg.name,
    JSON.stringify({ port: cfg.port }),
    ip,
  );
  res.json({ success: true });
});

router.post("/admin/rooms/:id/start", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const cfg = await getRoomConfig(Number(req.params.id));
  const ip = getClientIp(req);
  if (!cfg) return res.status(404).send("Not found");

  const result = await startRoom(cfg);
  await logAdminAction(
    "admin",
    "ROOM_START",
    cfg.name,
    JSON.stringify(result),
    ip,
  );
  if (result.ok) {
    await notifyRoomStatus(cfg.name, "started", cfg.port);
  }
  res.json(result);
});

router.post("/admin/rooms/:id/stop", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const cfg = await getRoomConfig(Number(req.params.id));
  const ip = getClientIp(req);
  if (!cfg) return res.status(404).send("Not found");

  const result = await stopRoom(cfg);
  setRooms(rooms.filter((r) => r.port !== cfg.port));
  await logAdminAction("admin", "ROOM_STOP", cfg.name, null, ip);
  if (result.ok) {
    await notifyRoomStatus(cfg.name, "stopped", cfg.port);
  }
  res.json(result);
});

router.post("/admin/restart", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send("Unauthorized");
  const ip = getClientIp(req);
  const configs = await listRoomConfigs();
  for (const cfg of configs) {
    if (isRunning(cfg.id)) await stopRoom(cfg);
  }
  for (const cfg of configs) {
    if (cfg.auto_start) await startRoom(cfg);
  }
  await logAdminAction("admin", "GLOBAL_RESTART", "all_rooms", null, ip);
  res.json({ success: true });
});

export default router;
