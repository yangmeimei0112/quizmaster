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
    return NextResponse.json(
      { error: error.message || "更新作答進度失敗" },
      { status: 400 }
    );
  }
}
