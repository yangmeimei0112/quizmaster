import { QuestionType } from "@/types/question";

export interface ParsedQuestionResult {
  stem: string;
  type: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string[];
  explanation: string;
  detectedAnswer: boolean;
  detectedExplanation: boolean;
  detectedType: boolean;
  rawText: string;
  warnings: string[];
}

/**
 * 智慧題目文字高容錯解析演算法
 *
 * 支援功能：
 * 1. 自動辨識題號前綴並移除（8.、8、第8題：、Q1:、(1)等），保留題幹多行內容與題幹內部編號列表（如 1. 2. 條件）。
 * 2. 自動辨識題目開頭的題型標籤（【單選題】、【複選題】、【多選】等）。
 * 3. 自動辨識題目前方或文末的答案標籤（如 (A) 8. 題目... 或 答案：A、答案為 (A)、解答: A,C、Ans: [A]、正解：B、答案：全 等）。
 * 4. 容錯辨識選項 A、B、C、D（(A)、（A）、[A]、【A】、A.、A、等多種格式，相容全形英文字母、換行、單行並列與數字選項 (1)~(4)）。
 * 5. 防範選項/題幹內部英文縮寫（例如「維生素 (B) 群」或題幹中的「(A) 級」）誤判為選項邊界。
 * 6. 自動擷取題目解析（解析：...、詳解：...、說明：...、解題說明：...）。
 * 7. 自動判定單選（SINGLE）或複選（MULTIPLE）。
 */
