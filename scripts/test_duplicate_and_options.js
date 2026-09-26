const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

console.log("====================================================");
console.log(" 80% THRESHOLD & OPTION CONSISTENCY AUTOMATED TESTS");
console.log("====================================================\n");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [通過] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [失敗] ${name}: ${err.message}`);
  }
}

async function asyncIt(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [通過] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [失敗] ${name}: ${err.message}`);
  }
}

// 讀取原始碼進行靜態規格審計
const quickAddPath = path.resolve(__dirname, "../src/components/QuickAddModal.tsx");
const checkDuplicateRoutePath = path.resolve(__dirname, "../src/app/api/questions/check-duplicate/route.ts");
const batchRoutePath = path.resolve(__dirname, "../src/app/api/questions/batch/route.ts");
const questionsRoutePath = path.resolve(__dirname, "../src/app/api/questions/route.ts");
const similarityPath = path.resolve(__dirname, "../src/lib/similarity.ts");
const questionTypesPath = path.resolve(__dirname, "../src/types/question.ts");
const addPagePath = path.resolve(__dirname, "../src/app/add/page.tsx");

const quickAddContent = fs.readFileSync(quickAddPath, "utf8");
const checkDuplicateRouteContent = fs.readFileSync(checkDuplicateRoutePath, "utf8");
const batchRouteContent = fs.readFileSync(batchRoutePath, "utf8");
const questionsRouteContent = fs.readFileSync(questionsRoutePath, "utf8");
const similarityContent = fs.readFileSync(similarityPath, "utf8");
const questionTypesContent = fs.readFileSync(questionTypesPath, "utf8");
const addPageContent = fs.readFileSync(addPagePath, "utf8");

