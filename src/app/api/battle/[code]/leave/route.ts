import { NextRequest, NextResponse } from "next/server";
import { leaveRoom, getRoomAsync, syncRoomToDb, deleteRoomFromDb } from "@/lib/battleStore";

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

    await getRoomAsync(code);
    const result = leaveRoom(code, playerId);
    if (result.room) {
      await syncRoomToDb(result.room, { isLeave: true });
    } else {
      await deleteRoomFromDb(code);
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "離開房間失敗" },
      { status: 400 }
    );
  }
}
