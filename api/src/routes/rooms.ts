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
  const isLocalAnnounce =
    clientIp === "127.0.0.1" ||
    clientIp === "::1" ||
    clientIp === "::ffff:127.0.0.1";

  const newRoom: Room = {
    ...roomData,
    id,
    guid: id,
    verifyUID: roomData.externalGuid || generateId(),
    externalGuid: id,
    name: roomData.name || "Room",
    port: roomData.port || 0,
    maxPlayers: roomData.maxPlayers ?? roomData.max_player ?? 0,
    netVersion: roomData.netVersion ?? roomData.net_version ?? 0,
    hasPassword: roomData.hasPassword ?? roomData.has_password ?? false,
    preferredGameName: roomData.preferredGameName || roomData.preferred_game || "",
    preferredGameId: roomData.preferredGameId ?? roomData.preferred_game_id ?? 0,
    description: roomData.description || "",
    address: isLocalAnnounce
      ? process.env.PUBLIC_ADDRESS || "rinzler-azahar.duckdns.org"
      : roomData.address || roomData.ip || clientIp,
    owner: username || roomData.owner || "server",
    createdAt: Date.now(),
    lastUpdate: Date.now(),
    players: roomData.players || roomData.members || [],
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
  res.json({
    id: newRoom.id,
    externalGuid: newRoom.verifyUID,
    name: newRoom.name,
    description: newRoom.description || "",
    owner: newRoom.owner,
    address: newRoom.address,
    ip: newRoom.address,
    port: newRoom.port,
    maxPlayers: newRoom.maxPlayers,
    max_player: newRoom.maxPlayers,
    netVersion: newRoom.netVersion,
    net_version: newRoom.netVersion,
    hasPassword: newRoom.hasPassword,
    has_password: newRoom.hasPassword,
    preferredGameName: newRoom.preferredGameName,
    preferredGameId: newRoom.preferredGameId,
    members: newRoom.players,
    players: newRoom.players,
  });
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

  const now = Date.now();
  const live = rooms.filter((r) => now - r.lastUpdate < 120000);
  setRooms(live);
  res.setHeader("Content-Type", "application/json");
  res.json({
    rooms: live.map((r) => ({
      id: r.id,
      externalGuid: r.verifyUID || r.id,
      verify_UID: r.verifyUID || r.id,
      name: r.name,
      description: r.description || "",
      owner: r.owner,
      address: r.address,
      ip: r.address,
      port: r.port,
      maxPlayers: r.maxPlayers,
      max_player: r.maxPlayers,
      netVersion: r.netVersion,
      net_version: r.netVersion,
      hasPassword: r.hasPassword,
      has_password: r.hasPassword,
      preferredGameName: r.preferredGameName,
      preferredGameId: r.preferredGameId,
      members: r.players || [],
      players: r.players || [],
    })),
  });
});

export default router;
