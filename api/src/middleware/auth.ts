import express from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { findUserByUsername } from "../db/users";

const privateKey = fs.readFileSync(
  path.join(__dirname, "../../private.pem"),
  "utf8",
);
const publicKey = fs.readFileSync(
  path.join(__dirname, "../../public.pem"),
  "utf8",
);

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function signPlayerJWT(username: string): string {
  return jwt.sign({ sub: username, role: "player" }, privateKey, {
    algorithm: "RS256",
    issuer: "azahar-player",
    expiresIn: "24h",
  });
}

export function signAdminJWT(): string {
  const expiry = process.env.ADMIN_JWT_EXPIRY || "1h";
  return jwt.sign({ role: "admin" }, privateKey, {
    algorithm: "RS256",
    issuer: "azahar-admin",
    expiresIn: expiry as any,
  });
}

export async function checkAuth(
  req: express.Request,
): Promise<{ username?: string; valid: boolean }> {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const jwtToken = authHeader.slice(7);
    for (const issuer of ["citra-core", "azahar-player"]) {
      try {
        const decoded = jwt.verify(jwtToken, publicKey, {
          algorithms: ["RS256"],
          issuer,
        }) as any;
        return { username: decoded.sub, valid: true };
      } catch {
        /* try next */
      }
    }
  }

  const username = (
    req.header("x-username") ||
    req.body?.username ||
    ""
  ).trim();
  const token = (
    req.header("x-citra-token") ||
    req.header("x-token") ||
    req.body?.token ||
    ""
  ).trim();

  if (username && token) {
    const user = await findUserByUsername(username);
    if (user && user.citra_token === token) {
      return { username, valid: true };
    }
    if (token === process.env.ROOM_TOKEN) {
      return {
        username: username || process.env.ROOM_USERNAME || "Rinzler",
        valid: true,
      };
    }
  }

  const ip = req.ip || req.socket.remoteAddress || "";
  const isLocal =
    ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

  if (isLocal) {
    return {
      username: req.header("x-username") ?? req.body?.username ?? "server",
      valid: true,
    };
  }

  return { valid: false };
}

export function isAdmin(req: express.Request): boolean {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  try {
    const decoded = jwt.verify(authHeader.slice(7), publicKey, {
      algorithms: ["RS256"],
      issuer: "azahar-admin",
    }) as any;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export const generateId = () => crypto.randomUUID();

export { privateKey, publicKey };
