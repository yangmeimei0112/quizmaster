import { NextRequest, NextResponse } from "next/server";
import { leaveRoomAsync } from "@/lib/battleStore";

interface RouteParams {
  params: {
    code: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    const body = await req.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: "缺少玩家識別碼" }, { status: 400 });
    }

    const result = await leaveRoomAsync(code, playerId);
    if (!result.room) {
      return NextResponse.json({ success: true, dissolved: true, room: null });
    }
    return NextResponse.json({ success: true, dissolved: false, room: result.room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "離開房間失敗" },
      { status: 400 }
    );
  }
}
