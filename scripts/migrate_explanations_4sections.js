/**
 * scripts/migrate_explanations_4sections.js
 * 批次將資料庫中現有題目的 explanation 解析依照全新 4 區塊結構（【考點導讀】、【各選項詳細解析】、【觀念說明】、【考試記憶重點】）整理統一
 */

const { PrismaClient } = require("@prisma/client");
const path = require("node:path");

async function main() {
  console.log("==================================================");
  console.log("🚀 開始執行現有題庫解析 4 區塊結構化批次更新腳本");
  console.log("==================================================");

  const prisma = new PrismaClient();

  try {
    // 動態載入 explanationParser 模組
    const parserModulePath = path.resolve(__dirname, "../src/lib/explanationParser.ts");
    const { normalizeExplanationToFourSections } = await import(
      "file://" + parserModulePath.replace(/\\/g, "/")
    );

    const questions = await prisma.question.findMany({
      where: {
        explanation: {
          not: null,
        },
      },
    });

    console.log(`共檢索到 ${questions.length} 筆包含解析之題目...`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const q of questions) {
      if (!q.explanation || !q.explanation.trim()) {
        unchangedCount++;
        continue;
      }

      const options = {
        A: q.optionA,
        B: q.optionB,
        C: q.optionC,
        D: q.optionD,
      };

      const normalized = normalizeExplanationToFourSections(
        q.explanation,
        options,
        q.correctAnswers
      );

      if (normalized && normalized.trim() !== q.explanation.trim()) {
        await prisma.question.update({
          where: { id: q.id },
          data: { explanation: normalized },
        });
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log("\n==================================================");
    console.log(`✅ 解析格式批次更新完成！`);
    console.log(`  - 成功升級更新: ${updatedCount} 筆`);
    console.log(`  - 維持原貌/免更新: ${unchangedCount} 筆`);
    console.log("==================================================");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("批次更新解析失敗:", err);
  process.exit(1);
});
