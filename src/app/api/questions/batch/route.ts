import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeText, calculateSimilarity } from "@/lib/similarity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questions, forceCreate = false } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "請提供題目陣列（questions）且不可為空" },
        { status: 400 }
      );
    }

    // 取得現有資料庫題幹資料（包含 normalizedStem 用於重複檢測）
    const existingQuestions = await prisma.question.findMany({
      select: { id: true, stem: true, normalizedStem: true },
    });

    const existingNormalizedSet = new Set(
      existingQuestions.map((q) => q.normalizedStem).filter(Boolean)
    );

    const createdList: any[] = [];
    const skippedList: any[] = [];
    const errorsList: any[] = [];

    // 逐題驗證與準備寫入
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const stem = q.stem?.trim();
      const optionA = q.optionA?.trim();
      const optionB = q.optionB?.trim();
      const optionC = q.optionC?.trim();
      const optionD = q.optionD?.trim();
      const type = q.type === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
      const explanation = q.explanation?.trim() || null;
      const category = q.category?.trim() || null;

      // 檢查必填欄位
      if (!stem || !optionA || !optionB || !optionC || !optionD) {
        errorsList.push({
          index: i + 1,
          stem: stem || "（空白題幹）",
          reason: "題幹與 A、B、C、D 四個選項皆不可為空",
        });
        continue;
      }

      // 答案處理
      let answersStr = "";
      if (Array.isArray(q.correctAnswers)) {
        answersStr = q.correctAnswers.sort().join(",");
      } else if (typeof q.correctAnswers === "string") {
        answersStr = q.correctAnswers.trim();
      }

      if (!answersStr) {
        errorsList.push({
          index: i + 1,
          stem,
          reason: "請至少指定一個正確解答",
        });
        continue;
      }

      if (type === "SINGLE" && answersStr.includes(",")) {
        answersStr = answersStr.split(",")[0];
      }

      const normStem = normalizeText(stem);

      // 防重複比對（非強制建立時）
      if (!forceCreate) {
        // 1. 完全相同題幹 (100% Exact Match)
        if (existingNormalizedSet.has(normStem)) {
          skippedList.push({
            index: i + 1,
            stem,
            reason: "題庫中已存在完全相同題目",
          });
          continue;
        }

        // 2. 高相似度比對 (>= 85%)
        let isHighSimilarity = false;
        let matchedStem = "";
        let maxSim = 0;

        for (const ex of existingQuestions) {
          const sim = calculateSimilarity(stem, ex.stem);
          if (sim.similarity >= 85) {
            isHighSimilarity = true;
            matchedStem = ex.stem;
            maxSim = sim.similarity;
            break;
          }
        }

        if (isHighSimilarity) {
          skippedList.push({
            index: i + 1,
            stem,
            reason: `與現有題目「${matchedStem}」高度相似 (${maxSim}%)`,
          });
          continue;
        }
      }

      // 建立此題
      try {
        const created = await prisma.question.create({
          data: {
            stem,
            normalizedStem: normStem,
            type,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswers: answersStr,
            explanation: explanation
              ? explanation.replace(/^\r?\n+|\s+$/g, "")
              : null,
            category,
            difficulty: "MEDIUM",
          },
        });

        createdList.push(created);
        // 加入已新增集合，防止同批次內部互相重複
        existingNormalizedSet.add(normStem);
        existingQuestions.push({
          id: created.id,
          stem: created.stem,
          normalizedStem: normStem,
        });
      } catch (createErr: any) {
        errorsList.push({
          index: i + 1,
          stem,
          reason: createErr.message || "寫入資料庫失敗",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSubmitted: questions.length,
      createdCount: createdList.length,
      skippedCount: skippedList.length,
      errorCount: errorsList.length,
      createdQuestions: createdList,
      skippedDuplicates: skippedList,
      errors: errorsList,
    });
  } catch (err: any) {
    console.error("Batch create questions error:", err);
    return NextResponse.json(
      { error: "批次新增題目發生伺服器異常: " + err.message },
      { status: 500 }
    );
  }
}
