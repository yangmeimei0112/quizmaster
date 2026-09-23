/**
 * answerUtils.ts
 * 統一答案字串正規化、判定比對與展示工具模組 (Single Source of Truth)
 */

/**
 * 將答案輸入（字串如 "A"、"A, B"、"A,B,C" 或陣列 ["A", "B"]）
 * 進行高容錯清理：去除空白、強制大寫、去除空項、去重複並依照字母字典順序排列。
 */
export function normalizeAnswers(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];

  let items: string[] = [];

  if (Array.isArray(raw)) {
    items = raw.flatMap((item) => (typeof item === "string" ? item.split(",") : []));
  } else if (typeof raw === "string") {
    items = raw.split(",");
  }

  const cleaned = items
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0 && /^[A-Z0-9]$/.test(item));

  // 去重並依字母順序排序
  return Array.from(new Set(cleaned)).sort();
}

/**
 * 嚴密且高容錯地比對使用者作答與標準答案是否完全相符。
 * 支援單選與複選題，自動防範空格、字母大小寫與順序不一致之誤判。
 *
 * @param userAns 使用者選取之答案（陣列或逗號分隔字串）
 * @param correctAns 題目標準解答（陣列或逗號分隔字串）
 * @returns boolean 是否完全正確
 */
export function compareAnswers(
  userAns: string | string[] | null | undefined,
  correctAns: string | string[] | null | undefined
): boolean {
  const normUser = normalizeAnswers(userAns);
  const normCorrect = normalizeAnswers(correctAns);

  if (normUser.length === 0 || normCorrect.length === 0) {
    return false;
  }

  if (normUser.length !== normCorrect.length) {
    return false;
  }

  return normUser.every((ans, idx) => ans === normCorrect[idx]);
}

/**
 * 格式化輸出標準答案字串，例如供題目清單或報告展示（如 "A, B"）
 */
export function formatAnswerDisplay(
  raw: string | string[] | null | undefined,
  separator: string = ", "
): string {
  const norm = normalizeAnswers(raw);
  return norm.join(separator);
}