export function parseQuestionText(rawText: string): ParsedQuestionResult {
  const result: ParsedQuestionResult = {
    stem: "",
    type: "SINGLE",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswers: ["A"],
    explanation: "",
    detectedAnswer: false,
    detectedExplanation: false,
    detectedType: false,
    rawText,
    warnings: [],
  };

  const text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!text) {
    result.warnings.push("貼入文本為空");
    return result;
  }

  // 正規化全形英文字母（Ａ-Ｚ, ａ-ｚ 轉半形 A-Z, a-z），保留全形中文括號與中文標點
  let workingText = text.replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );

  // 1. 檢測題前嵌入之答案（例如「(A) 8. 專案工作...」或「【B】第5題：...」）
  const leadingAnswerRegex =
    /^\s*(?:[\(（\[【]\s*([A-Da-d1-4])\s*[\)）\]】]|(?:標準答案|答案|解答|正解)\s*[:：為是選]?\s*([A-Da-d1-4]))\s*(?=(?:第\s*\d|\d+[\.、\s\)\)]|Q\d|【))/i;
  const leadingAnsMatch = workingText.match(leadingAnswerRegex);
  if (leadingAnsMatch) {
    const rawKey = leadingAnsMatch[1] || leadingAnsMatch[2];
    const keys = extractAnswerKeys(rawKey);
    if (keys.length > 0) {
      result.correctAnswers = keys;
      result.detectedAnswer = true;
      if (keys.length > 1) result.type = "MULTIPLE";
    }
    workingText = workingText.substring(leadingAnsMatch[0].length).trim();
  }

  // 2. 檢測題型標籤（【單選題】、【複選題】、【多選】等）
  const typeTagMatch = workingText.match(
    /^\s*(?:【\s*(單選(?:題)?|複選(?:題)?|多選(?:題)?)\s*】|[\(（]\s*(單選(?:題)?|複選(?:題)?|多選(?:題)?)\s*[\)）]|\[\s*(單選(?:題)?|複選(?:題)?|多選(?:題)?)\s*\])\s*/i
  );
  if (typeTagMatch) {
    const tag = typeTagMatch[1] || typeTagMatch[2] || typeTagMatch[3];
    if (tag.includes("複") || tag.includes("多")) {
      result.type = "MULTIPLE";
      result.detectedType = true;
    } else if (tag.includes("單")) {
      result.type = "SINGLE";
      result.detectedType = true;
    }
    workingText = workingText.substring(typeTagMatch[0].length).trim();
  }

  // 3. 提取解析 (Explanation)
  const explanationRegex =
    /(?:(?:^|\n)\s*(?:【?\s*(?:題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明|備註|Explanation|Note)\s*】?)\s*(?:[:：]|為|是)?\s*|【\s*(?:題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*】)([\s\S]*)$/i;
  const explanationMatch = workingText.match(explanationRegex);
  if (explanationMatch && explanationMatch.index !== undefined) {
    let rawExp = explanationMatch[1].trim();

    // 檢查解析內是否又夾帶了答案（例如「解析：... \n 答案：A」）
    const innerAnswerRegex =
      /(?:^|\n)\s*(?:(?:【?\s*(?:標準答案|正確答案|本題答案|參考答案|答案|解答|正解|Ans(?:wer)?|Key)\s*】?)\s*(?:[:：]|為|是|選|\.|\s)?\s*|【\s*(?:標準答案|正確答案|本題答案|參考答案|答案|解答|正解)\s*】\s*)([^\r\n]+)/i;
    const innerAnsMatch = rawExp.match(innerAnswerRegex);
    if (innerAnsMatch && !result.detectedAnswer) {
      const keys = extractAnswerKeys(innerAnsMatch[1]);
      if (keys.length > 0) {
        result.correctAnswers = keys;
        result.detectedAnswer = true;
        if (keys.length > 1) result.type = "MULTIPLE";
      }
      rawExp = rawExp.replace(innerAnsMatch[0], "").trim();
    }

    result.explanation = rawExp;
    result.detectedExplanation = true;
    workingText = workingText.substring(0, explanationMatch.index).trim();
  }

  // 4. 提取答案 (Answer)
  const answerRegex =
    /(?:^|\n)\s*(?:(?:【?\s*(?:標準答案|正確答案|本題答案|參考答案|答案|解答|正解|Ans(?:wer)?|Key)\s*】?)\s*(?:[:：]|為|是|選|\.|\s)?\s*|【\s*(?:標準答案|正確答案|本題答案|參考答案|答案|解答|正解)\s*】\s*)([^\r\n]+)/i;
  const answerMatch = workingText.match(answerRegex);
  if (answerMatch && answerMatch.index !== undefined) {
    const keys = extractAnswerKeys(answerMatch[1]);
    if (keys.length > 0) {
      result.correctAnswers = keys;
      result.detectedAnswer = true;
      if (keys.length > 1) {
        result.type = "MULTIPLE";
      }
      workingText = (
        workingText.substring(0, answerMatch.index) +
        "\n" +
        workingText.substring(answerMatch.index + answerMatch[0].length)
      ).trim();
    }
  }

  // 5. 提取選項 A, B, C, D
  const parsedOptions = extractOptions(workingText);

  if (parsedOptions) {
    result.stem = cleanStem(parsedOptions.stem);
    result.optionA = cleanOption(parsedOptions.optionA);
    result.optionB = cleanOption(parsedOptions.optionB);
    result.optionC = cleanOption(parsedOptions.optionC);
    result.optionD = cleanOption(parsedOptions.optionD);
  } else {
    result.stem = cleanStem(workingText);
    result.warnings.push("未能完全辨識 A、B、C、D 四個選項，請檢查文字格式或手動調整");
  }

  // 若尚未偵測到答案，預設為 A 並發出提示
  if (!result.detectedAnswer) {
    result.correctAnswers = ["A"];
    result.warnings.push("文本中未包含答案標籤，已預設為 A，請於預覽中檢查確認正確解答");
  }

  // 防呆檢查選項完整度
  if (!result.optionA) result.warnings.push("選項 A 內容為空");
  if (!result.optionB) result.warnings.push("選項 B 內容為空");
  if (!result.optionC) result.warnings.push("選項 C 內容為空");
  if (!result.optionD) result.warnings.push("選項 D 內容為空");

  return result;
}

