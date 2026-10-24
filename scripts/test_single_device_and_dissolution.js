/**
 * scripts/test_single_device_and_dissolution.js
 *
 * Milestone 3 專屬自動化測試套件：
 * 1. 單一設備防多開限制 (Single Device Constraint per Room)
 * 2. 舊連線踢除與新連線保留
 * 3. 房主遭踢除時之房主身分順延邏輯 (順延至既有選手 vs 單人房由新選手接任)
 * 4. recentlyLeftPlayers 註冊防止 Serverless DB snapshot 回魂
 * 5. 多設備同房共存性與同設備跨房獨立性
 * 6. 大廳房主離開自動解散 vs 對戰進行中房主退出標記完賽
 * 7. 同一選手連線 reconnect 冪等性防誤踢
 */

const assert = require("node:assert");
const path = require("node:path");

async function runTests() {
  console.log("==================================================");
  console.log("🧪 開始執行單一設備防多開限制與房間解散生命週期測試");
  console.log("==================================================");

  let passed = 0;
  function mark(msg) {
    console.log(`  ✓ ${msg}`);
    passed++;
  }

  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const {
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
    toggleReady,
    startBattle,
    isRoomDissolved,
    recentlyLeftPlayers,
    reconcileRoomWithDbSnapshot,
  } = battleStore;

  // -------------------------------------------------------------
  // 測試 1：單一設備重複加入自動踢除舊選手、保留新選手
  // -------------------------------------------------------------
  console.log("\n[測試 1] 驗證同設備重複加入時，舊選手被踢除，僅保留最新進房者...");
  const { room: r1, playerId: host1Id } = createRoom("房主阿強", "shiba", { maxPlayers: 4 }, "dev_host_1");
  mark("房主成功建立房間，綁定 deviceId: dev_host_1");

  const { playerId: guest1Id } = joinRoom(r1.code, "選手甲", "panda", undefined, "dev_guest_A");
  assert.strictEqual(r1.players.length, 2, "房主與選手甲在房間中，共 2 人");
  assert.ok(r1.players.some((p) => p.id === guest1Id && p.name === "選手甲"), "選手甲成功加入");
  mark("選手甲加入房間，綁定 deviceId: dev_guest_A");

  // 同設備 dev_guest_A 以新分頁/新暱稱加入
  const { playerId: guest2Id } = joinRoom(r1.code, "選手甲_新分頁", "fox", undefined, "dev_guest_A");
  assert.strictEqual(r1.players.length, 2, "同設備新分頁加入後，房間總人數維持 2 人");
  assert.strictEqual(r1.players.some((p) => p.id === guest1Id), false, "舊選手甲已被移除");
  assert.strictEqual(r1.players.some((p) => p.id === guest2Id), true, "新選手甲_新分頁被成功保留");
  const newGuestPlayer = r1.players.find((p) => p.id === guest2Id);
  assert.strictEqual(newGuestPlayer.deviceId, "dev_guest_A", "新選手設備識別碼維持 dev_guest_A");
  mark("舊選手已被踢除，新選手成功進駐且設備識別碼正確");

  // -------------------------------------------------------------
  // 測試 2：房主同設備另開分頁，房主身分順延給既有選手
  // -------------------------------------------------------------
  console.log("\n[測試 2] 驗證房主同設備另開分頁時，房主資格順延給既有選手...");
  const { room: r2, playerId: oldHostId } = createRoom("原房主", "shiba", { maxPlayers: 4 }, "dev_host_X");
  const { playerId: teammateId } = joinRoom(r2.code, "隊友乙", "koala", undefined, "dev_guest_B");
  assert.strictEqual(r2.hostId, oldHostId, "初始房主為 原房主");
  assert.strictEqual(r2.players.find((p) => p.id === teammateId).isHost, false, "隊友乙初始非房主");

  // 相同設備 dev_host_X 另開分頁進入
  const { playerId: newHostTabId } = joinRoom(r2.code, "原房主新視窗", "tiger", undefined, "dev_host_X");
  assert.strictEqual(r2.players.length, 2, "原房主被踢除，新視窗進房，房間維持 2 人");
  assert.strictEqual(r2.players.some((p) => p.id === oldHostId), false, "原房主已不在選手陣容中");
  
  // 檢查房主身分順延：隊友乙應繼承成為房主
  const promotedHost = r2.players.find((p) => p.id === teammateId);
  assert.strictEqual(promotedHost.isHost, true, "既有隊友乙成功順延繼承房主身分 (isHost: true)");
  assert.strictEqual(promotedHost.isReady, true, "新房主自動設為準備狀態 (isReady: true)");
  assert.strictEqual(r2.hostId, teammateId, "房間 hostId 更新為隊友乙之 ID");

  // 檢查新進連線為普通選手
  const newTabPlayer = r2.players.find((p) => p.id === newHostTabId);
  assert.strictEqual(newTabPlayer.isHost, false, "新進之同設備玩家為普通選手 (isHost: false)");
  mark("房主資格順利順延給既有選手，新進視窗作為普通隊員進入");

  // -------------------------------------------------------------
  // 測試 3：單人房主同設備另開分頁，新進玩家自動繼承房主
  // -------------------------------------------------------------
  console.log("\n[測試 3] 驗證單人房主同設備另開分頁時，新進玩家自動繼任為房主...");
  const { room: r3, playerId: soloHost1Id } = createRoom("孤獨房主", "lion", { maxPlayers: 4 }, "dev_solo_1");
  assert.strictEqual(r3.players.length, 1, "初始單人房間僅 1 人");
  assert.strictEqual(r3.hostId, soloHost1Id, "房主 ID 正確");

  // 同設備另開分頁進入
  const { playerId: soloHost2Id } = joinRoom(r3.code, "孤獨房主二號", "otter", undefined, "dev_solo_1");
  assert.strictEqual(r3.players.length, 1, "踢除舊房主後新房主進入，房間依然為 1 人");
  assert.strictEqual(r3.players[0].id, soloHost2Id, "新玩家 ID 與陣容唯一玩家相符");
  assert.strictEqual(r3.players[0].name, "孤獨房主二號", "新玩家暱稱正確");
  assert.strictEqual(r3.players[0].isHost, true, "因房間無其他選手，新加入者自動成為房主 (isHost: true)");
  assert.strictEqual(r3.players[0].isReady, true, "新房主準備狀態為 true");
  assert.strictEqual(r3.hostId, soloHost2Id, "房間 hostId 正確對應為新選手 ID");
  mark("單人房主換分頁後，舊選手被替換且新選手無縫成為新房主");

  // -------------------------------------------------------------
  // 測試 4：防範 Serverless 快取同步之「死者復甦」
  // -------------------------------------------------------------
  console.log("\n[測試 4] 驗證被踢除之選手 ID 正確註冊至 recentlyLeftPlayers，防止 DB Snapshot 回魂...");
  const leftSetR1 = recentlyLeftPlayers.get(r1.code);
  assert.ok(leftSetR1, "房間 1 的 recentlyLeftPlayers Set 存在");
  assert.strictEqual(leftSetR1.has(guest1Id), true, "被踢除之選手甲 guest1Id 存在於 recentlyLeftPlayers 集合中");

  const leftSetR2 = recentlyLeftPlayers.get(r2.code);
  assert.ok(leftSetR2, "房間 2 的 recentlyLeftPlayers Set 存在");
  assert.strictEqual(leftSetR2.has(oldHostId), true, "被順延踢除之原房主 oldHostId 存在於 recentlyLeftPlayers 集合中");

  // 模擬跨實例 Serverless DB 快取對齊：
  // 假定 DB Snapshot 中仍有舊選手 guest1Id 與一名剛加入的新選手 guest3
  const fakeDbSnapshot = {
    code: r1.code,
    hostId: r1.hostId,
    stage: "LOBBY",
    createdAt: r1.createdAt,
    updatedAt: r1.updatedAt,
    settings: { ...r1.settings },
    questions: [],
    players: [
      {
        id: host1Id,
        name: "房主阿強",
        avatarId: "shiba",
        isHost: true,
        isReady: true,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        score: 0,
        isFinished: false,
        lastActiveAt: Date.now(),
        deviceId: "dev_host_1",
      },
      {
        id: guest1Id, // 這是被踢除的舊選手！
        name: "選手甲",
        avatarId: "panda",
        isHost: false,
        isReady: false,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        score: 0,
        isFinished: false,
        lastActiveAt: Date.now(),
        deviceId: "dev_guest_A",
      },
      {
        id: "p_concurrent_guest3", // 這是遠端合法並行加入的玩家
        name: "並行隊友",
        avatarId: "sheep",
        isHost: false,
        isReady: false,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        score: 0,
        isFinished: false,
        lastActiveAt: Date.now(),
        deviceId: "dev_concurrent_3",
      },
    ],
  };

  const reconciledRoom = reconcileRoomWithDbSnapshot(r1, fakeDbSnapshot);
  assert.strictEqual(
    reconciledRoom.players.some((p) => p.id === guest1Id),
    false,
    "對齊快照時，被踢除之舊選手甲絕不回魂復活"
  );
  assert.strictEqual(
    reconciledRoom.players.some((p) => p.id === "p_concurrent_guest3"),
    true,
    "對齊快照時，合法的並行新玩家正常合併進入"
  );
  mark("recentlyLeftPlayers 防回魂機制成功攔截過期快照");

  // -------------------------------------------------------------
  // 測試 5：多台不同設備於同一房間和平共存
  // -------------------------------------------------------------
  console.log("\n[測試 5] 驗證 4 台相異 deviceId 在同房間內正常共存...");
  const { room: r5 } = createRoom("房主", "lion", { maxPlayers: 4 }, "device_mac_01");
  const p2 = joinRoom(r5.code, "玩家2", "muntjac", undefined, "device_win_02");
  const p3 = joinRoom(r5.code, "玩家3", "goat", undefined, "device_ios_03");
  const p4 = joinRoom(r5.code, "玩家4", "sheep", undefined, "device_android_04");

  assert.strictEqual(r5.players.length, 4, "4 名使用不同裝置的玩家皆在房間中");
  const deviceSet = new Set(r5.players.map((p) => p.deviceId));
  assert.strictEqual(deviceSet.size, 4, "4 位玩家各自擁有獨立的 deviceId，無任何衝突");
  mark("多台相異設備於同房間內共存運作正常");

  // -------------------------------------------------------------
  // 測試 6：同一設備加入不同房間互不衝突
  // -------------------------------------------------------------
  console.log("\n[測試 6] 驗證同一設備加入不同房間 (Room A / Room B) 互不衝突...");
  const roamingDeviceId = "device_roaming_99";
  const { room: roomA, playerId: playerInA } = createRoom("房主A", "cat", {}, roamingDeviceId);
  const { room: roomB, playerId: playerInB } = createRoom("房主B", "owl", {}, roamingDeviceId);

  assert.notStrictEqual(roomA.code, roomB.code, "房間 A 與房間 B 代碼相異");
  assert.strictEqual(roomA.players[0].deviceId, roamingDeviceId, "房間 A 內含有該設備");
  assert.strictEqual(roomB.players[0].deviceId, roamingDeviceId, "房間 B 內含有該設備");
  assert.strictEqual(roomA.players.length, 1, "房間 A 未受房間 B 影響");
  assert.strictEqual(roomB.players.length, 1, "房間 B 未受房間 A 影響");
  mark("同一設備跨房間獨立運作，互不影響");

  // -------------------------------------------------------------
  // 測試 7：大廳房主退出解散房間 vs 進行中房主退出標記完賽
  // -------------------------------------------------------------
  console.log("\n[測試 7] 驗證大廳房主退出時徹底解散房間，對戰進行中退出標記完賽...");
  const { room: r7Lobby, playerId: r7HostId } = createRoom("大廳房主", "deer", {}, "dev_r7");
  const leaveLobbyResult = leaveRoom(r7Lobby.code, r7HostId);
  assert.strictEqual(leaveLobbyResult.room, null, "大廳階段房主退出，房間解散回傳 null");
  assert.strictEqual(getRoom(r7Lobby.code), null, "記憶體中該房間已被銷毀");
  assert.strictEqual(isRoomDissolved(r7Lobby.code), true, "解散墓碑標記生效");
  mark("大廳階段房主退出時房間徹底解散");

  // 對戰進行中房主退出
  const { room: r7Playing, playerId: playHostId } = createRoom("戰局房主", "fox", { questionCount: 5 }, "dev_p_host");
  const { playerId: playGuestId } = joinRoom(r7Playing.code, "隊友", "koala", undefined, "dev_p_guest");
  // 模擬開賽
  const fakeQuestions = [
    {
      id: "q1",
      stem: "題目1",
      type: "SINGLE",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswers: "A",
    },
  ];
  toggleReady(r7Playing.code, playGuestId);
  startBattle(r7Playing.code, playHostId, fakeQuestions);
  assert.strictEqual(r7Playing.stage, "DRAWING", "開賽後進入 DRAWING 階段");

  const leavePlayResult = leaveRoom(r7Playing.code, playHostId);
  assert.notStrictEqual(leavePlayResult.room, null, "對戰階段房主離開，房間不解散");
  const leftHost = leavePlayResult.room.players.find((p) => p.id === playHostId);
  assert.strictEqual(leftHost.isFinished, true, "離開的房主被標記為棄賽完賽 (isFinished: true)");
  const newPlayHost = leavePlayResult.room.players.find((p) => p.id === playGuestId);
  assert.strictEqual(newPlayHost.isHost, true, "隊友成功接任房主身分");
  mark("對戰進行中房主退出房間不解散，房主標記棄賽完賽，隊友接任房主");

  // -------------------------------------------------------------
  // 測試 8：同選手以 existingPlayerId 重連不誤踢
  // -------------------------------------------------------------
  console.log("\n[測試 8] 驗證相同選手以 existingPlayerId 重新載入時保持連線不被誤踢...");
  const { room: r8, playerId: originalPlayerId } = createRoom("常駐玩家", "shiba", {}, "dev_stable");
  const reconnectResult = joinRoom(r8.code, "常駐玩家", "shiba", originalPlayerId, "dev_stable");
  assert.strictEqual(reconnectResult.playerId, originalPlayerId, "重連後 playerId 維持相同");
  assert.strictEqual(r8.players.length, 1, "房間人數依然為 1，未產生任何重複選手或誤踢");
  mark("同選手正常重連時冪等保留");

  console.log("\n==================================================");
  console.log(`🎉 單一設備防多開限制與生命週期驗證全數通過！(通過 ${passed} 項檢驗)`);
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗:", err);
  process.exit(1);
});
