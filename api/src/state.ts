import {
  recordActivityDB,
  addPlayerPresence,
  addGamePresence,
} from "./db/stats";

export interface Room {
  id: string;
  guid?: string;
  verifyUID?: string;
  name: string;
  description?: string;
  port: number;
  maxPlayers: number;
  preferredGameName: string;
  preferredGameId: number;
  netVersion: number;
  hasPassword: boolean;
  externalGuid: string;
  address: string;
  owner: string;
  createdAt: number;
  lastUpdate: number;
  players: any[];
}

export let rooms: Room[] = [];
export let chatLogs: {
  [roomId: string]: { username: string; message: string; timestamp: number }[];
} = {};
export let activityHistory: { timestamp: number; players: number }[] = [];
export let playerPresence: { [nickname: string]: number } = {};
export let gamePresence: { [game: string]: number } = {};

export function setRooms(val: Room[]) {
  rooms = val;
}

const MAX_ACTIVITY_POINTS = 5000;

export function recordActivity(room: Room) {
  const count = room.players?.length ?? 0;

  activityHistory.push({ timestamp: Date.now(), players: count });
  if (activityHistory.length > MAX_ACTIVITY_POINTS) activityHistory.shift();
  recordActivityDB(Date.now(), count);

  for (const p of room.players || []) {
    const name = p.nickname || p.username || "unknown";
    playerPresence[name] = (playerPresence[name] || 0) + 0.25;
    addPlayerPresence(name, 0.25);
  }
  const game = room.preferredGameName || "Unknown";
  gamePresence[game] =
    (gamePresence[game] || 0) + (count > 0 ? 0.25 * count : 0);
  if (count > 0) addGamePresence(game, 0.25 * count);
}
