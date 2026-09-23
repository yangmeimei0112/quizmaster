import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoom, startBattle, shuffleArray, BattleQuestion } from "@/lib/battleStore";

interface RouteParams {
  params: {
    code: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = params;
    const body = await req.json();
    const { hostId } = body;

    const currentRoom = getRoom(code);
    if (!currentRoom) {
      return NextResponse.json({ error: "查無此房間" }, { status: 404 });
    }

    if (currentRoom.hostId !== hostId) {
      return NextResponse.json({ error: "只有房主可以發起開賽" }, { status: 403 });
    }

    // Determine how many questions to draw
    const targetCount =
      currentRoom.settings.mode === "EXAM_50"
        ? 50
        : Math.max(Number(currentRoom.settings.questionCount) || 10, 1);

    // Filter criteria
    const where: any = {};
    if (currentRoom.settings.category && currentRoom.settings.category !== "ALL") {
      where.category = currentRoom.settings.category;
    }

    // Fetch questions from database
    let dbQuestions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        stem: true,
        type: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswers: true,
        explanation: true,
        category: true,
        difficulty: true,
        imageUrl: true,
      },
    });

    // If specific category doesn't have enough, fetch without category
    if (dbQuestions.length < targetCount && where.category) {
      dbQuestions = await prisma.question.findMany({
        select: {
          id: true,
          stem: true,
          type: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswers: true,
          explanation: true,
          category: true,
          difficulty: true,
          imageUrl: true,
        },
      });
    }

    if (dbQuestions.length === 0) {
      return NextResponse.json(
        { error: "題庫目前沒有任何題目，請先新增題目後再開賽" },
        { status: 400 }
      );
    }

    // Shuffle and slice
    const shuffled = shuffleArray(dbQuestions);
    const selected = shuffled.slice(0, Math.min(targetCount, shuffled.length)) as BattleQuestion[];

    // Provide a sample pool for the slot/roulette spinning effect
    const samplePool = shuffled.slice(0, Math.min(20, shuffled.length)).map((q) => ({
      id: q.id,
      stem: q.stem,
      category: q.category,
      type: q.type,
    }));

    const updatedRoom = startBattle(code, hostId, selected, samplePool);

    return NextResponse.json({
      room: updatedRoom,
      samplePool,
    });
  } catch (error: any) {
    console.error("Battle start error:", error);
    return NextResponse.json(
      { error: error.message || "發起對戰失敗" },
      { status: 400 }
    );
  }
}
