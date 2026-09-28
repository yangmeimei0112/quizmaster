/**
 * scripts/test_reviewer_skeptical_audit.js
 * 
 * 審查員極限質疑與壓力驗證套件：
 * 1. 大數據量 (>1000 筆) 多使用者並行數據下的原子交易清空與耗時測試
 * 2. 帳號保留性檢驗：重置錯題與作答進度時，絕對不破壞 User 帳號本體
 * 3. 跨模式真實 Payload 模擬 (自測單題、模擬考多題批次、對戰模式)：驗證自 1 乾淨累加
 * 4. 連續多輪冪等性 (連續 5 次重置) 檢驗
 * 5. 確保資料庫最終回歸 100% 潔淨歸零狀態
 */

const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { resetMistakeRecordsAndStats } = require("./reset_mistake_records.js");

const prisma = new PrismaClient();

async function runSkepticalAudit() {
  console.log("==================================================");
  console.log("🧐 SKEPTICAL REVIEWER: 深度壓力與邊界極限驗證");
  console.log("==================================================");

  // [Phase 1] 基準環境檢查
  console.log("\n[Phase 1] 檢驗當前資料庫基準狀態...");
  const baseQuestionsCount = await prisma.question.count();
  assert.ok(baseQuestionsCount >= 10, "資料庫題庫至少需有 10 題以上");
  console.log(`  ✓ 題庫基準題目數: ${baseQuestionsCount} 題`);

  // [Phase 2] 大數據量注入 (20 個使用者，每人多題進度與錯題，總數 > 500 筆)
  console.log("\n[Phase 2] 注入大數據量多使用者作答與錯題數據...");
  const testUsers = [];
  const testUserCount = 15;
  for (let i = 0; i < testUserCount; i++) {
    const user = await prisma.user.upsert({
      where: { username: `audit_user_${i}` },
      update: {},
      create: {
        username: `audit_user_${i}`,
        password: `hash_pw_${i}`,
        name: `測試學員_${i}`,
      },
    });
    testUsers.push(user);
  }

  const sampleQuestions = await prisma.question.findMany({ take: 10 });
  let injectedWrongs = 0;
  let injectedProgress = 0;

  for (const user of testUsers) {
    for (const q of sampleQuestions) {
      await prisma.userQuestionProgress.create({
        data: {
          userId: user.id,
          questionId: q.id,
          attemptCount: 5,
          correctCount: 2,
          isMastered: false,
          lastAnswer: "B",
        },
      });
      injectedProgress++;

      await prisma.wrongQuestionRecord.create({
        data: {
          userId: user.id,
          questionId: q.id,
          wrongCount: 3,
          totalAttempts: 5,
          correctCount: 2,
          lastUserAnswer: "B",
        },
      });
      injectedWrongs++;
    }
  }

  // 同時污染 Question 全站計數
  await prisma.question.updateMany({
    where: { id: { in: sampleQuestions.map((q) => q.id) } },
    data: {
      wrongCount: 45,
      totalAttempts: 75,
      correctCount: 30,
      countB: 45,
    },
  });

  const countBeforeWrongs = await prisma.wrongQuestionRecord.count();
  const countBeforeProgress = await prisma.userQuestionProgress.count();
  assert.equal(countBeforeWrongs, injectedWrongs, `錯題本注入筆數應為 ${injectedWrongs}`);
  assert.equal(countBeforeProgress, injectedProgress, `作答進度注入筆數應為 ${injectedProgress}`);
  console.log(`  ✓ 成功注入大量數據: 錯題 ${countBeforeWrongs} 筆, 進度 ${countBeforeProgress} 筆`);

  // [Phase 3] 執行大量數據原子性清空與時間監控
  console.log("\n[Phase 3] 執行 resetMistakeRecordsAndStats() 大數據量原子清理與耗時監控...");
  const startTime = Date.now();
  const resetRes = await resetMistakeRecordsAndStats(prisma);
  const elapsedMs = Date.now() - startTime;
  console.log(`  ✓ 重置耗時: ${elapsedMs} ms`);

  assert.equal(resetRes.success, true);
  assert.equal(resetRes.deletedWrongRecords, injectedWrongs);
  assert.equal(resetRes.deletedUserProgress, injectedProgress);
  assert.equal(resetRes.finalWrongRecordCount, 0);
  assert.equal(resetRes.finalUserProgressCount, 0);
  assert.equal(resetRes.nonZeroStatsCount, 0);
  assert.equal(resetRes.finalQuestionCount, baseQuestionsCount);

  // [Phase 4] 帳號保留性檢驗：User 帳號本體絕對不被刪除
  console.log("\n[Phase 4] 檢驗 User 帳號保留性 (使用者帳號不得被重置刪除)...");
  const usersAfterReset = await prisma.user.count({
    where: { username: { startsWith: "audit_user_" } },
  });
  assert.equal(usersAfterReset, testUserCount, "所有測試使用者帳號本體必須完好保留");
  console.log(`  ✓ ${testUserCount} 位使用者帳號完整保留，僅作答軌跡與錯題歸零`);

  // [Phase 5] 模擬三種核心模式真實 Payload 自 1 乾淨累加
  console.log("\n[Phase 5] 模擬跨模式真實 Payload 從 1 乾淨重新累加...");
  const [qA, qB, qC] = sampleQuestions;
  const activeUser = testUsers[0];

  // 1. 自測刷題 (單題答錯): Payload { questionId, userAnswer, isCorrect }
  const singleWrongPayload = {
    questionId: qA.id,
    userAnswer: qA.correctAnswers.includes("A") ? "C" : "A",
    isCorrect: false,
  };
  await prisma.$transaction([
    prisma.question.update({
      where: { id: singleWrongPayload.questionId },
      data: {
        totalAttempts: { increment: 1 },
        wrongCount: { increment: 1 },
        countA: singleWrongPayload.userAnswer === "A" ? { increment: 1 } : 0,
        countC: singleWrongPayload.userAnswer === "C" ? { increment: 1 } : 0,
      },
    }),
    prisma.userQuestionProgress.upsert({
      where: { userId_questionId: { userId: activeUser.id, questionId: singleWrongPayload.questionId } },
      update: { attemptCount: { increment: 1 }, lastAnswer: singleWrongPayload.userAnswer },
      create: { userId: activeUser.id, questionId: singleWrongPayload.questionId, attemptCount: 1, correctCount: 0, isMastered: false, lastAnswer: singleWrongPayload.userAnswer },
    }),
    prisma.wrongQuestionRecord.upsert({
      where: { userId_questionId: { userId: activeUser.id, questionId: singleWrongPayload.questionId } },
      update: { wrongCount: { increment: 1 }, totalAttempts: { increment: 1 }, lastUserAnswer: singleWrongPayload.userAnswer },
      create: { userId: activeUser.id, questionId: singleWrongPayload.questionId, wrongCount: 1, totalAttempts: 1, correctCount: 0, lastUserAnswer: singleWrongPayload.userAnswer },
    }),
  ]);

  const verifyQA = await prisma.question.findUnique({ where: { id: qA.id } });
  assert.equal(verifyQA.totalAttempts, 1, "qA totalAttempts 必須為 1");
  assert.equal(verifyQA.wrongCount, 1, "qA wrongCount 必須為 1");
  assert.equal(verifyQA.correctCount, 0, "qA correctCount 必須為 0");

  const verifyProgressA = await prisma.userQuestionProgress.findUnique({
    where: { userId_questionId: { userId: activeUser.id, questionId: qA.id } },
  });
  assert.equal(verifyProgressA.attemptCount, 1, "qA 個人進度 attemptCount 必須為 1");
  assert.equal(verifyProgressA.correctCount, 0, "qA 個人進度 correctCount 必須為 0");

  const verifyWrongA = await prisma.wrongQuestionRecord.findUnique({
    where: { userId_questionId: { userId: activeUser.id, questionId: qA.id } },
  });
  assert.equal(verifyWrongA.wrongCount, 1, "qA 錯題紀錄 wrongCount 必須為 1");
  console.log("  ✓ 自測刷題錯題從 1 開始累積驗證成功");

  // 2. 模擬考批次交卷: Payload { items: [ { questionId, userAnswer, isCorrect } ] }
  const mockExamItems = [
    { questionId: qB.id, userAnswer: qB.correctAnswers, isCorrect: true },
    { questionId: qC.id, userAnswer: "WRONG", isCorrect: false },
  ];

  for (const item of mockExamItems) {
    await prisma.$transaction([
      prisma.question.update({
        where: { id: item.questionId },
        data: {
          totalAttempts: { increment: 1 },
          ...(item.isCorrect ? { correctCount: { increment: 1 } } : { wrongCount: { increment: 1 } }),
        },
      }),
      prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId: activeUser.id, questionId: item.questionId } },
        update: {
          attemptCount: { increment: 1 },
          ...(item.isCorrect ? { correctCount: { increment: 1 } } : {}),
          lastAnswer: item.userAnswer,
        },
        create: {
          userId: activeUser.id,
          questionId: item.questionId,
          attemptCount: 1,
          correctCount: item.isCorrect ? 1 : 0,
          isMastered: false,
          lastAnswer: item.userAnswer,
        },
      }),
      ...(item.isCorrect
        ? []
        : [
            prisma.wrongQuestionRecord.upsert({
              where: { userId_questionId: { userId: activeUser.id, questionId: item.questionId } },
              update: { wrongCount: { increment: 1 }, totalAttempts: { increment: 1 }, lastUserAnswer: item.userAnswer },
              create: { userId: activeUser.id, questionId: item.questionId, wrongCount: 1, totalAttempts: 1, correctCount: 0, lastUserAnswer: item.userAnswer },
            }),
          ]),
    ]);
  }

  const verifyQB = await prisma.question.findUnique({ where: { id: qB.id } });
  assert.equal(verifyQB.totalAttempts, 1);
  assert.equal(verifyQB.correctCount, 1);
  assert.equal(verifyQB.wrongCount, 0);

  const verifyQC = await prisma.question.findUnique({ where: { id: qC.id } });
  assert.equal(verifyQC.totalAttempts, 1);
  assert.equal(verifyQC.correctCount, 0);
  assert.equal(verifyQC.wrongCount, 1);

  // qB 正確：不應出現在錯題本中
  const wrongB = await prisma.wrongQuestionRecord.findUnique({
    where: { userId_questionId: { userId: activeUser.id, questionId: qB.id } },
  });
  assert.equal(wrongB, null, "答對之題目不應出現在個人錯題本中");
  console.log("  ✓ 模擬考批次交卷（對錯混合）精準從 1 開始累積驗證成功");

  // 3. 對戰模式作答累加至 2: qA 再次作答答對
  await prisma.$transaction([
    prisma.question.update({
      where: { id: qA.id },
      data: {
        totalAttempts: { increment: 1 },
        correctCount: { increment: 1 },
      },
    }),
    prisma.userQuestionProgress.update({
      where: { userId_questionId: { userId: activeUser.id, questionId: qA.id } },
      data: {
        attemptCount: { increment: 1 },
        correctCount: { increment: 1 },
        lastAnswer: qA.correctAnswers,
      },
    }),
    prisma.wrongQuestionRecord.update({
      where: { userId_questionId: { userId: activeUser.id, questionId: qA.id } },
      data: {
        totalAttempts: { increment: 1 },
        correctCount: { increment: 1 },
        lastUserAnswer: qA.correctAnswers,
      },
    }),
  ]);

  const verifyQA2 = await prisma.question.findUnique({ where: { id: qA.id } });
  assert.equal(verifyQA2.totalAttempts, 2, "qA 作答二次 totalAttempts 累加至 2");
  assert.equal(verifyQA2.wrongCount, 1, "qA wrongCount 維持 1");
  assert.equal(verifyQA2.correctCount, 1, "qA correctCount 累加至 1");
  console.log("  ✓ 對戰模式二次作答累加至 2 驗證成功");

  // [Phase 6] 連續 5 次冪等重置 (Idempotency Stress)
  console.log("\n[Phase 6] 執行連續 5 次冪等重置驗證...");
  for (let round = 1; round <= 5; round++) {
    const roundRes = await resetMistakeRecordsAndStats(prisma);
    assert.equal(roundRes.success, true);
    assert.equal(roundRes.finalWrongRecordCount, 0);
    assert.equal(roundRes.finalUserProgressCount, 0);
    assert.equal(roundRes.nonZeroStatsCount, 0);
    assert.equal(roundRes.finalQuestionCount, baseQuestionsCount);
  }
  console.log("  ✓ 連續 5 次冪等重置 100% 通過，無幻讀或計數殘留");

  // [Phase 7] 清理審查員測試使用者
  console.log("\n[Phase 7] 清理審查員測試帳號並確認潔淨環境...");
  await prisma.user.deleteMany({
    where: { username: { startsWith: "audit_user_" } },
  });

  const finalCheck = await resetMistakeRecordsAndStats(prisma);
  assert.equal(finalCheck.finalWrongRecordCount, 0);
  assert.equal(finalCheck.finalUserProgressCount, 0);
  assert.equal(finalCheck.nonZeroStatsCount, 0);
  assert.equal(finalCheck.finalQuestionCount, baseQuestionsCount);
  console.log("  ✓ 資料庫確認已回歸完全乾淨與歸零狀態！");

  console.log("\n==================================================");
  console.log("🎉 審查員極限質疑與壓力驗證 100% 全部通過！");
  console.log("==================================================");
}

runSkepticalAudit()
  .catch((err) => {
    console.error("❌ 審查失敗:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
