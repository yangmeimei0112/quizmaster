import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSimilarity, normalizeText } from "@/lib/similarity";
import { SimilarMatch } from "@/types/question";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stem, stems, excludeId } = body;

    // 取得現有題目進行比對 (單人題庫規模，讀取題幹比對效率極高)
    const questions = await prisma.question.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      select: {
        id: true,
        stem: true,
        normalizedStem: true,
        type: true,
        category: true,
        difficulty: true,
      },
    });

    const checkSingleStem = (inputStem: string) => {
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
        // 快速比較已正規化的字串
        if (normInput && qNorm === normInput) {
          hasExactMatch = true;
          maxSimilarity = 100;
          matches.push({
            id: q.id,
            stem: q.stem,
            type: q.type as any,
            category: q.category,
            similarity: 100,
            isExact: true,
            level: "EXACT",
          });
          continue;
        }

        const res = calculateSimilarity(trimmedStem, q.stem);
        if (res.similarity >= 60) {
          if (res.similarity > maxSimilarity) {
            maxSimilarity = res.similarity;
          }
          if (res.isExact || res.similarity === 100) {
            hasExactMatch = true;
          }
          matches.push({
            id: q.id,
            stem: q.stem,
            type: q.type as any,
            category: q.category,
            similarity: res.similarity,
            isExact: res.isExact || res.similarity === 100,
            level: res.level,
          });
        }
      }

      // 按相似度由高到低排序，最多取前 5 筆
      matches.sort((a, b) => b.similarity - a.similarity);
      const topMatches = matches.slice(0, 5);

      return {
        stem: trimmedStem,
        hasExactMatch,
        hasHighSimilarity: maxSimilarity >= 70,
        maxSimilarity,
        matches: topMatches,
      };
    };

    if (Array.isArray(stems)) {
      const results = stems.map((s) => checkSingleStem(s));
      return NextResponse.json({ results });
    }

    const singleResult = checkSingleStem(stem);
    return NextResponse.json(singleResult);
  } catch (error: any) {
    console.error("Check duplicate error:", error);
    return NextResponse.json(
      { error: "比對題目重複失敗: " + error.message },
      { status: 500 }
    );
  }
}