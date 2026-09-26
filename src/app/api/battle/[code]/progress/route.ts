import { NextRequest, NextResponse } from "next/server";
import { updatePlayerProgress } from "@/lib/battleStore";

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
    const { playerId, currentIndex, correctCount, wrongCount, score, isFinished } = body;

    if (!playerId) {
      return NextResponse.json({ error: "缺少玩家識別碼" }, { status: 400 });
    }

    const room = updatePlayerProgress(code, playerId, {
      currentIndex: Number(currentIndex) || 0,
      correctCount: Number(correctCount) || 0,
      wrongCount: Number(wrongCount) || 0,
      score: Number(score) || 0,
      isFinished: Boolean(isFinished),
    });

    return NextResponse.json({ room });
  } catch (error: any) {
    const msg: string = error?.message || "更新作答進度失敗";
    let status = 500;
    if (msg.includes("不存在") || msg.includes("查無")) {
      status = 404;
    } else if (
      msg.includes("非等待") ||
      msg.includes("非 LOBBY") ||
      msg.includes("進行中")
    ) {
      status = 409;
    } else if (msg.includes("缺少") || msg.includes("房主")) {
      status = 400;
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
