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
 * 計算 Levenshtein 編輯距離 (高效雙緩衝列演算法，零 2D 矩陣記憶體開銷)
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let an = a.length;
  let bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  // 確保 a 為較短字串，最小化單列 Int32Array 記憶體配置
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
      currRow[i] = Math.min(
        currRow[i - 1] + 1,        // insertion
        prevRow[i] + 1,            // deletion
        prevRow[i - 1] + cost      // substitution
      );
    }
    prevRow.set(currRow);
  }

  return currRow[an];
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
 * 計算最長公共子序列 (LCS) (高效雙列 Int32Array 滾動計算)
 */
function longestCommonSubsequence(a: string, b: string): number {
  if (a === b) return a.length;
  let m = a.length;
  let n = b.length;
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
      if (a.charCodeAt(i - 1) === bj) {
        curr[i] = prev[i - 1] + 1;
      } else {
        curr[i] = Math.max(prev[i], curr[i - 1]);
      }
    }
    prev.set(curr);
  }

  return prev[m];
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