import { NextRequest, NextResponse } from "next/server";
import { updateAvatar } from "@/lib/battleStore";

interface RouteParams {
  params: {
    code: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    const body = await req.json();
    const { playerId, avatarId } = body;

    if (!playerId || !avatarId) {
      return NextResponse.json({ error: "缺少玩家識別碼或頭像代號" }, { status: 400 });
    }

    const room = updateAvatar(code, playerId, avatarId);
    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新頭像失敗" },
      { status: 400 }
    );
  }
}
