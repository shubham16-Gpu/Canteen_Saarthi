import jwt from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { JwtPayload, TokenPair } from "./types";

// ── Token Helpers ──

const JWT_SECRET = process.env.JWT_SECRET || "canteen-dev-secret-change-me";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "canteen-refresh-secret-change-me";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function signRefreshToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function generateTokenPair(
  payload: Omit<JwtPayload, "iat" | "exp">,
): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token);
  return decoded as JwtPayload | null;
}

// ── Password Helpers ──

const SALT_LENGTH = 32;
const HASH_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const hash = createPbkdf2Hash(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const candidateHash = createPbkdf2Hash(password, salt);
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidateHash, "hex");

  if (hashBuffer.length !== candidateBuffer.length) return false;
  return timingSafeEqual(hashBuffer, candidateBuffer);
}

function createPbkdf2Hash(password: string, salt: string): string {
  const { pbkdf2Sync } = require("crypto") as typeof import("crypto");
  return pbkdf2Sync(password, salt, HASH_ITERATIONS, KEY_LENGTH, DIGEST).toString(
    "hex",
  );
}

export function generateRandomToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}
