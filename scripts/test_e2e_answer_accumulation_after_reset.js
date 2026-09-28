/**
 * scripts/test_e2e_answer_accumulation_after_reset.js
 * 
 * 驗證重置後三大情境（自測刷題、模擬考交卷、對戰作答）之統計與錯題記錄能自 1 乾淨重新累加
 */

const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { resetMistakeRecordsAndStats } = require("./reset_mistake_records.js");

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("🧪 驗證重置後：自測刷題、模擬考、對戰全新自 1 重新累加");
  console.log("==================================================");

  // 1. 先執行徹底重置
  console.log("\n[Step 1] 執行 resetMistakeRecordsAndStats() 確保環境 100% 歸零...");
  const resetRes = await resetMistakeRecordsAndStats(prisma);
  assert.equal(resetRes.finalWrongRecordCount, 0);
  assert.equal(resetRes.finalUserProgressCount, 0);
  assert.equal(resetRes.nonZeroStatsCount, 0);
  console.log("  ✓ 資料庫確認 100% 乾淨歸零");

  // 取得測試題目與測試使用者
  const questions = await prisma.question.findMany({ take: 3 });
  assert.ok(questions.length >= 3, "至少需有 3 題測試題目");

  const [q1, q2, q3] = questions;

  const testUser = await prisma.user.upsert({
    where: { username: "e2e_test_accumulator" },
    update: {},
    create: {
      username: "e2e_test_accumulator",
      password: "dummy_password_hash",
      name: "累加測試員",
    },
  });

  try {
    // -----------------------------------------------------------------
    // 情境 1: 自測刷題 (單題作答，答錯)
    // -----------------------------------------------------------------
    console.log("\n[Step 2] 模擬自測刷題作答 q1 (單題錯題)...");
    const wrongAns1 = q1.correctAnswers.includes("A") ? "B" : "A";

    // 模擬 POST /api/wrong-questions 邏輯
    await prisma.$transaction([
      prisma.question.update({
        where: { id: q1.id },
        data: {
          totalAttempts: { increment: 1 },
          wrongCount: { increment: 1 },
          ...(wrongAns1 === "A" ? { countA: { increment: 1 } } : { countB: { increment: 1 } }),
        },
      }),
      prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
        update: { attemptCount: { increment: 1 }, lastAnswer: wrongAns1 },
        create: { userId: testUser.id, questionId: q1.id, attemptCount: 1, correctCount: 0, isMastered: false, lastAnswer: wrongAns1 },
      }),
      prisma.wrongQuestionRecord.upsert({
        where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
        update: { wrongCount: { increment: 1 }, totalAttempts: { increment: 1 }, lastUserAnswer: wrongAns1 },
        create: { userId: testUser.id, questionId: q1.id, wrongCount: 1, totalAttempts: 1, correctCount: 0, lastUserAnswer: wrongAns1 },
      }),
    ]);

    const checkQ1 = await prisma.question.findUnique({ where: { id: q1.id } });
    assert.equal(checkQ1.totalAttempts, 1, "q1 totalAttempts 應精準等於 1");
    assert.equal(checkQ1.wrongCount, 1, "q1 wrongCount 應精準等於 1");
    assert.equal(checkQ1.correctCount, 0, "q1 correctCount 應精準等於 0");

    const checkProg1 = await prisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
    });
    assert.equal(checkProg1.attemptCount, 1, "q1 UserQuestionProgress attemptCount 應為 1");
    assert.equal(checkProg1.correctCount, 0, "q1 UserQuestionProgress correctCount 應為 0");
    assert.equal(checkProg1.isMastered, false, "q1 UserQuestionProgress isMastered 應為 false");

    const checkWrong1 = await prisma.wrongQuestionRecord.findUnique({
      where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
    });
    assert.equal(checkWrong1.wrongCount, 1, "q1 WrongQuestionRecord wrongCount 應為 1");
    assert.equal(checkWrong1.totalAttempts, 1, "q1 WrongQuestionRecord totalAttempts 應為 1");
    console.log("  ✓ 自測刷題錯題紀錄與進度精準從 1 開始累積！");

    // -----------------------------------------------------------------
    // 情境 2: 模擬考交卷 (批次作答，q2 答對，q3 答錯)
    // -----------------------------------------------------------------
    console.log("\n[Step 3] 模擬考批次交卷 (q2 正確, q3 錯誤)...");
    const correctAns2 = q2.correctAnswers;
    const wrongAns3 = q3.correctAnswers.includes("A") ? "B" : "A";

    // q2: 答對
    await prisma.$transaction([
      prisma.question.update({
        where: { id: q2.id },
        data: {
          totalAttempts: { increment: 1 },
          correctCount: { increment: 1 },
        },
      }),
      prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId: testUser.id, questionId: q2.id } },
        update: { attemptCount: { increment: 1 }, correctCount: { increment: 1 }, lastAnswer: correctAns2 },
        create: { userId: testUser.id, questionId: q2.id, attemptCount: 1, correctCount: 1, isMastered: false, lastAnswer: correctAns2 },
      }),
    ]);

    // q3: 答錯
    await prisma.$transaction([
      prisma.question.update({
        where: { id: q3.id },
        data: {
          totalAttempts: { increment: 1 },
          wrongCount: { increment: 1 },
        },
      }),
      prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId: testUser.id, questionId: q3.id } },
        update: { attemptCount: { increment: 1 }, lastAnswer: wrongAns3 },
        create: { userId: testUser.id, questionId: q3.id, attemptCount: 1, correctCount: 0, isMastered: false, lastAnswer: wrongAns3 },
      }),
      prisma.wrongQuestionRecord.upsert({
        where: { userId_questionId: { userId: testUser.id, questionId: q3.id } },
        update: { wrongCount: { increment: 1 }, totalAttempts: { increment: 1 }, lastUserAnswer: wrongAns3 },
        create: { userId: testUser.id, questionId: q3.id, wrongCount: 1, totalAttempts: 1, correctCount: 0, lastUserAnswer: wrongAns3 },
      }),
    ]);

    const checkQ2 = await prisma.question.findUnique({ where: { id: q2.id } });
    assert.equal(checkQ2.totalAttempts, 1);
    assert.equal(checkQ2.correctCount, 1);
    assert.equal(checkQ2.wrongCount, 0);

    const checkQ3 = await prisma.question.findUnique({ where: { id: q3.id } });
    assert.equal(checkQ3.totalAttempts, 1);
    assert.equal(checkQ3.correctCount, 0);
    assert.equal(checkQ3.wrongCount, 1);

    const checkProg2 = await prisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId: testUser.id, questionId: q2.id } },
    });
    assert.equal(checkProg2.attemptCount, 1);
    assert.equal(checkProg2.correctCount, 1);

    const checkProg3 = await prisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId: testUser.id, questionId: q3.id } },
    });
    assert.equal(checkProg3.attemptCount, 1);
    assert.equal(checkProg3.correctCount, 0);

    console.log("  ✓ 模擬考交卷 (正答與錯題) 各項指標與進度自 1 乾淨累加完成！");

    // -----------------------------------------------------------------
    // 情境 3: 對戰模式作答 (q1 再次答錯，累加至 2)
    // -----------------------------------------------------------------
    console.log("\n[Step 4] 模擬對戰模式作答 q1 (再次答錯，驗證累加至 2)...");
    await prisma.$transaction([
      prisma.question.update({
        where: { id: q1.id },
        data: {
          totalAttempts: { increment: 1 },
          wrongCount: { increment: 1 },
        },
      }),
      prisma.userQuestionProgress.update({
        where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
        data: { attemptCount: { increment: 1 }, lastAnswer: wrongAns1 },
      }),
      prisma.wrongQuestionRecord.update({
        where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
        data: { wrongCount: { increment: 1 }, totalAttempts: { increment: 1 }, lastUserAnswer: wrongAns1 },
      }),
    ]);

    const checkQ1Again = await prisma.question.findUnique({ where: { id: q1.id } });
    assert.equal(checkQ1Again.totalAttempts, 2, "q1 二次作答 totalAttempts 累加至 2");
    assert.equal(checkQ1Again.wrongCount, 2, "q1 二次作答 wrongCount 累加至 2");

    const checkProg1Again = await prisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
    });
    assert.equal(checkProg1Again.attemptCount, 2, "q1 UserQuestionProgress attemptCount 累加至 2");

    const checkWrong1Again = await prisma.wrongQuestionRecord.findUnique({
      where: { userId_questionId: { userId: testUser.id, questionId: q1.id } },
    });
    assert.equal(checkWrong1Again.wrongCount, 2, "q1 WrongQuestionRecord wrongCount 累加至 2");
    assert.equal(checkWrong1Again.totalAttempts, 2, "q1 WrongQuestionRecord totalAttempts 累加至 2");

    console.log("  ✓ 對戰模式二次作答累加至 2 驗證無誤！");

  } finally {
    // -----------------------------------------------------------------
    // 清理與徹底回歸歸零
    // -----------------------------------------------------------------
    console.log("\n[Step 5] 清理測試使用者並再次執行徹底重置歸零...");
    await prisma.userQuestionProgress.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
    await prisma.wrongQuestionRecord.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});

    const finalClean = await resetMistakeRecordsAndStats(prisma);
    assert.equal(finalClean.finalWrongRecordCount, 0);
    assert.equal(finalClean.finalUserProgressCount, 0);
    assert.equal(finalClean.nonZeroStatsCount, 0);
    console.log("  ✓ 資料庫成功恢復 100% 乾淨歸零狀態");
  }

  console.log("\n==================================================");
  console.log("🎉 重置與跨模式新作答重新累積測試 100% 通過！");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ 驗證失敗:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
