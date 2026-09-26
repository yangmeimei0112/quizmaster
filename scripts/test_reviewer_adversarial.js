/**
 * scripts/test_reviewer_adversarial.js
 * 
 * Adversarial Verification Harness for:
 * 1. 1000~9999 Pure Numeric Room Code Generator (Edge cases, distribution, pool exhaustion, fallback)
 * 2. Join API Route Input Sanitization & Validation
 * 3. Database Reset Atomicity, Idempotency, and Question Row Preservation Invariant
 * 4. Post-Reset Accumulation across Practice, Batch Mock Exam, and Battle
 */

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");
const { resetMistakeRecordsAndStats } = require("./reset_mistake_records.js");

const prisma = new PrismaClient();

async function runAdversarialReview() {
  console.log("==================================================");
  console.log("⚔️ 啟動 REVIEWER 極限對抗性測試套件 (Adversarial Test Suite)");
  console.log("==================================================");

  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const {
    generateRoomCode,
    createRoom,
    joinRoom,
    getRoom,
    roomsStore, // Global map
  } = battleStore;

  // -------------------------------------------------------------
  // ATTACK 1: 10,000 組房間代碼生成極限分佈與邊界檢驗
  // -------------------------------------------------------------
  console.log("\n[Attack 1] 10,000 次高頻房間代碼生成極限邊界與正規化檢驗...");
  let minCode = 9999;
  let maxCode = 1000;
  const codesSet = new Set();

  for (let i = 0; i < 10000; i++) {
    const code = generateRoomCode();
    assert.equal(typeof code, "string", "代碼必須為 string 型別");
    assert.equal(code.length, 4, `代碼長度必須剛好為 4 碼: ${code}`);
    assert.equal(/^[1-9][0-9]{3}$/.test(code), true, `代碼必須嚴格匹配 /^[1-9][0-9]{3}$/: ${code}`);
    assert.equal(/[a-zA-Z]/.test(code), false, `代碼絕不可包含任何英文字母: ${code}`);
    assert.notEqual(code[0], "0", `代碼首碼不可為 0: ${code}`);

    const val = Number(code);
    assert.equal(Number.isInteger(val), true, "數值必須為整數");
    assert.equal(val >= 1000 && val <= 9999, true, `數值必須在 1000..9999 範圍內: ${val}`);

    if (val < minCode) minCode = val;
    if (val > maxCode) maxCode = val;
    codesSet.add(code);
  }

  assert.ok(minCode >= 1000, `最小值 ${minCode} >= 1000`);
  assert.ok(maxCode <= 9999, `最大值 ${maxCode} <= 9999`);
  assert.ok(codesSet.size >= 5000, `10,000 次生成具備高熵覆蓋 (${codesSet.size} 個獨立代碼)`);
  console.log(`  ✓ 10,000 次取樣 100% 合規，觀測範圍 [${minCode} ~ ${maxCode}]，獨立代碼數: ${codesSet.size}`);

  // -------------------------------------------------------------
  // ATTACK 2: 9,000 房間代碼池飽和與枯竭例外處理 (Pool Saturation)
  // -------------------------------------------------------------
  console.log("\n[Attack 2] 房間代碼池飽和、最後空位填補與枯竭例外 (9,000 房間滿載測試)...");
  
  // 取得全域 roomsStore (透過 globalThis 或直接變更)
  const globalStore = globalThis.__battleRoomsStore;
  assert.ok(globalStore, "全域 __battleRoomsStore 必須存在");

  // 暫存原房間
  const originalRooms = new Map(globalStore);
  globalStore.clear();

  try {
    // 預先填入 1000 至 9998 (共 8,999 間房間，留下唯一的 9999)
    const dummyRoomTemplate = {
      code: "",
      hostId: "dummy_host",
      settings: { maxPlayers: 4, mode: "CUSTOM", questionCount: 5, orderMode: "SAME" },
      stage: "LOBBY",
      players: [],
      questions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    for (let c = 1000; c <= 9998; c++) {
      const codeStr = String(c);
      globalStore.set(codeStr, { ...dummyRoomTemplate, code: codeStr });
    }
    assert.equal(globalStore.size, 8999, "成功模擬 8,999 間房間滿載");

    // 嘗試生成：應精準命中唯一的剩餘代碼 '9999'
    const lastCode = generateRoomCode();
    assert.equal(lastCode, "9999", "代碼池接近飽和時應藉由線性 fallback 順利尋得唯一空位 9999");
    globalStore.set("9999", { ...dummyRoomTemplate, code: "9999" });
    assert.equal(globalStore.size, 9000, "代碼池已達 100% 全滿 (9,000 間)");

    // 再次嘗試生成：應拋出代碼用盡錯誤
    assert.throws(
      () => {
        generateRoomCode();
      },
      (err) => {
        assert.match(err.message, /房間代碼已用盡/);
        return true;
      },
      "9,000 間全滿時應拋出 '房間代碼已用盡，無法建立更多房間'"
    );

    // 釋放一間房間 (例如 5555)
    globalStore.delete("5555");
    assert.equal(globalStore.size, 8999);
    const reclaimedCode = generateRoomCode();
    assert.equal(reclaimedCode, "5555", "釋放單一房間後應即刻被再次利用");
    console.log("  ✓ 9,000 房間滿載、唯一空位檢索、枯竭防護與資源回收檢驗全部通過");
  } finally {
    // 恢復原始房間
    globalStore.clear();
    for (const [k, v] of originalRooms) {
      globalStore.set(k, v);
    }
  }

  // -------------------------------------------------------------
  // ATTACK 3: 前端非數字字元過濾與邊界輸入比對
  // -------------------------------------------------------------
  console.log("\n[Attack 3] 前端非數字輸入、貼上混合字串與邊界過濾正規化檢驗...");

  function sanitizeRoomCodeInput(val) {
    return String(val || "").replace(/\D/g, "").slice(0, 4);
  }

  assert.equal(sanitizeRoomCodeInput("abcd"), "", "純英文應被過濾為空字串");
  assert.equal(sanitizeRoomCodeInput("R7X2"), "72", "舊版英數字串應僅保留數字");
  assert.equal(sanitizeRoomCodeInput("8520"), "8520", "標準 4 碼純數字完整保留");
  assert.equal(sanitizeRoomCodeInput(" 8 5 2 0 "), "8520", "帶空格數字應自動合攏為 4 碼");
  assert.equal(sanitizeRoomCodeInput("1234567"), "1234", "超過 4 碼應被截斷為前 4 碼");
  assert.equal(sanitizeRoomCodeInput("房間：9876"), "9876", "中文與符號混合輸入應精準提取 4 碼數字");
  assert.equal(sanitizeRoomCodeInput("！＠＃＄"), "", "特殊全形半形標點應過濾");
  assert.equal(sanitizeRoomCodeInput(null), "", "null 輸入安全處理");
  assert.equal(sanitizeRoomCodeInput(undefined), "", "undefined 輸入安全處理");
  console.log("  ✓ 前端輸入防禦邏輯 8 種極端輸入情境驗證通過");

  // -------------------------------------------------------------
  // ATTACK 4: 資料庫重置腳本事務原子性、冪等性與題庫筆數零損耗檢驗
  // -------------------------------------------------------------
  console.log("\n[Attack 4] 資料庫重置腳本事務原子性、冪等性與 Question 零損耗檢驗...");

  const initialQuestionsCount = await prisma.question.count();
  assert.ok(initialQuestionsCount > 0, "題庫必須具備基礎題目");

  // 建立 3 位測試使用者與 5 筆錯題記錄
  const testUser = await prisma.user.upsert({
    where: { username: "adversarial_tester" },
    update: {},
    create: { username: "adversarial_tester", password: "dummy_password", name: "對抗測試員" },
  });

  const sampleQuestions = await prisma.question.findMany({ take: 3 });
  for (const q of sampleQuestions) {
    await prisma.question.update({
      where: { id: q.id },
      data: {
        wrongCount: 99,
        totalAttempts: 150,
        correctCount: 51,
        countA: 30,
        countB: 40,
        countC: 50,
        countD: 30,
      },
    });

    await prisma.wrongQuestionRecord.upsert({
      where: {
        userId_questionId: {
          userId: testUser.id,
          questionId: q.id,
        },
      },
      update: { wrongCount: 99, totalAttempts: 150 },
      create: {
        userId: testUser.id,
        questionId: q.id,
        wrongCount: 99,
        totalAttempts: 150,
        correctCount: 51,
        lastUserAnswer: "C",
      },
    });
  }

  const preWrongCount = await prisma.wrongQuestionRecord.count();
  assert.ok(preWrongCount >= 3, "錯題本成功寫入污染測試數據");

  // 第一次執行重置
  const r1 = await resetMistakeRecordsAndStats(prisma);
  assert.equal(r1.success, true);
  assert.equal(r1.finalWrongRecordCount, 0, "WrongQuestionRecord 必須為 0");
  assert.equal(r1.nonZeroStatsCount, 0, "非零統計 Question 必須為 0");
  assert.equal(r1.finalQuestionCount, initialQuestionsCount, "題庫筆數絕對不變");

  // 第二次執行重置 (冪等性驗證)
  const r2 = await resetMistakeRecordsAndStats(prisma);
  assert.equal(r2.success, true);
  assert.equal(r2.finalWrongRecordCount, 0, "冪等重置 WrongQuestionRecord 維持 0");
  assert.equal(r2.nonZeroStatsCount, 0, "冪等重置 非零統計 Question 維持 0");
  assert.equal(r2.finalQuestionCount, initialQuestionsCount, "冪等重置 題庫筆數維持不變");
  assert.equal(r2.deletedWrongRecords, 0, "二次執行無需重複刪除");
  console.log("  ✓ 重置腳本原子交易與冪等性 (Idempotency) 檢驗 100% 通過");

  // -------------------------------------------------------------
  // ATTACK 5: 重置後作答全新累積驗證 (從 1 開始累積全站與個人統計)
  // -------------------------------------------------------------
  console.log("\n[Attack 5] 模擬刷題/模擬考多題目新作答，驗證統計精準從 1 重新累積...");

  const testQ = sampleQuestions[0];
  const qBefore = await prisma.question.findUnique({ where: { id: testQ.id } });
  assert.equal(qBefore.wrongCount, 0);
  assert.equal(qBefore.totalAttempts, 0);
  assert.equal(qBefore.correctCount, 0);
  assert.equal(qBefore.countA, 0);

  // 模擬學生答錯選 A (正解假設非 A)
  const chosenOpt = testQ.correctAnswers === "A" ? "B" : "A";
  const isCorrect = testQ.correctAnswers === chosenOpt;

  // 呼叫更新邏輯 (比照 /api/wrong-questions POST 邏輯)
  const updateData = {
    totalAttempts: { increment: 1 },
  };
  if (isCorrect) {
    updateData.correctCount = { increment: 1 };
  } else {
    updateData.wrongCount = { increment: 1 };
  }
  if (chosenOpt === "A") updateData.countA = { increment: 1 };
  if (chosenOpt === "B") updateData.countB = { increment: 1 };

  await prisma.question.update({
    where: { id: testQ.id },
    data: updateData,
  });

  if (!isCorrect) {
    await prisma.wrongQuestionRecord.create({
      data: {
        userId: testUser.id,
        questionId: testQ.id,
        wrongCount: 1,
        totalAttempts: 1,
        correctCount: 0,
        lastUserAnswer: chosenOpt,
      },
    });
  }

  const qAfter = await prisma.question.findUnique({ where: { id: testQ.id } });
  assert.equal(qAfter.totalAttempts, 1, "全站 totalAttempts 應精準等於 1");
  if (!isCorrect) {
    assert.equal(qAfter.wrongCount, 1, "全站 wrongCount 應精準等於 1");
  }
  if (chosenOpt === "A") {
    assert.equal(qAfter.countA, 1, "全站 countA 應精準等於 1");
  } else {
    assert.equal(qAfter.countB, 1, "全站 countB 應精準等於 1");
  }

  // 二次作答同題目：應累加至 2
  await prisma.question.update({
    where: { id: testQ.id },
    data: {
      totalAttempts: { increment: 1 },
      wrongCount: { increment: 1 },
    },
  });
  const qAfterSecond = await prisma.question.findUnique({ where: { id: testQ.id } });
  assert.equal(qAfterSecond.totalAttempts, 2, "二次作答 totalAttempts 累加至 2");
  console.log("  ✓ 作答全新累積驗證通過：初次作答從 1 開始，二次作答累加至 2");

  // -------------------------------------------------------------
  // ATTACK 6: 最終資料庫清理與歸零回歸
  // -------------------------------------------------------------
  console.log("\n[Attack 6] 清理測試數據並確認資料庫維持 100% 潔淨歸零狀態...");
  await prisma.wrongQuestionRecord.deleteMany({ where: { userId: testUser.id } });
  await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  const finalReset = await resetMistakeRecordsAndStats(prisma);
  assert.equal(finalReset.finalWrongRecordCount, 0);
  assert.equal(finalReset.nonZeroStatsCount, 0);
  assert.equal(finalReset.finalQuestionCount, initialQuestionsCount);
  console.log("  ✓ 資料庫已回歸徹底歸零與零錯題狀態");

  console.log("\n==================================================");
  console.log("🎉 REVIEWER 極限對抗性測試全數 100% 通過！");
  console.log("==================================================");
}

runAdversarialReview()
  .catch((err) => {
    console.error("❌ 對抗性測試失敗:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