/**
 * 輔助函式：從字串中擷取選項字母 A, B, C, D 或數字 1~4
 */
function extractAnswerKeys(str: string): string[] {
  if (/全|皆是|全部/.test(str)) {
    return ["A", "B", "C", "D"];
  }

  const normalized = str.replace(/[\uFF21-\uFF24\uFF41-\uFF44]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );

  const letters = normalized.match(/[A-Da-d]/g);
  if (letters && letters.length > 0) {
    const unique = Array.from(new Set(letters.map((m) => m.toUpperCase())));
    return unique.sort();
  }

  const numbers = normalized.match(/[1-4]/g);
  if (numbers && numbers.length > 0) {
    const numMap: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };
    const unique = Array.from(new Set(numbers.map((n) => numMap[n])));
    return unique.sort();
  }

  return [];
}

/**
 * 輔助函式：清理題幹前綴（去除「8. 」、「8、」、「第8題：」、「Q1: 」等前綴）
 * 注意：僅清除題目前置題號，絕不破壞題幹內部換行列表（如「1. 條件一 \n 2. 條件二」）
 */
function cleanStem(rawStem: string): string {
  let s = rawStem.trim();

  // 1. 移除開頭之「題目：」或「題目:」
  s = s.replace(/^\s*題目\s*[:：]\s*/i, "");

  // 2. 移除開頭可能存在的題型標籤
  s = s.replace(
    /^\s*(?:【\s*(?:單選(?:題)?|複選(?:題)?|多選(?:題)?)\s*】|[\(（]\s*(?:單選(?:題)?|複選(?:題)?|多選(?:題)?)\s*[\)）]|\[\s*(?:單選(?:題)?|複選(?:題)?|多選(?:題)?)\s*\])\s*/i,
    ""
  );

  // 3. 僅移除最開頭的題號前綴（避免誤刪題幹中間的編號列表 1. 2. 3.）
  s = s.replace(
    /^\s*(?:第\s*\d{1,4}\s*[題题]\s*[:：\.、\s]*|Q(?:uestion)?\s*[\d]{1,4}\s*[:：\.、\s]*|\(?\d{1,4}\)?[\.、\s]|\d{1,4}[\.、\)]|[\(（\[【]\s*\d{1,4}\s*[\)）\]】]\s*[:：\.、\s]*)\s*/i,
    ""
  );

  // 4. 若題幹中間某行單獨帶有顯式「第 X 題：」或「Q X:」（例如前有多行情境說明），僅移除顯式「第 X 題」標籤
  s = s.replace(
    /(?:^|\n)\s*(?:第\s*\d{1,4}\s*[題题]\s*[:：\.、\s]*|Q(?:uestion)?\s*[\d]{1,4}\s*[:：\.、\s]+)\s*/gi,
    (m, offset) => (offset === 0 ? "" : "\n")
  );

  // 5. 再次移除開頭殘留之「題目：」
  s = s.replace(/^\s*題目\s*[:：]\s*/i, "");

  return s.trim();
}

/**
 * 輔助函式：清理選項文字（去除末尾多餘標點符號如分號、句號）
 */
function cleanOption(rawOption: string): string {
  let s = rawOption.trim();
  s = s.replace(/[；;，,。、]$/, "");
  return s.trim();
}

