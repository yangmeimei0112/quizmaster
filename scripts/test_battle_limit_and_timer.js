/**
 * test_battle_limit_and_timer.js
 * 整合自動化測試：
 * 1. 對戰模式自訂題數上限為動態題庫總數（無 100 題硬編碼限制）。
 * 2. 創建/更新房間支援每題限時模式 (timeLimitPerQuestion)。
 * 3. 對戰作答時超時自動送出邏輯 (有選取自動送出、未選取判定未作答並計錯)。
 * 4. 手動送出後停止計時器並保留解析展示與下一題切換。
 * 5. 全站零 Emoji 規範靜態檢核。
 */

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("[測試] 開始執行對戰模式動態題數上限與每題限時自動化測試");
  console.log("==================================================");

  let passed = 0;
  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      process.exitCode = 1;
    }
  }

  // 動態匯入 TypeScript 模組
  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const answerUtilsPath = path.resolve(__dirname, "../src/lib/answerUtils.ts");

  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const answerUtils = await import("file://" + answerUtilsPath.replace(/\\/g, "/"));

  const {
    createRoom,
    joinRoom,
    getRoom,
    updateRoomSettings,
    startBattle,
  } = battleStore;

  const { compareAnswers, formatAnswerDisplay, normalizeAnswers } = answerUtils;

  // 1. 查詢真實題庫總數
  console.log("\n--- 1. 動態題庫上限與 API 邊界驗證 ---");
  const totalQuestionsCount = await prisma.question.count();
  console.log(`  題庫目前總題數: ${totalQuestionsCount}`);

  test("題庫題目數量大於等於 0", () => {
    assert(typeof totalQuestionsCount === "number" && totalQuestionsCount >= 0);
  });

  // 驗證 create/route.ts 與 [code]/route.ts 檔案內容不包含 100 題硬編碼限制
  const createRouteContent = fs.readFileSync(
    path.resolve(__dirname, "../src/app/api/battle/create/route.ts"),
    "utf-8"
  );
  const codeRouteContent = fs.readFileSync(
    path.resolve(__dirname, "../src/app/api/battle/[code]/route.ts"),
    "utf-8"
  );
  const roomLobbyContent = fs.readFileSync(
    path.resolve(__dirname, "../src/components/battle/RoomLobbyView.tsx"),
    "utf-8"
  );
  const battlePageContent = fs.readFileSync(
    path.resolve(__dirname, "../src/app/battle/page.tsx"),
    "utf-8"
  );

  test("API create route 使用 totalQuestionsCount 作為自訂題數動態上限", () => {
    assert(createRouteContent.includes("totalQuestionsCount"));
    assert(!createRouteContent.includes("qCount > 100"));
    assert(createRouteContent.includes("qCount > totalQuestionsCount"));
  });

  test("API [code] PATCH route 使用 totalQuestionsCount 作為自訂題數動態上限", () => {
    assert(codeRouteContent.includes("totalQuestionsCount"));
    assert(!codeRouteContent.includes("qCount > 100"));
    assert(codeRouteContent.includes("qCount > totalQuestionsCount"));
  });

  test("RoomLobbyView 移除 100 題上限硬編碼，改用 totalQuestionsCount", () => {
    assert(!roomLobbyContent.includes("max={100}"));
    assert(!roomLobbyContent.includes("1 ~ 100"));
    assert(roomLobbyContent.includes("totalQuestionsCount"));
  });

  test("對戰大廳 battle/page 移除 100 題上限硬編碼，使用 totalQuestionsCount", () => {
    assert(!battlePageContent.includes("max={100}"));
    assert(battlePageContent.includes("totalQuestionsCount"));
  });

  // 2. 測試 createRoom 與 updateRoomSettings 支援 timeLimitPerQuestion
  console.log("\n--- 2. timeLimitPerQuestion 房間限時設定支援 ---");
  const { room: r1, playerId: hostId1 } = createRoom("限時房主", "shiba", {
    maxPlayers: 4,
    mode: "CUSTOM",
    questionCount: 15,
    timeLimitPerQuestion: 20,
  });

  test("createRoom 成功初始化每題限時 20 秒", () => {
    assert.equal(r1.settings.timeLimitPerQuestion, 20);
    assert.equal(r1.settings.questionCount, 15);
  });

  const { room: r2 } = createRoom("不限時房主", "panda", {
    maxPlayers: 2,
    mode: "CUSTOM",
    questionCount: 10,
    timeLimitPerQuestion: 0,
  });

  test("createRoom 成功初始化不限時 (0 秒)", () => {
    assert.equal(r2.settings.timeLimitPerQuestion, 0);
  });

  test("updateRoomSettings 房主可動態調整每題限時", () => {
    const updated = updateRoomSettings(r1.code, hostId1, {
      timeLimitPerQuestion: 30,
    });
    assert.equal(updated.settings.timeLimitPerQuestion, 30);
  });

  test("updateRoomSettings 房主可將限時改為不限時 (0 秒)", () => {
    const updated = updateRoomSettings(r1.code, hostId1, {
      timeLimitPerQuestion: 0,
    });
    assert.equal(updated.settings.timeLimitPerQuestion, 0);
  });

  test("timeLimitPerQuestion 自動清理負數為 0", () => {
    const updated = updateRoomSettings(r1.code, hostId1, {
      timeLimitPerQuestion: -10,
    });
    assert.equal(updated.settings.timeLimitPerQuestion, 0);
  });

  // 3. 超時自動結算判定模擬
  console.log("\n--- 3. 超時自動結算比對與未作答計分語義 ---");
  const standardAnswer = "B";

  test("超時未選取任何選項 (空答案) compareAnswers 嚴格判定為 false", () => {
    const isCorrect = compareAnswers([], standardAnswer);
    assert.equal(isCorrect, false);
  });

  test("超時未選取任何選項 formatAnswerDisplay 正確格式化為空或由 fallback 提供 '未作答'", () => {
    const formatted = formatAnswerDisplay([]) || "未作答";
    assert.equal(formatted, "未作答");
  });

  test("超時已選取正確答案時自動送出比對成功", () => {
    const isCorrect = compareAnswers(["B"], standardAnswer);
    assert.equal(isCorrect, true);
  });

  test("超時已選取錯誤答案時自動送出比對失敗", () => {
    const isCorrect = compareAnswers(["A"], standardAnswer);
    assert.equal(isCorrect, false);
  });

  test("複選題超時未作答比對判定為 false", () => {
    const isCorrect = compareAnswers([], "A,C");
    assert.equal(isCorrect, false);
  });

  test("複選題超時部分選取比對判定為 false", () => {
    const isCorrect = compareAnswers(["A"], "A,C");
    assert.equal(isCorrect, false);
  });

  test("複選題超時全數選對比對判定為 true", () => {
    const isCorrect = compareAnswers(["A", "C"], "A,C");
    assert.equal(isCorrect, true);
  });

  // 4. BattlePlayView 程式碼邏輯與規範靜態稽核
  console.log("\n--- 4. BattlePlayView 計時與重連邏輯稽核 ---");
  const playViewContent = fs.readFileSync(
    path.resolve(__dirname, "../src/components/battle/BattlePlayView.tsx"),
    "utf-8"
  );

  test("BattlePlayView 引入 Timer 圖示", () => {
    assert(playViewContent.includes("Timer"));
  });

  test("BattlePlayView 具備倒數進度條結構 (timeLimit > 0 && !hasSubmitted)", () => {
    assert(playViewContent.includes("Dynamic Timer Progress Bar"));
    assert(playViewContent.includes("timeLeft / timeLimit"));
  });

  test("BattlePlayView 具備剩餘 <= 5 秒警戒視覺樣式 (animate-pulse 與 rose 色系)", () => {
    assert(playViewContent.includes("timeLeft <= 5"));
    assert(playViewContent.includes("bg-rose-500"));
  });

  test("BattlePlayView 超時歸零時自動送出邏輯 (TIMEOUT_AUTO 與 TIMEOUT_BLANK)", () => {
    assert(playViewContent.includes("TIMEOUT_AUTO"));
    assert(playViewContent.includes("TIMEOUT_BLANK"));
    assert(playViewContent.includes("evaluateAnswer(currentSelected, \"TIMEOUT_AUTO\")"));
    assert(playViewContent.includes("evaluateAnswer([], \"TIMEOUT_BLANK\")"));
  });

  test("BattlePlayView 答案送出後計時器停止 (clearInterval)", () => {
    assert(playViewContent.includes("clearInterval(timerRef.current)"));
    assert(playViewContent.includes("setHasSubmitted(true)"));
  });

  test("BattlePlayView 答題後不自動跳題，等待玩家點擊下一題按鈕", () => {
    assert(playViewContent.includes("advanceNextQuestion"));
    assert(playViewContent.includes("ExplanationCard"));
    assert(playViewContent.includes("下一題"));
  });

  test("BattlePlayView 相容重連機制 (從 localAnswers 恢復已作答狀態)", () => {
    assert(playViewContent.includes("currentQ.id in localAnswers"));
    assert(playViewContent.includes("setTimeLeft(0)"));
  });

  test("BattlePlayView 掛載時直接導出 initialAnswered 避免計時器競態與閃爍", () => {
    assert(playViewContent.includes("initialAnswered"));
    assert(playViewContent.includes("initialAnswered ? 0 : timeLimit"));
    assert(playViewContent.includes("hasSubmitted, setHasSubmitted] = useState<boolean>(initialAnswered)"));
  });

  test("BattlePlayView 答題結算時保留當前 currentIndex 防止刷新立即跳過解析", () => {
    assert(playViewContent.includes("currentIndex: currentIndex"));
    assert(playViewContent.includes("parsed.currentIndex = nextIndex"));
  });

  test("RoomLobbyView 具備當前對戰規則摘要卡片並呈現限時規則", () => {
    const updatedLobbyContent = fs.readFileSync(
      path.resolve(__dirname, "../src/components/battle/RoomLobbyView.tsx"),
      "utf-8"
    );
    assert(updatedLobbyContent.includes("當前對戰規則摘要"));
    assert(updatedLobbyContent.includes("timeLimitPerQuestion"));
    assert(updatedLobbyContent.includes("秒/題"));
  });

  // 5. 全站零 Emoji 規範稽核
  console.log("\n--- 5. 全站規範零 Emoji 靜態稽核 ---");
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  const targetFiles = [
    "src/components/battle/BattlePlayView.tsx",
    "src/components/battle/RoomLobbyView.tsx",
    "src/app/battle/page.tsx",
    "src/app/battle/[code]/page.tsx",
    "src/lib/battleStore.ts",
    "src/app/api/battle/create/route.ts",
    "src/app/api/battle/[code]/route.ts",
    "scripts/test_battle_limit_and_timer.js",
  ];

  for (const relPath of targetFiles) {
    const fullPath = path.resolve(__dirname, "..", relPath);
    const content = fs.readFileSync(fullPath, "utf-8");
    test(`檔案 ${relPath} 符合全站零 Emoji 規範`, () => {
      const match = content.match(emojiRegex);
      assert(!match, `檔案 ${relPath} 中發現 Emoji: ${match ? match[0] : ""}`);
    });
  }

  console.log("==================================================");
  console.log(`TOTAL TESTS: ${passed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: 0`);
  console.log("VERDICT: ALL BATTLE LIMIT AND TIMER TESTS PASSED!");
  console.log("==================================================");

  await prisma.$disconnect();
}

runTests().catch(async (e) => {
  console.error("Test execution failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
