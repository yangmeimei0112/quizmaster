import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSimilarity, normalizeText } from "@/lib/similarity";
import { SimilarMatch } from "@/types/question";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stem, excludeId } = body;

    if (!stem || typeof stem !== "string" || stem.trim().length < 2) {
      return NextResponse.json({
        hasExactMatch: false,
        hasHighSimilarity: false,
        maxSimilarity: 0,
        matches: [],
      });
    }

    const normInput = normalizeText(stem);

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

    const matches: SimilarMatch[] = [];
    let hasExactMatch = false;
    let maxSimilarity = 0;

    for (const q of questions) {
      // 快速比較已正規化的字串
      if (q.normalizedStem === normInput) {
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

      const res = calculateSimilarity(stem, q.stem);
      if (res.similarity >= 60) {
        if (res.similarity > maxSimilarity) {
          maxSimilarity = res.similarity;
        }
        if (res.isExact) {
          hasExactMatch = true;
        }
        matches.push({
          id: q.id,
          stem: q.stem,
          type: q.type as any,
          category: q.category,
          similarity: res.similarity,
          isExact: res.isExact,
          level: res.level,
        });
      }
    }

    // 按相似度由高到低排序，最多取前 5 筆
    matches.sort((a, b) => b.similarity - a.similarity);
    const topMatches = matches.slice(0, 5);

    return NextResponse.json({
      hasExactMatch,
      hasHighSimilarity: maxSimilarity >= 75,
      maxSimilarity,
      matches: topMatches,
    });
  } catch (error: any) {
    console.error("Check duplicate error:", error);
    return NextResponse.json(
      { error: "比對題目重複失敗: " + error.message },
      { status: 500 }
    );
  }
}