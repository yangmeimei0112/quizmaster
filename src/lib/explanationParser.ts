import React from "react";

/**
 * Normalizes answer input into an array of uppercase keys.
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
  return Array.from(new Set(cleaned)).sort();
}

export interface ParsedOptionCard {
  key: string; // e.g. "A", "B", "C", "D"
  text: string; // Stem/text of the option if provided
  isCorrect: boolean; // Whether this option is in correctAnswers
  explanation: string; // Parsed explanation text for this option
}

export interface ParsedExplanationResult {
  mode: "options" | "concept";
  intro?: string; // 第一區【考點導讀】
  options?: ParsedOptionCard[]; // 第二區【各選項詳細解析】
  conceptNote?: string; // 第三區【觀念說明】
  examTakeaway?: string; // 第四區【考試記憶重點】
  takeaway?: string; // 相容別名: examTakeaway || conceptNote
  conceptText?: string;
  rawText: string;
}

export interface StandardExplanationSections {
  intro?: string;
  options?: Array<{ key: string; text?: string; explanation: string }> | Record<string, string>;
  conceptNote?: string;
  examTakeaway?: string;
}

/**
 * 將四個區塊格式化為統一規範的標準解析字串
 * 【考點導讀】 -> 【各選項詳細解析】 -> 【觀念說明】 -> 【考試記憶重點】
 */
