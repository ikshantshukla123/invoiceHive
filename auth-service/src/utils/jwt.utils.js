import jwt from "jsonwebtoken";
import redis from "../config/redis.js";

// ── Token generation ──────────────────────────────────────────────────────────

export const generateAccessToken = (userId) =>
  jwt.sign(
    { sub: userId, type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

export const generateRefreshToken = (userId) =>
  jwt.sign(
    { sub: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

// ── Token verification ────────────────────────────────────────────────────────

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

// ── Redis: refresh token store ────────────────────────────────────────────────
// We store refresh tokens in Redis so we can:
//  1. Revoke them on logout
//  2. Rotate them on refresh (old token deleted, new one stored)
//  3. Detect token reuse attacks

const REFRESH_PREFIX = "refresh:";
const BLACKLIST_PREFIX = "blacklist:";

// Save refresh token to Redis with TTL matching the token expiry
export const saveRefreshToken = async (userId, token) => {
  const decoded = jwt.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000); // seconds until expiry
  await redis.set(`${REFRESH_PREFIX}${userId}`, token, "EX", ttl);
};

// Get stored refresh token for a user
export const getStoredRefreshToken = async (userId) =>
  redis.get(`${REFRESH_PREFIX}${userId}`);

// Delete refresh token (on logout or rotation)
export const deleteRefreshToken = async (userId) =>
  redis.del(`${REFRESH_PREFIX}${userId}`);

// Blacklist an access token (on logout) — TTL = remaining token lifetime
export const blacklistAccessToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.set(`${BLACKLIST_PREFIX}${token}`, "1", "EX", ttl);
    }
  } catch {
    // Token already expired — no need to blacklist
  }
};

// Check if access token is blacklisted
export const isTokenBlacklisted = async (token) => {
  const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
  return result !== null;
};

// ── Issue token pair + set cookie ─────────────────────────────────────────────
// Centralised so every login path (local + OAuth) uses identical logic

export const issueTokens = async (userId, res) => {
  const accessToken  = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Save refresh token to Redis
  await saveRefreshToken(userId, refreshToken);

  // Set refresh token as httpOnly cookie — JS can't read it (XSS protection)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict",
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return accessToken;
};