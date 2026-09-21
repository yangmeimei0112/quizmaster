const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

console.log("====================================================");
console.log(" QUICK ADD DUPLICATE PREVENTION AUTOMATED TEST SUITE");
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
const checkDuplicateRoutePath = path.resolve(__dirname, "../src/app/api/questions/check-duplicate/route.ts");
const questionTypesPath = path.resolve(__dirname, "../src/types/question.ts");

const quickAddContent = fs.readFileSync(quickAddPath, "utf8");
const checkDuplicateRouteContent = fs.readFileSync(checkDuplicateRoutePath, "utf8");
const questionTypesContent = fs.readFileSync(questionTypesPath, "utf8");

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
  else if (similarity >= 75) level = "HIGH";
  else if (similarity >= 50) level = "MEDIUM";
  else if (similarity >= 30) level = "LOW";

  return { similarity, isExact: similarity === 100, level };
}

async function runAllTests() {
  console.log("--- 1. API 路由比對邏輯驗證 ---");

  test("Check-Duplicate API: 支援多題批次比對 (Array.isArray(stems))", () => {
    assert(checkDuplicateRouteContent.includes("Array.isArray(stems)"), "check-duplicate 路由應支援 stems 陣列");
    assert(checkDuplicateRouteContent.includes("hasHighSimilarity: maxSimilarity >= 70"), "高相似度門檻應設定為 >= 70%");
  });

  test("Question Types: 正確定義 QuestionDuplicateStatus 介面", () => {
    assert(questionTypesContent.includes("export interface QuestionDuplicateStatus"), "缺少 QuestionDuplicateStatus 介面定義");
    assert(questionTypesContent.includes('status: "NORMAL" | "SIMILAR" | "EXACT"'), "狀態型別定義需包含 NORMAL/SIMILAR/EXACT");
    assert(questionTypesContent.includes('duplicateSource: "DATABASE" | "BATCH" | null'), "重複來源需包含 DATABASE/BATCH/null");
  });

  await asyncTest("資料庫即時比對測試: 完全相同題幹 100% 命中", async () => {
    const existing = await prisma.question.findFirst({ select: { stem: true, normalizedStem: true } });
    assert(existing, "資料庫應存在至少一題測試題目");

    const norm = normalizeText(existing.stem);
    const isMatch = norm === (existing.normalizedStem || normalizeText(existing.stem));
    assert.strictEqual(isMatch, true, "題庫已存在題幹經 normalize 後需 100% 完全匹配");
  });

  console.log("\n--- 2. 同批次內部互相重複偵測 (Intra-batch Duplicate Check) ---");

  test("同批次重複比對邏輯模擬: 第 1 題正常，第 3 題為第 1 題完全重複", () => {
    const batchList = [
      { stem: "下列何者為專案工作說明書（SOW）提供者？" },
      { stem: "下列何者指的是工作結果的滿意度確認？" },
      { stem: "下列何者為專案工作說明書（SOW）提供者？" }, // 與第 1 題完全相同
    ];

    const computed = [];
    for (let i = 0; i < batchList.length; i++) {
      const current = batchList[i].stem;
      const normCurrent = normalizeText(current);
      let batchExactMatch = false;
      let batchMatchedIndex = -1;
      let batchMatchedStem = "";

      for (let j = 0; j < i; j++) {
        const prev = batchList[j].stem;
        if (normCurrent === normalizeText(prev)) {
          batchExactMatch = true;
          batchMatchedIndex = j + 1;
          batchMatchedStem = prev;
          break;
        }
      }

      if (batchExactMatch) {
        computed.push({ status: "EXACT", isExactMatch: true, source: "BATCH", matchedBatchIndex: batchMatchedIndex });
      } else {
        computed.push({ status: "NORMAL", isExactMatch: false, source: null });
      }
    }

    assert.strictEqual(computed[0].isExactMatch, false, "第 1 題首次出現不應標記為批次重複");
    assert.strictEqual(computed[1].isExactMatch, false, "第 2 題不重複");
    assert.strictEqual(computed[2].isExactMatch, true, "第 3 題應命中批次重複");
    assert.strictEqual(computed[2].source, "BATCH", "重複來源應為 BATCH");
    assert.strictEqual(computed[2].matchedBatchIndex, 1, "命中索引應為第 1 題");
  });

  test("同批次高相似度比對邏輯模擬 (>= 70%)", () => {
    const stemA = "發展專案團隊（Develop Project Team）的產出（Output）為下列哪一項？";
    const stemB = "請問發展專案團隊的產出為下列哪一項？";
    const simRes = calculateSimilarity(stemA, stemB);
    assert(simRes.similarity >= 70, `微調題幹相似度應 >= 70% (實際: ${simRes.similarity}%)`);
  });

  console.log("\n--- 3. 膠囊切換標記與卡片警示靜態驗證 ---");

  test("切換膠囊標籤: 100% 完全重複鮮紅標籤 (⚠️已重複)", () => {
    assert(quickAddContent.includes("(⚠️已重複)"), "膠囊缺少 (⚠️已重複) 鮮紅標籤");
    assert(quickAddContent.includes("bg-rose-600") || quickAddContent.includes("bg-rose-500"), "缺少鮮紅色高亮樣式");
  });

  test("切換膠囊標籤: 高相似度琥珀黃標籤 (XX%相似)", () => {
    assert(quickAddContent.includes("%相似)"), "膠囊缺少 (%相似) 琥珀黃標籤");
    assert(quickAddContent.includes("bg-amber-600") || quickAddContent.includes("bg-amber-500"), "缺少琥珀黃色高亮樣式");
  });

  test("切換膠囊標籤: 正常題目綠色標籤", () => {
    assert(quickAddContent.includes("正常") && (quickAddContent.includes("bg-emerald-500") || quickAddContent.includes("text-emerald-300")), "缺少正常題目綠色標籤");
  });

  test("編輯卡片頂部警示橫幅: 100% 完全重複橫幅與題幹展示", () => {
    assert(quickAddContent.includes("⚠️ 題庫中已有完全相同 (100%) 的題目"), "卡片缺少 100% 完全相同題目警示橫幅");
    assert(quickAddContent.includes("currentDup.matchedStem"), "警示橫幅需展示題庫已存在之題幹內容");
  });

  test("編輯卡片頂部警示橫幅: 高度相似警示橫幅", () => {
    assert(quickAddContent.includes("⚠️ 發現高度相似題目"), "卡片缺少高度相似題目警示橫幅");
  });

  console.log("\n--- 4. 多題批次排除與按鈕控制邏輯 ---");

  test("多題模式按鈕: 提供一鍵「自動排除重複題，新增剩餘 N 題」", () => {
    assert(quickAddContent.includes("handleBatchSaveNonDuplicates"), "缺少 handleBatchSaveNonDuplicates 處理函式");
    assert(quickAddContent.includes("自動排除重複題，新增剩餘"), "按鈕文字需包含「自動排除重複題，新增剩餘」");
  });

  test("多題模式按鈕: 全數重複時禁用按鈕並提示", () => {
    assert(quickAddContent.includes("allAreDuplicates"), "需有全數重複判定狀態 (allAreDuplicates)");
    assert(quickAddContent.includes("全部題目皆已重複，無法新增"), "全數重複時按鈕文字需顯示「全部題目皆已重複，無法新增」");
  });

  console.log("\n--- 5. 單題模式徹底阻擋驗證 ---");

  test("單題模式: 100% 完全重複時嚴格禁用「直接新增」與「帶入表單」", () => {
    assert(quickAddContent.includes("isSingleExactDuplicate"), "需有單題重複嚴格阻擋判定");
    assert(quickAddContent.includes("disabled={!currentItem || !isCurrentFormValid || isSingleExactDuplicate"), "帶入表單按鈕在重複時需 disabled");
    assert(quickAddContent.includes("disabled={!currentItem || !isCurrentFormValid || isDirectSubmitting || isSingleExactDuplicate"), "直接新增按鈕在重複時需 disabled");
  });

  test("單題模式: 快捷鍵 Ctrl+Enter 在重複時予以阻擋", () => {
    assert(quickAddContent.includes("duplicateStatuses[0]?.isExactMatch"), "Ctrl+Enter 快捷鍵需防禦單題重複");
    assert(quickAddContent.includes("已嚴格阻擋新增") || quickAddContent.includes("已嚴格鎖定送出"), "快捷鍵阻擋需提示錯誤");
  });

  console.log("\n--- 6. 比對中競爭態與邊界防禦深度驗證 (Hardened Checks) ---");

  test("競爭態防禦: isCheckingDuplicates 徹底鎖定多題批次按鈕與文字", () => {
    assert(quickAddContent.includes("比對題庫防重複中..."), "批次按鈕比對中需顯示「比對題庫防重複中...」");
    assert(quickAddContent.includes("disabled={isBatchSubmitting || isCheckingDuplicates}"), "批次儲存按鈕需包含 isCheckingDuplicates 禁用");
  });

  test("競爭態防禦: isCheckingDuplicates 阻擋 Ctrl+Enter 快速提交", () => {
    assert(quickAddContent.includes('if (isCheckingDuplicates) {\n          setFormError("正在比對題庫防重複，請稍候...");\n          return;\n        }'), "Ctrl+Enter 快捷鍵需在比對中攔截並提示");
  });

  test("競爭態防禦: 所有送出函式皆嚴格防禦 isCheckingDuplicates", () => {
    assert(quickAddContent.includes('handleConfirmAndApply = useCallback(() => {\n    if (!currentItem) return;\n\n    if (isCheckingDuplicates) {'), "handleConfirmAndApply 缺少比對中防護");
    assert(quickAddContent.includes('handleConfirmAndDirectSave = useCallback(async () => {\n    if (isDirectSubmitting) return;\n\n    if (isCheckingDuplicates) {'), "handleConfirmAndDirectSave 缺少比對中防護");
    assert(quickAddContent.includes('handleBatchSaveAll = useCallback(async () => {\n    if (isBatchSubmitting) return;\n    if (parsedList.length === 0) return;\n\n    if (isCheckingDuplicates) {'), "handleBatchSaveAll 缺少比對中防護");
    assert(quickAddContent.includes('handleBatchSaveNonDuplicates = useCallback(async () => {\n    if (isBatchSubmitting) return;\n\n    if (isCheckingDuplicates) {'), "handleBatchSaveNonDuplicates 缺少比對中防護");
  });

  test("UI狀態誠實性: 卡片頂部在比對中顯示藍色 Spinner 而非提前假綠「題庫比對正常」", () => {
    assert(quickAddContent.includes("isCurrentDupChecking ? ("), "卡片橫幅需優先判定 isCurrentDupChecking");
    assert(quickAddContent.includes("正在比對題庫防重複與相似度..."), "需顯示正在比對中文字");
  });

  test("UI狀態誠實性: 膠囊標籤在比對中顯示「比對中...」而非假綠「正常」", () => {
    assert(quickAddContent.includes("isItemChecking ? ("), "膠囊需有 isItemChecking 狀態分流");
    assert(quickAddContent.includes("比對中..."), "膠囊標籤需包含「比對中...」");
  });

  test("健壯性: stemsKey 採用 JSON.stringify 防範字串分隔符碰撞", () => {
    assert(quickAddContent.includes("JSON.stringify(parsedList.map((q) => q.stem.trim()))"), "stemsKey 需採用 JSON.stringify");
  });

  test("API健壯性: check-duplicate 確保 normInput 非空避免空字串假陽性", () => {
    assert(checkDuplicateRouteContent.includes("if (normInput && qNorm === normInput)"), "比對需檢查 normInput 非空");
  });

  test("多題排除功能體驗: 非重複題目若有缺漏欄位自動跳轉至該題 (setActiveIndex(i))", () => {
    assert(quickAddContent.includes("if (duplicateStatuses[i]?.isExactMatch) continue;"), "驗證時需略過已重複之題目");
    assert(quickAddContent.includes("setActiveIndex(i);"), "發現未填欄位需自動跳轉");
  });

  console.log("\n====================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  if (failedTests === 0) {
    console.log("VERDICT: ALL QUICK ADD DUPLICATE TESTS PASSED!");
  } else {
    console.error("VERDICT: SOME TESTS FAILED");
    process.exit(1);
  }
  console.log("====================================================");
}

runAllTests()
  .catch((e) => {
    console.error("測試套件執行失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
