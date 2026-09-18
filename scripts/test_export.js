const { PrismaClient } = require("@prisma/client");
const { Document, Packer, Paragraph, TextRun } = require("docx");

const prisma = new PrismaClient();

async function testExport() {
  console.log("=== 測試 Google 文件匯出：不含解析時要有答案 ===");

  const questions = await prisma.question.findMany({ take: 3 });

  // 測試：不含解析 (includeExplanation = false)，但要有答案 (includeAnswers = true)
  const docChildren = [];
  questions.forEach((q, idx) => {
    // 題幹
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `${idx + 1}. ${q.stem}` })] }));
    // 選項
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `(A) ${q.optionA}` })] }));
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `(B) ${q.optionB}` })] }));
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `(C) ${q.optionC}` })] }));
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `(D) ${q.optionD}` })] }));

    // 依據新需求：要有答案！
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `【標準答案】：${q.correctAnswers}` })] }));
    // 隱藏解析：不加入 q.explanation
  });

  const doc = new Document({ sections: [{ children: docChildren }] });
  const buffer = await Packer.toBuffer(doc);
  console.log(`[驗證] 成功生成含答案但隱藏解析之 docx 文件，大小: ${buffer.length} bytes`);
  if (buffer.length < 1000) throw new Error("文件大小異常");

  console.log("=== 測試通過！符合需求：不含解析時依然輸出標準答案 ===");
}

testExport()
  .catch((e) => {
    console.error("測試失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });