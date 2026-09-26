import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: 取得使用者的題目掌握度資料與作答歷程
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({
        success: true,
        progressMap: {},
        list: [],
        isAuthenticated: false,
      });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId");

    const where: any = { userId: user.id };
    const wrongWhere: any = { userId: user.id };
    if (questionId) {
      where.questionId = questionId;
      wrongWhere.questionId = questionId;
    }

    const [progressList, wrongRecords] = await Promise.all([
      prisma.userQuestionProgress.findMany({
        where,
      }),
      prisma.wrongQuestionRecord.findMany({
        where: wrongWhere,
        select: { questionId: true, totalAttempts: true, correctCount: true, wrongCount: true },
      }),
    ]);

    const progressMap: Record<
      string,
      { isMastered: boolean; attemptCount: number; correctCount: number }
    > = {};

    // 優先納入 wrongRecords 中已測驗過但尚未寫入 progress 的題目 (向下相容)
    for (const wr of wrongRecords) {
      progressMap[wr.questionId] = {
        isMastered: false,
        attemptCount: wr.totalAttempts || wr.wrongCount || 1,
        correctCount: wr.correctCount || 0,
      };
    }

    // 以 UserQuestionProgress 正式狀態為主覆蓋
    for (const p of progressList) {
      progressMap[p.questionId] = {
        isMastered: p.isMastered,
        attemptCount: p.attemptCount,
        correctCount: p.correctCount,
      };
    }

    return NextResponse.json({
      success: true,
      progressMap,
      list: progressList,
      isAuthenticated: true,
    });
  } catch (error: any) {
    console.error("Fetch mastery status error:", error);
    return NextResponse.json(
      { error: "取得掌握度狀態失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}

// POST: 切換或設定「這題我會了」(isMastered)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        {
          error: "此模式需登入使用，紀錄您的專屬作答軌跡",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { questionId, isMastered } = body;

    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "缺少題目識別碼 (questionId)" }, { status: 400 });
    }

    // 確認題目是否存在
    const questionExists = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!questionExists) {
      return NextResponse.json({ error: "找不到指定的題目" }, { status: 404 });
    }

    // 查詢現有記錄
    const existing = await prisma.userQuestionProgress.findUnique({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId,
        },
      },
    });

    const targetMastered =
      typeof isMastered === "boolean" ? isMastered : !existing?.isMastered;

    const updated = await prisma.userQuestionProgress.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId,
        },
      },
      update: {
        isMastered: targetMastered,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        questionId,
        isMastered: targetMastered,
        attemptCount: 1,
        correctCount: targetMastered ? 1 : 0,
      },
    });

    return NextResponse.json({
      success: true,
      questionId: updated.questionId,
      isMastered: updated.isMastered,
      message: updated.isMastered
        ? "已成功標記為「這題我會了」！"
        : "已取消「這題我會了」標記。",
    });
  } catch (error: any) {
    console.error("Update question mastery error:", error);
    return NextResponse.json(
      { error: "更新題目掌握狀態失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}