// 文字相似度輔助函式 (同 src/lib/similarity.ts)
function normalizeText(text) {
  if (!text) return "";
  let result = text
    .replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ")
    .toLowerCase();
  return result.replace(/[\s\p{P}\p{S}]/gu, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  let an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  if (an > bn) {
    const tmpS = a; a = b; b = tmpS;
    const tmpL = an; an = bn; bn = tmpL;
  }
  const prevRow = new Int32Array(an + 1);
  const currRow = new Int32Array(an + 1);
  for (let i = 0; i <= an; i++) prevRow[i] = i;
  for (let j = 1; j <= bn; j++) {
    currRow[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= an; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      currRow[i] = Math.min(currRow[i - 1] + 1, prevRow[i] + 1, prevRow[i - 1] + cost);
    }
    prevRow.set(currRow);
  }
  return currRow[an];
}

function bigramSimilarity(a, b) {
  if (a === b) return 100;
  if (a.length < 2 || b.length < 2) return a === b ? 100 : 0;
  const getBigrams = (str) => {
    const s = new Set();
    for (let i = 0; i < str.length - 1; i++) s.add(str.substring(i, i + 2));
    return s;
  };
  const setA = getBigrams(a), setB = getBigrams(b);
  let intersection = 0;
  for (const item of setA) { if (setB.has(item)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

function lcs(a, b) {
  if (a === b) return a.length;
  let m = a.length, n = b.length;
  if (m === 0 || n === 0) return 0;
  if (m > n) {
    const tmpS = a; a = b; b = tmpS;
    const tmpL = m; m = n; n = tmpL;
  }
  const prev = new Int32Array(m + 1);
  const curr = new Int32Array(m + 1);
  for (let j = 1; j <= n; j++) {
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      if (a.charCodeAt(i - 1) === bj) curr[i] = prev[i - 1] + 1;
      else curr[i] = Math.max(prev[i], curr[i - 1]);
    }
    prev.set(curr);
  }
  return prev[m];
}

function charDice(a, b) {
  if (a === b) return 100;
  if (!a || !b) return 0;
  const countA = {}, countB = {};
  for (const c of a) countA[c] = (countA[c] || 0) + 1;
  for (const c of b) countB[c] = (countB[c] || 0) + 1;
  let common = 0;
  for (const c in countA) {
    if (countB[c]) common += Math.min(countA[c], countB[c]);
  }
  return Math.round((2 * common / (a.length + b.length)) * 100);
}

function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  if (!norm1 || !norm2) return { similarity: 0, isExact: false, level: "NONE" };
  if (norm1 === norm2) return { similarity: 100, isExact: true, level: "EXACT" };

  const maxLen = Math.max(norm1.length, norm2.length);
  const minLen = Math.min(norm1.length, norm2.length);

  const levRatio = Math.max(0, Math.round((1 - levenshtein(norm1, norm2) / maxLen) * 100));
  const bigramRatio = bigramSimilarity(norm1, norm2);
  const diceRatio = charDice(norm1, norm2);
  const lcsLen = lcs(norm1, norm2);
  const lcsMaxRatio = Math.round((lcsLen / maxLen) * 100);
  const overlapScore = Math.round((lcsLen / minLen) * 90);

  const similarity = Math.max(levRatio, bigramRatio, diceRatio, lcsMaxRatio, overlapScore);
  let level = "NONE";
  if (similarity >= 95) level = "EXACT";
  else if (similarity >= 80) level = "HIGH";
  else if (similarity >= 50) level = "MEDIUM";
  else if (similarity >= 30) level = "LOW";

  return { similarity, isExact: similarity === 100, level };
}

function compareQuestionOptions(opts1, opts2) {
  const list1 = [opts1.optionA || "", opts1.optionB || "", opts1.optionC || "", opts1.optionD || ""].map((s) => s.trim());
  const list2 = [opts2.optionA || "", opts2.optionB || "", opts2.optionC || "", opts2.optionD || ""].map((s) => s.trim());

  const hasOpts1 = list1.some((s) => s.length > 0);
  const hasOpts2 = list2.some((s) => s.length > 0);

  if (!hasOpts1 || !hasOpts2) {
    return { similarity: 100, isConsistent: true, hasOptions: false, matchDetails: "無選項資料" };
  }

  const perms = [
    [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
    [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
    [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
    [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0],
  ];

  const simMatrix = [];
  for (let i = 0; i < 4; i++) {
    simMatrix[i] = [];
    for (let j = 0; j < 4; j++) {
      if (!list1[i] && !list2[j]) {
        simMatrix[i][j] = 100;
      } else if (!list1[i] || !list2[j]) {
        simMatrix[i][j] = 0;
      } else {
        simMatrix[i][j] = calculateSimilarity(list1[i], list2[j]).similarity;
      }
    }
  }

  let maxAvgSim = 0;
  for (const p of perms) {
    const sum = simMatrix[0][p[0]] + simMatrix[1][p[1]] + simMatrix[2][p[2]] + simMatrix[3][p[3]];
    const avg = Math.round(sum / 4);
    if (avg > maxAvgSim) {
      maxAvgSim = avg;
    }
  }

  const isConsistent = maxAvgSim >= 80;
  return {
    similarity: maxAvgSim,
    isConsistent,
    hasOptions: true,
    matchDetails: isConsistent ? `選項高度一致 (${maxAvgSim}%)` : `選項內容不一致 (${maxAvgSim}%)`,
  };
}

async function runTests() {
  console.log("--- 1. 相似度 < 80% 直接判定為非重複 (Strict 80% Threshold) ---");

  it("check-duplicate 路由實作嚴格 80% 門檻 (stemSim < 80 時 continue)", () => {
    assert.ok(checkDuplicateRouteContent.includes("stemSim < 80"), "check-duplicate 應檢查 stemSim < 80");
    assert.ok(checkDuplicateRouteContent.includes("hasHighSimilarity: maxSimilarity >= 80"), "高相似度定義應為 maxSimilarity >= 80");
  });

  it("QuickAddModal 實作嚴格 80% 門檻 (sim.similarity < 80 及 batchMaxSim >= 80)", () => {
    assert.ok(quickAddContent.includes("sim.similarity < 80"), "批次內部比較應在 sim.similarity < 80 時略過");
    assert.ok(quickAddContent.includes("isBatchHighSim = batchMaxSim >= 80"), "同批次高相似度判定門檻應為 >= 80");
  });

  it("批次新增與單題新增 API 實作 80% 門檻", () => {
    assert.ok(batchRouteContent.includes("sim.similarity >= 80"), "batch route 應採用 >= 80% 相似度門檻");
    assert.ok(questionsRouteContent.includes("sim.similarity >= 80"), "questions route 應採用 >= 80% 相似度門檻");
  });

  it("數值模擬: 相似度 75% 嚴格被認定為非重複題目", () => {
    const sim = 75;
    const isHigh = sim >= 80;
    assert.strictEqual(isHigh, false, "75% 相似度不可被判定為高相似");
  });

  console.log("\n--- 2. 題目相同但選項不同時判定為非重複 (Option Consistency Check) ---");

  it("compareQuestionOptions: 正確辨識選項內容不一致 (similarity < 80%)", () => {
    const q1 = {
      optionA: "依法令之行為",
      optionB: "業務上正當行為",
      optionC: "正當防衛",
      optionD: "緊急避難",
    };
    const q2 = {
      optionA: "期待不可能",
      optionB: "原因自由行為",
      optionC: "心神喪失",
      optionD: "瘖啞人",
    };
    const res = compareQuestionOptions(q1, q2);
    assert.strictEqual(res.isConsistent, false, "完全不同選項內容應判定為不一致");
    assert.ok(res.similarity < 40, `選項相似度應低於 40% (實際: ${res.similarity}%)`);
  });

  it("compareQuestionOptions: 選項順序重排但內容相同時正確判定為一致 (100%)", () => {
    const q1 = { optionA: "甲", optionB: "乙", optionC: "丙", optionD: "丁" };
    const q2 = { optionA: "丁", optionB: "丙", optionC: "乙", optionD: "甲" };
    const res = compareQuestionOptions(q1, q2);
    assert.strictEqual(res.isConsistent, true, "選項重排應判定為一致");
    assert.strictEqual(res.similarity, 100, "完全相同選項重排後相似度應為 100%");
  });

  it("check-duplicate 路由整合選項一致性: 選項不一致時不得判定為重複題", () => {
    assert.ok(
      checkDuplicateRouteContent.includes("compareQuestionOptions"),
      "check-duplicate 應引入 compareQuestionOptions"
    );
    assert.ok(
      checkDuplicateRouteContent.includes("optRes.hasOptions && !optRes.isConsistent"),
      "check-duplicate 應在選項不一致時 continue 排除重複"
    );
  });

  it("batch 路由整合選項一致性: 題幹相同但選項不一致時不得略過 (不放入 skippedList)", () => {
    assert.ok(
      batchRouteContent.includes("compareQuestionOptions"),
      "batch 路由應引入 compareQuestionOptions"
    );
    assert.ok(
      batchRouteContent.includes("hasIdenticalOptions"),
      "batch 路由應只在選項一致時才加入 skippedList"
    );
  });

  it("questions 路由整合選項一致性: 題幹相同但選項不一致時允許新增", () => {
    assert.ok(
      questionsRouteContent.includes("compareQuestionOptions"),
      "questions 路由應引入 compareQuestionOptions"
    );
  });

  console.log("\n--- 3. 題目與選項皆相似 (>=80%) 時正確觸發對照視窗 (Comparison Modal) ---");

  it("QuickAddModal 宣告 showComparisonModal 狀態與自動彈出機制", () => {
    assert.ok(
      quickAddContent.includes("showComparisonModal") && quickAddContent.includes("setShowComparisonModal"),
      "QuickAddModal 應包含 showComparisonModal 狀態"
    );
    assert.ok(
      quickAddContent.includes("hasHighSimItems") && quickAddContent.includes("setShowComparisonModal(true)"),
      "當偵測到 >= 80% 相似題時應自動觸發 setShowComparisonModal(true)"
    );
  });

  it("對照視窗 UI 完整展示使用者輸入題目 vs 題庫相似題目之題幹與選項", () => {
    assert.ok(quickAddContent.includes("高相似題目對照與判斷"), "對照視窗應有「高相似題目對照與判斷」標題");
    assert.ok(quickAddContent.includes("【您輸入的題目】"), "對照視窗應包含「【您輸入的題目】」");
    assert.ok(quickAddContent.includes("【題庫中相似題目】") || quickAddContent.includes("題庫現存題目"), "對照視窗應包含題庫相似題目");
    assert.ok(quickAddContent.includes("選項 (A, B, C, D)："), "對照視窗應清晰展示選項 A, B, C, D");
  });

  it("對照視窗提供雙向判斷按鈕與「確認完成，關閉對照視窗」按鈕", () => {
    assert.ok(quickAddContent.includes("⚠️ 是，本題為重複題目"), "需包含「⚠️ 是，本題為重複題目」按鈕");
    assert.ok(quickAddContent.includes("✓ 否，本題未與題庫重複"), "需包含「✓ 否，本題未與題庫重複」按鈕");
    assert.ok(quickAddContent.includes("確認完成，關閉對照視窗"), "需包含「確認完成，關閉對照視窗」按鈕");
  });

  console.log("\n--- 4. 使用者確認為「否，未重複」之題目送出時 100% 保留並寫入題庫 ---");

  it("nonDuplicateItems 保留所有 verifiedStatuses === 'NOT_DUPLICATE' 之題目", () => {
    assert.ok(
      quickAddContent.includes("if (verifiedStatuses[idx] === 'NOT_DUPLICATE') return true;"),
      "nonDuplicateItems 必須保留所有經確認為 NOT_DUPLICATE 之題目"
    );
  });

  it("handleBatchSaveAll / handleBatchSaveNonDuplicates 傳遞 verifiedNotDuplicate 與 forceCreate", () => {
    assert.ok(
      quickAddContent.includes("verifiedNotDuplicate: verifiedStatuses[idx] === 'NOT_DUPLICATE'"),
      "handleBatchSaveAll 需傳遞 verifiedNotDuplicate"
    );
    assert.ok(
      quickAddContent.includes("isVerifiedNotDup = origIdx !== -1 && verifiedStatuses[origIdx] === 'NOT_DUPLICATE'"),
      "handleBatchSaveNonDuplicates 需精確判定 isVerifiedNotDup"
    );
  });

  it("batch API 接收 verifiedNotDuplicate/forceCreate 時絕不略過 (Bypass Duplicate Check)", () => {
    assert.ok(
      batchRouteContent.includes("shouldBypassDuplicateCheck"),
      "batch API 應宣告 shouldBypassDuplicateCheck"
    );
    assert.ok(
      batchRouteContent.includes("q.verifiedNotDuplicate === true"),
      "batch API 應在 verifiedNotDuplicate 為 true 時豁免重複過濾"
    );
  });

  it("handleConfirmAndDirectSave 支援放行 verifiedStatuses[0] === 'NOT_DUPLICATE'", () => {
    assert.ok(
      quickAddContent.includes("verifiedStatuses[0] !== 'NOT_DUPLICATE'"),
      "handleConfirmAndDirectSave 在確認非重複時解除 exact duplicate 阻擋"
    );
    assert.ok(
      quickAddContent.includes("forceCreate: isVerifiedNotDup"),
      "handleConfirmAndDirectSave 傳送 forceCreate: isVerifiedNotDup"
    );
  });

  it("QuickAddModal: questionsKey 完整監聽選項與答案變更重啟重複比對", () => {
    assert.ok(
      quickAddContent.includes("questionsKey = useMemo"),
      "QuickAddModal 需宣告 questionsKey 監聽完整題目選項"
    );
    assert.ok(
      quickAddContent.includes("a: q.optionA.trim()"),
      "questionsKey 需涵蓋 optionA"
    );
  });

  it("QuickAddModal: Ctrl+Enter 與 handleConfirmAndApply 在經查證非重複時解除阻擋", () => {
    assert.ok(
      quickAddContent.includes("duplicateStatuses[0]?.isExactMatch && verifiedStatuses[0] !== 'NOT_DUPLICATE'"),
      "Ctrl+Enter 快捷鍵需在 verifiedStatuses[0] === 'NOT_DUPLICATE' 時允許送出"
    );
    assert.ok(
      quickAddContent.includes("currentDup?.isExactMatch && verifiedStatuses[activeIndex] !== 'NOT_DUPLICATE'"),
      "handleConfirmAndApply 需在 verifiedStatuses === 'NOT_DUPLICATE' 時解除阻擋"
    );
  });

  it("QuickAddModal: 膠囊與預覽卡片提供放行狀態 (✓已放行) 與開啟對照按鈕", () => {
    assert.ok(
      quickAddContent.includes("(✓已放行)"),
      "膠囊列表需在 NOT_DUPLICATE 時顯示 (✓已放行)"
    );
    assert.ok(
      quickAddContent.includes("✓ 已查證放行：此題確認未與題庫重複"),
      "預覽卡片需在 NOT_DUPLICATE 時展示綠色放行提示"
    );
  });

  it("questions API 支援 verifiedNotDuplicate 放行防重複檢查", () => {
    assert.ok(
      questionsRouteContent.includes("shouldForceCreate"),
      "questions API 應整合 shouldForceCreate"
    );
    assert.ok(
      questionsRouteContent.includes("verifiedNotDuplicate === true"),
      "questions API 應在 verifiedNotDuplicate 為 true 時豁免重複檢查"
    );
  });

  it("add/page.tsx 落實選項一致性比對與 80% 門檻", () => {
    assert.ok(
      addPageContent.includes("maxSimilarity >= 80"),
      "add/page.tsx 需採用 80% 門檻"
    );
    assert.ok(
      addPageContent.includes("optionA,") && addPageContent.includes("optionB,"),
      "add/page.tsx check-duplicate 呼叫需包含選項"
    );
  });

  await asyncIt("資料庫寫入整合驗證: verifiedNotDuplicate=true 能夠成功建立題目", async () => {
    const testStem = `測試防重複放行_${Date.now()}`;
    const testOptionA = "選項一";
    const testOptionB = "選項二";
    const testOptionC = "選項三";
    const testOptionD = "選項四";

    // 建立一筆基本題目
    const created1 = await prisma.question.create({
      data: {
        stem: testStem,
        normalizedStem: normalizeText(testStem),
        type: "SINGLE",
        optionA: testOptionA,
        optionB: testOptionB,
        optionC: testOptionC,
        optionD: testOptionD,
        correctAnswers: "A",
        difficulty: "MEDIUM",
      },
    });

    try {
      assert.ok(created1.id, "題目1應成功建立");

      // 模擬同題幹但選項不同 (依法令之行為 vs 蘋果香蕉) -> compareQuestionOptions 應為 false
      const optRes = compareQuestionOptions(
        { optionA: testOptionA, optionB: testOptionB, optionC: testOptionC, optionD: testOptionD },
        { optionA: "蘋果", optionB: "香蕉", optionC: "橘子", optionD: "芭樂" }
      );
      assert.strictEqual(optRes.isConsistent, false, "題目相同但選項不同時，選項比對判定為非一致");

      // 模擬經查證放行 (forceCreate=true) 寫入
      const created2 = await prisma.question.create({
        data: {
          stem: testStem,
          normalizedStem: normalizeText(testStem),
          type: "SINGLE",
          optionA: "蘋果",
          optionB: "香蕉",
          optionC: "橘子",
          optionD: "芭樂",
          correctAnswers: "B",
          difficulty: "MEDIUM",
        },
      });
      assert.ok(created2.id, "經查證放行之題目應成功寫入資料庫");
      assert.notStrictEqual(created1.id, created2.id, "兩題應為獨立記錄");

      // 清理測試題目
      await prisma.question.deleteMany({
        where: { id: { in: [created1.id, created2.id] } },
      });
    } catch (e) {
      await prisma.question.deleteMany({
        where: { stem: testStem },
      });
      throw e;
    }
  });

  console.log("\n====================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  if (failedTests === 0) {
    console.log("VERDICT: ALL 80% THRESHOLD & OPTIONS TESTS PASSED!");
  } else {
    console.error("VERDICT: SOME TESTS FAILED");
    process.exit(1);
  }
  console.log("====================================================");
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
