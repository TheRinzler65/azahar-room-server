import { Router } from "express";
import { rooms, setRooms, Room, recordActivity } from "../state";
import { checkAuth, generateId } from "../middleware/auth";
import { registerAnnouncedRoom, bindPing } from "../roomManager";
import { notifyDiscord } from "../utils/discord";
import {
  upsertLobbyRoom,
  markLobbyRoomGone,
  touchLobbyRoom,
} from "../db/lobby";
import { isUserBanned } from "../db/bans";

const router = Router();

router.get("/rooms", async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "";
  if (await isUserBanned(undefined, clientIp)) {
    return res.status(403).json({ error: "Banned from multiplayer network" });
  }

  const live = rooms.filter((r) => Date.now() - r.lastUpdate < 120000);
  const gone = rooms.filter((r) => Date.now() - r.lastUpdate >= 120000);
  if (gone.length) {
    gone.forEach((r) => markLobbyRoomGone(r.id));
    setRooms(live);
  }
  res.setHeader("Content-Type", "application/json");
  res.json(live);
});

router.post("/lobby", async (req, res) => {
  const { valid, username } = await checkAuth(req);
  if (!valid) return res.status(401).send("Unauthorized");

  const clientIp = req.ip || req.socket.remoteAddress || "";
  if (await isUserBanned(username, clientIp)) {
    console.warn(
      `[Lobby] Denied room creation for banned user/ip: ${username} (${clientIp})`,
    );
    return res
      .status(403)
      .json({ error: "You are banned from creating or joining rooms" });
  }

  const id = generateId();
  const roomData = req.body;

  const newRoom: Room = {
    ...roomData,
    id,
    guid: id,
    externalGuid: id,
    address: process.env.PUBLIC_ADDRESS || "rinzler-azahar.duckdns.org",
    owner: username || "server",
    createdAt: Date.now(),
    lastUpdate: Date.now(),
    players: roomData.players || [],
  };

  rooms.push(newRoom);
  setRooms(rooms.filter((r) => r.port !== newRoom.port || r.id === newRoom.id));
  console.log(`Lobby created: ${newRoom.name} [${id}]`);
  registerAnnouncedRoom(newRoom.name, newRoom.port, id);
  upsertLobbyRoom(newRoom).catch((e) =>
    console.error(`[lobby] failed to persist room ${id}: ${e.message}`),
  );
  notifyDiscord(
    `🆕 Room **${newRoom.name}** created by ${newRoom.owner} (${newRoom.players.length}/${newRoom.maxPlayers} players)`,
  );
  res.json(newRoom);
});

router.post("/lobby/:id", async (req, res) => {
  const { valid, username } = await checkAuth(req);
  if (!valid) return res.status(401).send("Unauthorized");

  const clientIp = req.ip || req.socket.remoteAddress || "";
  if (await isUserBanned(username, clientIp)) {
    return res.status(403).json({ error: "Banned" });
  }

  const { id } = req.params;
  const room = rooms.find((r) => r.id === id);
  if (!room) return res.status(404).send("Not Found");

  room.lastUpdate = Date.now();
  if (req.body && req.body.players) {
    room.players = req.body.players;
  }
  recordActivity(room);
  bindPing(id, room.players);
  touchLobbyRoom(id);

  console.log(
    `Lobby ping: ${room.name} [${id}] (${room.players.length} players)`,
  );
  res.setHeader("Content-Type", "application/json");
  res.json(room);
});

router.delete("/lobby/:id", async (req, res) => {
  const { valid } = await checkAuth(req);
  if (!valid) return res.status(401).send("Unauthorized");

  const { id } = req.params;
  setRooms(rooms.filter((r) => r.id !== id));
  markLobbyRoomGone(id);
  console.log(`Lobby deleted: [${id}]`);
  res.setHeader("Content-Type", "application/json");
  res.json({ status: "deleted" });
});

router.get("/lobby", async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "";
  if (await isUserBanned(undefined, clientIp)) {
    return res.status(403).json({ error: "Banned" });
  }

  setRooms(rooms.filter((r) => Date.now() - r.lastUpdate < 120000));
  res.setHeader("Content-Type", "application/json");
  res.json({ rooms });
});

export default router;
