const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j - 1][i] + 1, matrix[j][i - 1] + 1, matrix[j - 1][i - 1] + cost);
    }
  }
  return matrix[bn][an];
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
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function charDice(a, b) {
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
  if (!norm1 || !norm2) return { similarity: 0, isExact: false };
  if (norm1 === norm2) return { similarity: 100, isExact: true };
  const maxLen = Math.max(norm1.length, norm2.length);
  const minLen = Math.min(norm1.length, norm2.length);

  const levRatio = Math.max(0, Math.round((1 - levenshtein(norm1, norm2) / maxLen) * 100));
  const bigramRatio = bigramSimilarity(norm1, norm2);
  const diceRatio = charDice(norm1, norm2);
  const lcsLen = lcs(norm1, norm2);
  const lcsMaxRatio = Math.round((lcsLen / maxLen) * 100);
  const overlapScore = Math.round((lcsLen / minLen) * 90);

  const similarity = Math.max(levRatio, bigramRatio, diceRatio, lcsMaxRatio, overlapScore);
  return { similarity, isExact: similarity === 100 };
}

async function runTests() {
  console.log("=== 開始執行功能整合測試 ===");

  // 1. 測試資料庫現有題目
  const total = await prisma.question.count();
  console.log(`[測試 1] 現有題目數量: ${total} 題`);

  // 2. 測試完全重複題目偵測
  const targetStem = "下列何者屬於 JavaScript 的原始資料型別 (Primitive Types)？";
  const duplicateInput = "下列何者屬於 JavaScript 的原始資料型別 (Primitive Types)？";
  const resExact = calculateSimilarity(targetStem, duplicateInput);
  console.log(`[測試 2] 完全相同題目相似度: ${resExact.similarity}% (isExact: ${resExact.isExact})`);
  if (!resExact.isExact || resExact.similarity !== 100) throw new Error("完全重複比對失敗");

  // 3. 測試高度相似題目偵測 (微調語句)
  const slightVariation = "請問下列何者是屬於 JavaScript 的原始資料型別？";
  const resSimilar = calculateSimilarity(targetStem, slightVariation);
  console.log(`[測試 3] 微調題幹相似度: ${resSimilar.similarity}% (判定: 觸發防重複警示)`);
  if (resSimilar.similarity < 75) throw new Error("微調題幹未達警示門檻 (75%)");

  // 4. 測試無關題目相似度
  const unrelated = "光年是時間單位還是距離單位？";
  const resUnrelated = calculateSimilarity(targetStem, unrelated);
  console.log(`[測試 4] 無關題目相似度: ${resUnrelated.similarity}% (預期 < 20%)`);
  if (resUnrelated.similarity >= 20) throw new Error("無關題目相似度過高");

  // 5. 測試搜尋過濾
  const searchResult = await prisma.question.findMany({
    where: {
      OR: [
        { stem: { contains: "Python" } },
        { optionA: { contains: "Python" } },
      ],
    },
  });
  console.log(`[測試 5] 關鍵字 'Python' 搜尋結果: ${searchResult.length} 題`);

  // 6. 測試題型篩選 (單選 vs 複選)
  const singleQuestions = await prisma.question.findMany({ where: { type: "SINGLE" } });
  const multiQuestions = await prisma.question.findMany({ where: { type: "MULTIPLE" } });
  console.log(`[測試 6] 單選題 ${singleQuestions.length} 題, 複選題 ${multiQuestions.length} 題`);

  console.log("=== 所有功能測試全部通過！ ===");
}

runTests()
  .catch((e) => {
    console.error("測試失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });