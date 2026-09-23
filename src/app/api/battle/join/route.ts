import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/lib/battleStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, playerName, playerAvatar } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "請輸入4碼房間代碼" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = (playerName || "冒險者").trim();
    const result = joinRoom(cleanCode, cleanName, playerAvatar || "panda");

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "加入房間失敗" },
      { status: 400 }
    );
  }
}
