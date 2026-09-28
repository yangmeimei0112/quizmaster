/**
 * scripts/reset_mistake_records.js
 * 
 * 清空全站個人錯題本 (WrongQuestionRecord)、使用者個別題目進度與掌握紀錄 (UserQuestionProgress) 與題庫所有作答統計數值 (Question stats: wrongCount, totalAttempts, correctCount, countA..D 歸零)
 * 支援直接透過 Node.js 執行，亦可供後端維護調用。
 */

const { PrismaClient } = require("@prisma/client");

/**
 * 徹底重置全站個人錯題記錄、個人作答進度掌握度與題庫統計數據
 * @param {PrismaClient} [customPrisma] - 可選傳入之 PrismaClient 實例
 * @returns {Promise<{
 *   success: boolean,
 *   initialQuestionCount: number,
 *   finalQuestionCount: number,
 *   initialWrongRecordCount: number,
 *   deletedWrongRecords: number,
 *   initialUserProgressCount: number,
 *   deletedUserProgress: number,
 *   finalUserProgressCount: number,
 *   updatedQuestions: number,
 *   finalWrongRecordCount: number,
 *   nonZeroStatsCount: number
 * }>}
 */
async function resetMistakeRecordsAndStats(customPrisma) {
  const shouldDisconnect = !customPrisma;
  const prisma = customPrisma || new PrismaClient();

  try {
    // 1. 取得重置前基準數據
    const initialQuestionCount = await prisma.question.count();
    const initialWrongRecordCount = await prisma.wrongQuestionRecord.count();
    const initialUserProgressCount = await prisma.userQuestionProgress.count();

    // 2. 清空個人錯題本、使用者個別進度掌握紀錄，並將全站題庫作答統計數值全數歸零 (以 $transaction 保證原子性)
    const [deleteWrongResult, deleteProgressResult, updateResult] = await prisma.$transaction([
      prisma.wrongQuestionRecord.deleteMany({}),
      prisma.userQuestionProgress.deleteMany({}),
      prisma.question.updateMany({
        data: {
          wrongCount: 0,
          totalAttempts: 0,
          correctCount: 0,
          countA: 0,
          countB: 0,
          countC: 0,
          countD: 0,
        },
      }),
    ]);

    // 3. 驗證重置後不變性 (Invariants Verification)
    const finalWrongRecordCount = await prisma.wrongQuestionRecord.count();
    const finalUserProgressCount = await prisma.userQuestionProgress.count();
    const finalQuestionCount = await prisma.question.count();
    const nonZeroStatsCount = await prisma.question.count({
      where: {
        OR: [
          { wrongCount: { not: 0 } },
          { totalAttempts: { not: 0 } },
          { correctCount: { not: 0 } },
          { countA: { not: 0 } },
          { countB: { not: 0 } },
          { countC: { not: 0 } },
          { countD: { not: 0 } },
        ],
      },
    });

    if (finalWrongRecordCount !== 0) {
      throw new Error(`個人錯題本清空失敗，尚存 ${finalWrongRecordCount} 筆記錄`);
    }

    if (finalUserProgressCount !== 0) {
      throw new Error(`使用者作答進度掌握紀錄清空失敗，尚存 ${finalUserProgressCount} 筆記錄`);
    }

    if (finalQuestionCount !== initialQuestionCount) {
      throw new Error(
        `題庫筆數損壞！重置前 ${initialQuestionCount} 筆，重置後 ${finalQuestionCount} 筆`
      );
    }

    if (nonZeroStatsCount !== 0) {
      throw new Error(`題庫統計歸零失敗，尚存 ${nonZeroStatsCount} 筆非零統計題目`);
    }

    return {
      success: true,
      initialQuestionCount,
      finalQuestionCount,
      initialWrongRecordCount,
      deletedWrongRecords: deleteWrongResult.count,
      initialUserProgressCount,
      deletedUserProgress: deleteProgressResult.count,
      finalUserProgressCount,
      updatedQuestions: updateResult.count,
      finalWrongRecordCount,
      nonZeroStatsCount,
    };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

// 支援直接命令列執行
if (require.main === module) {
  (async () => {
    console.log("==================================================");
    console.log("🧹 開始執行全站個人錯題本與題庫統計數據重置腳本...");
    console.log("==================================================");

    try {
      const result = await resetMistakeRecordsAndStats();
      console.log(`✓ 成功清空個人錯題本: 刪除 ${result.deletedWrongRecords} 筆 (原 ${result.initialWrongRecordCount} 筆，現 0 筆)`);
      console.log(`✓ 成功清空個人作答進度與掌握紀錄: 刪除 ${result.deletedUserProgress} 筆 (原 ${result.initialUserProgressCount} 筆，現 0 筆)`);
      console.log(`✓ 成功歸零題庫統計數據: 更新 ${result.updatedQuestions} 筆題目`);
      console.log(`✓ 驗證題庫總筆數無損: 初始 ${result.initialQuestionCount} 筆 == 最終 ${result.finalQuestionCount} 筆`);
      console.log(`✓ 驗證統計歸零完整性: 非零統計題目數為 ${result.nonZeroStatsCount} 筆`);
      console.log("==================================================");
      console.log("🎉 全站錯題本、作答進度與統計數據已徹底清空歸零完成！");
      console.log("==================================================");
      process.exit(0);
    } catch (error) {
      console.error("❌ 重置過程發生錯誤:", error);
      process.exit(1);
    }
  })();
}

module.exports = {
  resetMistakeRecordsAndStats,
};
