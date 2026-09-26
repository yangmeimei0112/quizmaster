import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: 根據模式 (全部 / 未曾測驗 / 測驗我不會的) 與篩選條件獲取刷題題庫
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get("mode")?.toLowerCase() || "all";
    const type = searchParams.get("type") || "ALL";
    const category = searchParams.get("category") || "ALL";
    const difficulty = searchParams.get("difficulty") || "ALL";
    const q = searchParams.get("q")?.trim() || "";

    // 檢查登入防呆：未曾測驗與我不會的題目僅供登入帳號使用
    if ((mode === "untested" || mode === "unmastered") && !user) {
      return NextResponse.json(
        {
          error: "此模式需登入使用，紀錄您的專屬作答軌跡",
          requiresAuth: true,
          questions: [],
          stats: { total: 0, singleCount: 0, multipleCount: 0, categories: [] },
        },
        { status: 401 }
      );
    }

    const where: any = {};

    if (type !== "ALL") {
      where.type = type;
    }
    if (category !== "ALL") {
      where.category = category;
    }
    if (difficulty !== "ALL") {
      where.difficulty = difficulty;
    }

    if (q) {
      where.OR = [
        { stem: { contains: q } },
        { optionA: { contains: q } },
        { optionB: { contains: q } },
        { optionC: { contains: q } },
        { optionD: { contains: q } },
        { explanation: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    // 取得使用者個人作答歷程與掌握狀態
    let userProgressList: any[] = [];
    let userWrongList: any[] = [];
    const progressMap: Record<
      string,
      { isMastered: boolean; attemptCount: number; correctCount: number }
    > = {};

    if (user) {
      [userProgressList, userWrongList] = await Promise.all([
        prisma.userQuestionProgress.findMany({
          where: { userId: user.id },
        }),
        prisma.wrongQuestionRecord.findMany({
          where: { userId: user.id },
          select: { questionId: true, totalAttempts: true, correctCount: true, wrongCount: true },
        }),
      ]);

      for (const wr of userWrongList) {
        progressMap[wr.questionId] = {
          isMastered: false,
          attemptCount: wr.totalAttempts || wr.wrongCount || 1,
          correctCount: wr.correctCount || 0,
        };
      }

      for (const p of userProgressList) {
        progressMap[p.questionId] = {
          isMastered: p.isMastered,
          attemptCount: p.attemptCount,
          correctCount: p.correctCount,
        };
      }
    }

    // 模式篩選邏輯
    if (mode === "untested" && user) {
      // 未曾測驗的題目：該使用者未曾作答過 (attemptCount === 0 或無紀錄)
      const testedIds = Object.keys(progressMap).filter(
        (qid) => (progressMap[qid]?.attemptCount ?? 0) > 0
      );
      where.id = { notIn: testedIds };
    } else if (mode === "unmastered" && user) {
      // 測驗我不會的題目：曾作答但尚未標記為「我會了」(isMastered: false)
      const unmasteredIds = Object.keys(progressMap).filter((qid) => {
        const item = progressMap[qid];
        return item && item.attemptCount > 0 && !item.isMastered;
      });
      where.id = { in: unmasteredIds };
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 格式化題目並附加使用者個人掌握狀態
    const formattedQuestions = questions.map((item) => {
      const prog = progressMap[item.id];
      return {
        ...item,
        isMastered: prog?.isMastered ?? false,
        isTested: (prog?.attemptCount ?? 0) > 0,
      };
    });

    const singleCount = formattedQuestions.filter((x) => x.type === "SINGLE").length;
    const multipleCount = formattedQuestions.filter((x) => x.type === "MULTIPLE").length;
    const categories = Array.from(
      new Set(formattedQuestions.map((x) => x.category).filter(Boolean))
    ) as string[];

    return NextResponse.json({
      questions: formattedQuestions,
      userMastery: progressMap,
      stats: {
        total: formattedQuestions.length,
        singleCount,
        multipleCount,
        categories,
      },
    });
  } catch (error: any) {
    console.error("Fetch practice questions error:", error);
    return NextResponse.json(
      { error: "取得刷題題目清單失敗: " + (error?.message || "伺服器錯誤") },
      { status: 500 }
    );
  }
}
