import { NextRequest, NextResponse } from "next/server";
import { resetBattle } from "@/lib/battleStore";

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

    if (!hostId) {
      return NextResponse.json({ error: "只有房主可以重置對戰" }, { status: 401 });
    }

    const room = resetBattle(code, hostId);
    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "重置對戰失敗" },
      { status: 400 }
    );
  }
}
