import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "請輸入帳號與密碼" },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤，請重新檢查" },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤，請重新檢查" },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      userId: user.id,
      username: user.username,
      name: user.name,
    });

    const userProfile = {
      id: user.id,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
    };

    const res = NextResponse.json({ user: userProfile, success: true }, { status: 200 });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return res;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登入失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}
