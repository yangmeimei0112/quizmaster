import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from "docx";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "題庫測驗卷",
      subtitle = "Google 文件匯出試卷",
      includeExplanation = false, // 是否包含解析
      includeAnswers = true,      // 是否包含標準答案 (預設為 true，要有答案但是隱藏解析)
      questionIds = [],          // 若指定則匯出特定題，否則匯出全部
      category = "ALL",
      type = "ALL",
    } = body;

    // 取得題目
    const where: any = {};
    if (questionIds && questionIds.length > 0) {
      where.id = { in: questionIds };
    } else {
      if (category !== "ALL") where.category = category;
      if (type !== "ALL") where.type = type;
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "查無符合條件的題目可供匯出" },
        { status: 400 }
      );
    }

    const docChildren: Paragraph[] = [];

    // 1. 文件大標題
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 120 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 36, // 18pt
            color: "0F172A",
            font: "Microsoft JhengHei",
          }),
        ],
      })
    );

    // 2. 副標題與資訊列
    const infoText = `${subtitle} · 總題數：${questions.length} 題 · 匯出模式：${
      includeExplanation
        ? "含答案與詳細解析 (教師/複習卷)"
        : includeAnswers
        ? "含標準答案，隱藏解析"
        : "不含答案與解析 (純測驗題目)"
    }`;

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: infoText,
            size: 20, // 10pt
            color: "64748B",
            font: "Microsoft JhengHei",
          }),
        ],
      })
    );

    // 3. 考生資訊填寫欄位 (若為測驗卷更具真實感)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "班級／群組：__________   姓名：____________   座號：______   得分：______",
            size: 20,
            color: "334155",
            font: "Microsoft JhengHei",
          }),
        ],
      })
    );

    // 4. 分隔橫線
    docChildren.push(
      new Paragraph({
        spacing: { after: 300 },
        border: {
          bottom: {
            color: "CBD5E1",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );

    // 5. 逐題輸出
    questions.forEach((q, idx) => {
      const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";

      // 題幹 (keepNext: true 防止題目與選項跨頁斷開)
      docChildren.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: `${idx + 1}. `,
              bold: true,
              size: 22,
              color: "0F172A",
              font: "Microsoft JhengHei",
            }),
            new TextRun({
              text: `【${typeLabel}】`,
              bold: true,
              size: 20,
              color: q.type === "SINGLE" ? "2563EB" : "7C3AED",
              font: "Microsoft JhengHei",
            }),
            new TextRun({
              text: q.stem,
              bold: true,
              size: 22,
              color: "0F172A",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );

      // 選項 A, B, C, D (微縮排排版，keepLines: true 防止選項截斷)
      const options = [
        { key: "A", text: q.optionA },
        { key: "B", text: q.optionB },
        { key: "C", text: q.optionC },
        { key: "D", text: q.optionD },
      ];

      options.forEach((opt) => {
        docChildren.push(
          new Paragraph({
            keepLines: true,
            indent: { left: 450 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `(${opt.key}) `,
                bold: true,
                size: 20,
                color: "334155",
                font: "Microsoft JhengHei",
              }),
              new TextRun({
                text: opt.text,
                size: 20,
                color: "1E293B",
                font: "Microsoft JhengHei",
              }),
            ],
          })
        );
      });

      // 6. 是否包含解答或解析
      if (includeExplanation || includeAnswers) {
        docChildren.push(
          new Paragraph({
            indent: { left: 450 },
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: "【標準答案】：",
                bold: true,
                size: 20,
                color: "047857",
                font: "Microsoft JhengHei",
              }),
              new TextRun({
                text: q.correctAnswers,
                bold: true,
                size: 20,
                color: "059669",
                font: "Microsoft JhengHei",
              }),
            ],
          })
        );
      }

      if (includeExplanation) {
        docChildren.push(
          new Paragraph({
            indent: { left: 450 },
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "【題目解析】：",
                bold: true,
                size: 20,
                color: "475569",
                font: "Microsoft JhengHei",
              }),
              new TextRun({
                text: q.explanation ? q.explanation : "（出題者未填寫解析）",
                italics: !q.explanation,
                size: 20,
                color: q.explanation ? "334155" : "94A3B8",
                font: "Microsoft JhengHei",
              }),
            ],
          })
        );
      }

      // 每題間隔微線
      docChildren.push(
        new Paragraph({
          spacing: { after: 160 },
        })
      );
    });

    // 建立 docx 文件物件
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const safeFilename = encodeURIComponent(title.replace(/\s+/g, "_") + ".docx");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      },
    });
  } catch (error: any) {
    console.error("Export docx error:", error);
    return NextResponse.json(
      { error: "匯出 Google 文件失敗: " + error.message },
      { status: 500 }
    );
  }
}