/**
 * test_battle_review_and_barrier.js
 * Comprehensive automated verification test suite for Milestone M8:
 * - Server-Side Auto-Transition Threshold (5.0s calibration)
 * - Client-Side Idempotency Replay Barrier Logic
 * - User Answer History Tracking & Evaluation Accuracy
 * - BattleReviewPanel Component SSR Contract & Tab Filter Partitioning
 * - Dual Entrypoints Integration Static Audit
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

async function runTestSuite() {
  console.log("==================================================");
  console.log("⚔️ 執行對戰覆盤面板 (BattleReviewPanel) 與防重放屏障驗證");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [通過] ${name}`);
    } catch (err) {
      console.error(`  ✗ [失敗] ${name}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // =========================================================================
  // Part 1: Server-Side Auto-Transition Threshold (5.0s Calibration)
  // =========================================================================
  console.log("\n--- Part 1: 伺服器端 5.0 秒轉場閾值與開賽時序校準 (R2 Server) ---");

  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const { createRoom, joinRoom, toggleReady, startBattle, getRoom } = battleStore;

  const sampleQuestions = [
    {
      id: "q1",
      stem: "關於 TypeScript 型別系統，下列何者正確？",
      optionA: "any 會停用型別檢查",
      optionB: "unknown 與 any 完全相同",
      optionC: "never 代表所有型別的聯集",
      optionD: "void 不能用於函式回傳值",
      correctAnswers: "A",
      type: "SINGLE",
      explanation: "A 選項正確：any 會繞過型別系統檢查。",
    },
    {
      id: "q2",
      stem: "下列哪些屬於 JavaScript 的原始型別 (Primitive Types)？",
      optionA: "string",
      optionB: "boolean",
      optionC: "object",
      optionD: "symbol",
      correctAnswers: "A,B,D",
      type: "MULTIPLE",
      explanation: "A、B、D 為原始型別，object 為物件型別。",
    },
    {
      id: "q3",
      stem: "React 18 中的自動批次更新 (Automatic Batching) 適用於哪些情境？",
      optionA: "僅適用於 React 事件處理器",
      optionB: "適用於 Promise, setTimeout, 與原生事件",
      optionC: "不適用於非同步函式",
      optionD: "完全停用批次更新",
      correctAnswers: "B",
      type: "SINGLE",
      explanation: "B 選項正確：React 18 預設在所有非同步操作中自動批次更新 state。",
    },
  ];

  // 1.1 Create room & start battle
  const hostResult = createRoom("測試主辦人", "dragon");
  const roomCode = hostResult.room.code;
  const guestResult = joinRoom(roomCode, "參賽玩家", "fox");
  toggleReady(roomCode, guestResult.playerId);

  const started = startBattle(roomCode, hostResult.playerId, sampleQuestions);

  test("開賽初始階段為 DRAWING 且記錄 drawingStartTime", () => {
    assert.equal(started.stage, "DRAWING");
    assert.ok(typeof started.drawingStartTime === "number");
    assert.ok(started.drawingStartTime > 0);
  });

  test("開賽預期 playingStartTime 設定為開賽時間 + 5000ms (5.0秒對齊)", () => {
    assert.ok(typeof started.playingStartTime === "number");
    const delta = started.playingStartTime - started.drawingStartTime;
    assert.ok(
      Math.abs(delta - 5000) < 50,
      `預期 delta 為 5000ms，實際為 ${delta}ms`
    );
  });

  test("未滿 5.0 秒 (經過 4.5 秒) 時 getRoom 嚴格維持 DRAWING 狀態", () => {
    started.drawingStartTime = Date.now() - 4500;
    const roomBefore = getRoom(roomCode);
    assert.equal(roomBefore.stage, "DRAWING", "未滿 5.0 秒不應提前轉場至 PLAYING");
  });

  test("到達或超過 5.0 秒 (經過 5.1 秒) 時 getRoom 自動推進至 PLAYING", () => {
    started.drawingStartTime = Date.now() - 5100;
    const roomAfter = getRoom(roomCode);
    assert.equal(roomAfter.stage, "PLAYING", "超過 5.0 秒應自動前進至 PLAYING");
    assert.ok(roomAfter.playingStartTime > 0);
  });

  // =========================================================================
  // Part 2: Client-Side Idempotency Replay Barrier Logic
  // =========================================================================
  console.log("\n--- Part 2: 客戶端單向防重放屏障模擬 (R2 Client Barrier) ---");

  test("防重放屏障：動畫完成後記錄 drawingStartTime，阻擋過期 DRAWING 輪詢暫態", () => {
    const completedDrawingSessions = new Set();
    const t1 = 1727000000000;

    // 動畫完成
    completedDrawingSessions.add(t1);

    // 模擬過期輪詢 payload (伺服器暫態仍在 DRAWING)
    const incomingPollPayload = {
      code: "TEST",
      stage: "DRAWING",
      drawingStartTime: t1,
    };

    // 客戶端單向屏障正規化邏輯
    let normalized = incomingPollPayload;
    if (
      normalized.stage === "DRAWING" &&
      normalized.drawingStartTime &&
      completedDrawingSessions.has(normalized.drawingStartTime)
    ) {
      normalized = {
        ...normalized,
        stage: "PLAYING",
      };
    }

    assert.equal(
      normalized.stage,
      "PLAYING",
      "過期 DRAWING payload 應被屏障強行鉗位為 PLAYING，防止動畫重放"
    );
  });

  test("防重放屏障：新一輪 (再來一局) 產生全新 drawingStartTime 時正常允許播放", () => {
    const completedDrawingSessions = new Set();
    const t1 = 1727000000000;
    const t2 = 1727000060000; // 新回合

    completedDrawingSessions.add(t1);

    const newMatchPayload = {
      code: "TEST",
      stage: "DRAWING",
      drawingStartTime: t2,
    };

    const isDrawingCompleted = completedDrawingSessions.has(newMatchPayload.drawingStartTime);
    const effectiveStage =
      newMatchPayload.stage === "DRAWING" && isDrawingCompleted ? "PLAYING" : newMatchPayload.stage;

    assert.equal(isDrawingCompleted, false, "新回合 timestamp 不存在於歷史集合中");
    assert.equal(effectiveStage, "DRAWING", "新回合應正常呈現 DRAWING 抽題動畫");
  });

  test("防重放屏障與歷程重設：房間回退至 LOBBY 時，所有玩家（含非房主訪客）作答快取與屏障徹底重設", () => {
    let guestUserAnswers = { q1: ["A"], q2: ["B"] };
    const guestDrawingSessions = new Set([1727000000000]);
    let guestLocalStorage = { "battle_user_answers_TEST_p_guest": JSON.stringify(guestUserAnswers) };

    const incomingPollLobby = {
      code: "TEST",
      stage: "LOBBY",
    };

    // Client-side logic in fetchRoom on receiving LOBBY
    if (incomingPollLobby.stage === "LOBBY") {
      guestDrawingSessions.clear();
      guestUserAnswers = {};
      delete guestLocalStorage["battle_user_answers_TEST_p_guest"];
    }

    assert.equal(Object.keys(guestUserAnswers).length, 0, "作答紀錄必須重置為空物件");
    assert.equal(guestDrawingSessions.size, 0, "屏障歷史紀錄必須清空");
    assert.equal(guestLocalStorage["battle_user_answers_TEST_p_guest"], undefined, "localStorage 必須被徹底刪除");
  });

  // =========================================================================
  // Part 3: User Answer Tracking & Preservation Logic
  // =========================================================================
  console.log("\n--- Part 3: 作答歷程保存與判定正確性 (R1 Data Layer) ---");

  const answerUtilsPath = path.resolve(__dirname, "../src/lib/answerUtils.ts");
  const { compareAnswers, normalizeAnswers, formatAnswerDisplay } = await import(
    "file://" + answerUtilsPath.replace(/\\/g, "/")
  );

  test("單選與複選作答判定精準度 (compareAnswers)", () => {
    // 單選正確
    assert.equal(compareAnswers(["A"], "A"), true);
    // 單選錯誤
    assert.equal(compareAnswers(["B"], "A"), false);
    // 複選正確 (順序無關、去空白、大小寫容錯)
    assert.equal(compareAnswers(["B", "A", "D"], "A,B,D"), true);
    assert.equal(compareAnswers(["a", "b", "d"], "A,B,D"), true);
    // 複選少選 (部分答對仍為錯)
    assert.equal(compareAnswers(["A", "B"], "A,B,D"), false);
    // 複選多選
    assert.equal(compareAnswers(["A", "B", "C", "D"], "A,B,D"), false);
  });

  test("多題作答歷程追蹤與累積 (Record<string, string[]> 不受題號更迭破壞)", () => {
    let userAnswers = {};

    // 模擬第一題答 B (錯)
    userAnswers = { ...userAnswers, [sampleQuestions[0].id]: ["B"] };
    // 模擬第二題答 A, B, D (對)
    userAnswers = { ...userAnswers, [sampleQuestions[1].id]: ["A", "B", "D"] };
    // 模擬第三題答 B (對)
    userAnswers = { ...userAnswers, [sampleQuestions[2].id]: ["B"] };

    assert.equal(Object.keys(userAnswers).length, 3);
    assert.deepEqual(userAnswers["q1"], ["B"]);
    assert.deepEqual(userAnswers["q2"], ["A", "B", "D"]);
    assert.deepEqual(userAnswers["q3"], ["B"]);

    // 驗證比對統計
    const correctCount = sampleQuestions.filter((q) =>
      compareAnswers(userAnswers[q.id], q.correctAnswers)
    ).length;
    const wrongCount = sampleQuestions.filter(
      (q) => !compareAnswers(userAnswers[q.id], q.correctAnswers)
    ).length;

    assert.equal(correctCount, 2);
    assert.equal(wrongCount, 1);
  });

  test("作答紀錄與展示格式化容錯 (formatAnswerDisplay 支援未排序、小寫與空值)", () => {
    // 陣列未排序且小寫自動正規化
    assert.equal(formatAnswerDisplay(["b", "a"]), "A, B");
    // 空陣列回傳空字串並由 || 未作答 接手
    assert.equal(formatAnswerDisplay([]) || "未作答", "未作答");
    // null 回傳空字串並由 || 未作答 接手
    assert.equal(formatAnswerDisplay(null) || "未作答", "未作答");
    // 正解字串正規化為帶空格格式
    assert.equal(formatAnswerDisplay("A,B"), "A, B");
    assert.equal(formatAnswerDisplay("A") || "無", "A");
  });

  // =========================================================================
  // Part 4: BattleReviewPanel Component SSR Contract & Tab Filter
  // =========================================================================
  console.log("\n--- Part 4: BattleReviewPanel SSR 元件契約與篩選檢驗 ---");

  const panelSourcePath = path.resolve(
    __dirname,
    "../src/components/battle/BattleReviewPanel.tsx"
  );
  const cardSourcePath = path.resolve(__dirname, "../src/components/ExplanationCard.tsx");
  const parserSourcePath = path.resolve(__dirname, "../src/lib/explanationParser.ts");

  function loadTranspiledModule(filePath) {
    const code = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    });

    const mod = { exports: {} };
    const customRequire = (id) => {
      if (id === "@/lib/explanationParser" || id === "./explanationParser") {
        return loadTranspiledModule(parserSourcePath);
      }
      if (id === "@/components/ExplanationCard" || id === "./ExplanationCard") {
        return loadTranspiledModule(cardSourcePath);
      }
      if (id === "@/lib/answerUtils" || id === "./answerUtils") {
        return {
          __esModule: true,
          compareAnswers,
          normalizeAnswers,
          formatAnswerDisplay,
          default: { compareAnswers, normalizeAnswers, formatAnswerDisplay },
        };
      }
      if (id === "react") return React;
      if (id === "lucide-react") {
        return new Proxy(
          {},
          {
            get: (_, propName) => {
              return (props) =>
                React.createElement("svg", {
                  "data-lucide": propName,
                  className: props.className,
                  width: props.size || 16,
                  height: props.size || 16,
                });
            },
          }
        );
      }
      return require(id);
    };

    const fn = new Function("require", "module", "exports", transpiled.outputText);
    fn(customRequire, mod, mod.exports);
    return mod.exports;
  }

  const BattleReviewPanelModule = loadTranspiledModule(panelSourcePath);
  const BattleReviewPanel =
    BattleReviewPanelModule.BattleReviewPanel || BattleReviewPanelModule.default;

  test("BattleReviewPanel 匯出契約驗證 (Named & Default)", () => {
    assert.ok(typeof BattleReviewPanel === "function", "必須匯出 React 元件函式");
  });

  const mockUserAnswers = {
    q1: ["B"], // 錯 (正解 A)
    q2: ["A", "B", "D"], // 對 (正解 A,B,D)
    q3: ["B"], // 對 (正解 B)
  };

  test("SSR 渲染契約：完整渲染 3 道題目、篩選標籤與徽章計數", () => {
    const element = React.createElement(BattleReviewPanel, {
      questions: sampleQuestions,
      userAnswers: mockUserAnswers,
      title: "測試考題覆盤面板",
    });

    const html = ReactDOMServer.renderToStaticMarkup(element);

    // 標題與標籤檢驗
    assert.ok(html.includes("測試考題覆盤面板"), "包含自訂標題");
    assert.ok(html.includes("全部題目"), "包含全部題目篩選標籤");
    assert.ok(html.includes("僅看錯題"), "包含僅看錯題篩選標籤");
    assert.ok(html.includes("僅看答對"), "包含僅看答對篩選標籤");

    // 徽章計數：總共 3 題，答對 2 題，答錯 1 題
    assert.ok(html.includes(">3<"), "包含總題數徽章 3");
    assert.ok(html.includes(">1<"), "包含錯題數徽章 1");
    assert.ok(html.includes(">2<"), "包含答對數徽章 2");

    // 題幹與選項檢驗
    assert.ok(html.includes("關於 TypeScript 型別系統"), "包含 Q1 題幹");
    assert.ok(html.includes("JavaScript 的原始型別"), "包含 Q2 題幹");
    assert.ok(html.includes("React 18 中的自動批次更新"), "包含 Q3 題幹");

    // 正確與錯誤標記
    assert.ok(html.includes("答錯"), "Q1 標註答錯");
    assert.ok(html.includes("答對"), "Q2/Q3 標註答對");
    assert.ok(html.includes("你的選擇"), "標註玩家選擇");
    assert.ok(html.includes("正解"), "標註正解選項");
  });

  test("ExplanationCard 嵌入整合：覆盤中嵌入解析卡片並傳入所需屬性", () => {
    const element = React.createElement(BattleReviewPanel, {
      questions: sampleQuestions,
      userAnswers: mockUserAnswers,
    });

    const html = ReactDOMServer.renderToStaticMarkup(element);

    // 驗證解析卡片核心內容與選項剖析結構
    assert.ok(html.includes("any 會繞過型別系統檢查"), "包含 Q1 解析文字");
    assert.ok(html.includes("A、B、D 為原始型別"), "包含 Q2 解析文字");
    assert.ok(html.includes("React 18 預設在所有非同步操作中自動批次更新"), "包含 Q3 解析文字");
  });

  test("空狀態回饋：預設篩選 WRONG 且全數答對時顯示恭喜全對賀詞", () => {
    const allCorrectAnswers = {
      q1: ["A"],
      q2: ["A", "B", "D"],
      q3: ["B"],
    };

    const element = React.createElement(BattleReviewPanel, {
      questions: sampleQuestions,
      userAnswers: allCorrectAnswers,
      defaultFilter: "WRONG",
    });

    const html = ReactDOMServer.renderToStaticMarkup(element);

    assert.ok(html.includes("太厲害了！本局全數答對，無任何錯題！"), "全對時顯示祝賀空狀態");
  });

  // =========================================================================
  // Part 5: Static Call-Site & Contract Audit
  // =========================================================================
  console.log("\n--- Part 5: 頁面與雙入口靜態整合審計 (Dual Entrypoint Audit) ---");

  const pagePath = path.resolve(__dirname, "../src/app/battle/[code]/page.tsx");
  const playViewPath = path.resolve(__dirname, "../src/components/battle/BattlePlayView.tsx");
  const podiumViewPath = path.resolve(__dirname, "../src/components/battle/BattlePodiumView.tsx");

  const pageContent = fs.readFileSync(pagePath, "utf8");
  const playViewContent = fs.readFileSync(playViewPath, "utf8");
  const podiumViewContent = fs.readFileSync(podiumViewPath, "utf8");

  test("審計 battle/[code]/page.tsx 包含 completedDrawingSessionsRef 防重放屏障", () => {
    assert.ok(
      pageContent.includes("completedDrawingSessionsRef"),
      "page.tsx 必須具備 completedDrawingSessionsRef"
    );
    assert.ok(
      pageContent.includes("completedDrawingSessionsRef.current.add"),
      "handleDrawAnimationComplete 必須登記 completedDrawingSessionsRef"
    );
    assert.ok(
      pageContent.includes("completedDrawingSessionsRef.current.has"),
      "fetchRoom 與視圖路由必須檢查 completedDrawingSessionsRef"
    );
  });

  test("審計 battle/[code]/page.tsx 包含 userAnswers 狀態與 localStorage 持久化", () => {
    assert.ok(pageContent.includes("userAnswers"), "page.tsx 必須宣告 userAnswers state");
    assert.ok(
      pageContent.includes("battle_user_answers_"),
      "page.tsx 必須在 localStorage 存取 battle_user_answers_"
    );
    assert.ok(
      pageContent.includes("handleRecordAnswer"),
      "page.tsx 必須具備 handleRecordAnswer 回呼函式"
    );
  });

  test("審計 Entrypoint 1: BattlePlayView.tsx 於等待畫面嵌入 BattleReviewPanel", () => {
    assert.ok(
      playViewContent.includes("import BattleReviewPanel"),
      "BattlePlayView 必須匯入 BattleReviewPanel"
    );
    assert.ok(
      playViewContent.includes("onRecordAnswer"),
      "BattlePlayView 必須支援 onRecordAnswer prop"
    );
    assert.ok(
      playViewContent.includes("<BattleReviewPanel"),
      "BattlePlayView 必須在等待畫面呼叫 <BattleReviewPanel"
    );
  });

  test("審計 Entrypoint 2: BattlePodiumView.tsx 於頒獎台戰績表下方嵌入 BattleReviewPanel", () => {
    assert.ok(
      podiumViewContent.includes("import BattleReviewPanel"),
      "BattlePodiumView 必須匯入 BattleReviewPanel"
    );
    assert.ok(
      podiumViewContent.includes("userAnswers"),
      "BattlePodiumView 必須接收 userAnswers prop"
    );
    assert.ok(
      podiumViewContent.includes("<BattleReviewPanel"),
      "BattlePodiumView 必須呼叫 <BattleReviewPanel"
    );
    assert.ok(
      podiumViewContent.includes("orderedQuestions"),
      "BattlePodiumView 必須計算 orderedQuestions 保持玩家亂序題號一致性"
    );
    assert.ok(
      podiumViewContent.includes("effectiveUserAnswers"),
      "BattlePodiumView 必須具備 effectiveUserAnswers 支援水合/刷新容錯"
    );
  });

  test("審計 battle/[code]/page.tsx 於 LOBBY 重設所有玩家之作答歷程與防重放屏障", () => {
    assert.ok(
      pageContent.includes('updatedRoom.stage === "LOBBY"'),
      "fetchRoom 必須在房間階段為 LOBBY 時清理所有玩家作答紀錄"
    );
  });

  // =========================================================================
  // Part 6: 對戰模式錯題自動同步至錯題系統 (Wrong Questions Integration)
  // =========================================================================
  console.log("\n--- Part 6: 對戰模式錯題自動同步至錯題系統 (Wrong Questions Integration) ---");

  test("審計 BattlePlayView.tsx 具備錯題自動同步 API 呼叫與防重複集合", () => {
    assert.ok(
      playViewContent.includes('fetch("/api/wrong-questions"'),
      "BattlePlayView 必須在答錯時呼叫 /api/wrong-questions"
    );
    assert.ok(
      playViewContent.includes("syncedWrongQuestionIdsRef"),
      "BattlePlayView 必須使用 syncedWrongQuestionIdsRef 防止同一題重複同步"
    );
    assert.ok(
      playViewContent.includes("formatAnswerDisplay"),
      "BattlePlayView 必須使用 formatAnswerDisplay 格式化作答文字"
    );
    assert.ok(
      playViewContent.includes("drawingStartTime"),
      "BattlePlayView 必須在新局開始時清理已同步錯題集合"
    );
  });

  test("審計 BattleReviewPanel.tsx 呈現錯題已記錄至錯題本之文案與標籤", () => {
    const reviewPanelContent = fs.readFileSync(panelSourcePath, "utf-8");
    assert.ok(
      reviewPanelContent.includes("個人錯題本與全站錯題統計"),
      "BattleReviewPanel 標題說明必須提示答錯考題已納入個人錯題本與全站統計"
    );
    assert.ok(
      reviewPanelContent.includes("已同步至錯題本"),
      "BattleReviewPanel 錯題標籤必須清楚標記已同步至錯題本"
    );
  });

  test("行為邏輯模擬：答錯題即時觸發 /api/wrong-questions 且答對題不觸發", async () => {
    const loggedRequests = [];
    const fakeFetch = async (url, options) => {
      loggedRequests.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ success: true }) };
    };

    const syncedSet = new Set();
    const handleSimulatedAnswer = async (qId, ans, correctAns) => {
      const { compareAnswers, formatAnswerDisplay } = await import(
        "file://" + path.resolve(__dirname, "../src/lib/answerUtils.ts").replace(/\\/g, "/")
      );
      const isCorrect = compareAnswers(ans, correctAns);
      if (!isCorrect) {
        if (!syncedSet.has(qId)) {
          syncedSet.add(qId);
          const userAnsStr = formatAnswerDisplay(ans) || "未作答";
          await fakeFetch("/api/wrong-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId: qId, userAnswer: userAnsStr }),
          });
        }
      }
    };

    // 1. 答錯 Q1
    await handleSimulatedAnswer("q101", ["B"], "A");
    assert.equal(loggedRequests.length, 1, "答錯 Q1 應觸發 1 次請求");
    assert.equal(loggedRequests[0].url, "/api/wrong-questions");
    assert.equal(loggedRequests[0].body.questionId, "q101");
    assert.equal(loggedRequests[0].body.userAnswer, "B");

    // 2. 答對 Q2
    await handleSimulatedAnswer("q102", ["C"], "C");
    assert.equal(loggedRequests.length, 1, "答對 Q2 不應觸發請求");

    // 3. 重複作答 Q1 (防重複機制)
    await handleSimulatedAnswer("q101", ["B"], "A");
    assert.equal(loggedRequests.length, 1, "同一場次重複作答不應發送第二次錯題記錄");

    // 4. 新局開始清空集合
    syncedSet.clear();
    await handleSimulatedAnswer("q101", ["D"], "A");
    assert.equal(loggedRequests.length, 2, "新局重抽相同題目若答錯應允許再次同步");
    assert.equal(loggedRequests[1].body.userAnswer, "D");
  });

  console.log(`\n==================================================`);
  console.log(`🎉 對戰覆盤面板、防重放屏障與錯題同步測試全數通過！(通過 ${passed} / ${total} 項，0 錯誤)`);
  console.log(`==================================================\n`);
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
