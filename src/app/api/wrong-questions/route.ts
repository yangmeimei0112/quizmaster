import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeAnswers, compareAnswers } from "@/lib/answerUtils";

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

      const formattedRecords = records.map((record) => {
        const q = record.question;
        const totalAttempts = Math.max(q.totalAttempts ?? 0, q.wrongCount ?? 0);
        return {
          ...record,
          totalAttempts: Math.max(record.totalAttempts ?? 1, record.wrongCount ?? 1),
          correctCount: record.correctCount ?? 0,
          question: {
            ...q,
            totalAttempts,
            correctCount: q.correctCount ?? 0,
            countA: q.countA ?? 0,
            countB: q.countB ?? 0,
            countC: q.countC ?? 0,
            countD: q.countD ?? 0,
          },
        };
      });

      return NextResponse.json({
        mode: "personal",
        records: formattedRecords,
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

    const formattedQuestions = questions.map((q) => ({
      ...q,
      totalAttempts: Math.max(q.totalAttempts ?? 0, q.wrongCount ?? 0),
      correctCount: q.correctCount ?? 0,
      countA: q.countA ?? 0,
      countB: q.countB ?? 0,
      countC: q.countC ?? 0,
      countD: q.countD ?? 0,
    }));

    return NextResponse.json({
      mode: "global",
      questions: formattedQuestions,
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

// POST: 記錄作答題目（支援單題或批次交卷時並行高效寫入，無論對錯皆完整統計）
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();

    // 支援單題 { questionId, userAnswer, isCorrect } 或批次 { items: [...] }
    let items: Array<{ questionId: string; userAnswer?: string; isCorrect?: boolean }> = [];
    if (Array.isArray(body.items)) {
      items = body.items;
    } else if (body.questionId) {
      items = [{ questionId: body.questionId, userAnswer: body.userAnswer, isCorrect: body.isCorrect }];
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "無題目需要記錄" }, { status: 400 });
    }

    // 先取得相關題目的標準答案等資訊以做準確比對
    const validQuestionIds = items.map((i) => i.questionId).filter(Boolean);
    const questions = await prisma.question.findMany({
      where: { id: { in: validQuestionIds } },
    });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // 1. 全域累計：並行更新 Question 表上的統計資料
    await Promise.all(
      items.map(async (item) => {
        if (!item.questionId) return;
        const q = questionMap.get(item.questionId);

        const isCorrect =
          typeof item.isCorrect === "boolean"
            ? item.isCorrect
            : q
            ? compareAnswers(item.userAnswer, q.correctAnswers)
            : false;

        const selected = normalizeAnswers(item.userAnswer);

        const updateData: any = {
          totalAttempts: { increment: 1 },
        };
        if (isCorrect) {
          updateData.correctCount = { increment: 1 };
        } else {
          updateData.wrongCount = { increment: 1 };
        }
        if (selected.includes("A")) updateData.countA = { increment: 1 };
        if (selected.includes("B")) updateData.countB = { increment: 1 };
        if (selected.includes("C")) updateData.countC = { increment: 1 };
        if (selected.includes("D")) updateData.countD = { increment: 1 };

        try {
          await prisma.question.update({
            where: { id: item.questionId },
            data: updateData,
          });
        } catch {
          // 題目若已被刪除則忽略
        }
      })
    );

    // 2. 若使用者已登入，更新或記錄至其個人專屬錯題本與題目掌握作答進度
    let savedToPersonal = false;
    if (user) {
      await Promise.all(
        items.map(async (item) => {
          if (!item.questionId) return;
          const q = questionMap.get(item.questionId);

          const isCorrect =
            typeof item.isCorrect === "boolean"
              ? item.isCorrect
              : q
              ? compareAnswers(item.userAnswer, q.correctAnswers)
              : false;

          try {
            // 同步記錄或累計個人作答進度 (UserQuestionProgress)
            await prisma.userQuestionProgress.upsert({
              where: {
                userId_questionId: {
                  userId: user.id,
                  questionId: item.questionId,
                },
              },
              update: {
                attemptCount: { increment: 1 },
                ...(isCorrect ? { correctCount: { increment: 1 } } : {}),
                lastAnswer: item.userAnswer || null,
                updatedAt: new Date(),
              },
              create: {
                userId: user.id,
                questionId: item.questionId,
                isMastered: false,
                attemptCount: 1,
                correctCount: isCorrect ? 1 : 0,
                lastAnswer: item.userAnswer || null,
              },
            });

            if (!isCorrect) {
              // 答錯：upsert 錯題紀錄
              await prisma.wrongQuestionRecord.upsert({
                where: {
                  userId_questionId: {
                    userId: user.id,
                    questionId: item.questionId,
                  },
                },
                update: {
                  wrongCount: { increment: 1 },
                  totalAttempts: { increment: 1 },
                  lastUserAnswer: item.userAnswer || null,
                  updatedAt: new Date(),
                },
                create: {
                  userId: user.id,
                  questionId: item.questionId,
                  wrongCount: 1,
                  totalAttempts: 1,
                  correctCount: 0,
                  lastUserAnswer: item.userAnswer || null,
                },
              });
            } else {
              // 答對：若原本已有錯題記錄，更新總次數與答對次數
              const existing = await prisma.wrongQuestionRecord.findUnique({
                where: {
                  userId_questionId: {
                    userId: user.id,
                    questionId: item.questionId,
                  },
                },
              });
              if (existing) {
                await prisma.wrongQuestionRecord.update({
                  where: { id: existing.id },
                  data: {
                    totalAttempts: { increment: 1 },
                    correctCount: { increment: 1 },
                    lastUserAnswer: item.userAnswer || null,
                    updatedAt: new Date(),
                  },
                });
              }
            }
          } catch (err) {
            console.error("Update wrong record or question progress error:", err);
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
