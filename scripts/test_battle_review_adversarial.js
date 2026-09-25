/**
 * scripts/test_battle_review_adversarial.js
 * Adversarial Stress Harness for Milestone M8 R1: Battle Review & Dual Entrypoints
 * 
 * Verifies:
 * 1. Answer tracking edge cases (single, multiple, empty/skipped, exact correctness, 10+ retention, round-trip cache).
 * 2. Review panel filtering stress tests (100% correct, 100% wrong, mixed, empty quiz, badge counts matching cards).
 * 3. Dual entrypoint rendering check (SSR markup for waiting screen & podium contexts, strict ExplanationCard prop forwarding).
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

async function runAdversarialHarness() {
  console.log("==================================================================");
  console.log("🔥 EMPIRICAL ADVERSARIAL CHALLENGER: Battle Review & Dual Entrypoints");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function runTest(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    Error: ${err.message}`);
      if (err.stack) {
        const stackLines = err.stack.split("\n").slice(1, 4).join("\n");
        console.error(`    ${stackLines}`);
      }
    }
  }

  // Helper to transpile TS/TSX modules on the fly
  const moduleCache = new Map();
  function loadTranspiled(filePath, customOverrides = {}) {
    const absPath = path.resolve(filePath);
    const code = fs.readFileSync(absPath, "utf8");
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
      if (customOverrides[id]) {
        return customOverrides[id];
      }
      if (id === "@/lib/explanationParser" || id.endsWith("explanationParser")) {
        return loadTranspiled(path.resolve(__dirname, "../src/lib/explanationParser.ts"), customOverrides);
      }
      if (id === "@/components/ExplanationCard" || id.endsWith("ExplanationCard")) {
        return loadTranspiled(path.resolve(__dirname, "../src/components/ExplanationCard.tsx"), customOverrides);
      }
      if (id === "@/lib/answerUtils" || id.endsWith("answerUtils")) {
        return loadTranspiled(path.resolve(__dirname, "../src/lib/answerUtils.ts"), customOverrides);
      }
      if (id === "@/lib/battleStore" || id.endsWith("battleStore")) {
        return loadTranspiled(path.resolve(__dirname, "../src/lib/battleStore.ts"), customOverrides);
      }
      if (id === "@/lib/battleAudio" || id.endsWith("battleAudio")) {
        return {
          battleAudio: {
            playCorrect: () => {},
            playWrong: () => {},
            playVictory: () => {},
            playCountdown: () => {},
            playStart: () => {},
            getMuted: () => false,
            setMuted: () => {},
            playClick: () => {},
          },
        };
      }
      if (id === "@/lib/avatars" || id.endsWith("avatars")) {
        return {
          getAnimalAvatar: (avatarId) => ({
            id: avatarId || "fox",
            name: "測試小動物",
            icon: "🦊",
            gradient: "from-amber-500 to-orange-500",
            border: "border-amber-400",
          }),
        };
      }
      if (id === "./AnimalAvatar" || id === "@/components/battle/AnimalAvatar") {
        return {
          __esModule: true,
          default: (props) => React.createElement("div", { "data-testid": "animal-avatar", "data-id": props.id }, "Avatar"),
        };
      }
      if (id === "./CompetitorLiveBoard" || id === "@/components/battle/CompetitorLiveBoard") {
        return {
          __esModule: true,
          default: (props) => React.createElement("div", { "data-testid": "competitor-live-board" }, "LiveBoard"),
        };
      }
      if (id === "./BattleReviewPanel" || id === "@/components/battle/BattleReviewPanel") {
        return loadTranspiled(path.resolve(__dirname, "../src/components/battle/BattleReviewPanel.tsx"), customOverrides);
      }
      if (id === "next/link") {
        return {
          __esModule: true,
          default: (props) => React.createElement("a", { href: props.href, className: props.className }, props.children),
        };
      }
      if (id === "next/navigation") {
        return {
          useRouter: () => ({ push: () => {}, replace: () => {} }),
          usePathname: () => "/battle/TEST",
        };
      }
      if (id === "react") return React;
      if (id === "react-dom/server") return ReactDOMServer;
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

  // Load answerUtils
  const answerUtils = loadTranspiled(path.resolve(__dirname, "../src/lib/answerUtils.ts"));
  const { compareAnswers, normalizeAnswers } = answerUtils;

  // =========================================================================
  // Section 1: Answer Tracking Edge Cases
  // =========================================================================
  console.log("\n--- Section 1: 作答歷程極端邊界測試 (Answer Tracking Edge Cases) ---");

  runTest("單選判定：標準比對、大小寫、去空白與錯選", () => {
    // 正確單選
    assert.equal(compareAnswers(["A"], "A"), true);
    assert.equal(compareAnswers(["B"], "B"), true);
    // 大小寫不拘
    assert.equal(compareAnswers(["a"], "A"), true);
    assert.equal(compareAnswers(["A"], "a"), true);
    // 兩端空白防禦
    assert.equal(compareAnswers([" A "], "A"), true);
    assert.equal(compareAnswers(["A"], " A "), true);
    // 錯選
    assert.equal(compareAnswers(["B"], "A"), false);
    assert.equal(compareAnswers(["C"], "A"), false);
  });

  runTest("複選判定：多選項順序無關、去空白、大小寫、字串拆分", () => {
    // 順序無關 (B,C 與 C,B)
    assert.equal(compareAnswers(["B", "C"], "B,C"), true);
    assert.equal(compareAnswers(["C", "B"], "B,C"), true);
    assert.equal(compareAnswers(["C", "B"], "B, C"), true);
    assert.equal(compareAnswers(["b", "c"], "B,C"), true);
    // 4 個選項全選
    assert.equal(compareAnswers(["D", "A", "C", "B"], "A,B,C,D"), true);
    // 傳入含逗號的單一字串陣列元素容錯
    assert.equal(compareAnswers(["B, C"], "B,C"), true);
    // 部分答對 (缺漏) 嚴格判定為錯
    assert.equal(compareAnswers(["B"], "B,C"), false);
    assert.equal(compareAnswers(["C"], "B,C"), false);
    // 多選 (多出錯項) 嚴格判定為錯
    assert.equal(compareAnswers(["A", "B", "C"], "B,C"), false);
    assert.equal(compareAnswers(["B", "C", "D"], "B,C"), false);
    // 完全錯誤
    assert.equal(compareAnswers(["A", "D"], "B,C"), false);
  });

  runTest("空作答與跳過判定：空陣列 []、undefined、null、純空白", () => {
    assert.equal(compareAnswers([], "A"), false);
    assert.equal(compareAnswers([], "B,C"), false);
    assert.equal(compareAnswers(undefined, "A"), false);
    assert.equal(compareAnswers(null, "A"), false);
    assert.equal(compareAnswers([""], "A"), false);
    assert.equal(compareAnswers(["   "], "A"), false);
    // 當題目正解為空或無效時的安全防護
    assert.equal(compareAnswers(["A"], ""), false);
    assert.equal(compareAnswers(["A"], null), false);
    assert.equal(compareAnswers(["A"], undefined), false);
    assert.equal(compareAnswers([], ""), false);
  });

  runTest("10+ 題大量歷程保存、累加不變性與 LocalStorage 序列化還原", () => {
    const totalQ = 14;
    const questions = [];
    for (let i = 1; i <= totalQ; i++) {
      questions.push({
        id: `q_${i}`,
        stem: `題目第 ${i} 題題幹`,
        optionA: `選項 A_${i}`,
        optionB: `選項 B_${i}`,
        optionC: `選項 C_${i}`,
        optionD: `選項 D_${i}`,
        correctAnswers: i % 2 === 0 ? "B,C" : "A",
        type: i % 2 === 0 ? "MULTIPLE" : "SINGLE",
        explanation: `題目 ${i} 的詳解說明。`,
      });
    }

    let userAnswers = {};

    // 模擬依序作答 14 題
    const simulatedInputs = [
      ["A"],            // Q1: Correct (A)
      ["B", "C"],       // Q2: Correct (B,C)
      ["D"],            // Q3: Wrong (correct A)
      [],               // Q4: Skipped/Empty
      undefined,        // Q5: Undefined
      ["B"],            // Q6: Partial Wrong (correct B,C)
      ["A"],            // Q7: Correct (A)
      ["C", "B"],       // Q8: Correct (B,C out-of-order)
      ["A", "B", "C"],  // Q9: Superset Wrong (correct A)
      [],               // Q10: Skipped/Empty
      ["A"],            // Q11: Correct (A)
      ["B", "C"],       // Q12: Correct (B,C)
      ["B"],            // Q13: Wrong (correct A)
      ["B", "C"],       // Q14: Correct (B,C)
    ];

    simulatedInputs.forEach((ans, idx) => {
      const qId = questions[idx].id;
      if (ans !== undefined) {
        userAnswers = { ...userAnswers, [qId]: ans };
      }
    });

    // 模擬 LocalStorage 存取與序列化
    const serialized = JSON.stringify(userAnswers);
    const deserialized = JSON.parse(serialized);

    assert.equal(Object.keys(deserialized).length, 13); // Q5 omitted as undefined
    assert.deepEqual(deserialized["q_1"], ["A"]);
    assert.deepEqual(deserialized["q_2"], ["B", "C"]);
    assert.deepEqual(deserialized["q_3"], ["D"]);
    assert.deepEqual(deserialized["q_4"], []);
    assert.equal(deserialized["q_5"], undefined);
    assert.deepEqual(deserialized["q_8"], ["C", "B"]);

    // 驗證歷程判定：
    // Q1(對), Q2(對), Q3(錯), Q4(錯), Q5(錯), Q6(錯), Q7(對), Q8(對), Q9(錯), Q10(錯), Q11(對), Q12(對), Q13(錯), Q14(對)
    // 預期對：Q1, Q2, Q7, Q8, Q11, Q12, Q14 -> 7 題
    // 預期錯：Q3, Q4, Q5, Q6, Q9, Q10, Q13 -> 7 題
    let correctSum = 0;
    let wrongSum = 0;
    questions.forEach((q) => {
      const ans = deserialized[q.id] || [];
      if (compareAnswers(ans, q.correctAnswers)) {
        correctSum++;
      } else {
        wrongSum++;
      }
    });

    assert.equal(correctSum, 7, "預期 7 題答對");
    assert.equal(wrongSum, 7, "預期 7 題答錯/未答");
  });

  // =========================================================================
  // Section 2: Review Panel Filtering Stress Tests
  // =========================================================================
  console.log("\n--- Section 2: 覆盤面板篩選器極端壓力測試 (Review Panel Filtering) ---");

  const BattleReviewPanelModule = loadTranspiled(
    path.resolve(__dirname, "../src/components/battle/BattleReviewPanel.tsx")
  );
  const BattleReviewPanel = BattleReviewPanelModule.default || BattleReviewPanelModule.BattleReviewPanel;

  // 構造 12 題測試題庫
  const stressQuestions = [];
  for (let i = 1; i <= 12; i++) {
    stressQuestions.push({
      id: `sq_${i}`,
      stem: `極端壓力題庫第 ${i} 題`,
      optionA: `選項 A 代表 ${i}`,
      optionB: `選項 B 代表 ${i}`,
      optionC: `選項 C 代表 ${i}`,
      optionD: `選項 D 代表 ${i}`,
      correctAnswers: i % 2 === 0 ? "B,D" : "A",
      type: i % 2 === 0 ? "MULTIPLE" : "SINGLE",
      explanation: `解析 ${i}：選項 **A** 是主要考點，\`CodeBlock\` 關鍵詞。`,
    });
  }

  // Helper to count rendered question cards by matching the question badge
  function countRenderedCards(html) {
    const matches = html.match(/bg-accent\/20[^>]*>\s*第\s*\d+\s*題/g);
    return matches ? matches.length : 0;
  }

  runTest("100% 全對場景：ALL 顯示全部，WRONG 顯示 0 並呈現全對祝賀，CORRECT 顯示全部", () => {
    const perfectAnswers = {};
    stressQuestions.forEach((q) => {
      perfectAnswers[q.id] = q.type === "SINGLE" ? ["A"] : ["B", "D"];
    });

    // 1. ALL 篩選
    const elementAll = React.createElement(BattleReviewPanel, {
      questions: stressQuestions,
      userAnswers: perfectAnswers,
      defaultFilter: "ALL",
    });
    const htmlAll = ReactDOMServer.renderToStaticMarkup(elementAll);
    assert.equal(countRenderedCards(htmlAll), 12, "ALL 應渲染全部 12 張考題卡");
    assert.ok(htmlAll.includes("共 12 題"));
    assert.ok(htmlAll.includes("答對 12"));
    assert.ok(htmlAll.includes("答錯 0"));
    assert.ok(!htmlAll.includes("太厲害了！本局全數答對"));

    // 2. WRONG 篩選 (全對時應為空狀態)
    const elementWrong = React.createElement(BattleReviewPanel, {
      questions: stressQuestions,
      userAnswers: perfectAnswers,
      defaultFilter: "WRONG",
    });
    const htmlWrong = ReactDOMServer.renderToStaticMarkup(elementWrong);
    assert.equal(countRenderedCards(htmlWrong), 0, "WRONG 應渲染 0 張卡片");
    assert.ok(
      htmlWrong.includes("太厲害了！本局全數答對，無任何錯題！🎉"),
      "必須呈現全對慶祝空狀態"
    );
    assert.ok(htmlWrong.includes("可切換至「全部題目」或「僅看答對」查看考題解析"));

    // 3. CORRECT 篩選
    const elementCorrect = React.createElement(BattleReviewPanel, {
      questions: stressQuestions,
      userAnswers: perfectAnswers,
      defaultFilter: "CORRECT",
    });
    const htmlCorrect = ReactDOMServer.renderToStaticMarkup(elementCorrect);
    assert.equal(countRenderedCards(htmlCorrect), 12, "CORRECT 應渲染全部 12 張卡片");
    assert.ok(!htmlCorrect.includes("太厲害了！本局全數答對"));
  });

  runTest("100% 全錯/全缺場景：ALL 顯示全部，WRONG 顯示全部，CORRECT 顯示 0 並呈現勉勵空狀態", () => {
    const zeroAnswers = {};
    stressQuestions.forEach((q, idx) => {
      // 故意全部答錯或留空
      zeroAnswers[q.id] = idx % 2 === 0 ? ["C"] : [];
    });

    // 1. ALL 篩選
    const elementAll = React.createElement(BattleReviewPanel, {
      questions: stressQuestions,
      userAnswers: zeroAnswers,
      defaultFilter: "ALL",
    });
    const htmlAll = ReactDOMServer.renderToStaticMarkup(elementAll);
    assert.equal(countRenderedCards(htmlAll), 12, "ALL 應渲染全部 12 張卡片");
    assert.ok(htmlAll.includes("答對 0"));
    assert.ok(htmlAll.includes("答錯 12"));

    // 2. WRONG 篩選
    const elementWrong = React.createElement(BattleReviewPanel, {
      questions: stressQuestions,
      userAnswers: zeroAnswers,
      defaultFilter: "WRONG",
    });
    const htmlWrong = ReactDOMServer.renderToStaticMarkup(elementWrong);
    assert.equal(countRenderedCards(htmlWrong), 12, "WRONG 應渲染全部 12 張錯題卡");

    // 3. CORRECT 篩選 (全錯時答對清單為空)
    const elementCorrect = React.createElement(BattleReviewPanel, {
      questions: stressQuestions,
      userAnswers: zeroAnswers,
      defaultFilter: "CORRECT",
    });
    const htmlCorrect = ReactDOMServer.renderToStaticMarkup(elementCorrect);
    assert.equal(countRenderedCards(htmlCorrect), 0, "CORRECT 應渲染 0 張卡片");
    assert.ok(
      htmlCorrect.includes("本局暫無答對題目，再接再厲！💪"),
      "必須呈現零答對勉勵空狀態"
    );
    assert.ok(htmlCorrect.includes("可切換至「全部題目」或「僅看錯題」"));
  });

  runTest("混合得分精確卡片數量對齊：Badge 數字與 HTML 渲染卡片張數 100% 吻合", () => {
    // 構造 12 題中剛好 7 對 5 錯
    // 對: 1, 2, 3, 4, 5, 6, 7
    // 錯: 8, 9, 10, 11, 12
    const mixedAnswers = {};
    stressQuestions.forEach((q, idx) => {
      if (idx < 7) {
        mixedAnswers[q.id] = q.type === "SINGLE" ? ["A"] : ["B", "D"];
      } else {
        mixedAnswers[q.id] = ["C"];
      }
    });

    // 測試 ALL
    const htmlAll = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BattleReviewPanel, {
        questions: stressQuestions,
        userAnswers: mixedAnswers,
        defaultFilter: "ALL",
      })
    );
    assert.equal(countRenderedCards(htmlAll), 12);
    assert.ok(htmlAll.includes(">12<"), "全部題目 Badge 應為 12");
    assert.ok(htmlAll.includes(">7<"), "答對 Badge 應為 7");
    assert.ok(htmlAll.includes(">5<"), "答錯 Badge 應為 5");

    // 測試 WRONG
    const htmlWrong = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BattleReviewPanel, {
        questions: stressQuestions,
        userAnswers: mixedAnswers,
        defaultFilter: "WRONG",
      })
    );
    const wrongCards = countRenderedCards(htmlWrong);
    assert.equal(wrongCards, 5, "WRONG 視角應嚴格僅渲染 5 張卡片");
    // 確認出現的是 sq_8 到 sq_12 的題幹
    assert.ok(htmlWrong.includes("第 8 題"));
    assert.ok(htmlWrong.includes("第 12 題"));
    assert.ok(!htmlWrong.includes("第 1 題"));
    assert.ok(!htmlWrong.includes("第 7 題"));

    // 測試 CORRECT
    const htmlCorrect = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BattleReviewPanel, {
        questions: stressQuestions,
        userAnswers: mixedAnswers,
        defaultFilter: "CORRECT",
      })
    );
    const correctCards = countRenderedCards(htmlCorrect);
    assert.equal(correctCards, 7, "CORRECT 視角應嚴格僅渲染 7 張卡片");
    assert.ok(htmlCorrect.includes("第 1 題"));
    assert.ok(htmlCorrect.includes("第 7 題"));
    assert.ok(!htmlCorrect.includes("第 8 題"));
    assert.ok(!htmlCorrect.includes("第 12 題"));
  });

  runTest("邊界狀況：0 題目或空陣列安全容錯", () => {
    const htmlEmpty = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BattleReviewPanel, {
        questions: [],
        userAnswers: {},
      })
    );
    assert.equal(countRenderedCards(htmlEmpty), 0);
    assert.ok(htmlEmpty.includes("目前暫無本局作答紀錄"));
    assert.ok(htmlEmpty.includes("共 0 題"));
  });

  // =========================================================================
  // Section 3: Dual Entrypoints & ExplanationCard Strict Prop Forwarding
  // =========================================================================
  console.log("\n--- Section 3: 雙入口 SSR 渲染與 ExplanationCard 屬性轉發 (Dual Entrypoints & Props) ---");

  // Interceptor to inspect props passed to ExplanationCard
  let interceptedProps = [];
  const MockExplanationCard = (props) => {
    interceptedProps.push(props);
    return React.createElement(
      "div",
      {
        "data-testid": "intercepted-explanation-card",
        "data-type": props.questionType,
        "data-correct": props.correctAnswers,
      },
      props.explanation
    );
  };

  const InterceptedPanelModule = loadTranspiled(
    path.resolve(__dirname, "../src/components/battle/BattleReviewPanel.tsx"),
    {
      "@/components/ExplanationCard": {
        __esModule: true,
        default: MockExplanationCard,
        ExplanationCard: MockExplanationCard,
      },
    }
  );
  const InterceptedPanel = InterceptedPanelModule.default || InterceptedPanelModule.BattleReviewPanel;

  runTest("ExplanationCard 屬性轉發檢驗：explanation, correctAnswers, userAnswer, options, questionType 嚴格傳遞", () => {
    interceptedProps = [];

    const testAnswers = {
      sq_1: ["A"],
      sq_2: ["B", "D"],
      sq_3: [],
      sq_4: ["C"],
    };

    const targetQuestions = stressQuestions.slice(0, 4);

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(InterceptedPanel, {
        questions: targetQuestions,
        userAnswers: testAnswers,
        defaultFilter: "ALL",
      })
    );

    assert.equal(interceptedProps.length, 4, "應為 4 道題目分別調用 ExplanationCard");

    targetQuestions.forEach((q, idx) => {
      const p = interceptedProps[idx];
      assert.ok(p, `第 ${idx + 1} 題 ExplanationCard 屬性必須存在`);
      
      // 1. explanation
      assert.equal(p.explanation, q.explanation, `第 ${idx + 1} 題 explanation 必須忠實轉發`);
      
      // 2. correctAnswers
      assert.equal(p.correctAnswers, q.correctAnswers, `第 ${idx + 1} 題 correctAnswers 必須正確轉發`);
      
      // 3. userAnswer
      assert.deepEqual(p.userAnswer, testAnswers[q.id] || [], `第 ${idx + 1} 題 userAnswer 必須相符`);
      
      // 4. options (A, B, C, D map)
      assert.ok(p.options && typeof p.options === "object", `第 ${idx + 1} 題 options 必須為物件`);
      assert.equal(p.options.A, q.optionA);
      assert.equal(p.options.B, q.optionB);
      assert.equal(p.options.C, q.optionC);
      assert.equal(p.options.D, q.optionD);
      
      // 5. questionType
      assert.equal(p.questionType, q.type, `第 ${idx + 1} 題 questionType 必須相符`);
    });
  });

  // Entrypoint 1: Waiting Screen Context (BattlePlayView)
  runTest("入口 1 驗證：提早交卷等待畫面 (BattlePlayView) SSR 渲染與覆盤面板嵌入", () => {
    const PlayViewModule = loadTranspiled(
      path.resolve(__dirname, "../src/components/battle/BattlePlayView.tsx")
    );
    const BattlePlayView = PlayViewModule.default || PlayViewModule.BattlePlayView;

    const mockRoom = {
      id: "room_test_1",
      code: "TEST1",
      hostId: "player_host",
      stage: "PLAYING",
      questions: stressQuestions.slice(0, 5),
      players: [
        {
          id: "player_p1",
          name: "提早完成者",
          avatar: "fox",
          score: 850,
          correctCount: 4,
          wrongCount: 1,
          currentIndex: 5,
          isFinished: true, // 關鍵：已完成作答
          isHost: false,
        },
        {
          id: "player_host",
          name: "尚在作答者",
          avatar: "dragon",
          score: 400,
          correctCount: 2,
          wrongCount: 0,
          currentIndex: 2,
          isFinished: false,
          isHost: true,
        },
      ],
      settings: {
        totalQuestions: 5,
        timePerQuestion: 20,
        mode: "STANDARD",
        orderMode: "FIXED",
        scoring: "BALANCED",
      },
    };

    const userAnswers = {
      sq_1: ["A"],
      sq_2: ["B", "D"],
      sq_3: ["A"],
      sq_4: ["B", "D"],
      sq_5: ["C"], // 錯
    };

    const playElement = React.createElement(BattlePlayView, {
      room: mockRoom,
      currentPlayerId: "player_p1",
      userAnswers: userAnswers,
      onRefreshRoom: async () => mockRoom,
      onFinishBattle: () => {},
    });

    const playHtml = ReactDOMServer.renderToStaticMarkup(playElement);

    // 驗證等待畫面關鍵字
    assert.ok(playHtml.includes("你已完成所有題目"), "包含提早完成提示");
    assert.ok(playHtml.includes("提前前往結算頒獎台"), "包含前往頒獎台按鈕");
    assert.ok(playHtml.includes("正在等待其他參賽者完成對戰"), "包含等待其他選手提示");

    // 驗證嵌入之 BattleReviewPanel
    assert.ok(playHtml.includes("本局考題覆盤與解析"), "等待畫面中必須嵌入覆盤面板");
    assert.ok(playHtml.includes("共 5 題"), "覆盤面板題數正確");
    assert.ok(playHtml.includes("答對 4"), "答對數正確標記為 4");
    assert.ok(playHtml.includes("答錯 1"), "答錯數正確標記為 1");
  });

  // Entrypoint 2: Final Podium Context (BattlePodiumView)
  runTest("入口 2 驗證：最終結算頒獎台 (BattlePodiumView) SSR 渲染與覆盤面板嵌入", () => {
    const PodiumViewModule = loadTranspiled(
      path.resolve(__dirname, "../src/components/battle/BattlePodiumView.tsx")
    );
    const BattlePodiumView = PodiumViewModule.default || PodiumViewModule.BattlePodiumView;

    const mockFinishedRoom = {
      id: "room_test_2",
      code: "TEST2",
      hostId: "player_host",
      stage: "FINISHED",
      questions: stressQuestions.slice(0, 5),
      players: [
        {
          id: "player_host",
          name: "冠軍得主",
          avatar: "dragon",
          score: 1200,
          correctCount: 5,
          wrongCount: 0,
          currentIndex: 5,
          isFinished: true,
          isHost: true,
        },
        {
          id: "player_p2",
          name: "亞軍選手",
          avatar: "shiba",
          score: 950,
          correctCount: 4,
          wrongCount: 1,
          currentIndex: 5,
          isFinished: true,
          isHost: false,
        },
      ],
      settings: {
        totalQuestions: 5,
        timePerQuestion: 20,
        mode: "STANDARD",
        orderMode: "FIXED",
        scoring: "BALANCED",
      },
    };

    const podiumElement = React.createElement(BattlePodiumView, {
      room: mockFinishedRoom,
      currentPlayerId: "player_p2",
      userAnswers: {
        sq_1: ["A"],
        sq_2: ["B", "D"],
        sq_3: ["A"],
        sq_4: ["B", "D"],
        sq_5: ["B"], // 錯
      },
      onLeaveBattle: () => {},
    });

    const podiumHtml = ReactDOMServer.renderToStaticMarkup(podiumElement);

    // 驗證頒獎台戰績總表
    assert.ok(podiumHtml.includes("全體參賽選手戰績總表"), "包含選手戰績總表標題");
    assert.ok(podiumHtml.includes("冠軍得主"), "戰績表包含冠軍");
    assert.ok(podiumHtml.includes("亞軍選手"), "戰績表包含亞軍");

    // 驗證頒獎台下方嵌入之 BattleReviewPanel
    assert.ok(podiumHtml.includes("本局考題覆盤與解析"), "頒獎台頁面中必須嵌入考題覆盤面板");
    assert.ok(podiumHtml.includes("極端壓力題庫第 1 題"), "包含第一題題幹");
    assert.ok(podiumHtml.includes("極端壓力題庫第 5 題"), "包含第五題題幹");
  });

  // =========================================================================
  // Section 4: Personalized Randomized Question Order Consistency
  // =========================================================================
  console.log("\n--- Section 4: 亂序抽題題序個人化一致性 (Random Question Order Invariance) ---");

  runTest("亂序模式題序保存：BattlePodiumView 依據 playerQuestionOrders 精準呈現玩家個人題序", () => {
    const PodiumViewModule = loadTranspiled(
      path.resolve(__dirname, "../src/components/battle/BattlePodiumView.tsx")
    );
    const BattlePodiumView = PodiumViewModule.default || PodiumViewModule.BattlePodiumView;

    // 原始題目為 sq_1, sq_2, sq_3, sq_4
    const originalQuestions = stressQuestions.slice(0, 4);
    // 玩家 A 亂序題序為: sq_3, sq_1, sq_4, sq_2
    const randomizedOrder = ["sq_3", "sq_1", "sq_4", "sq_2"];

    const mockRoomWithRandom = {
      id: "room_random",
      code: "RAND1",
      hostId: "player_a",
      stage: "FINISHED",
      questions: originalQuestions,
      playerQuestionOrders: {
        player_a: randomizedOrder,
      },
      players: [
        {
          id: "player_a",
          name: "亂序作答玩家",
          avatar: "dragon",
          score: 1000,
          correctCount: 4,
          wrongCount: 0,
          currentIndex: 4,
          isFinished: true,
          isHost: true,
        },
      ],
      settings: {
        totalQuestions: 4,
        timePerQuestion: 20,
        mode: "STANDARD",
        orderMode: "RANDOM",
        scoring: "BALANCED",
      },
    };

    const podiumElement = React.createElement(BattlePodiumView, {
      room: mockRoomWithRandom,
      currentPlayerId: "player_a",
      userAnswers: {
        sq_3: ["A"],
        sq_1: ["A"],
        sq_4: ["B", "D"],
        sq_2: ["B", "D"],
      },
      onLeaveBattle: () => {},
    });

    const html = ReactDOMServer.renderToStaticMarkup(podiumElement);

    // 檢查題目出現順序：第 1 題應對應 sq_3，第 2 題對應 sq_1
    const idxQ3 = html.indexOf("極端壓力題庫第 3 題");
    const idxQ1 = html.indexOf("極端壓力題庫第 1 題");
    const idxQ4 = html.indexOf("極端壓力題庫第 4 題");
    const idxQ2 = html.indexOf("極端壓力題庫第 2 題");

    assert.ok(idxQ3 !== -1 && idxQ1 !== -1 && idxQ4 !== -1 && idxQ2 !== -1);
    assert.ok(idxQ3 < idxQ1, "sq_3 應排在 sq_1 之前");
    assert.ok(idxQ1 < idxQ4, "sq_1 應排在 sq_4 之前");
    assert.ok(idxQ4 < idxQ2, "sq_4 應排在 sq_2 之前");
  });

  // =========================================================================
  // Section 5: Real ExplanationCard SSR Stress & Corrupted Inputs
  // =========================================================================
  console.log("\n--- Section 5: 真實 ExplanationCard SSR 整合與異常資料防禦 ---");

  runTest("極端資料防禦：題目缺省選項 (optionC, optionD 為 null)、空解析、髒資料安全渲染", () => {
    const corruptQuestions = [
      {
        id: "cq_1",
        stem: "二選一判斷題（無 C、D 選項）",
        optionA: "正確",
        optionB: "錯誤",
        optionC: null,
        optionD: undefined,
        correctAnswers: "A",
        type: "SINGLE",
        explanation: null, // 空解析
      },
      {
        id: "cq_2",
        stem: "題目解析包含複合 Markdown 粗體與代碼",
        optionA: "選項 A",
        optionB: "選項 B",
        optionC: "選項 C",
        optionD: "選項 D",
        correctAnswers: "B,C",
        type: "MULTIPLE",
        explanation: "這是 **關鍵重點**，請參考 `useMemo` 與 `useCallback` 的機制。",
      },
    ];

    const corruptAnswers = {
      cq_1: ["A"],
      cq_2: ["B"], // 部分答對 -> 錯
      stale_question_999: ["Z"], // 不存在的題目髒資料
    };

    const element = React.createElement(BattleReviewPanel, {
      questions: corruptQuestions,
      userAnswers: corruptAnswers,
    });

    const html = ReactDOMServer.renderToStaticMarkup(element);

    assert.ok(html.includes("二選一判斷題"), "二選一題目正常渲染");
    assert.ok(html.includes("複合 Markdown 粗體"), "Markdown 題目正常渲染");
    assert.ok(html.includes("關鍵重點"), "粗體 Markdown 正常解析");
    assert.ok(html.includes("useMemo"), "代碼徽章正常解析");
    assert.ok(html.includes("此題目前暫無詳細解析說明。"), "null 解析優雅降級為空解析提示");
  });

  console.log("\n==================================================================");
  console.log(`🏁 對抗性測試執行結果: 通過 ${passed} 項，失敗 ${failed} 項`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`Adversarial verification failed with ${failed} failure(s).`);
  }
}

runAdversarialHarness().catch((err) => {
  console.error("Adversarial Test Suite Error:", err);
  process.exit(1);
});
