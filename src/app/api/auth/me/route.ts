import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(req);
    if (!sessionUser) {
      return NextResponse.json({ user: null });
    }

    // 檢查用戶是否依然存在於資料庫
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error: any) {
    console.error("Auth me error:", error);
    return NextResponse.json({ user: null });
  }
}
