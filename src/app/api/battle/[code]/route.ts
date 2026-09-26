import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateRoomSettings } from "@/lib/battleStore";

interface RouteParams {
  params: {
    code: string;
  };
}

// GET: 查詢房間狀態
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    if (!code) {
      return NextResponse.json({ error: "無效的房間代碼" }, { status: 400 });
    }

    const room = getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "查無此房間或房間已關閉" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json(
      { error: "查詢房間狀態失敗: " + error.message },
      { status: 500 }
    );
  }
}

// PATCH: 房主更新房間設定
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    if (!code) {
      return NextResponse.json({ error: "缺少房間代碼" }, { status: 400 });
    }

    const body = await req.json();
    const { hostId, settings } = body;

    if (!hostId) {
      return NextResponse.json({ error: "缺少房主身份識別" }, { status: 400 });
    }

    const updatedRoom = updateRoomSettings(code, hostId, settings || {});
    return NextResponse.json({ room: updatedRoom });
  } catch (error: any) {
    const msg: string = error?.message || "更新房間設定失敗";
    let status = 500;
    if (msg.includes("不存在") || msg.includes("查無")) {
      status = 404;
    } else if (
      msg.includes("非等待") ||
      msg.includes("非 LOBBY") ||
      msg.includes("進行中") ||
      msg.includes("已開始")
    ) {
      status = 409;
    } else if (msg.includes("房主") || msg.includes("缺少")) {
      status = 400;
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
