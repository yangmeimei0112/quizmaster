import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRoom } from "@/lib/battleStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalQuestionsCount = await prisma.question.count();
    return NextResponse.json({ totalQuestionsCount }, { status: 200 });
  } catch (error: any) {
    console.error("Battle question count query error:", error);
    return NextResponse.json(
      { error: "取得題庫題目總數失敗: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hostName, hostAvatar, settings } = body;

    const trimmedName = (hostName || "房主").trim();
    const cleanSettings = { ...(settings || {}) };

    const totalQuestionsCount = await prisma.question.count();

    if (cleanSettings.mode === "CUSTOM") {
      const qCount = Number(cleanSettings.questionCount);
      if (typeof cleanSettings.questionCount !== "undefined" && isNaN(qCount)) {
        return NextResponse.json(
          { error: "題目數量必須為有效數字" },
          { status: 400 }
        );
      }
      if (qCount < 1) {
        return NextResponse.json(
          { error: "自訂題數必須至少為 1 題" },
          { status: 400 }
        );
      }
      if (totalQuestionsCount > 0 && qCount > totalQuestionsCount) {
        return NextResponse.json(
          {
            error: `自訂題數 (${qCount} 題) 不能超過題庫總題數 (${totalQuestionsCount} 題)`,
          },
          { status: 400 }
        );
      }
    }

    if (cleanSettings.timeLimitPerQuestion !== undefined) {
      const tLimit = Number(cleanSettings.timeLimitPerQuestion);
      cleanSettings.timeLimitPerQuestion = isNaN(tLimit) || tLimit < 0 ? 0 : Math.floor(tLimit);
    }

    const result = createRoom(trimmedName, hostAvatar || "shiba", cleanSettings);

    return NextResponse.json({ ...result, totalQuestionsCount }, { status: 201 });
  } catch (error: any) {
    console.error("Battle room create error:", error);
    return NextResponse.json(
      { error: "創建對戰房間失敗: " + error.message },
      { status: 500 }
    );
  }
}
