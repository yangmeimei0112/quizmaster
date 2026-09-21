import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: 取得錯題列表（個人專屬錯題本 或 全站高頻錯題排行，依要求均需登入方可查看）
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // 嚴格落實需求：「查看錯題功能我想要使用者登入才可以使用」
    if (!user) {
      return NextResponse.json(
        {
          error: "查看錯題功能需登入後方可使用",
          requiresAuth: true,
          records: [],
          questions: [],
          totalCount: 0,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedMode = searchParams.get("mode");
    const mode = requestedMode === "global" ? "global" : "personal";

    const limitParam = searchParams.get("limit");
    const isAll = limitParam === "all" || limitParam === "-1";
    const limit = isAll ? undefined : Math.max(1, parseInt(limitParam || "10", 10));

    if (mode === "personal") {
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

    // mode === "global": 全站高頻錯題排行 (已登入使用者亦可橫向參考全站陷阱題)
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

// POST: 記錄做錯的題目（支援單題或批次交卷時並行高效寫入）
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

    // 1. 全域累計：並行更新 Question 表上的 wrongCount
    await Promise.all(
      items.map(async (item) => {
        if (!item.questionId) return;
        try {
          await prisma.question.update({
            where: { id: item.questionId },
            data: {
              wrongCount: { increment: 1 },
            },
          });
        } catch {
          // 題目若已被刪除則忽略
        }
      })
    );

    // 2. 若使用者已登入，將錯題並行寫入或累計至其個人專屬錯題本
    let savedToPersonal = false;
    if (user) {
      await Promise.all(
        items.map(async (item) => {
          if (!item.questionId) return;
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
        })
      );
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
