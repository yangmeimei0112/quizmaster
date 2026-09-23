import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/battleStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hostName, hostAvatar, settings } = body;

    const trimmedName = (hostName || "房主").trim();
    const result = createRoom(trimmedName, hostAvatar || "shiba", settings || {});

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Battle room create error:", error);
    return NextResponse.json(
      { error: "創建對戰房間失敗: " + error.message },
      { status: 500 }
    );
  }
}
