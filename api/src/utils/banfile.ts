import fs from "fs";
import path from "path";
import { listBans, addBan } from "../db/bans";
import { loadEnv } from "../env";

loadEnv();

const PROJECT_ROOT =
  process.env.PROJECT_ROOT || path.resolve(__dirname, "../../..");

function getBanFilePath(): string {
  if (process.env.BANLIST_PATH) return process.env.BANLIST_PATH;
  if (process.env.BAN_FILE) return process.env.BAN_FILE;
  const localBan = path.join(PROJECT_ROOT, "banlist.txt");
  if (fs.existsSync(localBan)) return localBan;
  return "/opt/azahar/banlist.txt";
}

const ban_file = getBanFilePath();

export async function syncBanFile() {
  try {
    const dir = path.dirname(ban_file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const bans = await listBans();
    const usernames = bans
      .filter((b) => b.type === "username")
      .map((b) => b.value.trim());
    const ips = bans.filter((b) => b.type === "ip").map((b) => b.value.trim());

    const content = `CitraRoom-BanList-1\n${usernames.join("\n")}\n\n${ips.join("\n")}\n`;
    fs.writeFileSync(ban_file, content, "utf-8");
    console.log(
      `[BanSync] wrote ${usernames.length} usernames, ${ips.length} ips`,
    );
  } catch (e: any) {
    console.log(`[BanSync] fail: ${e.message}`);
  }
}

export async function addBanDB(
  type: "username" | "ip",
  value: string,
  reason?: string,
  bannedBy?: string,
  durationMinutes?: number,
) {
  await addBan(type, value, reason, bannedBy, durationMinutes);
  await syncBanFile();
}
