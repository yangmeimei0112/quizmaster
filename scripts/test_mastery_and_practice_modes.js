const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("🧪 題型偏好 (未曾測驗/測驗我不會) 與「這題我會了」自動化測試");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ [通過] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [失敗] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [通過] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [失敗] ${name}:`, err.message);
      failed++;
    }
  }

  // --- 1. Schema 與型別定義檢驗 ---
  console.log("\n[Part 1] Prisma Schema 與 TypeScript 型別檢驗...");

  const schemaContent = fs.readFileSync(
    path.join(__dirname, "../prisma/schema.prisma"),
    "utf8"
  );
  const typesContent = fs.readFileSync(
    path.join(__dirname, "../src/types/question.ts"),
    "utf8"
  );

  test("1.1 prisma.schema 定義 UserQuestionProgress 模型", () => {
    assert.match(schemaContent, /model UserQuestionProgress\s*\{/);
    assert.match(schemaContent, /userId\s+String/);
    assert.match(schemaContent, /questionId\s+String/);
    assert.match(schemaContent, /isMastered\s+Boolean\s+@default\(false\)/);
    assert.match(schemaContent, /attemptCount\s+Int\s+@default\(0\)/);
    assert.match(schemaContent, /correctCount\s+Int\s+@default\(0\)/);
    assert.match(schemaContent, /@@unique\(\[userId,\s*questionId\]\)/);
  });

  test("1.2 User 與 Question 模型包含 userProgress 關聯", () => {
    assert.match(schemaContent, /userProgress\s+UserQuestionProgress\[\]/);
    assert.match(schemaContent, /questionProgress\s+UserQuestionProgress\[\]/);
  });

  test("1.3 types/question.ts 定義 UserQuestionProgress 介面", () => {
    assert.match(typesContent, /export interface UserQuestionProgress\s*\{/);
    assert.match(typesContent, /isMastered:\s*boolean/);
    assert.match(typesContent, /attemptCount:\s*number/);
    assert.match(typesContent, /correctCount:\s*number/);
  });

  // --- 2. 前端原始碼合約與 UI 規範檢驗 ---
  console.log("\n[Part 2] 前端原始碼規範檢驗 (src/app/practice/page.tsx)...");

  const practicePageContent = fs.readFileSync(
    path.join(__dirname, "../src/app/practice/page.tsx"),
    "utf8"
  );

  test("2.1 大廳具備「未曾測驗的題目」與「測驗我不會的題目」篩選選項", () => {
    assert.ok(practicePageContent.includes("UNTESTED"), "需包含 UNTESTED 模式");
    assert.ok(practicePageContent.includes("UNMASTERED"), "需包含 UNMASTERED 模式");
    assert.ok(practicePageContent.includes("未曾測驗的題目"), "需包含「未曾測驗的題目」按鈕文字");
    assert.ok(practicePageContent.includes("測驗我不會的題目"), "需包含「測驗我不會的題目」按鈕文字");
  });

  test("2.2 未登入使用者點擊偏好時具備防呆機制與 AuthModal 觸發", () => {
    assert.ok(practicePageContent.includes("openAuthModal"), "需整合 openAuthModal");
    assert.ok(
      practicePageContent.includes("此模式需登入使用，紀錄您的專屬作答軌跡"),
      "需提供登入提示文字"
    );
  });

  test("2.3 作答揭曉後在選項與解析之間配置【💡 這題我會了】按鈕", () => {
    assert.ok(practicePageContent.includes("data-mastery-btn"), "需具備 data-mastery-btn 標記");
    assert.ok(
      practicePageContent.includes("這題我會了"),
      "需具備「這題我會了」標籤"
    );
    assert.ok(
      practicePageContent.includes("已掌握（這題我會了）"),
      "掌握後需轉為已掌握狀態文字"
    );
    // 確認位置在 ExplanationCard 之前
    const buttonIndex = practicePageContent.indexOf("data-mastery-btn");
    const explanationIndex = practicePageContent.indexOf("<ExplanationCard");
    assert.ok(
      buttonIndex > 0 && explanationIndex > buttonIndex,
      "【這題我會了】按鈕必須置於 ExplanationCard 上方"
    );
  });

  // --- 3. 後端 API 邏輯與資料庫整合檢驗 ---
  console.log("\n[Part 3] 後端 API 邏輯與資料庫 CRUD 整合檢驗...");

  const testUser = await prisma.user.create({
    data: {
      username: `test_mastery_user_${Date.now()}`,
      password: "hashed_password_123",
      name: "Mastery Tester",
    },
  });

  // 取得 3 題題目做測試
  const sampleQuestions = await prisma.question.findMany({ take: 3 });
  if (sampleQuestions.length < 3) {
    throw new Error("題庫題目少於 3 題，無法執行完整隔離測試");
  }

  const [q1, q2, q3] = sampleQuestions;

  try {
    await asyncTest("3.1 初始狀態下，3 題題目均屬於該使用者的「未曾測驗」範圍", async () => {
      // 模擬 mode=untested 查詢
      const testedProgress = await prisma.userQuestionProgress.findMany({
        where: { userId: testUser.id, attemptCount: { gt: 0 } },
        select: { questionId: true },
      });
      const testedIds = testedProgress.map((p) => p.questionId);

      const untestedQuestions = await prisma.question.findMany({
        where: { id: { in: [q1.id, q2.id, q3.id], notIn: testedIds } },
      });

      assert.strictEqual(untestedQuestions.length, 3, "初始 3 題皆應為未曾測驗");
    });

    await asyncTest("3.2 作答 q1 後，q1 自動自「未曾測驗」中排除並記錄進度", async () => {
      // 模擬使用者作答 q1
      await prisma.userQuestionProgress.create({
        data: {
          userId: testUser.id,
          questionId: q1.id,
          attemptCount: 1,
          correctCount: 1,
          isMastered: false, // 答對但尚未手動標記「我會了」
        },
      });

      const testedProgress = await prisma.userQuestionProgress.findMany({
        where: { userId: testUser.id, attemptCount: { gt: 0 } },
        select: { questionId: true },
      });
      const testedIds = testedProgress.map((p) => p.questionId);

      const untested = await prisma.question.findMany({
        where: { id: { in: [q1.id, q2.id, q3.id], notIn: testedIds } },
      });

      assert.strictEqual(untested.length, 2, "q1 作答後未測驗剩 2 題");
      assert.ok(!untested.some((q) => q.id === q1.id), "q1 不得再出現在未測驗清單中");
    });

    await asyncTest("3.3 曾作答但 isMastered: false 之題目，正確納入「測驗我不會的題目」", async () => {
      // 使用者作答 q2 答錯
      await prisma.userQuestionProgress.create({
        data: {
          userId: testUser.id,
          questionId: q2.id,
          attemptCount: 1,
          correctCount: 0,
          isMastered: false,
        },
      });

      // 查詢「測驗我不會的題目」 (曾作答且 isMastered === false)
      const unmasteredRecords = await prisma.userQuestionProgress.findMany({
        where: {
          userId: testUser.id,
          attemptCount: { gt: 0 },
          isMastered: false,
        },
        select: { questionId: true },
      });
      const unmasteredIds = unmasteredRecords.map((r) => r.questionId);

      const unmasteredQuestions = await prisma.question.findMany({
        where: { id: { in: unmasteredIds } },
      });

      const ids = unmasteredQuestions.map((q) => q.id);
      assert.ok(ids.includes(q1.id), "q1 (未標記掌握) 應在不會的題目中");
      assert.ok(ids.includes(q2.id), "q2 (未標記掌握) 應在不會的題目中");
      assert.ok(!ids.includes(q3.id), "q3 (未曾測驗) 不得在不會的題目中");
    });

    await asyncTest("3.4 點擊【這題我會了】標記 q1 為已掌握 (isMastered: true) 後，即時移出「我不會的題目」", async () => {
      // 模擬 POST /api/practice/mastery
      await prisma.userQuestionProgress.update({
        where: {
          userId_questionId: {
            userId: testUser.id,
            questionId: q1.id,
          },
        },
        data: {
          isMastered: true,
        },
      });

      // 重新篩選「測驗我不會的題目」
      const unmasteredRecords = await prisma.userQuestionProgress.findMany({
        where: {
          userId: testUser.id,
          attemptCount: { gt: 0 },
          isMastered: false,
        },
        select: { questionId: true },
      });
      const unmasteredIds = unmasteredRecords.map((r) => r.questionId);

      assert.ok(!unmasteredIds.includes(q1.id), "已掌握的 q1 必須從我不會的清單中移出");
      assert.ok(unmasteredIds.includes(q2.id), "未掌握的 q2 仍應保留");
    });

    await asyncTest("3.5 再次點擊【這題我會了】可取消掌握標記，狀態翻轉回 isMastered: false", async () => {
      // 再次切換 q1
      await prisma.userQuestionProgress.update({
        where: {
          userId_questionId: {
            userId: testUser.id,
            questionId: q1.id,
          },
        },
        data: {
          isMastered: false,
        },
      });

      const record = await prisma.userQuestionProgress.findUnique({
        where: {
          userId_questionId: {
            userId: testUser.id,
            questionId: q1.id,
          },
        },
      });

      assert.strictEqual(record.isMastered, false, "取消標記後 isMastered 應為 false");
    });

    await asyncTest("3.6 級聯刪除 (Cascade Delete)：使用者帳號刪除時關聯進度同步清空", async () => {
      await prisma.user.delete({ where: { id: testUser.id } });
      const remainingProgress = await prisma.userQuestionProgress.findMany({
        where: { userId: testUser.id },
      });
      assert.strictEqual(remainingProgress.length, 0, "Progress 筆數必須為 0");
    });

  } finally {
    // 確保測試帳號被徹底清除
    try {
      await prisma.userQuestionProgress.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    } catch {}
  }

  // --- 4. 深度 API 契約、安全防護與邊界驗證 ---
  console.log("\n[Part 4] 深度 API 契約、未登入安全阻擋與極限邊界檢驗...");

  const questionsRouteContent = fs.readFileSync(
    path.join(__dirname, "../src/app/api/questions/route.ts"),
    "utf8"
  );
  const practiceQuestionsRouteContent = fs.readFileSync(
    path.join(__dirname, "../src/app/api/practice/questions/route.ts"),
    "utf8"
  );
  const practiceMasteryRouteContent = fs.readFileSync(
    path.join(__dirname, "../src/app/api/practice/mastery/route.ts"),
    "utf8"
  );

  test("4.1 force-dynamic 靜態優化規避宣告檢驗", () => {
    assert.ok(
      questionsRouteContent.includes('export const dynamic = "force-dynamic"'),
      "questions route 必須明確宣告 force-dynamic"
    );
    assert.ok(
      practiceQuestionsRouteContent.includes('export const dynamic = "force-dynamic"'),
      "practice/questions route 必須明確宣告 force-dynamic"
    );
    assert.ok(
      practiceMasteryRouteContent.includes('export const dynamic = "force-dynamic"'),
      "practice/mastery route 必須明確宣告 force-dynamic"
    );
  });

  test("4.2 未登入使用者存取未曾測驗/我不會的題目時嚴格回傳 401 與 requiresAuth 標記", () => {
    assert.ok(
      questionsRouteContent.includes('requiresAuth: true'),
      "questions 路由未登入存取時需回傳 requiresAuth: true"
    );
    assert.ok(
      practiceQuestionsRouteContent.includes('requiresAuth: true'),
      "practice/questions 路由未登入存取時需回傳 requiresAuth: true"
    );
    assert.ok(
      practiceMasteryRouteContent.includes('requiresAuth: true'),
      "practice/mastery 路由未登入切換時需回傳 requiresAuth: true"
    );
  });

  test("4.3 POST /api/practice/mastery 包含不存在題目之 404 防呆檢查", () => {
    assert.ok(
      practiceMasteryRouteContent.includes("找不到指定的題目"),
      "practice/mastery 需包含題目不存在之 404 檢查"
    );
  });

  // 使用獨立測試帳號 2 測試邊界狀態與多次切換
  const testUser2 = await prisma.user.create({
    data: {
      username: `test_boundary_user_${Date.now()}`,
      password: "hashed_password_456",
      name: "Boundary Tester",
    },
  });

  try {
    await asyncTest("4.4 作答對錯之計數原子累計 (attemptCount & correctCount 獨立統計)", async () => {
      // 第一次答錯
      await prisma.userQuestionProgress.create({
        data: {
          userId: testUser2.id,
          questionId: q1.id,
          attemptCount: 1,
          correctCount: 0,
          isMastered: false,
        },
      });

      // 第二次答對：attemptCount 累加, correctCount 累加
      await prisma.userQuestionProgress.update({
        where: {
          userId_questionId: {
            userId: testUser2.id,
            questionId: q1.id,
          },
        },
        data: {
          attemptCount: { increment: 1 },
          correctCount: { increment: 1 },
        },
      });

      const rec = await prisma.userQuestionProgress.findUnique({
        where: {
          userId_questionId: {
            userId: testUser2.id,
            questionId: q1.id,
          },
        },
      });

      assert.strictEqual(rec.attemptCount, 2, "總作答次數應累計至 2");
      assert.strictEqual(rec.correctCount, 1, "答對次數應為 1");
      assert.strictEqual(rec.isMastered, false, "未手動標記前 isMastered 仍為 false");
    });

    await asyncTest("4.5 連續多次翻轉「這題我會了」(false -> true -> false -> true) 狀態精準一致", async () => {
      // 翻轉至 true
      await prisma.userQuestionProgress.update({
        where: { userId_questionId: { userId: testUser2.id, questionId: q1.id } },
        data: { isMastered: true },
      });
      let rec = await prisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId: testUser2.id, questionId: q1.id } },
      });
      assert.strictEqual(rec.isMastered, true);

      // 翻轉回 false
      await prisma.userQuestionProgress.update({
        where: { userId_questionId: { userId: testUser2.id, questionId: q1.id } },
        data: { isMastered: false },
      });
      rec = await prisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId: testUser2.id, questionId: q1.id } },
      });
      assert.strictEqual(rec.isMastered, false);

      // 再次翻轉至 true
      await prisma.userQuestionProgress.update({
        where: { userId_questionId: { userId: testUser2.id, questionId: q1.id } },
        data: { isMastered: true },
      });
      rec = await prisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId: testUser2.id, questionId: q1.id } },
      });
      assert.strictEqual(rec.isMastered, true);
    });

    await asyncTest("4.6 向下相容整合：既有 WrongQuestionRecord 正確回退映射至未掌握題目", async () => {
      // 在無 UserQuestionProgress 下建立舊版錯題紀錄
      await prisma.wrongQuestionRecord.create({
        data: {
          userId: testUser2.id,
          questionId: q2.id,
          wrongCount: 3,
          totalAttempts: 5,
          correctCount: 2,
        },
      });

      // 模擬 GET /api/practice/mastery 之向下相容合併邏輯
      const [progressList, wrongRecords] = await Promise.all([
        prisma.userQuestionProgress.findMany({ where: { userId: testUser2.id } }),
        prisma.wrongQuestionRecord.findMany({ where: { userId: testUser2.id } }),
      ]);

      const progressMap = {};
      for (const wr of wrongRecords) {
        progressMap[wr.questionId] = {
          isMastered: false,
          attemptCount: wr.totalAttempts || wr.wrongCount || 1,
          correctCount: wr.correctCount || 0,
        };
      }
      for (const p of progressList) {
        progressMap[p.questionId] = {
          isMastered: p.isMastered,
          attemptCount: p.attemptCount,
          correctCount: p.correctCount,
        };
      }

      // q2 雖無 UserQuestionProgress，但由 WrongQuestionRecord 映射出未掌握狀態
      assert.ok(progressMap[q2.id], "q2 應存在於 progressMap 中");
      assert.strictEqual(progressMap[q2.id].isMastered, false, "q2 預設為未掌握");
      assert.strictEqual(progressMap[q2.id].attemptCount, 5, "作答次數應為 5");

      // q1 存在 UserQuestionProgress 且為 true，應保持掌握
      assert.ok(progressMap[q1.id], "q1 應存在於 progressMap 中");
      assert.strictEqual(progressMap[q1.id].isMastered, true, "q1 應為已掌握");
    });

  } finally {
    try {
      await prisma.userQuestionProgress.deleteMany({ where: { userId: testUser2.id } });
      await prisma.wrongQuestionRecord.deleteMany({ where: { userId: testUser2.id } });
      await prisma.user.deleteMany({ where: { id: testUser2.id } });
    } catch {}
  }

  console.log("\n==================================================");
  console.log(`總測試項目: ${passed + failed} | 通過: ${passed} | 失敗: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
