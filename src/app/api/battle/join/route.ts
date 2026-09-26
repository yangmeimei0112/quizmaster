import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/lib/battleStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, playerName, playerAvatar, existingPlayerId, playerId } = body;

    const rawCode = typeof code === "string" ? code.trim() : "";
    const cleanCode = rawCode.replace(/\D/g, "");

    if (!cleanCode || cleanCode.length !== 4 || !/^[1-9][0-9]{3}$/.test(cleanCode)) {
      return NextResponse.json({ error: "請輸入4碼純數字房間代碼" }, { status: 400 });
    }
    const cleanName = (playerName || "冒險者").trim();
    const targetPlayerId = (existingPlayerId || playerId || "").trim() || undefined;
    const result = joinRoom(cleanCode, cleanName, playerAvatar || "panda", targetPlayerId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const msg: string = error?.message || "加入房間失敗";
    let status = 500;
    if (msg.includes("不存在") || msg.includes("查無")) {
      status = 404;
    } else if (
      msg.includes("進行中") ||
      msg.includes("非 LOBBY") ||
      msg.includes("非等待") ||
      msg.includes("已結束") ||
      msg.includes("上限")
    ) {
      status = 409;
    } else if (msg.includes("缺少") || msg.includes("請輸入")) {
      status = 400;
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