interface ExtractedOptions {
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

const STYLE_TESTERS = [
  // 半形括號: (A)
  {
    name: "half_paren",
    regex: (k: string) => new RegExp(`^\\s*\\(${k}\\)\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)\\(${k}\\)\\s*`, "i"),
  },
  // 全形括號: （A）
  {
    name: "full_paren",
    regex: (k: string) => new RegExp(`^\\s*（${k}）\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)（${k}）\\s*`, "i"),
  },
  // 中括號: [A]
  {
    name: "bracket",
    regex: (k: string) => new RegExp(`^\\s*\\[${k}\\]\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)\\[${k}\\]\\s*`, "i"),
  },
  // 粗括號: 【A】
  {
    name: "thick_bracket",
    regex: (k: string) => new RegExp(`^\\s*【${k}】\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)【${k}】\\s*`, "i"),
  },
  // 英文句點: A. / A．
  {
    name: "dot",
    regex: (k: string) => new RegExp(`^\\s*${k}[\\.．]\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)${k}[\\.．]\\s*`, "i"),
  },
  // 中文頓號: A、
  {
    name: "dunhao",
    regex: (k: string) => new RegExp(`^\\s*${k}、\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)${k}、\\s*`, "i"),
  },
  // 單括號: A) / A）
  {
    name: "single_paren",
    regex: (k: string) => new RegExp(`^\\s*${k}[\\)）]\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)${k}[\\)）]\\s*`, "i"),
  },
  // 冒號: A: / A：
  {
    name: "colon",
    regex: (k: string) => new RegExp(`^\\s*${k}[:：]\\s*`, "i"),
    inlineRegex: (k: string) => new RegExp(`(?:^|\\s|\\n)${k}[:：]\\s*`, "i"),
  },
];

/**
 * 完整多策略選項提取演算法
 */
function extractOptions(text: string): ExtractedOptions | null {
  // 策略 1：行首獨立選項（每行一選項，或選項跨多行） - 最安全、最精準、完全免疫內部英文縮寫
  const lineAnchored = tryLineAnchoredExtraction(text);
  if (lineAnchored) return lineAnchored;

  // 策略 2：成對行首選項（每行兩個選項，例如 A/B 同行，C/D 同行）
  const pairedLine = tryPairedLineExtraction(text);
  if (pairedLine) return pairedLine;

  // 策略 3：行內或單行所有選項並列 (A ... B ... C ... D)
  const inline = tryInlineExtraction(text);
  if (inline) return inline;

  // 策略 4：數字選項 (1), (2), (3), (4) 轉 A, B, C, D
  const numeric = tryNumericExtraction(text);
  if (numeric) return numeric;

  return null;
}

/**
 * 策略 1：行首錨定匹配（每選項以獨立行首開始，相容空行或選項內容換行）
 */
function tryLineAnchoredExtraction(text: string): ExtractedOptions | null {
  const lines = text.split("\n");

  for (const style of STYLE_TESTERS) {
    let idxA = -1, idxB = -1, idxC = -1, idxD = -1;
    let matchLenA = 0, matchLenB = 0, matchLenC = 0, matchLenD = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (idxA === -1) {
        const m = line.match(style.regex("A"));
        if (m) { idxA = i; matchLenA = m[0].length; }
      } else if (idxB === -1) {
        const m = line.match(style.regex("B"));
        if (m) { idxB = i; matchLenB = m[0].length; }
      } else if (idxC === -1) {
        const m = line.match(style.regex("C"));
        if (m) { idxC = i; matchLenC = m[0].length; }
      } else if (idxD === -1) {
        const m = line.match(style.regex("D"));
        if (m) { idxD = i; matchLenD = m[0].length; }
      }
    }

    if (idxA !== -1 && idxB !== -1 && idxC !== -1 && idxD !== -1) {
      const stem = lines.slice(0, idxA).join("\n");
      const optA = [lines[idxA].substring(matchLenA), ...lines.slice(idxA + 1, idxB)].join("\n");
      const optB = [lines[idxB].substring(matchLenB), ...lines.slice(idxB + 1, idxC)].join("\n");
      const optC = [lines[idxC].substring(matchLenC), ...lines.slice(idxC + 1, idxD)].join("\n");
      const optD = [lines[idxD].substring(matchLenD), ...lines.slice(idxD + 1)].join("\n");

      return { stem, optionA: optA, optionB: optB, optionC: optC, optionD: optD };
    }
  }

