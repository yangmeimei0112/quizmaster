/**
 * 文字正規化：
 * 1. 轉半形英數字
 * 2. 轉小寫
 * 3. 移除標點符號、空白、常見問句開頭/助詞 (可選)
 */
export function normalizeText(text: string): string {
  if (!text) return "";

  let result = text
    // 全形轉半形
    .replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ") // 全形空格
    .toLowerCase();

  // 移除所有常見標點符號、括號、引號、符號與空白
  result = result.replace(/[\s\p{P}\p{S}]/gu, "");

  return result;
}

/**
 * 計算 Levenshtein 編輯距離
 */
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[bn][an];
}

/**
 * 計算 2-gram (Bigram) Jaccard 相似度
 */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  if (a.length < 2 || b.length < 2) {
    return a === b ? 100 : 0;
  }

  const getBigrams = (str: string) => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.substring(i, i + 2));
    }
    return s;
  };

  const setA = getBigrams(a);
  const setB = getBigrams(b);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;

  return Math.round((intersection / union) * 100);
}

/**
 * 計算最長公共子序列 (LCS)
 */
function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * 計算字元層級 Dice 係數 (針對中文單字與英數特徵極佳)
 */
function charDiceCoefficient(a: string, b: string): number {
  if (a === b) return 100;
  if (!a || !b) return 0;

  const countA: Record<string, number> = {};
  const countB: Record<string, number> = {};

  for (const c of a) countA[c] = (countA[c] || 0) + 1;
  for (const c of b) countB[c] = (countB[c] || 0) + 1;

  let common = 0;
  for (const c in countA) {
    if (countB[c]) common += Math.min(countA[c], countB[c]);
  }

  return Math.round(((2 * common) / (a.length + b.length)) * 100);
}

export interface SimilarityResult {
  similarity: number; // 0 ~ 100
  isExact: boolean;
  level: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXACT";
}

/**
 * 比較兩段文字的綜合相似度
 */
export function calculateSimilarity(text1: string, text2: string): SimilarityResult {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (!norm1 || !norm2) {
    return { similarity: 0, isExact: false, level: "NONE" };
  }

  if (norm1 === norm2) {
    return { similarity: 100, isExact: true, level: "EXACT" };
  }

  const maxLen = Math.max(norm1.length, norm2.length);
  const minLen = Math.min(norm1.length, norm2.length);

  // 1. Levenshtein 編輯距離
  const dist = levenshtein(norm1, norm2);
  const levRatio = Math.max(0, Math.round((1 - dist / maxLen) * 100));

  // 2. 2-gram 相似度
  const bigramRatio = bigramSimilarity(norm1, norm2);

  // 3. 字元層級 Dice 係數
  const diceRatio = charDiceCoefficient(norm1, norm2);

  // 4. 最長公共子序列 (LCS) 包含度
  const lcsLen = longestCommonSubsequence(norm1, norm2);
  const lcsMaxRatio = Math.round((lcsLen / maxLen) * 100);
  const lcsMinRatio = Math.round((lcsLen / minLen) * 100);

  // 綜合加權相似度評估
  // 當較短字串大部分字元出現在較長字串中時 (例如括號被省略或加了「請問」等前綴)
  const overlapScore = Math.round(lcsMinRatio * 0.9);

  const similarity = Math.max(
    levRatio,
    bigramRatio,
    diceRatio,
    lcsMaxRatio,
    overlapScore
  );

  let level: SimilarityResult["level"] = "NONE";
  if (similarity >= 95) level = "EXACT";
  else if (similarity >= 75) level = "HIGH";
  else if (similarity >= 50) level = "MEDIUM";
  else if (similarity >= 30) level = "LOW";

  return {
    similarity,
    isExact: similarity === 100,
    level,
  };
}