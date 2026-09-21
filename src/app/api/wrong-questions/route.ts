import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: 取得錯題列表（個人專屬錯題本 或 全站高頻錯題排行）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = await getCurrentUser(req);

    // 預設模式：已登入預設 personal，未登入預設 global
    const requestedMode = searchParams.get("mode");
    const mode = requestedMode || (user ? "personal" : "global");

    const limitParam = searchParams.get("limit");
    const isAll = limitParam === "all" || limitParam === "-1";
    const limit = isAll ? undefined : Math.max(1, parseInt(limitParam || "10", 10));

    if (mode === "personal") {
      if (!user) {
        return NextResponse.json(
          {
            error: "請先登入以查看個人專屬錯題本",
            requiresAuth: true,
            records: [],
            totalCount: 0,
          },
          { status: 401 }
        );
      }

      const [records, totalCount] = await Promise.all([
        prisma.wrongQuestionRecord.findMany({
          where: { userId: user.id },
          include: {
            question: true,
          },
          orderBy: [{ wrongCount: "desc" }, { updatedAt: "desc" }],
          take: limit,
        }),
        prisma.wrongQuestionRecord.count({
          where: { userId: user.id },
        }),
      ]);

      return NextResponse.json({
        mode: "personal",
        records,
        totalCount,
      });
    }

    // mode === "global": 全站高頻錯題排行
    const [questions, totalCount] = await Promise.all([
      prisma.question.findMany({
        where: { wrongCount: { gt: 0 } },
        orderBy: [{ wrongCount: "desc" }, { updatedAt: "desc" }],
        take: limit,
      }),
      prisma.question.count({
        where: { wrongCount: { gt: 0 } },
      }),
    ]);

    return NextResponse.json({
      mode: "global",
      questions,
      totalCount,
    });
  } catch (error: any) {
    console.error("Fetch wrong questions error:", error);
    return NextResponse.json(
      { error: "取得錯題排行榜失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}

// POST: 記錄做錯的題目（支援單題或批次交卷時寫入）
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();

    // 支援單題 { questionId, userAnswer } 或批次 { items: [...] }
    let items: Array<{ questionId: string; userAnswer?: string }> = [];
    if (Array.isArray(body.items)) {
      items = body.items;
    } else if (body.questionId) {
      items = [{ questionId: body.questionId, userAnswer: body.userAnswer }];
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "無題目需要記錄" }, { status: 400 });
    }

    // 1. 全域累計：更新 Question 表上的 wrongCount (不論是否登入均列入全站統計)
    for (const item of items) {
      if (!item.questionId) continue;
      try {
        await prisma.question.update({
          where: { id: item.questionId },
          data: {
            wrongCount: { increment: 1 },
          },
        });
      } catch (e) {
        // 題目若不存在則忽略
      }
    }

    // 2. 若使用者已登入，將錯題寫入或累計至其個人專屬錯題本
    let savedToPersonal = false;
    if (user) {
      for (const item of items) {
        if (!item.questionId) continue;
        try {
          await prisma.wrongQuestionRecord.upsert({
            where: {
              userId_questionId: {
                userId: user.id,
                questionId: item.questionId,
              },
            },
            update: {
              wrongCount: { increment: 1 },
              lastUserAnswer: item.userAnswer || null,
              updatedAt: new Date(),
            },
            create: {
              userId: user.id,
              questionId: item.questionId,
              wrongCount: 1,
              lastUserAnswer: item.userAnswer || null,
            },
          });
        } catch (err) {
          console.error("Upsert wrong record error:", err);
        }
      }
      savedToPersonal = true;
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      savedToPersonal,
      message: savedToPersonal
        ? "已成功記錄至您的個人錯題本！"
        : "已記錄至全站統計；登入後可自動同步至個人錯題本。",
    });
  } catch (error: any) {
    console.error("Record wrong questions error:", error);
    return NextResponse.json(
      { error: "記錄錯題失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}
