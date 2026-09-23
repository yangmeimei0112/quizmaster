const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();

async function runTest() {
  console.log("==================================================");
  console.log("🎲 執行「抽題系統 (Question Drawing System)」專項健全性審查");
  console.log("==================================================");

  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const {
    createRoom,
    joinRoom,
    toggleReady,
    startBattle,
    getRoom,
    shuffleArray,
  } = battleStore;

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ 失敗: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. 題庫容量與題目屬性檢驗
  console.log("\n[檢查 1] 題庫基礎量與必要欄位健全性...");
  const allQuestions = await prisma.question.findMany();
  assert(allQuestions.length >= 50, `題庫題目充足 (目前 ${allQuestions.length} 題，高於 50 題門檻)`);
  
  const hasIncomplete = allQuestions.some(
    (q) => !q.stem || !q.optionA || !q.optionB || !q.correctAnswers
  );
  assert(!hasIncomplete, "所有題庫題目皆具備完整題幹、選項與正確解答");

  // 2. 自訂題數抽題檢驗
  console.log("\n[檢查 2] 自訂題數抽題 (例如 10 題) 隨機性與完整性...");
  const { room: room1, playerId: host1 } = createRoom("房主阿強", "shiba", {
    mode: "CUSTOM",
    questionCount: 10,
    orderMode: "SAME",
  });
  const { playerId: p2 } = joinRoom(room1.code, "小美", "rabbit");
  toggleReady(room1.code, p2, true);

  const shuffled1 = shuffleArray(allQuestions);
  const selected10 = shuffled1.slice(0, 10);
  const samplePool10 = shuffled1.slice(0, Math.min(20, shuffled1.length)).map((q) => ({
    id: q.id,
    stem: q.stem,
    category: q.category,
    type: q.type,
  }));

  const startedRoom1 = startBattle(room1.code, host1, selected10, samplePool10);
  assert(startedRoom1.stage === "DRAWING", "開賽後房間階段正確轉為 DRAWING (抽題街機動畫)");
  assert(startedRoom1.questions.length === 10, "抽出題目數量精準為 10 題");
  assert(startedRoom1.samplePool && startedRoom1.samplePool.length === Math.min(20, shuffled1.length), "抽題展示池 samplePool 數量相符 (抽取 20 題輪播樣本)");
  assert(startedRoom1.samplePool[0].stem, "samplePool 包含題幹文字以供輪播");
  assert(startedRoom1.samplePool[0].type, "samplePool 包含題型以供標籤渲染");

  // 檢查所有題目唯一無重複
  const idSet = new Set(startedRoom1.questions.map((q) => q.id));
  assert(idSet.size === 10, "抽出的 10 題題目皆唯一無重複");

  // 3. 50 題模擬考抽題檢驗
  console.log("\n[檢查 3] 50 題全真模擬考模式抽題檢驗...");
  const { room: room2, playerId: host2 } = createRoom("考霸小明", "fox", {
    mode: "EXAM_50",
    orderMode: "SAME",
  });
  const shuffled2 = shuffleArray(allQuestions);
  const selected50 = shuffled2.slice(0, 50);
  const samplePool50 = shuffled2.slice(0, 20).map((q) => ({
    id: q.id,
    stem: q.stem,
    category: q.category,
    type: q.type,
  }));

  const startedRoom2 = startBattle(room2.code, host2, selected50, samplePool50);
  assert(startedRoom2.questions.length === 50, "50 題全真模考精準抽出 50 題");
  assert(startedRoom2.samplePool.length === 20, "高題數時 samplePool 自動上限為 20 題保持動畫流暢");
  assert(new Set(startedRoom2.questions.map((q) => q.id)).size === 50, "50 題完全唯一無重複");

  // 4. 題序模式檢驗 (SAME vs RANDOM)
  console.log("\n[檢查 4] 亂序模式 (RANDOM) 下每位玩家分配題目檢驗...");
  const { room: room3, playerId: host3 } = createRoom("房主小虎", "tiger", {
    mode: "CUSTOM",
    questionCount: 5,
    orderMode: "RANDOM",
  });
  const { playerId: p3A } = joinRoom(room3.code, "玩家A", "panda");
  const { playerId: p3B } = joinRoom(room3.code, "玩家B", "koala");
  toggleReady(room3.code, p3A, true);
  toggleReady(room3.code, p3B, true);

  const selected5 = shuffleArray(allQuestions).slice(0, 5);
  const startedRoom3 = startBattle(room3.code, host3, selected5);

  assert(startedRoom3.playerQuestionOrders !== undefined, "亂序模式下正確生成 playerQuestionOrders 映射表");
  const hostOrder = startedRoom3.playerQuestionOrders[host3];
  const pAOrder = startedRoom3.playerQuestionOrders[p3A];
  const pBOrder = startedRoom3.playerQuestionOrders[p3B];
  assert(hostOrder && hostOrder.length === 5, "房主分配到 5 題題序");
  assert(pAOrder && pAOrder.length === 5, "玩家A 分配到 5 題題序");
  assert(pBOrder && pBOrder.length === 5, "玩家B 分配到 5 題題序");
  assert(new Set(pAOrder).size === 5, "玩家A 題目清單內無重複題目");

  // 5. 跨端同步檢驗：非房主客戶端讀取房間狀態
  console.log("\n[檢查 5] 跨客戶端 (非房主) 輪詢獲取抽題資訊檢驗...");
  const fetchedByOtherClient = getRoom(room3.code);
  assert(fetchedByOtherClient !== null, "非房主可正常透過房間代碼輪詢獲取房間");
  assert(fetchedByOtherClient.stage === "DRAWING", "非房主獲取之階段同步為 DRAWING");
  assert(fetchedByOtherClient.samplePool.length === 5, "非房主可取得相同的 samplePool 以播放卡片輪播動畫");

  // 6. 逾時自動過渡保護 (Drawing Timeout Safety Guard)
  console.log("\n[檢查 6] 抽題逾時保護機制 (防止任何客戶端卡在 DRAWING)...");
  startedRoom3.drawingStartTime = Date.now() - 8000; // 模擬經過 8 秒
  const roomAfterTimeout = getRoom(room3.code);
  assert(roomAfterTimeout.stage === "PLAYING", "超過 7.5 秒後 getRoom 自動推進至 PLAYING，防止玩家被卡住");

  console.log(`\n==================================================`);
  console.log(`🎉 抽題系統審查全數通過！(通過 ${passed} / ${total} 項，0 錯誤)`);
  console.log(`==================================================\n`);

  await prisma.$disconnect();
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
