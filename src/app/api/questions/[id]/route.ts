import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/similarity";

// GET: 單題詳情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: params.id },
    });

    if (!question) {
      return NextResponse.json({ error: "查無此題目" }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 更新修改題目
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      stem,
      type,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswers,
      explanation,
      category,
      difficulty,
      tags,
    } = body;

    let answersStr = "";
    if (Array.isArray(correctAnswers)) {
      answersStr = correctAnswers.sort().join(",");
    } else if (typeof correctAnswers === "string") {
      answersStr = correctAnswers;
    }

    const updated = await prisma.question.update({
      where: { id: params.id },
      data: {
        stem: stem ? stem.trim() : undefined,
        normalizedStem: stem ? normalizeText(stem) : undefined,
        type: type ? (type === "MULTIPLE" ? "MULTIPLE" : "SINGLE") : undefined,
        optionA: optionA ? optionA.trim() : undefined,
        optionB: optionB ? optionB.trim() : undefined,
        optionC: optionC ? optionC.trim() : undefined,
        optionD: optionD ? optionD.trim() : undefined,
        explanation:
          explanation !== undefined
            ? explanation && explanation.trim()
              ? explanation.replace(/^\r?\n+|\s+$/g, "")
              : null
            : undefined,
        category: category !== undefined ? category?.trim() || null : undefined,
        difficulty: difficulty || undefined,
        tags: tags !== undefined ? tags?.trim() || null : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "更新失敗: " + error.message }, { status: 500 });
  }
}

// DELETE: 刪除題目
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.question.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "題目已成功刪除" });
  } catch (error: any) {
    return NextResponse.json({ error: "刪除失敗: " + error.message }, { status: 500 });
  }
}