export function formatStandardExplanation(sections: StandardExplanationSections): string {
  const parts: string[] = [];

  if (sections.intro && sections.intro.trim()) {
    let cleanIntro = sections.intro.trim();
    let prevIntro = "";
    while (cleanIntro !== prevIntro) {
      prevIntro = cleanIntro;
      cleanIntro = cleanIntro
        .replace(
          /^\s*(?:【\s*(?:考點導讀|考點說明|題目導讀|導讀|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*】\s*[:：]?|(?:考點導讀|考點說明|題目導讀|導讀|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*[:：])\s*/i,
          ""
        )
        .trim();
    }
    if (cleanIntro) {
      parts.push(`【考點導讀】\n${cleanIntro}`);
    }
  }

  let formattedOptions: string[] = [];
  if (Array.isArray(sections.options)) {
    formattedOptions = sections.options
      .filter((o) => o && o.key)
      .map((o) => {
        let cleanExp = (o.explanation || o.text || "").trim();
        cleanExp = cleanExp.replace(new RegExp(`^\\s*(?:${o.key}[\\.．:：\\、\\s]|\\(${o.key}\\)|（${o.key}）|\\[${o.key}\\]|【${o.key}】)\\s*`, "i"), "");
        return `${o.key}. ${cleanExp}`.trim();
      });
  } else if (sections.options && typeof sections.options === "object") {
    formattedOptions = Object.entries(sections.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, exp]) => {
        let cleanExp = (typeof exp === "string" ? exp : String(exp || "")).trim();
        cleanExp = cleanExp.replace(new RegExp(`^\\s*(?:${k}[\\.．:：\\、\\s]|\\(${k}\\)|（${k}）|\\[${k}\\]|【${k}】)\\s*`, "i"), "");
        return `${k}. ${cleanExp}`.trim();
      });
  }

  if (formattedOptions.length > 0) {
    parts.push(`【各選項詳細解析】\n${formattedOptions.join("\n")}`);
  }

  if (sections.conceptNote && sections.conceptNote.trim()) {
    let cleanConcept = sections.conceptNote.trim();
    let prevConcept = "";
    while (cleanConcept !== prevConcept) {
      prevConcept = cleanConcept;
      cleanConcept = cleanConcept
        .replace(
          /^\s*(?:【\s*(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*】\s*[:：]?|(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*[:：])\s*/i,
          ""
        )
        .trim();
    }
    if (cleanConcept) {
      parts.push(`【觀念說明】\n${cleanConcept}`);
    }
  }

  if (sections.examTakeaway && sections.examTakeaway.trim()) {
    let cleanExam = sections.examTakeaway.trim();
    let prevExam = "";
    while (cleanExam !== prevExam) {
      prevExam = cleanExam;
      cleanExam = cleanExam
        .replace(
          /^\s*(?:【\s*(?:考試記憶重點|記憶重點|考試重點|重點記憶|解題口訣|速記重點|破題速記|重點整理|核心考點|考點總結|解題關鍵|總結|結論|記憶關鍵)\s*】\s*[:：]?|(?:考試記憶重點|記憶重點|考試重點|重點記憶|解題口訣|速記重點|破題速記|重點整理|核心考點|考點總結|解題關鍵|總結|結論|記憶關鍵)\s*[:：])\s*/i,
          ""
        )
        .trim();
    }
    if (cleanExam.startsWith("【觀念說明】")) {
      cleanExam = "";
    }
    if (cleanExam) {
      parts.push(`【考試記憶重點】\n${cleanExam}`);
    }
  }

  return parts.join("\n\n").trim();
}

/**
 * 將任何原始解析字串自動偵測並重新整理成標準 4 區塊結構
 */
export function normalizeExplanationToFourSections(
  rawText: string | null | undefined,
  options?: OptionsInput,
  correctAnswers?: string | string[] | null
): string {
  if (!rawText || !rawText.trim()) return "";
  const parsed = parseExplanation(rawText, correctAnswers, options);

  const optionsForFormat =
    parsed.options && parsed.options.length > 0
      ? parsed.options.map((o) => ({ key: o.key, explanation: o.explanation }))
      : undefined;

  let conceptNote = parsed.conceptNote;
  if (!conceptNote && parsed.mode === "concept" && parsed.conceptText) {
    conceptNote = parsed.conceptText;
  }

  const examTakeaway = parsed.examTakeaway;

  return formatStandardExplanation({
    intro: parsed.intro,
    options: optionsForFormat,
    conceptNote,
    examTakeaway,
  });
}

export interface OptionItem {
  key: string;
  text: string;
}

export type OptionsInput =
  | Record<string, string>
  | Array<{ key: string; text: string }>
  | null
  | undefined;

/**
 * Normalizes options input into a key-value record with uppercase keys (e.g. { A: "...", B: "..." }).
 * Supports both array format [{ key: "A", text: "..." }] and object format { A: "...", B: "..." },
 * as well as Prisma question shape { optionA: "...", optionB: "..." }.
 */
function normalizeOptionsMap(options: OptionsInput): Record<string, string> {
  const map: Record<string, string> = {};
  if (!options) return map;

  if (Array.isArray(options)) {
    for (const opt of options) {
      if (opt && typeof opt.key === "string") {
        const cleanKey = opt.key.trim().toUpperCase();
        if (cleanKey) {
          map[cleanKey] = typeof opt.text === "string" ? opt.text : "";
        }
      }
    }
  } else if (typeof options === "object") {
    for (const [k, v] of Object.entries(options)) {
      if (!v && v !== "") continue;
      const strVal = typeof v === "string" ? v : String(v);
      const cleanKey = k.trim().toUpperCase();

      // Support "optionA" -> "A"
      if (cleanKey.startsWith("OPTION") && cleanKey.length === 7) {
        map[cleanKey.charAt(6)] = strVal;
      } else if (cleanKey.length === 1) {
        map[cleanKey] = strVal;
      } else {
        map[cleanKey] = strVal;
      }
    }
  }

  return map;
}

function normalizeFullWidthLetters(str: string): string {
  if (!str) return "";
  return str.replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

function stripGenericExplanationPrefix(str: string): string {
  const genericPrefixRegex =
    /^\s*(?:(?:【\s*(?:題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明|備註|Explanation|Note)\s*】[:：]?)|(?:(?:題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明|備註|Explanation|Note)\s*[:：]))\s*/i;
  let cur = str.trim();
  let prev = "";
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(genericPrefixRegex, "").trim();
  }
  return cur;
}

interface DetectedMarker {
  index: number;
  length: number;
  matchedText: string;
  key: string;
}

const explanationParseCache = new Map<string, ParsedExplanationResult>();

/**
 * Pure, deterministic parser that parses question explanation strings into structured AST.
 * Supports dual-mode: Option Card Extraction Mode (>= 2 options detected) and Concept Mode.
 */
export function parseExplanation(
  explanation: string | null | undefined,
  correctAnswers?: string | string[] | null,
  options?: OptionsInput
): ParsedExplanationResult {
  const rawText = typeof explanation === "string" ? explanation : (explanation != null ? String(explanation) : "");

  if (!explanation || typeof explanation !== "string" || !explanation.trim()) {
    return {
      mode: "concept",
      rawText,
      conceptText: typeof explanation === "string" ? explanation.trim() : "",
      options: [],
    };
  }

  const normalized = normalizeFullWidthLetters(rawText.trim());
  const stripped = stripGenericExplanationPrefix(normalized);
  if (!stripped) {
    return {
      mode: "concept",
      rawText,
      conceptText: "",
      options: [],
    };
  }
  const trimmed = stripped;
  const optionsMap = normalizeOptionsMap(options);
  const normalizedCorrect = normalizeAnswers(correctAnswers);
  const correctSet = new Set(normalizedCorrect);

  const cacheKey = `${trimmed}::${normalizedCorrect.join(",")}::${optionsMap.A || ""}::${optionsMap.B || ""}::${optionsMap.C || ""}::${optionsMap.D || ""}`;
  const cached = explanationParseCache.get(cacheKey);
  if (cached) return cached;

  // 1. Identify all explicit bracketed section headers
  const headerPatterns = [
    { type: "S1", regex: /(?:^|[\r\n]+)\s*【\s*(?:考點導讀|考點說明|題目導讀|導讀)\s*】\s*[:：]?\s*/gi },
    { type: "S2", regex: /(?:^|[\r\n]+)\s*【\s*(?:各選項詳細解析|各選項解析|選項詳細解析|選項解析|詳細解析)\s*】\s*[:：]?\s*/gi },
    { type: "S3", regex: /(?:^|[\r\n]+)\s*【\s*(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念)\s*】\s*[:：]?\s*/gi },
    { type: "S4", regex: /(?:^|[\r\n]+)\s*【\s*(?:考試記憶重點|記憶重點|考試重點|重點記憶|解題口訣|速記重點|破題速記|重點整理|核心考點|考點分析|考點總結|解析總結|重點提示|解題關鍵|記憶關鍵)\s*】\s*[:：]?\s*/gi },
  ];

  const foundHeaders: Array<{ type: string; index: number; contentStart: number }> = [];
  for (const { type, regex } of headerPatterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(trimmed)) !== null) {
      foundHeaders.push({
        type,
        index: m.index,
        contentStart: m.index + m[0].length,
      });
    }
  }

  foundHeaders.sort((a, b) => a.index - b.index);

  let explicitIntro: string | undefined;
  let explicitOptions: string | undefined;
  let section3Text: string | undefined;
  let section4Text: string | undefined;
  let rawTakeaway: string | undefined;
  let unassignedPreHeader = "";

  const trailingTakeawayRegex =
    /(?:[\r\n]+|\s{2,})(?:(?:【\s*(?:考試記憶重點|記憶重點|考試重點|重點記憶|解題口訣|速記重點|破題速記|重點整理|核心考點|考點分析|考點總結|解析總結|重點提示|解題關鍵|記憶關鍵|總結|結論)\s*】)|(?:(?:總結|總結說明|結論|總之|故本題|因此本題|綜上所述|解題關鍵|記憶關鍵|記憶重點|考試重點)[：:\s])|(?:(?:💡|📌|★|▼|👉)\s*(?:總結|結論|核心考點|考點說明)?[:：\s]?))([\s\S]*)$/u;

  const trailingConceptRegex =
    /(?:[\r\n]+|\s{2,})(?:(?:【\s*(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念)\s*】\s*[:：]?)|(?:(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念)\s*[:：]))([\s\S]*)$/u;

  if (foundHeaders.length > 0) {
    unassignedPreHeader = trimmed.substring(0, foundHeaders[0].index).trim();

    for (let i = 0; i < foundHeaders.length; i++) {
      const h = foundHeaders[i];
      const end = i + 1 < foundHeaders.length ? foundHeaders[i + 1].index : trimmed.length;
      const content = trimmed.substring(h.contentStart, end).trim();

      if (h.type === "S1" && !explicitIntro) explicitIntro = content;
      else if (h.type === "S2" && !explicitOptions) explicitOptions = content;
      else if (h.type === "S3" && !section3Text) section3Text = content;
      else if (h.type === "S4" && !section4Text) {
        section4Text = content;
        rawTakeaway = trimmed.substring(h.index, end).trim();
      }
    }

    if (!explicitIntro && unassignedPreHeader) {
      explicitIntro = unassignedPreHeader;
    }
  } else {
    // Unstructured mode: Check for trailing takeaway and concept at the very end
    let working = trimmed;
    const takeawayMatch = working.match(trailingTakeawayRegex);
    if (takeawayMatch && takeawayMatch.index !== undefined) {
      section4Text = working.substring(takeawayMatch.index).trim();
      rawTakeaway = working.substring(takeawayMatch.index).trim();
      working = working.substring(0, takeawayMatch.index).trim();
    }

    const conceptMatch = working.match(trailingConceptRegex);
    if (conceptMatch && conceptMatch.index !== undefined) {
      section3Text = working.substring(conceptMatch.index).trim();
      working = working.substring(0, conceptMatch.index).trim();
    }

    unassignedPreHeader = working;
  }

  const optionsTargetText = explicitOptions || unassignedPreHeader;

  // Option marker detection on candidate text (optionsTargetText)
  const masked = optionsTargetText.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length));
  const markerRegex =
    /(?:^|[\r\n；;。!?！？\s])(?:(?:選項\s*[\(（]([A-Ha-h])[\)）])|(?:選項\s*([A-Ha-h]))|(?:([A-Ha-h])\s*選項(?:\s*[:：])?))|(?<=^|[\r\n；;。!?！？:,：，、\s\]】\)])\s*(?:([A-Ha-h])\s*(?:\.(?![a-zA-Z0-9_])|[:：、]))|(?<=^|[\r\n；;。!?！？])\s*(?:[\[【]([A-Ha-h])[\]】])|(?<![a-zA-Z0-9_\u4e00-\u9fa5])\(([A-Ha-h])\)|（([A-Ha-h])）/g;

  const rawMarkers: DetectedMarker[] = [];
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(masked)) !== null) {
    const letter = (
      match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || match[7]
    ).toUpperCase();
    const fullMatch = match[0];
    const matchIndex = match.index;

    const markerStartIndex = fullMatch.search(/(?:選項|[\[【\(（]|[A-Ha-h])/i);
    const actualStart = matchIndex + (markerStartIndex >= 0 ? markerStartIndex : 0);

    rawMarkers.push({
      index: actualStart,
      length: fullMatch.length - (actualStart - matchIndex),
      matchedText: optionsTargetText.substring(actualStart, matchIndex + fullMatch.length),
      key: letter,
    });
  }

  const seenKeys = new Set<string>();
  const markers: DetectedMarker[] = [];
  for (const m of rawMarkers) {
    if (!seenKeys.has(m.key)) {
      seenKeys.add(m.key);
      markers.push(m);
    }
  }

  // Clean prefix helper
  const cleanWithPrefixes = (text: string, regex: RegExp) => {
    let cur = text.trim();
    let prev = "";
    while (cur !== prev) {
      prev = cur;
      cur = cur.replace(regex, "").trim();
    }
    return cur;
  };

  const introPrefixRegex =
    /^\s*(?:【\s*(?:考點導讀|考點說明|題目導讀|導讀|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*】\s*[:：]?|(?:考點導讀|考點說明|題目導讀|導讀|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*[:：])\s*/i;
  const conceptPrefixRegex =
    /^\s*(?:【\s*(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*】\s*[:：]?|(?:觀念說明|概念說明|觀念解析|概念解析|核心觀念|理論說明|觀念補充|相關觀念|相關概念|題目解析|試題解析|解題思路|參考解析|解析|詳解|解題說明|題目說明|說明)\s*[:：])\s*/i;
  const takeawayPrefixRegex =
    /^\s*(?:【\s*(?:考試記憶重點|記憶重點|考試重點|重點記憶|解題口訣|速記重點|破題速記|重點整理|核心考點|考點分析|考點總結|解析總結|重點提示|解題關鍵|記憶關鍵|總結|結論)\s*】\s*[:：]?|(?:考試記憶重點|記憶重點|考試重點|重點記憶|解題口訣|速記重點|破題速記|重點整理|核心考點|考點分析|考點總結|解析總結|重點提示|解題關鍵|記憶關鍵|總結|總結說明|結論|總之|故本題|因此本題|綜上所述)\s*[:：]?|(?:💡|📌|★|▼|👉)\s*(?:總結|結論|核心考點|考點說明)?[:：\s]?)\s*/u;

  let intro: string | undefined = explicitIntro ? cleanWithPrefixes(explicitIntro, introPrefixRegex) : undefined;

  let parsedOptions: ParsedOptionCard[] = [];
  let isOptionMode = false;

  if (markers.length >= 2) {
    if (!intro && !explicitOptions && markers[0].index > 0) {
      const rawIntro = optionsTargetText.substring(0, markers[0].index).trim();
      if (rawIntro) {
        intro = cleanWithPrefixes(rawIntro, introPrefixRegex) || undefined;
      }
    }

    const cards: ParsedOptionCard[] = [];
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const contentStart = m.index + m.matchedText.length;
      const isLast = i === markers.length - 1;
      const contentEnd = isLast ? optionsTargetText.length : markers[i + 1].index;

      let blockContent = optionsTargetText.substring(contentStart, contentEnd).trim();

      if (isLast) {
        if (!section4Text) {
          const takeawayMatch = blockContent.match(trailingTakeawayRegex);
          if (takeawayMatch && takeawayMatch.index !== undefined) {
            const tIndex = takeawayMatch.index;
            rawTakeaway = blockContent.substring(tIndex).trim();
            section4Text = blockContent.substring(tIndex).trim();
            blockContent = blockContent.substring(0, tIndex).trim();
          }
        }
        if (!section3Text) {
          const conceptMatch = blockContent.match(trailingConceptRegex);
          if (conceptMatch && conceptMatch.index !== undefined) {
            const cIndex = conceptMatch.index;
            section3Text = blockContent.substring(cIndex).trim();
            blockContent = blockContent.substring(0, cIndex).trim();
          }
        }
      }

      blockContent = blockContent.replace(/^[ :：、\.\)\）\]】]+/, "");
      blockContent = blockContent.replace(/[\(（\[【]+$/, "");
      blockContent = blockContent.replace(/[；;，,、\s]+$/, "").trim();

      cards.push({
        key: m.key,
        text: optionsMap[m.key] || "",
        isCorrect: correctSet.has(m.key),
        explanation: blockContent,
      });
    }

    const hasEmpty = cards.some((c) => !c.explanation.trim());
    if (!hasEmpty) {
      parsedOptions = cards;
      isOptionMode = true;
    }
  }

  if (section3Text) {
    section3Text = cleanWithPrefixes(section3Text, conceptPrefixRegex);
  }

  const cleanTakeaway = section4Text ? cleanWithPrefixes(section4Text, takeawayPrefixRegex) : undefined;
  const legacyTakeaway = rawTakeaway || cleanTakeaway || undefined;

  if (!isOptionMode) {
    // Concept Mode
    if (!section3Text) {
      let concept = unassignedPreHeader || optionsTargetText;
      if (intro && concept === intro) concept = "";
      section3Text = cleanWithPrefixes(concept, conceptPrefixRegex);
    }

    const cleanConcept = section3Text || "";

    const result: ParsedExplanationResult = {
      mode: "concept",
      intro: intro || undefined,
      conceptText: cleanConcept,
      conceptNote: cleanConcept || undefined,
      examTakeaway: cleanTakeaway,
      takeaway: legacyTakeaway,
      rawText,
      options: [],
    };
    explanationParseCache.set(cacheKey, result);
    if (explanationParseCache.size > 300) {
      const firstKey = explanationParseCache.keys().next().value;
      if (firstKey) explanationParseCache.delete(firstKey);
    }
    return result;
  }

  const result: ParsedExplanationResult = {
    mode: "options",
    intro: intro || undefined,
    options: parsedOptions,
    conceptNote: section3Text || undefined,
    examTakeaway: cleanTakeaway,
    takeaway: legacyTakeaway,
    rawText,
  };
  explanationParseCache.set(cacheKey, result);
  if (explanationParseCache.size > 300) {
    const firstKey = explanationParseCache.keys().next().value;
    if (firstKey) explanationParseCache.delete(firstKey);
  }
  return result;
}

/**
 * Lightweight, zero-loss tokenizer that converts Markdown tokens (**bold** and `code`)
 * into high-contrast React elements while preserving 100% of characters without truncation
 * or accidental HTML interpretation.
 */
export function renderMarkdownTokens(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex matching **bold** or `code`.
  // Requires at least one character inside to avoid empty formatting tags.
  const regex = /(\*\*((?:[^*]|\*(?!\*))+?)\*\*)|(`([^`]+?)`)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    // Push preceding text as literal text node
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }

    if (match[2] !== undefined) {
      // Bold token
      const boldContent = match[2];
      nodes.push(
        React.createElement(
          "strong",
          { key: `b-${matchStart}`, className: "font-bold text-white" },
          boldContent
        )
      );
    } else if (match[4] !== undefined) {
      // Monospace micro-badge token
      const codeContent = match[4];
      nodes.push(
        React.createElement(
          "code",
          {
            key: `c-${matchStart}`,
            className:
              "font-mono bg-white/[0.08] text-indigo-300 px-1.5 py-0.5 rounded text-xs border border-white/[0.1]",
          },
          codeContent
        )
      );
    }

    lastIndex = matchEnd;
  }

  // Push remaining trailing text
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}
