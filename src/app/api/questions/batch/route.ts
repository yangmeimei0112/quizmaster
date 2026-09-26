import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeText, calculateSimilarity, compareQuestionOptions } from "@/lib/similarity";

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

    // 取得現有資料庫題目資料（包含選項與答案用於選項一致性比對）
    const existingQuestions = await prisma.question.findMany({
      select: {
        id: true,
        stem: true,
        normalizedStem: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswers: true,
      },
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

      // 防重複比對（非強制建立且未經使用者查證放行時）
      const shouldBypassDuplicateCheck =
        forceCreate || q.forceCreate === true || q.verifiedNotDuplicate === true;

      if (!shouldBypassDuplicateCheck) {
        // 1. 完全相同題幹 (100% Exact Match) -> 需同時比對選項
        if (existingNormalizedSet.has(normStem)) {
          const matchingStemQuestions = existingQuestions.filter(
            (ex) => (ex.normalizedStem || normalizeText(ex.stem)) === normStem
          );

          let hasIdenticalOptions = false;
          for (const ex of matchingStemQuestions) {
            const optRes = compareQuestionOptions(
              { optionA, optionB, optionC, optionD },
              ex
            );
            if (!optRes.hasOptions || optRes.isConsistent) {
              hasIdenticalOptions = true;
              break;
            }
          }

          if (hasIdenticalOptions) {
            skippedList.push({
              index: i + 1,
              stem,
              reason: "題庫中已存在完全相同題目（題幹與選項高度一致）",
            });
            continue;
          }
        }

        // 2. 高相似度比對 (嚴格以 80% 為界線，且選項亦高度一致才視為重複)
        let isHighSimilarity = false;
        let matchedStem = "";
        let maxSim = 0;

        for (const ex of existingQuestions) {
          const sim = calculateSimilarity(stem, ex.stem);
          if (sim.similarity >= 80) {
            const optRes = compareQuestionOptions(
              { optionA, optionB, optionC, optionD },
              ex
            );
            // 若選項內容不一致 (< 80%)，視為不同題目，不得判定為重複
            if (!optRes.hasOptions || optRes.isConsistent) {
              isHighSimilarity = true;
              matchedStem = ex.stem;
              maxSim = sim.similarity;
              break;
            }
          }
        }

        if (isHighSimilarity) {
          skippedList.push({
            index: i + 1,
            stem,
            reason: `與現有題目「${matchedStem}」高度相似 (${maxSim}%) 且選項高度一致`,
          });
          continue;
        }
      }

      // 建立此題
      try {
        const imageUrl = q.imageUrl && typeof q.imageUrl === "string" ? q.imageUrl.trim() || null : null;
        const created = await prisma.question.create({
          data: {
            stem,
            normalizedStem: normStem,
            type,
            imageUrl,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswers: answersStr,
            explanation: explanation
              ? explanation.replace(/^\r?\n+|\s+$/g, "")
              : null,
            category,
            difficulty: q.difficulty || "MEDIUM",
            tags: q.tags ? q.tags.trim() : null,
          },
        });

        createdList.push(created);
        // 加入已新增集合，防止同批次內部互相重複
        existingNormalizedSet.add(normStem);
        existingQuestions.push({
          id: created.id,
          stem: created.stem,
          normalizedStem: normStem,
          optionA: created.optionA,
          optionB: created.optionB,
          optionC: created.optionC,
          optionD: created.optionD,
          correctAnswers: created.correctAnswers,
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
