import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, name } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "帳號長度需至少為 3 個字元" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "密碼長度需至少為 6 個字元" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();

    // 檢查帳號是否已存在
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: "該帳號名稱已被註冊，請選擇其他名稱" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: passwordHash,
        name: name?.trim() || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });

    const token = createSessionToken({
      userId: user.id,
      username: user.username,
      name: user.name,
    });

    const res = NextResponse.json({ user, success: true }, { status: 201 });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return res;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "註冊帳號失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}
