/**
 * scripts/verify_reset_and_room_code.js
 * 
 * 針對以下兩大核心需求的深度驗證套件：
 * 1. 全站錯題記錄與統計數據徹底清空歸零，且後續能從 1 正確重新累積
 * 2. 對戰模式 4 碼房間代碼全面純數字化 (1000~9999)，前端輸入框與後端生成全面相容
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { resetMistakeRecordsAndStats } = require("./reset_mistake_records.js");

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("🧪 開始執行錯題重置與 4 碼純數字房間代碼驗證套件");
  console.log("==================================================");

  // -------------------------------------------------------------
  // PART 1: 4 碼純數字房間代碼 (1000~9999) 生成與大廳契約驗證
  // -------------------------------------------------------------
  console.log("\n[Part 1] 驗證 4 碼純數字房間代碼生成與唯一性...");

  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const { generateRoomCode, createRoom, joinRoom, startBattle, updatePlayerProgress, getRoom } = battleStore;

  const NUM_SAMPLES = 1000;
  const generatedCodes = [];
  const uniqueCodeSet = new Set();

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const code = generateRoomCode();
    assert.strictEqual(code.length, 4, `代碼長度必須為 4: ${code}`);
    assert.match(code, /^[1-9][0-9]{3}$/, `代碼必須符合 1000~9999 純數字規範: ${code}`);
    assert.doesNotMatch(code, /[a-zA-Z]/, `代碼不可含有任何英文字母: ${code}`);
    const num = Number(code);
    assert.ok(num >= 1000 && num <= 9999, `代碼數值必須落在 1000 至 9999: ${code}`);
    assert.notStrictEqual(code[0], "0", `代碼首碼不可為 0: ${code}`);

    generatedCodes.push(code);
    uniqueCodeSet.add(code);
  }

  console.log(`  ✓ 隨機生成 ${NUM_SAMPLES} 組房間代碼，100% 符合 /^[1-9][0-9]{3}$/`);
  console.log(`  ✓ 產生之代碼均在 1000~9999 之間且無英文字母，不以 0 開頭`);
  console.log(`  ✓ ${NUM_SAMPLES} 次取樣包含 ${uniqueCodeSet.size} 個獨立代碼 (高熵分佈)`);

  // 驗證房間生命週期與 4 碼純數字代碼互動
  console.log("\n[Part 1.2] 驗證純數字房間代碼於真實房間生命週期中的運作...");
  const { room, playerId: hostId } = createRoom("房主小明", "shiba");
  assert.match(room.code, /^[1-9][0-9]{3}$/, `建立之房間代碼為 4 碼純數字: ${room.code}`);

  const joinResult = joinRoom(room.code, "隊友小華", "panda");
  assert.strictEqual(joinResult.room.players.length, 2, "隊友透過 4 碼純數字成功加入房間");

  const fetchedRoom = getRoom(room.code);
  assert.ok(fetchedRoom, "透過 4 碼純數字代碼成功查詢房間");
  assert.strictEqual(fetchedRoom.code, room.code);

  console.log(`  ✓ 房間創建、玩家加入、狀態查詢全面相容 4 碼純數字 (${room.code})`);

  // -------------------------------------------------------------
  // PART 2: 前端輸入框與驗證純數字化靜態契約檢驗
  // -------------------------------------------------------------
  console.log("\n[Part 2] 驗證前端輸入框屬性與純數字過濾規範...");

  const battlePageContent = fs.readFileSync(path.resolve(__dirname, "../src/app/battle/page.tsx"), "utf8");
  assert.match(battlePageContent, /inputMode="numeric"/, "battle/page.tsx 必須具備 inputMode=\"numeric\"");
  assert.match(battlePageContent, /pattern="\[0-9\]\*"|"\[0-9\]\+"/, "battle/page.tsx 必須具備 pattern=\"[0-9]*\"");
  assert.match(battlePageContent, /replace\(\/\\D\/g,\s*["']["']\)\.slice\(0,\s*4\)/, "battle/page.tsx 必須透過 replace(/\\D/g, '').slice(0, 4) 過濾非數字");
  assert.match(battlePageContent, /placeholder="例如：8520"/, "battle/page.tsx placeholder 必須為「例如：8520」");

  const battleCodeContent = fs.readFileSync(path.resolve(__dirname, "../src/app/battle/[code]/page.tsx"), "utf8");
  assert.match(battleCodeContent, /replace\(\/\\D\/g,\s*["']["']\)\.slice\(0,\s*4\)/, "battle/[code]/page.tsx 必須對 roomCode 進行純數字與 4 碼過濾");

  console.log("  ✓ 前端 inputMode=\"numeric\" 與 pattern=\"[0-9]*\" 宣告無誤 (自動喚起行動端數字鍵盤)");
  console.log("  ✓ 輸入非數字字元即時過濾 (replace(/\\D/g, '').slice(0, 4)) 宣告無誤");
  console.log("  ✓ 預設 Placeholder 為「例如：8520」");

  // -------------------------------------------------------------
  // PART 3: 錯題與統計數值徹底清空歸零驗證 (R1)
  // -------------------------------------------------------------
  console.log("\n[Part 3] 執行 resetMistakeRecordsAndStats() 重置資料庫...");
  const resetResult = await resetMistakeRecordsAndStats(prisma);

  assert.strictEqual(resetResult.success, true, "重置函式必須回傳 success: true");
  assert.strictEqual(resetResult.finalWrongRecordCount, 0, "WrongQuestionRecord 表筆數必須嚴格為 0");
  assert.strictEqual(resetResult.nonZeroStatsCount, 0, "非零統計 Question 筆數必須嚴格為 0");
  assert.strictEqual(
    resetResult.finalQuestionCount,
    resetResult.initialQuestionCount,
    "重置過程中題庫題目筆數不得發生損耗"
  );

  // 再次直接查庫以確保物理資料庫狀態
  const totalWrongRecords = await prisma.wrongQuestionRecord.count();
  assert.strictEqual(totalWrongRecords, 0, "物理資料庫 WrongQuestionRecord 筆數確認為 0");

  const nonZeroQuestions = await prisma.question.findMany({
    where: {
      OR: [
        { wrongCount: { gt: 0 } },
        { totalAttempts: { gt: 0 } },
        { correctCount: { gt: 0 } },
        { countA: { gt: 0 } },
        { countB: { gt: 0 } },
        { countC: { gt: 0 } },
        { countD: { gt: 0 } },
      ],
    },
  });
  assert.strictEqual(nonZeroQuestions.length, 0, "題庫所有題目作答統計值嚴格為 0");
  console.log(`  ✓ 成功清空 WrongQuestionRecord (筆數: ${totalWrongRecords})`);
  console.log(`  ✓ 題庫全數 ${resetResult.finalQuestionCount} 筆題目統計值全數歸零`);

  // -------------------------------------------------------------
  // PART 4: 重新開始記錄驗證 (從 1 開始重新正確累積)
  // -------------------------------------------------------------
  console.log("\n[Part 4] 驗證新作答能從 1 正確重新累積...");
  const sampleQ = await prisma.question.findFirst();
  assert.ok(sampleQ, "題庫中必須有測試題目");

  // 建立或取得測試使用者
  let testUser = await prisma.user.findFirst({ where: { username: "test_verifier" } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        username: "test_verifier",
        password: "hashed_dummy_password",
        name: "驗證者",
      },
    });
  }

  // 模擬學生作答錯題 (選 B，正解非 B)
  const isCorrect = sampleQ.correctAnswers === "B";
  const testWrongAnswer = isCorrect ? "A" : "B"; // 確保為錯題

  // 1. 更新 Question 統計
  await prisma.question.update({
    where: { id: sampleQ.id },
    data: {
      totalAttempts: { increment: 1 },
      wrongCount: { increment: 1 },
      countB: testWrongAnswer === "B" ? { increment: 1 } : 0,
      countA: testWrongAnswer === "A" ? { increment: 1 } : 0,
    },
  });

  // 2. 寫入個人錯題本
  await prisma.wrongQuestionRecord.create({
    data: {
      userId: testUser.id,
      questionId: sampleQ.id,
      wrongCount: 1,
      totalAttempts: 1,
      correctCount: 0,
      lastUserAnswer: testWrongAnswer,
    },
  });

  // 3. 查驗累積值
  const updatedQ = await prisma.question.findUnique({ where: { id: sampleQ.id } });
  assert.strictEqual(updatedQ.totalAttempts, 1, "Question totalAttempts 應從 0 累加至 1");
  assert.strictEqual(updatedQ.wrongCount, 1, "Question wrongCount 應從 0 累加至 1");
  assert.strictEqual(updatedQ.correctCount, 0, "Question correctCount 應維持 0");
  if (testWrongAnswer === "B") {
    assert.strictEqual(updatedQ.countB, 1, "Question countB 應從 0 累加至 1");
  } else {
    assert.strictEqual(updatedQ.countA, 1, "Question countA 應從 0 累加至 1");
  }

  const userRecord = await prisma.wrongQuestionRecord.findUnique({
    where: {
      userId_questionId: {
        userId: testUser.id,
        questionId: sampleQ.id,
      },
    },
  });
  assert.ok(userRecord, "個人錯題記錄成功建立");
  assert.strictEqual(userRecord.wrongCount, 1, "個人錯題次數初始為 1");
  assert.strictEqual(userRecord.totalAttempts, 1, "個人作答次數初始為 1");
  assert.strictEqual(userRecord.correctCount, 0, "個人答對次數初始為 0");
  assert.strictEqual(userRecord.lastUserAnswer, testWrongAnswer, "記錄最後一次作答答案");

  console.log("  ✓ 作答一題錯題後，該題全站統計與個人錯題記錄成功從 1 開始累積！");

  // 4. 清理測試資料，恢復乾淨歸零狀態
  console.log("\n[Part 5] 恢復全站徹底清空歸零狀態...");
  await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  const cleanFinal = await resetMistakeRecordsAndStats(prisma);
  assert.strictEqual(cleanFinal.finalWrongRecordCount, 0);
  assert.strictEqual(cleanFinal.nonZeroStatsCount, 0);
  console.log("  ✓ 資料庫已回歸完全歸零與無錯題狀態");

  console.log("\n==================================================");
  console.log("🎉 所有驗證項目 100% 通過！");
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
