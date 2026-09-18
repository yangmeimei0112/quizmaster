import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeText, calculateSimilarity } from "@/lib/similarity";

// GET: 查詢題目列表與搜尋
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "ALL";
    const category = searchParams.get("category") || "ALL";
    const difficulty = searchParams.get("difficulty") || "ALL";

    // 建立篩選條件
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

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 統計資料
    const allQuestions = await prisma.question.findMany({
      select: { type: true, category: true },
    });

    const totalCount = allQuestions.length;
    const singleCount = allQuestions.filter((x) => x.type === "SINGLE").length;
    const multipleCount = allQuestions.filter((x) => x.type === "MULTIPLE").length;

    // 不重複的分類列表
    const categories = Array.from(
      new Set(allQuestions.map((x) => x.category).filter(Boolean))
    ) as string[];

    return NextResponse.json({
      questions,
      stats: {
        total: totalCount,
        singleCount,
        multipleCount,
        categories,
      },
    });
  } catch (error: any) {
    console.error("Fetch questions error:", error);
    return NextResponse.json(
      { error: "取得題目清單失敗: " + error.message },
      { status: 500 }
    );
  }
}

// POST: 新增題目 (含重複性後端攔截校驗)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      stem,
      type,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswers, // Array e.g. ["A"] or string "A"
      explanation,
      category,
      difficulty = "MEDIUM",
      tags,
      forceCreate = false,
    } = body;

    if (!stem || !stem.trim()) {
      return NextResponse.json({ error: "題幹不可為空" }, { status: 400 });
    }
    if (!optionA?.trim() || !optionB?.trim() || !optionC?.trim() || !optionD?.trim()) {
      return NextResponse.json({ error: "A、B、C、D 四個選項皆不可為空" }, { status: 400 });
    }

    // 處理答案字串
    let answersStr = "";
    if (Array.isArray(correctAnswers)) {
      answersStr = correctAnswers.sort().join(",");
    } else if (typeof correctAnswers === "string") {
      answersStr = correctAnswers;
    }

    if (!answersStr) {
      return NextResponse.json({ error: "請至少指定一個正確答案" }, { status: 400 });
    }

    if (type === "SINGLE" && answersStr.includes(",")) {
      return NextResponse.json({ error: "單選題只能設定一個正確答案" }, { status: 400 });
    }

    const normStem = normalizeText(stem);

    // 後端防重複檢查 (如果沒有強制新增)
    if (!forceCreate) {
      const existing = await prisma.question.findMany({
        select: { id: true, stem: true, normalizedStem: true },
      });

      for (const item of existing) {
        if (item.normalizedStem === normStem) {
          return NextResponse.json(
            {
              error: "題庫中已存在完全相同的題目！",
              isDuplicate: true,
              exactMatch: true,
              matchedQuestion: item,
            },
            { status: 409 }
          );
        }

        const sim = calculateSimilarity(stem, item.stem);
        if (sim.similarity >= 85) {
          return NextResponse.json(
            {
              error: `發現極高相似度題目 (${sim.similarity}%)，請確認是否要重複新增`,
              isDuplicate: true,
              exactMatch: false,
              similarity: sim.similarity,
              matchedQuestion: item,
              requiresConfirmation: true,
            },
            { status: 409 }
          );
        }
      }
    }

    // 建立新題目
    const newQuestion = await prisma.question.create({
      data: {
        stem: stem.trim(),
        normalizedStem: normStem,
        type: type === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        correctAnswers: answersStr,
        explanation: explanation ? explanation.trim() : null,
        category: category ? category.trim() : null,
        difficulty: difficulty || "MEDIUM",
        tags: tags ? tags.trim() : null,
      },
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error: any) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { error: "新增題目失敗: " + error.message },
      { status: 500 }
    );
  }
}