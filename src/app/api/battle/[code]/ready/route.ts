import { NextRequest, NextResponse } from "next/server";
import { toggleReady } from "@/lib/battleStore";

interface RouteParams {
  params: {
    code: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    const body = await req.json();
    const { playerId, isReady } = body;

    if (!playerId) {
      return NextResponse.json({ error: "缺少玩家識別碼" }, { status: 400 });
    }

    const room = toggleReady(code, playerId, isReady);
    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新準備狀態失敗" },
      { status: 400 }
    );
  }
}
