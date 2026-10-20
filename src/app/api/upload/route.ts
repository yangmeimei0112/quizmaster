import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 支援的圖片格式
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

// 限制上傳大小 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function tryWriteLocalUpload(fileName: string, buffer: Buffer): void {
  if (process.env.VERCEL === "1" || process.env.READONLY_FS === "1") {
    return;
  }
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
  } catch {
    // Serverless environments (e.g. Vercel) have a read-only filesystem (EROFS).
    // Portable Base64 Data URL is returned directly as primary URL.
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 模式 1: 接收 multipart/form-data 檔案上傳
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("file") || formData.get("image")) as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "未接收到上傳檔案，請確認欄位名稱為 'file' 或 'image'" },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `不支援的檔案格式 (${file.type})。僅支援 JPG、PNG、WebP、GIF、SVG 圖片。`,
          },
          { status: 400 }
        );
      }

      if (file.size <= 0) {
        return NextResponse.json(
          { error: "上傳的檔案內容為空，請選擇有效的圖片檔案" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `檔案容量過大 (${(file.size / (1024 * 1024)).toFixed(1)}MB)，請小於 10MB` },
          { status: 400 }
        );
      }

      // 決定安全副檔名
      const ext = EXTENSION_MAP[file.type] || ".png";
      const sanitizedBase = file.name
        ? path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_")
        : "image";
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fileName = `${sanitizedBase}_${uniqueSuffix}${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length === 0) {
        return NextResponse.json(
          { error: "上傳的檔案內容為空，請選擇有效的圖片檔案" },
          { status: 400 }
        );
      }
      const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

      // 最佳努力本地寫入 (於 Vercel Serverless 唯讀環境自動略過且不報錯)
      tryWriteLocalUpload(fileName, buffer);

      return NextResponse.json(
        {
          success: true,
          url: dataUrl,
          dataUrl,
          fileName,
          size: buffer.length,
          type: file.type,
        },
        { status: 201 }
      );
    }

    // 模式 2: 接收 JSON (如 Base64 Data URL)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { dataUrl, fileName: originalName } = body;

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json(
          { error: "請提供有效的圖片 dataUrl (Base64)" },
          { status: 400 }
        );
      }

      const match = dataUrl.trim().match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,([\s\S]+)$/);
      if (!match) {
        return NextResponse.json(
          { error: "無效的 Data URL 格式，必須符合 data:image/...;base64,..." },
          { status: 400 }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2].replace(/\s+/g, "");

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `不支援的圖片格式: ${mimeType}` },
          { status: 400 }
        );
      }

      if (!base64Data || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(base64Data)) {
        return NextResponse.json(
          { error: "無效的 Base64 圖片資料內容" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length === 0) {
        return NextResponse.json(
          { error: "圖片內容為空，請提供有效的圖片" },
          { status: 400 }
        );
      }

      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "圖片容量過大，超過 10MB 限制" },
          { status: 400 }
        );
      }

      const ext = EXTENSION_MAP[mimeType] || ".png";
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fileName = `${originalName ? path.basename(originalName, path.extname(originalName)) : "clipboard"}_${uniqueSuffix}${ext}`;

      const portableDataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

      // 最佳努力本地寫入 (於 Vercel Serverless 唯讀環境自動略過且不報錯)
      tryWriteLocalUpload(fileName, buffer);

      return NextResponse.json(
        {
          success: true,
          url: portableDataUrl,
          dataUrl: portableDataUrl,
          fileName,
          size: buffer.length,
          type: mimeType,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "不支援的 Content-Type，請使用 multipart/form-data 或 application/json" },
      { status: 415 }
    );
  } catch (error: any) {
    console.error("Image upload API error:", error);
    return NextResponse.json(
      { error: "圖片上傳處理失敗: " + error.message },
      { status: 500 }
    );
  }
}

