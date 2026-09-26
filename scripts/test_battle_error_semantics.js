/**
 * test_battle_error_semantics.js
 * Comprehensive automated verification test suite for battle API error code semantics and stage guards.
 */

const assert = require("node:assert/strict");
const path = require("node:path");

async function runSemanticsTests() {
  console.log("==================================================");
  console.log("🧪 驗證對戰系統 HTTP 狀態碼語義與階段防護 (Semantic Status Codes)");
  console.log("==================================================");

  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const {
    createRoom,
    joinRoom,
    getRoom,
    toggleReady,
    updateAvatar,
    updateRoomSettings,
    startBattle,
    updatePlayerProgress,
  } = battleStore;

  let passed = 0;
  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  ✓ [通過] ${name}`);
    } catch (err) {
      console.error(`  ✗ [失敗] ${name}:`, err.message);
      process.exitCode = 1;
    }
  }

  // 1. 建立測試房間
  const { room, playerId: hostId } = createRoom("房主小智", "pikachu", {
    maxPlayers: 2,
    mode: "CUSTOM",
    questionCount: 2,
  });
  const guestResult = joinRoom(room.code, "小霞", "fox");
  const guestId = guestResult.playerId;

  // 2. 測試非房主嘗試修改房間設定
  test("非房主嘗試修改房間設定應拋出 '只有房主可以變更房間設定'", () => {
    assert.throws(
      () => {
        updateRoomSettings(room.code, guestId, { questionCount: 5 });
      },
      (err) => err.message.includes("只有房主")
    );
  });

  // 3. 測試非等待階段 (LOBBY) 下 toggleReady 與 updateAvatar
  const dummyQuestions = [
    { id: "q1", stem: "題目1", correctAnswers: "A", type: "SINGLE" },
    { id: "q2", stem: "題目2", correctAnswers: "B", type: "SINGLE" },
  ];
  toggleReady(room.code, guestId, true);
  startBattle(room.code, hostId, dummyQuestions);

  test("對戰進行中 (DRAWING/PLAYING) 嘗試 toggleReady 應拋出階段不符錯誤", () => {
    assert.throws(
      () => {
        toggleReady(room.code, guestId, false);
      },
      (err) => err.message.includes("非等待階段")
    );
  });

  test("對戰進行中 (DRAWING/PLAYING) 嘗試 updateAvatar 應拋出階段不符錯誤", () => {
    assert.throws(
      () => {
        updateAvatar(room.code, guestId, "cat");
      },
      (err) => err.message.includes("非等待階段")
    );
  });

  test("對戰進行中 (DRAWING/PLAYING) 嘗試 joinRoom 應拋出狀態不符錯誤", () => {
    assert.throws(
      () => {
        joinRoom(room.code, "小剛", "bear");
      },
      (err) => err.message.includes("對戰已在進行中")
    );
  });

  // 4. 測試等待階段 (LOBBY) 下不允許 updatePlayerProgress
  const { room: lobbyRoom, playerId: lobbyHost } = createRoom("等待房主", "shiba", {
    maxPlayers: 2,
  });
  test("等待階段 (LOBBY) 下嘗試 updatePlayerProgress 應拋出 '尚未開始' 錯誤", () => {
    assert.throws(
      () => {
        updatePlayerProgress(lobbyRoom.code, lobbyHost, {
          currentIndex: 1,
          correctCount: 1,
          wrongCount: 0,
          score: 100,
          isFinished: false,
        });
      },
      (err) => err.message.includes("尚未開始")
    );
  });

  console.log(`\n==================================================`);
  console.log(`🎉 對戰系統語義與階段防護測試全數通過！(通過 ${passed} 項)`);
  console.log(`==================================================\n`);
}

runSemanticsTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
