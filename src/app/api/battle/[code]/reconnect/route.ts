import { NextRequest, NextResponse } from "next/server";
import { reconnectPlayer, getPlayerProgress } from "@/lib/battleStore";

interface RouteParams {
  params: {
    code: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    if (!code) {
      return NextResponse.json({ error: "缺少房間代碼" }, { status: 400 });
    }

    const body = await req.json();
    const { playerId, progress } = body;

    if (!playerId) {
      return NextResponse.json({ error: "缺少玩家身分識別" }, { status: 400 });
    }

    const result = reconnectPlayer(code, playerId, progress);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const msg: string = error?.message || "重連對戰失敗";
    let status = 500;
    if (msg.includes("不存在") || msg.includes("查無")) {
      status = 404;
    } else if (msg.includes("不在該房間")) {
      status = 403;
    }
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");

    if (!code || !playerId) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    const result = getPlayerProgress(code, playerId);
    if (!result) {
      return NextResponse.json({ error: "查無此對戰紀錄或玩家" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "取得進度失敗" }, { status: 500 });
  }
}