  // 通用相容行首（允許不同選項混合使用相近風格）
  const genericLineMarker = (k: string) =>
    new RegExp(
      `^\\s*(?:[\\(（\\[【]\\s*${k}\\s*[\\)）\\]】]|${k}[\\.．、\\)）:：]|(?:^|\\n)\\s*${k}\\s+)`,
      "i"
    );

  let idxA = -1, idxB = -1, idxC = -1, idxD = -1;
  let lenA = 0, lenB = 0, lenC = 0, lenD = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (idxA === -1) {
      const m = line.match(genericLineMarker("A"));
      if (m) { idxA = i; lenA = m[0].length; }
    } else if (idxB === -1) {
      const m = line.match(genericLineMarker("B"));
      if (m) { idxB = i; lenB = m[0].length; }
    } else if (idxC === -1) {
      const m = line.match(genericLineMarker("C"));
      if (m) { idxC = i; lenC = m[0].length; }
    } else if (idxD === -1) {
      const m = line.match(genericLineMarker("D"));
      if (m) { idxD = i; lenD = m[0].length; }
    }
  }

  if (idxA !== -1 && idxB !== -1 && idxC !== -1 && idxD !== -1) {
    return {
      stem: lines.slice(0, idxA).join("\n"),
      optionA: [lines[idxA].substring(lenA), ...lines.slice(idxA + 1, idxB)].join("\n"),
      optionB: [lines[idxB].substring(lenB), ...lines.slice(idxB + 1, idxC)].join("\n"),
      optionC: [lines[idxC].substring(lenC), ...lines.slice(idxC + 1, idxD)].join("\n"),
      optionD: [lines[idxD].substring(lenD), ...lines.slice(idxD + 1)].join("\n"),
    };
  }

  return null;
}

/**
 * 策略 2：成對行首 (例如第 1 行 A, B；第 2 行 C, D)
 */
function tryPairedLineExtraction(text: string): ExtractedOptions | null {
  const lines = text.split("\n");

  for (const style of STYLE_TESTERS) {
    let lineABIdx = -1;
    let lineCDIdx = -1;
    let mAB: { mAEnd: number; mBStart: number; mBEnd: number } | null = null;
    let mCD: { mCEnd: number; mDStart: number; mDEnd: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (lineABIdx === -1) {
        const mA = line.match(style.regex("A"));
        if (mA) {
          const rest = line.substring(mA[0].length);
          const mB = rest.match(style.inlineRegex("B"));
          if (mB && mB.index !== undefined) {
            lineABIdx = i;
            mAB = {
              mAEnd: mA[0].length,
              mBStart: mA[0].length + mB.index,
              mBEnd: mA[0].length + mB.index + mB[0].length,
            };
          }
        }
      } else if (lineCDIdx === -1) {
        const mC = line.match(style.regex("C"));
        if (mC) {
          const rest = line.substring(mC[0].length);
          const mD = rest.match(style.inlineRegex("D"));
          if (mD && mD.index !== undefined) {
            lineCDIdx = i;
            mCD = {
              mCEnd: mC[0].length,
              mDStart: mC[0].length + mD.index,
              mDEnd: mC[0].length + mD.index + mD[0].length,
            };
          }
        }
      }
    }

    if (lineABIdx !== -1 && lineCDIdx !== -1 && mAB && mCD) {
      const stem = lines.slice(0, lineABIdx).join("\n");
      const lineAB = lines[lineABIdx];
      const lineCD = lines[lineCDIdx];

      const optA = lineAB.substring(mAB.mAEnd, mAB.mBStart);
      const optB = [
        lineAB.substring(mAB.mBEnd),
        ...lines.slice(lineABIdx + 1, lineCDIdx),
      ].join("\n");
      const optC = lineCD.substring(mCD.mCEnd, mCD.mDStart);
      const optD = [
        lineCD.substring(mCD.mDEnd),
        ...lines.slice(lineCDIdx + 1),
      ].join("\n");

      return { stem, optionA: optA, optionB: optB, optionC: optC, optionD: optD };
    }
  }

  return null;
}

