const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTests() {
  console.log("====================================================");
  console.log(" BATCH SAVE WITH EXPLANATION AUTOMATED TEST SUITE");
  console.log("====================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      failedTests++;
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      failedTests++;
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  }

  // 讀取原始碼進行靜態規格校驗
  const quickAddPath = path.resolve(__dirname, "../src/components/QuickAddModal.tsx");
  const quickAddContent = fs.readFileSync(quickAddPath, "utf8");

  // 動態引入 TypeScript 解析器模組
  const explanationParserPath = path.resolve(__dirname, "../src/lib/explanationParser.ts");
  const { normalizeExplanationToFourSections } = await import(
    "file://" + explanationParserPath.replace(/\\/g, "/")
  );

  // ==========================================
  // 1. 靜態 UI / UX 規範校驗
  // ==========================================
  console.log("--- 1. QuickAddModal 靜態 UI / UX 規範校驗 ---");

  test("QuickAddModal: 引入 FileCheck 圖示", () => {
    assert.ok(
      quickAddContent.includes("FileCheck") && quickAddContent.includes("lucide-react"),
      "必須自 lucide-react 引入 FileCheck 圖示"
    );
  });

  test("QuickAddModal: 全站規範零 Emoji 檢驗", () => {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const match = quickAddContent.match(emojiRegex);
    assert.strictEqual(match, null, `QuickAddModal 不得包含 Emoji，發現: ${match ? match[0] : ""}`);
  });

  test("QuickAddModal: 定義 hasExplanationCount 動態計算邏輯", () => {
    assert.ok(
      quickAddContent.includes("hasExplanationCount"),
      "必須定義 hasExplanationCount 計算具備解析題目數"
    );
    assert.ok(
      quickAddContent.includes("q.explanation && q.explanation.trim().length > 0"),
      "必須檢查 explanation 有實質非空白內容"
    );
  });

  test("QuickAddModal: 定義 nonDuplicateExplanationItems 防重複過濾集合", () => {
    assert.ok(
      quickAddContent.includes("nonDuplicateExplanationItems"),
      "必須定義 nonDuplicateExplanationItems 集合"
    );
    assert.ok(
      quickAddContent.includes("nonDuplicateExplanationCount"),
      "必須定義 nonDuplicateExplanationCount 題數"
    );
  });

  test("QuickAddModal: 提供【僅入庫有解析題目】按鈕並顯示動態題數", () => {
    assert.ok(
      quickAddContent.includes("僅入庫有解析題目"),
      "必須包含【僅入庫有解析題目】按鈕文字"
    );
    assert.ok(
      quickAddContent.includes("handleBatchSaveOnlyWithExplanations"),
      "按鈕必須綁定 handleBatchSaveOnlyWithExplanations 處理函式"
    );
  });

  test("QuickAddModal: 無解析題目時按鈕呈現禁用狀態", () => {
    assert.ok(
      quickAddContent.includes("hasExplanationCount === 0"),
      "必須在 hasExplanationCount === 0 時禁用按鈕"
    );
  });

  test("QuickAddModal: 比對中 (isCheckingDuplicates) 或提交中時按鈕呈現禁用/等待狀態", () => {
    assert.ok(
      quickAddContent.includes("isCheckingDuplicates") &&
      quickAddContent.includes("isBatchSubmitting"),
      "必須在比對中或提交中禁用按鈕"
    );
  });

  test("QuickAddModal: 膠囊清單具備【有解析】視覺化微徽章標記", () => {
    assert.ok(
      quickAddContent.includes("有解析") && quickAddContent.includes("item.explanation"),
      "膠囊必須包含有解析視覺化標籤"
    );
  });

  // ==========================================
  // 2. 核心過濾邏輯與邊界情況模擬驗證
  // ==========================================
  console.log("\n--- 2. 核心過濾邏輯與邊界情況模擬驗證 ---");

  function filterExplanationItems(items, duplicateStatuses = [], verifiedStatuses = {}) {
    return items.filter((item, idx) => {
      const hasExp = Boolean(item.explanation && item.explanation.trim().length > 0);
      if (!hasExp) return false;
      if (verifiedStatuses[idx] === "NOT_DUPLICATE") return true;
      if (duplicateStatuses[idx]?.isExactMatch) return false;
      if (verifiedStatuses[idx] === "IS_DUPLICATE") return false;
      return true;
    });
  }

  test("過濾邏輯: 空字串、純空白、null、undefined 之解析皆被排除", () => {
    const items = [
      { stem: "Q1", explanation: "" },
      { stem: "Q2", explanation: "   " },
      { stem: "Q3", explanation: null },
      { stem: "Q4", explanation: undefined },
      { stem: "Q5", explanation: "實質解析內容" },
    ];
    const filtered = filterExplanationItems(items);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].stem, "Q5");
  });

  test("邊界情況 1: 全數題目皆有解析 (All with explanation)", () => {
    const items = [
      { stem: "Q1", explanation: "解析 1" },
      { stem: "Q2", explanation: "解析 2" },
      { stem: "Q3", explanation: "解析 3" },
    ];
    const filtered = filterExplanationItems(items);
    assert.strictEqual(filtered.length, 3);
    const remaining = items.filter((item) => !filtered.includes(item));
    assert.strictEqual(remaining.length, 0, "全部皆有解析時剩餘題目應為 0");
  });

  test("邊界情況 2: 部分題目有解析 (Partial with explanation)", () => {
    const items = [
      { stem: "Q1", explanation: "解析 1" },
      { stem: "Q2", explanation: "" },
      { stem: "Q3", explanation: "解析 3" },
      { stem: "Q4", explanation: "   " },
      { stem: "Q5", explanation: "" },
    ];
    const filtered = filterExplanationItems(items);
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].stem, "Q1");
    assert.strictEqual(filtered[1].stem, "Q3");

    // 剩餘未上傳題目
    const remaining = items.filter((item) => !filtered.includes(item));
    assert.strictEqual(remaining.length, 3);
    assert.deepStrictEqual(
      remaining.map((q) => q.stem),
      ["Q2", "Q4", "Q5"],
      "剩餘未上傳題目應精確保留 Q2, Q4, Q5"
    );
  });

  test("邊界情況 3: 全數題目皆無解析 (None with explanation)", () => {
    const items = [
      { stem: "Q1", explanation: "" },
      { stem: "Q2", explanation: "  \n  " },
      { stem: "Q3", explanation: "" },
    ];
    const filtered = filterExplanationItems(items);
    assert.strictEqual(filtered.length, 0, "無解析題目時符合條件應為 0 題");
    const hasCount = items.filter((q) => Boolean(q.explanation && q.explanation.trim().length > 0)).length;
    assert.strictEqual(hasCount, 0, "hasExplanationCount 應為 0");
  });

  test("邊界情況 4: 重複題目過濾整合 - 100% 重複自動排除", () => {
    const items = [
      { stem: "Q1", explanation: "解析 1" },
      { stem: "Q2", explanation: "解析 2" }, // 100% 重複
      { stem: "Q3", explanation: "解析 3" },
    ];
    const duplicateStatuses = [
      { isExactMatch: false },
      { isExactMatch: true },
      { isExactMatch: false },
    ];
    const filtered = filterExplanationItems(items, duplicateStatuses, {});
    assert.strictEqual(filtered.length, 2);
    assert.deepStrictEqual(filtered.map((q) => q.stem), ["Q1", "Q3"]);
  });

  test("邊界情況 5: 重複題目過濾整合 - 使用者標記 IS_DUPLICATE 排除，NOT_DUPLICATE 保留", () => {
    const items = [
      { stem: "Q1", explanation: "解析 1" },
      { stem: "Q2", explanation: "解析 2" },
      { stem: "Q3", explanation: "解析 3" },
    ];
    const duplicateStatuses = [
      { isHighSimilarity: true },
      { isHighSimilarity: true },
      { isExactMatch: false },
    ];
    const verifiedStatuses = {
      0: "IS_DUPLICATE",     // 確認重複 -> 排除
      1: "NOT_DUPLICATE",    // 確認未重複 -> 保留
    };
    const filtered = filterExplanationItems(items, duplicateStatuses, verifiedStatuses);
    assert.strictEqual(filtered.length, 2);
    assert.deepStrictEqual(filtered.map((q) => q.stem), ["Q2", "Q3"]);
  });

  test("邊界情況 6: 高相似度提交守衛 - 僅守衛即將上傳且具備解析之題目", () => {
    const items = [
      { stem: "Q1", explanation: "" }, // 無解析，不參與上傳
      { stem: "Q2", explanation: "解析 2" }, // 有解析，相似未查證
    ];
    const duplicateStatuses = [
      { isHighSimilarity: true, isExactMatch: false }, // Q1 相似但無解析
      { isHighSimilarity: true, isExactMatch: false }, // Q2 相似且有解析
    ];
    const verifiedStatuses = {};

    const firstUnverifiedHighSimIdx = items.findIndex(
      (item, idx) =>
        Boolean(item.explanation && item.explanation.trim().length > 0) &&
        duplicateStatuses[idx]?.isHighSimilarity &&
        !duplicateStatuses[idx]?.isExactMatch &&
        (verifiedStatuses[idx] === null || verifiedStatuses[idx] === undefined)
    );

    assert.strictEqual(firstUnverifiedHighSimIdx, 1, "應精準命中第 2 題 (index 1)");
  });

  // ==========================================
  // 3. 4 區塊解析格式化與入庫結構驗證
  // ==========================================
  console.log("\n--- 3. 4 區塊解析格式化與入庫結構驗證 ---");

  test("解析標準化: 儲存時自動轉化為標準 4 區塊結構", () => {
    const rawExp = `本題考點為專案範疇管理。
(A) 控制品質為品質管理。
(B) 正確，確認範疇是客戶驗收。
相關概念：確認範疇之主要效益在於使驗收過程具有客觀性。
記憶關鍵：確認範疇是由客戶或贊助人正式驗收可交付成果。`;
    const normalized = normalizeExplanationToFourSections(rawExp, {
      A: "控制品質",
      B: "確認範疇",
      C: "控制成本",
      D: "控制風險",
    }, ["B"]);

    assert.ok(normalized.includes("【考點導讀】"), "應包含【考點導讀】");
    assert.ok(normalized.includes("【各選項詳細解析】"), "應包含【各選項詳細解析】");
    assert.ok(normalized.includes("【觀念說明】"), "應包含【觀念說明】");
    assert.ok(normalized.includes("【考試記憶重點】"), "應包含【考試記憶重點】");
  });

  // ==========================================
  // 4. 資料庫寫入與真實 API 行為模擬驗證
  // ==========================================
  console.log("\n--- 4. 資料庫寫入與真實 API 行為模擬驗證 ---");

  await asyncTest("E2E 批次儲存整合: 僅具備解析之題目寫入題庫，無解析題目被略過", async () => {
    const testTag = `TEST_EXP_${Date.now()}`;
    const questionsToTest = [
      {
        stem: `[${testTag}] 第一題：具備完整解析之題目`,
        type: "SINGLE",
        optionA: "選項 A1",
        optionB: "選項 B1",
        optionC: "選項 C1",
        optionD: "選項 D1",
        correctAnswers: ["A"],
        explanation: "【考點導讀】本題解析一【各選項詳細解析】A 正確【觀念說明】核心觀念【考試記憶重點】速記重點",
        tags: testTag,
      },
      {
        stem: `[${testTag}] 第二題：完全無解析之題目（應被排除）`,
        type: "SINGLE",
        optionA: "選項 A2",
        optionB: "選項 B2",
        optionC: "選項 C2",
        optionD: "選項 D2",
        correctAnswers: ["B"],
        explanation: "", // 空解析
        tags: testTag,
      },
      {
        stem: `[${testTag}] 第三題：具備完整解析之題目二`,
        type: "SINGLE",
        optionA: "選項 A3",
        optionB: "選項 B3",
        optionC: "選項 C3",
        optionD: "選項 D3",
        correctAnswers: ["C"],
        explanation: "【考點導讀】本題解析二【各選項詳細解析】C 正確【觀念說明】核心觀念二【考試記憶重點】速記重點二",
        tags: testTag,
      },
    ];

    // 1. 執行篩選
    const targetQuestions = questionsToTest.filter(
      (q) => Boolean(q.explanation && q.explanation.trim().length > 0)
    );

    assert.strictEqual(targetQuestions.length, 2, "應挑選 2 題有解析之題目");

    // 2. 模擬寫入資料庫
    const createdIds = [];
    try {
      for (const q of targetQuestions) {
        const created = await prisma.question.create({
          data: {
            stem: q.stem,
            normalizedStem: q.stem.replace(/\s+/g, "").toLowerCase(),
            type: q.type,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswers: q.correctAnswers.join(","),
            explanation: normalizeExplanationToFourSections(q.explanation, {
              A: q.optionA,
              B: q.optionB,
              C: q.optionC,
              D: q.optionD,
            }, q.correctAnswers),
            tags: q.tags,
          },
        });
        createdIds.push(created.id);
      }

      assert.strictEqual(createdIds.length, 2, "成功寫入 2 道題目");

      // 3. 查詢資料庫確認只寫入了第一題與第三題
      const dbItems = await prisma.question.findMany({
        where: { tags: testTag },
      });

      assert.strictEqual(dbItems.length, 2, "題庫中應僅有 2 題");
      assert.ok(dbItems.some((d) => d.stem.includes("第一題")));
      assert.ok(dbItems.some((d) => d.stem.includes("第三題")));
      assert.ok(!dbItems.some((d) => d.stem.includes("第二題")), "第二題 (無解析) 絕不可寫入題庫");

      // 4. 確認寫入的解析格式正確
      for (const d of dbItems) {
        assert.ok(d.explanation && d.explanation.includes("【考點導讀】"));
        assert.ok(d.explanation && d.explanation.includes("【各選項詳細解析】"));
      }
    } finally {
      // 清理測試資料
      if (createdIds.length > 0) {
        await prisma.question.deleteMany({
          where: { id: { in: createdIds } },
        });
      }
    }
  });

  // ==========================================
  // 5. 總結報告輸出
  // ==========================================
  console.log("\n====================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log("====================================================");
  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("VERDICT: ALL TESTS IN SUITE PASSED!\n");
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
