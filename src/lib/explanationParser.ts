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
  intro?: string;
  options?: ParsedOptionCard[];
  takeaway?: string;
  conceptText?: string;
  rawText: string;
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

interface DetectedMarker {
  index: number;
  length: number;
  matchedText: string;
  key: string;
}

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

  const trimmed = rawText.trim();
  const optionsMap = normalizeOptionsMap(options);
  const normalizedCorrect = normalizeAnswers(correctAnswers);
  const correctSet = new Set(normalizedCorrect);

  // Mask markdown code blocks so code contents are not mistakenly treated as options
  const masked = trimmed.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length));

  // Regex to detect option markers with boundary safety:
  // 1. Explicit keywords: 選項(A), 選項A, A選項
  // 2. Delimited bare markers: A., A:, A：, A、 (requires start-of-line or punctuation boundary; A. requires not followed by identifier chars)
  // 3. Delimited brackets: [A], 【A】 (requires start-of-line or punctuation boundary)
  // 4. Parenthesized:
  //    - (A): halfwidth, requires negative lookbehind (?<![a-zA-Z0-9_\u4e00-\u9fa5]) to prevent matching P(A), f(A), etc.
  //    - （A）: fullwidth
  const markerRegex =
    /(?:^|[\r\n；;。!?！？\s])(?:(?:選項\s*[\(（]([A-Ha-h])[\)）])|(?:選項\s*([A-Ha-h]))|(?:([A-Ha-h])\s*選項(?:\s*[:：])?))|(?<=^|[\r\n；;。!?！？])\s*(?:([A-Ha-h])\s*(?:\.(?![a-zA-Z0-9_])|[:：、]))|(?<=^|[\r\n；;。!?！？])\s*(?:[\[【]([A-Ha-h])[\]】])|(?<![a-zA-Z0-9_\u4e00-\u9fa5])\(([A-Ha-h])\)|（([A-Ha-h])）/g;

  const rawMarkers: DetectedMarker[] = [];
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(masked)) !== null) {
    const letter = (
      match[1] ||
      match[2] ||
      match[3] ||
      match[4] ||
      match[5] ||
      match[6] ||
      match[7]
    ).toUpperCase();
    const fullMatch = match[0];
    const matchIndex = match.index;

    // Find the exact start of the marker within fullMatch (skipping any leading delimiter or whitespace)
    const markerStartIndex = fullMatch.search(/(?:選項|[\[【\(（]|[A-Ha-h])/i);
    const actualStart = matchIndex + (markerStartIndex >= 0 ? markerStartIndex : 0);

    rawMarkers.push({
      index: actualStart,
      length: fullMatch.length - (actualStart - matchIndex),
      matchedText: trimmed.substring(actualStart, matchIndex + fullMatch.length),
      key: letter,
    });
  }

  // Filter markers:
  // If the same letter is matched multiple times, only the first occurrence acts as the card boundary
  // (subsequent occurrences in the same card are cross-references within explanation text).
  const seenKeys = new Set<string>();
  const markers: DetectedMarker[] = [];
  for (const m of rawMarkers) {
    if (!seenKeys.has(m.key)) {
      seenKeys.add(m.key);
      markers.push(m);
    }
  }

  // Dual-mode threshold:
  // Option Card Extraction Mode is triggered when >= 2 distinct options are detected.
  if (markers.length < 2) {
    // Concept Monolithic Mode:
    // Check if there is an ending takeaway/summary section
    let conceptText = trimmed;
    let takeaway: string | undefined;

    const takeawayMatch = trimmed.match(
      /(?:[\r\n]+|\s{2,})(?:(?:【\s*(?:總結|結論|核心考點|考點分析|考點總結|解析總結|重點提示|解題關鍵)\s*】)|(?:(?:總結|總結說明|結論|總之|核心考點|考點分析|考點總結|故本題|因此本題|綜上所述|本題解答|答案解析|解題關鍵)[：:\s])|(?:[💡📌★▼👉]\s*(?:總結|結論|核心考點|考點說明)?[:：\s]?))/
    );

    if (takeawayMatch && takeawayMatch.index !== undefined) {
      const tIndex = takeawayMatch.index;
      takeaway = trimmed.substring(tIndex).trim();
      conceptText = trimmed.substring(0, tIndex).trim();
    }

    return {
      mode: "concept",
      conceptText,
      takeaway,
      rawText,
      options: [],
    };
  }

  // Option Card Extraction Mode:
  // Extract preamble/intro text before first marker
  let intro: string | undefined;
  if (markers[0].index > 0) {
    const rawIntro = trimmed.substring(0, markers[0].index).trim();
    if (rawIntro) {
      intro = rawIntro;
    }
  }

  const parsedOptions: ParsedOptionCard[] = [];
  let takeaway: string | undefined;

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const contentStart = m.index + m.matchedText.length;
    const isLast = i === markers.length - 1;
    const contentEnd = isLast ? trimmed.length : markers[i + 1].index;

    let blockContent = trimmed.substring(contentStart, contentEnd).trim();

    // If this is the last option card, check if concluding takeaway follows
    if (isLast) {
      const takeawayMatch = blockContent.match(
        /(?:[\r\n]+|\s{2,})(?:(?:【\s*(?:總結|結論|核心考點|考點分析|考點總結|解析總結|重點提示|解題關鍵)\s*】)|(?:(?:總結|總結說明|結論|總之|核心考點|考點分析|考點總結|故本題|因此本題|綜上所述|本題解答|答案解析|解題關鍵)[：:\s])|(?:[💡📌★▼👉]\s*(?:總結|結論|核心考點|考點說明)?[:：\s]?))/
      );
      if (takeawayMatch && takeawayMatch.index !== undefined) {
        const tIndex = takeawayMatch.index;
        takeaway = blockContent.substring(tIndex).trim();
        blockContent = blockContent.substring(0, tIndex).trim();
      }
    }

    // Clean up leading colons, dunhao, or closing brackets attached to content if any
    blockContent = blockContent.replace(/^[:：、\.\s\)\）\]】]+/, "");
    // Clean up trailing opening brackets/parentheses from nested brackets
    blockContent = blockContent.replace(/[\(（\[【]+$/, "");
    // Clean up trailing semicolons, commas
    blockContent = blockContent.replace(/[；;，,\s]+$/, "").trim();

    parsedOptions.push({
      key: m.key,
      text: optionsMap[m.key] || "",
      isCorrect: correctSet.has(m.key),
      explanation: blockContent,
    });
  }

  return {
    mode: "options",
    intro,
    options: parsedOptions,
    takeaway,
    rawText,
  };
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