/**
 * 策略 3：行內或全文順序匹配 (A) ... (B) ... (C) ... (D)
 */
function tryInlineExtraction(text: string): ExtractedOptions | null {
  for (const style of STYLE_TESTERS) {
    const mA = findMarkerMatch(text, style.inlineRegex("A"), 0);
    if (!mA) continue;

    const mB = findMarkerMatch(text, style.inlineRegex("B"), mA.endIndex);
    if (!mB) continue;

    const mC = findMarkerMatch(text, style.inlineRegex("C"), mB.endIndex);
    if (!mC) continue;

    const mD = findMarkerMatch(text, style.inlineRegex("D"), mC.endIndex);
    if (!mD) continue;

    return {
      stem: text.substring(0, mA.startIndex),
      optionA: text.substring(mA.endIndex, mB.startIndex),
      optionB: text.substring(mB.endIndex, mC.startIndex),
      optionC: text.substring(mC.endIndex, mD.startIndex),
      optionD: text.substring(mD.endIndex),
    };
  }

  return null;
}

/**
 * 策略 4：數字選項 (1), (2), (3), (4) 或 ①, ②, ③, ④
 */
function tryNumericExtraction(text: string): ExtractedOptions | null {
  const numericStyles = [
    {
      regex: (k: string) => new RegExp(`^\\s*[\\(（]${k}[\\)）]\\s*`),
    },
    {
      regex: (k: string) => new RegExp(`^\\s*\\[${k}\\]\\s*`),
    },
    {
      regex: (k: string) => {
        const circleMap: Record<string, string> = { "1": "①", "2": "②", "3": "③", "4": "④" };
        return new RegExp(`^\\s*${circleMap[k]}\\s*`);
      },
    },
  ];

  const lines = text.split("\n");

  for (const style of numericStyles) {
    let idx1 = -1, idx2 = -1, idx3 = -1, idx4 = -1;
    let len1 = 0, len2 = 0, len3 = 0, len4 = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (idx1 === -1) {
        const m = line.match(style.regex("1"));
        if (m) { idx1 = i; len1 = m[0].length; }
      } else if (idx2 === -1) {
        const m = line.match(style.regex("2"));
        if (m) { idx2 = i; len2 = m[0].length; }
      } else if (idx3 === -1) {
        const m = line.match(style.regex("3"));
        if (m) { idx3 = i; len3 = m[0].length; }
      } else if (idx4 === -1) {
        const m = line.match(style.regex("4"));
        if (m) { idx4 = i; len4 = m[0].length; }
      }
    }

    if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1 && idx4 !== -1) {
      return {
        stem: lines.slice(0, idx1).join("\n"),
        optionA: [lines[idx1].substring(len1), ...lines.slice(idx1 + 1, idx2)].join("\n"),
        optionB: [lines[idx2].substring(len2), ...lines.slice(idx2 + 1, idx3)].join("\n"),
        optionC: [lines[idx3].substring(len3), ...lines.slice(idx3 + 1, idx4)].join("\n"),
        optionD: [lines[idx4].substring(len4), ...lines.slice(idx4 + 1)].join("\n"),
      };
    }
  }

  return null;
}

interface MarkerMatchResult {
  startIndex: number;
  endIndex: number;
}

function findMarkerMatch(
  text: string,
  regex: RegExp,
  fromIndex: number
): MarkerMatchResult | null {
  const sub = text.substring(fromIndex);
  const match = sub.match(regex);
  if (!match || match.index === undefined) return null;

  const fullMatch = match[0];
  const startIndex = fromIndex + match.index;
  const endIndex = startIndex + fullMatch.length;

  return { startIndex, endIndex };
}
