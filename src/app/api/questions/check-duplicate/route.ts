import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSimilarity, normalizeText, compareQuestionOptions } from "@/lib/similarity";
import { SimilarMatch } from "@/types/question";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stem, stems, questions: inputQuestions, excludeId } = body;

    // 取得現有題目進行比對 (包含選項與答案，用於選項一致性比對)
    const questions = await prisma.question.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      select: {
        id: true,
        stem: true,
        normalizedStem: true,
        type: true,
        category: true,
        difficulty: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswers: true,
      },
    });

    const checkSingleQuestion = (inputItem: {
      stem?: string;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswers?: string | string[];
    }) => {
      const inputStem = inputItem.stem || "";
      if (!inputStem || typeof inputStem !== "string" || inputStem.trim().length < 2) {
        return {
          stem: inputStem || "",
          hasExactMatch: false,
          hasHighSimilarity: false,
          maxSimilarity: 0,
          matches: [],
        };
      }

      const trimmedStem = inputStem.trim();
      const normInput = normalizeText(trimmedStem);
      const matches: SimilarMatch[] = [];
      let hasExactMatch = false;
      let maxSimilarity = 0;

      for (const q of questions) {
        const qNorm = q.normalizedStem || normalizeText(q.stem);
        let isStemExact = false;
        let stemSim = 0;

        // 快速比較已正規化的字串
        if (normInput && qNorm === normInput) {
          isStemExact = true;
          stemSim = 100;
        } else {
          const res = calculateSimilarity(trimmedStem, q.stem);
          stemSim = res.similarity;
        }

        // 閾值規則：相似度嚴格以 80% 為界線，相似度 < 80% 直接判定為正常題目（非重複題）
        if (stemSim < 80) {
          continue;
        }

        // 選項一致性比對 (Option Similarity Check)
        const optRes = compareQuestionOptions(inputItem, q);

        // 若題幹相似 (>= 80% 或 100%)，但選項內容不一致 (< 80%)，則視為不同題目，不得判定為重複題
        if (optRes.hasOptions && !optRes.isConsistent) {
          continue;
        }

        // 正解一致性比對
        let isAnswersExact = true;
        if (inputItem.correctAnswers && q.correctAnswers) {
          const a1 = Array.isArray(inputItem.correctAnswers)
            ? inputItem.correctAnswers.slice().sort().join(",")
            : String(inputItem.correctAnswers)
                .split(",")
                .map((s) => s.trim())
                .sort()
                .join(",");
          const a2 = String(q.correctAnswers)
            .split(",")
            .map((s) => s.trim())
            .sort()
            .join(",");
          if (a1 && a2 && a1 !== a2) {
            isAnswersExact = false;
          }
        }

        const isOptionsExact = !optRes.hasOptions || optRes.similarity === 100;
        const isExact = isStemExact && isOptionsExact && isAnswersExact;

        if (isExact) {
          hasExactMatch = true;
          maxSimilarity = 100;
        } else {
          if (stemSim > maxSimilarity) {
            maxSimilarity = stemSim;
          }
        }

        matches.push({
          id: q.id,
          stem: q.stem,
          type: q.type as any,
          category: q.category,
          similarity: stemSim,
          isExact,
          level: isExact ? "EXACT" : "HIGH",
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswers: q.correctAnswers,
          optionsSimilarity: optRes.similarity,
          optionsMatch: optRes.isConsistent,
        });
      }

      // 按是否完全重複與相似度由高到低排序，最多取前 5 筆
      matches.sort((a, b) => {
        if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
        return b.similarity - a.similarity;
      });
      const topMatches = matches.slice(0, 5);

      return {
        stem: trimmedStem,
        hasExactMatch,
        hasHighSimilarity: maxSimilarity >= 80,
        maxSimilarity,
        matches: topMatches,
      };
    };

    if (Array.isArray(inputQuestions)) {
      const results = inputQuestions.map((item) => checkSingleQuestion(item));
      return NextResponse.json({ results });
    }

    if (Array.isArray(stems)) {
      const results = stems.map((s) =>
        checkSingleQuestion(typeof s === "string" ? { stem: s } : s)
      );
      return NextResponse.json({ results });
    }

    const singleResult = checkSingleQuestion({
      stem,
      optionA: body.optionA,
      optionB: body.optionB,
      optionC: body.optionC,
      optionD: body.optionD,
      correctAnswers: body.correctAnswers,
    });
    return NextResponse.json(singleResult);
  } catch (error: any) {
    console.error("Check duplicate error:", error);
    return NextResponse.json(
      { error: "比對題目重複失敗: " + error.message },
      { status: 500 }
    );
  }
}