import crypto from "crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { User } from "@/types/question";

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.SESSION_SECRET ||
  "quizmaster-secure-session-salt-token-2026-key";

export const AUTH_COOKIE_NAME = "quizmaster_session";

/**
 * 使用 Node.js 原生 crypto.scryptSync 進行安全密碼加鹽雜湊
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * 驗證密碼是否與資料庫雜湊比對成功 (使用 timingSafeEqual 防止計時攻擊)
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split(":");
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export interface SessionPayload {
  userId: string;
  username: string;
  name?: string | null;
  exp: number; // Unix timestamp in seconds
  iat: number;
}

/**
 * 建立 HMAC-SHA256 簽名 Session Token (效期預設 7 天)
 */
export function createSessionToken(
  payload: { userId: string; username: string; name?: string | null },
  expiresInSeconds = 7 * 24 * 3600
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const data: SessionPayload = { ...payload, exp, iat };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * 驗證 Token 是否合法且未過期
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const data: SessionPayload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * 取得當前請求的登入使用者資訊
 */
export async function getCurrentUser(req?: NextRequest): Promise<User | null> {
  try {
    let token: string | undefined;
    if (req) {
      token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    }
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;
    return {
      id: payload.userId,
      username: payload.username,
      name: payload.name ?? null,
    };
  } catch {
    return null;
  }
}
