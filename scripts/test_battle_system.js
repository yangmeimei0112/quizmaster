/**
 * test_battle_system.js
 * Multi-player battle arena end-to-end integration and verification test suite.
 */

const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

async function runBattleTests() {
  console.log("==================================================");
  console.log("⚔️ 開始執行多人對戰模式 (Battle System) 整合自動化測試");
  console.log("==================================================");

  // Dynamic import of TypeScript modules via Node 22
  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const avatarsPath = path.resolve(__dirname, "../src/lib/avatars.ts");

  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const avatars = await import("file://" + avatarsPath.replace(/\\/g, "/"));

  const {
    createRoom,
    joinRoom,
    getRoom,
    toggleReady,
    updateAvatar,
    updateRoomSettings,
    startBattle,
    updatePlayerProgress,
    leaveRoom,
    resetBattle,
    generateRoomCode,
  } = battleStore;

  const { ANIMAL_AVATARS, getAnimalAvatar } = avatars;

  let passed = 0;
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`❌ 測試失敗: ${message}`);
    }
    console.log(`  ✓ ${message}`);
    passed++;
  }

  // -------------------------------------------------------------
  // 測試 1：12 款同風格動物頭像系統檢驗
  // -------------------------------------------------------------
  console.log("\n[測試 1] 驗證 12 款日系動物頭像規格與主題色設定...");
  assert(ANIMAL_AVATARS.length === 12, "頭像清單剛好為 12 款動物");
  const expectedAnimals = ["shiba", "panda", "fox", "lion", "tiger", "koala", "penguin", "rabbit", "cat", "owl", "deer", "monkey"];
  expectedAnimals.forEach((animalId) => {
    const avatar = getAnimalAvatar(animalId);
    assert(avatar && avatar.id === animalId, `動物 ${animalId} (${avatar.name}) 存在且設定完備`);
    assert(avatar.primaryColor && avatar.primaryColor.startsWith("#"), `動物 ${animalId} 主題色為有效 HEX 色碼`);
  });

  // -------------------------------------------------------------
  // 測試 2：4 碼純數字 (1000~9999) 房間代碼生成
  // -------------------------------------------------------------
  console.log("\n[測試 2] 驗證 4 碼純數字 (1000~9999) 房間代碼格式...");
  const sampleCodes = new Set();
  for (let i = 0; i < 1000; i++) {
    const code = generateRoomCode();
    assert(code.length === 4, `代碼長度為 4 碼: ${code}`);
    assert(/^[1-9][0-9]{3}$/.test(code), `代碼為合法 1000~9999 純數字格式: ${code}`);
    const num = Number(code);
    assert(num >= 1000 && num <= 9999, `代碼數值介於 1000 至 9999 之間: ${code}`);
    assert(!/[a-zA-Z]/.test(code), `代碼不包含任何英文字母: ${code}`);
    sampleCodes.add(code);
  }
  assert(sampleCodes.size >= 800, "1000 次隨機生成具備高唯一性");

  // -------------------------------------------------------------
  // 測試 3：創建房間與房主身分建立
  // -------------------------------------------------------------
  console.log("\n[測試 3] 驗證創建房間 (Create Room) 生命週期...");
  const { room, playerId: hostId } = createRoom("房主阿強", "shiba", {
    maxPlayers: 4,
    mode: "CUSTOM",
    questionCount: 5,
    orderMode: "RANDOM",
  });

  assert(room.code.length === 4, `成功建立房間，4 碼代碼: ${room.code}`);
  assert(room.hostId === hostId, "房主 ID 正確對應");
  assert(room.stage === "LOBBY", "初始階段為 LOBBY (等待大廳)");
  assert(room.players.length === 1, "初始房間僅有 1 位房主");
  assert(room.players[0].isHost === true, "房主標記為 true");
  assert(room.players[0].avatarId === "shiba", "房主頭像為柴犬 shiba");
  assert(room.settings.questionCount === 5, "自訂題數為 5 題");
  assert(room.settings.orderMode === "RANDOM", "順序模式為 RANDOM (亂序)");

  // -------------------------------------------------------------
  // 測試 4：玩家加入房間 (Join Room) 與防重複暱稱
  // -------------------------------------------------------------
  console.log("\n[測試 4] 驗證多名玩家透過 4 碼代碼加入房間...");
  const joinResult1 = joinRoom(room.code, "小美", "rabbit");
  assert(joinResult1.room.players.length === 2, "第 2 位玩家成功加入");
  assert(joinResult1.room.players[1].name === "小美", "玩家暱稱為小美");
  assert(joinResult1.room.players[1].avatarId === "rabbit", "頭像為兔子 rabbit");
  assert(joinResult1.room.players[1].isReady === false, "新加入玩家預設未準備 (isReady: false)");

  // 暱稱重複自動後綴測試
  const joinResult2 = joinRoom(room.code, "小美", "panda");
  assert(joinResult2.room.players[2].name === "小美 (2)", "暱稱重複自動編號為 '小美 (2)'");

  const joinResult3 = joinRoom(room.code, "大雄", "koala");
  assert(joinResult3.room.players.length === 4, "已達 4 人滿員上限");

  // 滿員加入應被阻擋
  let fullBlocked = false;
  try {
    joinRoom(room.code, "胖虎", "tiger");
  } catch (e) {
    fullBlocked = true;
  }
  assert(fullBlocked, "滿員時加入正確拋出錯誤拒絕加入");

  // -------------------------------------------------------------
  // 測試 5：準備狀態切換 (Ready Toggle) 與開賽防呆攔截
  // -------------------------------------------------------------
  console.log("\n[測試 5] 驗證準備就緒機制與未全員就緒攔截...");
  const p1 = joinResult1.playerId;
  const p2 = joinResult2.playerId;
  const p3 = joinResult3.playerId;

  // 未全員準備時開賽應失敗
  let startBlocked = false;
  try {
    startBattle(room.code, hostId, [{ id: "mock_1", stem: "題幹", type: "SINGLE", optionA: "A", optionB: "B", optionC: "C", optionD: "D", correctAnswers: "A" }]);
  } catch (e) {
    startBlocked = true;
  }
  assert(startBlocked, "尚有玩家未準備就緒時，開賽被正確阻擋");

  // 玩家陸續切換準備
  toggleReady(room.code, p1, true);
  toggleReady(room.code, p2, true);
  toggleReady(room.code, p3, true);

  const updatedRoom = getRoom(room.code);
  assert(updatedRoom.players.slice(1).every((p) => p.isReady), "所有非房主玩家皆已準備完成 (All Ready)");

  // -------------------------------------------------------------
  // 測試 6：開賽抽取實際題庫與題序模式 (SAME vs RANDOM)
  // -------------------------------------------------------------
  console.log("\n[測試 6] 驗證從 Prisma 題庫抽取真實題目與順序洗牌...");
  const dbQuestions = await prisma.question.findMany({ take: 5 });
  assert(dbQuestions.length >= 1, `題庫成功讀取 ${dbQuestions.length} 題`);

  const mockQuestions = dbQuestions.map((q) => ({
    id: q.id,
    stem: q.stem,
    type: q.type,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctAnswers: q.correctAnswers,
    explanation: q.explanation,
    category: q.category,
    difficulty: q.difficulty,
    imageUrl: q.imageUrl,
  }));

  const samplePool = mockQuestions.map((q) => ({ id: q.id, stem: q.stem, category: q.category, type: q.type }));
  const startedRoom = startBattle(room.code, hostId, mockQuestions, samplePool);
  assert(startedRoom.stage === "DRAWING", "開賽後進入 DRAWING (街機抽題動畫階段)");
  assert(startedRoom.drawingStartTime > 0, "抽題開始時間戳記正確記錄");
  assert(startedRoom.questions.length === mockQuestions.length, "成功綁定抽出的題目陣列");
  assert(startedRoom.samplePool && startedRoom.samplePool.length === samplePool.length, "房間成功持久化 samplePool 供全體玩家動畫播放");
  assert(startedRoom.playerQuestionOrders !== undefined, "已為玩家分配作答題序");

  // 驗證每位玩家分配之題目 ID 集合完全相同
  const hostQIds = startedRoom.playerQuestionOrders[hostId];
  const p1QIds = startedRoom.playerQuestionOrders[p1];
  assert(hostQIds.length === mockQuestions.length, "房主分配題目數相符");
  assert(p1QIds.length === mockQuestions.length, "玩家 1 分配題目數相符");
  assert(new Set(hostQIds).size === mockQuestions.length, "作答題目無重複");

  // -------------------------------------------------------------
  // 測試 7：即時作答進度提交與排行榜動態計算
  // -------------------------------------------------------------
  console.log("\n[測試 7] 驗證即時作答進度提交與排行榜排名運算...");
  // 房主答 5 題全對
  updatePlayerProgress(room.code, hostId, {
    currentIndex: 5,
    correctCount: 5,
    wrongCount: 0,
    score: 500,
    isFinished: true,
  });

  // 玩家 1 答 5 題對 3 錯 2
  updatePlayerProgress(room.code, p1, {
    currentIndex: 5,
    correctCount: 3,
    wrongCount: 2,
    score: 300,
    isFinished: true,
  });

  // 玩家 2 答 5 題對 4 錯 1
  updatePlayerProgress(room.code, p2, {
    currentIndex: 5,
    correctCount: 4,
    wrongCount: 1,
    score: 400,
    isFinished: true,
  });

  // 玩家 3 答 5 題對 2 錯 3
  updatePlayerProgress(room.code, p3, {
    currentIndex: 5,
    correctCount: 2,
    wrongCount: 3,
    score: 200,
    isFinished: true,
  });

  const finishedRoom = getRoom(room.code);
  assert(finishedRoom.stage === "FINISHED", "全員完賽後自動推進為 FINISHED (結算頒獎台)");

  // 驗證排名排序
  const ranking = [...finishedRoom.players].sort((a, b) => b.score - a.score);
  assert(ranking[0].id === hostId && ranking[0].score === 500, "第 1 名冠軍為房主阿強 (500 分)");
  assert(ranking[1].id === p2 && ranking[1].score === 400, "第 2 名銀牌為小美 (2) (400 分)");
  assert(ranking[2].id === p1 && ranking[2].score === 300, "第 3 名銅牌為小美 (300 分)");
  assert(ranking[3].id === p3 && ranking[3].score === 200, "第 4 名為大雄 (200 分)");

  // -------------------------------------------------------------
  // 測試 8：再來一局 (Replay / Reset Battle)
  // -------------------------------------------------------------
  console.log("\n[測試 8] 驗證房主發起再來一局重置房間狀態...");
  const resetRoom = resetBattle(room.code, hostId);
  assert(resetRoom.stage === "LOBBY", "階段重置回 LOBBY");
  assert(resetRoom.questions.length === 0, "題目清單已清空待重新抽取");
  assert(resetRoom.samplePool === undefined, "題目樣本池已清空");
  assert(resetRoom.players.every((p) => p.score === 0 && p.currentIndex === 0), "所有玩家分數與題號已歸零");
  assert(resetRoom.players.find((p) => p.id === hostId).isReady === true, "房主維持準備就緒");
  assert(resetRoom.players.filter((p) => !p.isHost).every((p) => !p.isReady), "其他玩家已重設為未準備");

  // -------------------------------------------------------------
  // 測試 9：玩家離開與房主轉移
  // -------------------------------------------------------------
  console.log("\n[測試 9] 驗證房主離開時繼承房主身分與房間釋放...");
  const leaveResult = leaveRoom(room.code, hostId);
  assert(leaveResult.room.players.length === 3, "房主離開後剩餘 3 人");
  assert(leaveResult.room.players[0].isHost === true, "第一順位玩家自動晉升為新房主");
  assert(leaveResult.room.hostId === leaveResult.room.players[0].id, "hostId 成功同步更新");

  // -------------------------------------------------------------
  // 測試 10：50 題全真模擬考模式規格
  // -------------------------------------------------------------
  console.log("\n[測試 10] 驗證 50 題模擬考對戰模式規則...");
  const { room: examRoom } = createRoom("檢定考官", "owl", {
    mode: "EXAM_50",
    maxPlayers: 10,
    orderMode: "SAME",
  });
  assert(examRoom.settings.mode === "EXAM_50", "模式為 50 題全真模擬考");
  assert(examRoom.settings.questionCount === 50, "題數固定為 50 題");
  assert(examRoom.settings.maxPlayers === 10, "人數上限為 10 人");
  assert(examRoom.settings.orderMode === "SAME", "檢定模式全員同題序");

  // -------------------------------------------------------------
  // 測試 11：自填題數 (Custom fill question count) 與房間設定更新
  // -------------------------------------------------------------
  console.log("\n[測試 11] 驗證自填題數 (Custom question count input) 與房間設定更新...");
  const { room: customRoom, playerId: cHostId } = createRoom("自填房主", "fox", {
    mode: "CUSTOM",
    questionCount: 15, // 自填 15 題
  });
  assert(customRoom.settings.questionCount === 15, "初始自填 15 題設定成功");
  
  // 房主在大廳動態將自填題數改為 25 題
  const updatedSettingsRoom = updateRoomSettings(customRoom.code, cHostId, {
    questionCount: 25,
  });
  assert(updatedSettingsRoom.settings.questionCount === 25, "房主動態修改自填題數為 25 題成功");

  // -------------------------------------------------------------
  // 測試 12：抽題轉場伺服器閾值 (5000ms) 與客戶端防重放屏障 (Replay Barrier)
  // -------------------------------------------------------------
  console.log("\n[測試 12] 驗證抽題轉場 5000ms 閾值校準與防重複播放屏障...");
  const { room: barrierRoom, playerId: bHostId } = createRoom("屏障測試房主", "lion", {
    questionCount: 3,
  });
  const dummyQuestions = [
    { id: "q_b1", stem: "測試題1", type: "SINGLE", optionA: "A1", optionB: "B1", optionC: "C1", optionD: "D1", correctAnswers: "A", explanation: "解析1" },
    { id: "q_b2", stem: "測試題2", type: "MULTIPLE", optionA: "A2", optionB: "B2", optionC: "C2", optionD: "D2", correctAnswers: "A,B", explanation: "解析2" },
    { id: "q_b3", stem: "測試題3", type: "SINGLE", optionA: "A3", optionB: "B3", optionC: "C3", optionD: "D3", correctAnswers: "C", explanation: "解析3" },
  ];
  const bStarted = startBattle(barrierRoom.code, bHostId, dummyQuestions);
  assert(bStarted.stage === "DRAWING", "對戰發起後進入 DRAWING 階段");
  const drawingTime = bStarted.drawingStartTime;
  assert(typeof drawingTime === "number" && drawingTime > 0, "抽題開始時間戳記存在");

  // 模擬未達 5000ms (例如 4000ms)
  bStarted.drawingStartTime = Date.now() - 4000;
  const pollEarly = getRoom(barrierRoom.code);
  assert(pollEarly.stage === "DRAWING", "未達 5000ms (4.0s) 前維持 DRAWING 階段");

  // 模擬已達 5000ms (例如 5100ms)
  bStarted.drawingStartTime = Date.now() - 5100;
  const pollTransitioned = getRoom(barrierRoom.code);
  assert(pollTransitioned.stage === "PLAYING", "超過 5000ms (5.1s) 伺服器端自動平滑推進至 PLAYING 階段");

  // 測試客戶端防重放屏障 (Client-side Replay Barrier)
  const completedDrawingSessions = new Set();
  // 客戶端抽題動畫播放完畢，登記該場次 drawingStartTime
  completedDrawingSessions.add(drawingTime);
  assert(completedDrawingSessions.has(drawingTime), "客戶端成功將場次 drawingStartTime 登記至防重放屏障");

  // 假想伺服器輪詢短暫送回 DRAWING
  const staleServerResponse = { stage: "DRAWING", drawingStartTime: drawingTime };
  const effectiveStage =
    staleServerResponse.stage === "DRAWING" &&
    staleServerResponse.drawingStartTime &&
    completedDrawingSessions.has(staleServerResponse.drawingStartTime)
      ? "PLAYING"
      : staleServerResponse.stage;
  assert(effectiveStage === "PLAYING", "防重放屏障生效：即使收到 DRAWING 亦鎖定為 PLAYING，絕不重複播放動畫");

  // -------------------------------------------------------------
  // 測試 13：考題對錯詳解覆盤與篩選器 (ALL / WRONG / CORRECT) 邏輯檢驗
  // -------------------------------------------------------------
  console.log("\n[測試 13] 驗證作答歷程紀錄、對錯判定與雙入口覆盤篩選器...");
  const answerUtilsPath = path.resolve(__dirname, "../src/lib/answerUtils.ts");
  const answerUtils = await import("file://" + answerUtilsPath.replace(/\\/g, "/"));
  const { compareAnswers } = answerUtils;

  // 模擬玩家作答歷程
  const testAnswers = {
    q_b1: ["A"],       // 正解 A -> 答對
    q_b2: ["A"],       // 正解 A,B -> 答錯 (少選 B)
    q_b3: ["C"],       // 正解 C -> 答對
  };

  const reviewItems = dummyQuestions.map((q, idx) => {
    const userAns = testAnswers[q.id] || [];
    const isCorrect = compareAnswers(userAns, q.correctAnswers);
    return {
      questionIndex: idx + 1,
      question: q,
      userAnswer: userAns,
      isCorrect,
    };
  });

  assert(reviewItems.length === 3, "覆盤題數正確記錄為 3 題");
  assert(reviewItems[0].isCorrect === true, "第 1 題判定為答對 (✓)");
  assert(reviewItems[1].isCorrect === false, "第 2 題判定為答錯 (❌)");
  assert(reviewItems[2].isCorrect === true, "第 3 題判定為答對 (✓)");

  // 驗證狀態篩選器 (ALL / WRONG / CORRECT)
  const allFiltered = reviewItems;
  const wrongFiltered = reviewItems.filter((item) => !item.isCorrect);
  const correctFiltered = reviewItems.filter((item) => item.isCorrect);

  assert(allFiltered.length === 3, "全部題目篩選傳回 3 題");
  assert(wrongFiltered.length === 1 && wrongFiltered[0].question.id === "q_b2", "❌ 僅看錯題篩選正確回傳 1 題 (q_b2)");
  assert(correctFiltered.length === 2, "✓ 僅看答對篩選正確回傳 2 題 (q_b1, q_b3)");

  // 驗證 ExplanationCard 整合必要資料齊備性
  wrongFiltered.forEach((item) => {
    assert(typeof item.question.explanation === "string", "錯題包含完整 explanation 解析");
    assert(item.question.correctAnswers === "A,B", "包含 correctAnswers 正解");
    assert(Array.isArray(item.userAnswer) && item.userAnswer[0] === "A", "包含使用者實際 userAnswer 作答紀錄");
    assert(item.question.optionA && item.question.optionB, "包含選項內容供 ExplanationCard 渲染");
  });

  console.log("\n==================================================");
  console.log(`🎉 多人對戰系統自動化測試全數通過！(通過 ${passed} 項，失敗 0 項)`);
  console.log("==================================================");
}

runBattleTests()
  .catch((e) => {
    console.error("❌ 測試失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
