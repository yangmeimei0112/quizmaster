"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import {
  parseExplanation,
  renderMarkdownTokens,
  ParsedOptionCard,
  OptionsInput,
} from "@/lib/explanationParser";

export type ExplanationFontSize = "small" | "medium" | "large";
export type ExplanationViewMode = "full" | "concise";

export interface ExplanationOptionsMap {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  [key: string]: string | undefined;
}

export interface ExplanationCardProps {
  /**
   * Raw explanation string from Question (e.g. q.explanation).
   * 100% database immutability: will not be mutated or stripped.
   */
  explanation?: string | null;

  /**
   * Correct answer(s) string (e.g. "A" or "A,C") or array (e.g. ["A", "C"]).
   */
  correctAnswers?: string | string[] | null;

  /**
   * The user's submitted answer (e.g. "B" or ["A", "B"]).
   * Optional: used to contextualize personal feedback.
   */
  userAnswer?: string | string[] | null;

  /**
   * Question options map or array of options to enrich card headers with stem text.
   */
  options?: OptionsInput;

  /**
   * Question type ("SINGLE" | "MULTIPLE").
   */
  questionType?: "SINGLE" | "MULTIPLE" | string;

  /**
   * Compact display mode for space-constrained views (e.g. multiplayer battle).
   * Default: false.
   */
  compact?: boolean;

  /**
   * Default font size if not found in localStorage.
   * Default: "medium" (15.5px / 1.85 line-height).
   */
  defaultFontSize?: ExplanationFontSize;

  /**
   * Initial view mode: "full" ("完整剖析") or "concise" ("重點精簡").
   * Default: "full".
   */
  defaultViewMode?: ExplanationViewMode;

  /**
   * Whether to show reader controls (A-/A/A+ and Full/Concise view toggle).
   * Default: true.
   */
  showControls?: boolean;

  /**
   * Whether to show one-click copy button.
   * Default: true.
   */
  showCopyButton?: boolean;

  /**
   * Custom CSS classes applied to root container.
   */
  className?: string;

  /**
   * Custom header title override (default: "題目詳解與考點").
   */
  title?: string;
}

const STORAGE_KEY = "quizmaster_explanation_font_size";

const FONT_SIZE_STYLES: Record<
  ExplanationFontSize,
  { fontSize: string; lineHeight: string; label: string }
> = {
  small: { fontSize: "13.5px", lineHeight: "1.7", label: "A-" },
  medium: { fontSize: "15.5px", lineHeight: "1.85", label: "A" },
  large: { fontSize: "17.5px", lineHeight: "2.0", label: "A+" },
};

/**
 * Normalizes user answer input into an uppercase Set for quick checking.
 */
function normalizeUserAnswerSet(userAnswer?: string | string[] | null): Set<string> {
  const set = new Set<string>();
  if (!userAnswer) return set;

  if (Array.isArray(userAnswer)) {
    for (const ans of userAnswer) {
      if (typeof ans === "string") {
        for (const part of ans.split(",")) {
          const clean = part.trim().toUpperCase();
          if (clean) set.add(clean);
        }
      }
    }
  } else if (typeof userAnswer === "string") {
    for (const part of userAnswer.split(",")) {
      const clean = part.trim().toUpperCase();
      if (clean) set.add(clean);
    }
  }

  return set;
}

/**
 * Flagship Option C Canonical ExplanationCard Component.
 * Features high-contrast deep dark theme (#0c101d), adaptive dual-mode layout,
 * lightweight zero-loss Markdown rendering, scoped font-size scaling with SSR-safe
 * localStorage persistence, view toggle (full/concise), and one-click copy.
 */
export function ExplanationCard({
  explanation,
  correctAnswers,
  userAnswer,
  options,
  questionType,
  compact = false,
  defaultFontSize = "medium",
  defaultViewMode = "full",
  showControls = true,
  showCopyButton = true,
  className = "",
  title = "題目詳解與考點",
}: ExplanationCardProps) {
  // SSR-safe state: initialize with default, sync with localStorage inside useEffect
  const [fontSize, setFontSize] = useState<ExplanationFontSize>(defaultFontSize);
  const [viewMode, setViewMode] = useState<ExplanationViewMode>(defaultViewMode);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync font size from localStorage after hydration to prevent hydration error #418
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ExplanationFontSize | null;
      if (stored && (stored === "small" || stored === "medium" || stored === "large")) {
        setFontSize(stored);
      }
    } catch {
      // Gracefully ignore storage exceptions (e.g. private browsing mode)
    }
  }, []);

  const handleFontSizeChange = useCallback((newSize: ExplanationFontSize) => {
    setFontSize(newSize);
    try {
      localStorage.setItem(STORAGE_KEY, newSize);
    } catch {
      // Ignore
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!explanation) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(explanation);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = explanation;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy explanation to clipboard:", err);
    }
  }, [explanation]);

  // Parse structured explanation using deterministic engine
  const parsed = useMemo(
    () => parseExplanation(explanation, correctAnswers, options),
    [explanation, correctAnswers, options]
  );

  const userSelectedSet = useMemo(() => normalizeUserAnswerSet(userAnswer), [userAnswer]);

  // Filter options based on viewMode
  const displayedOptions = useMemo(() => {
    if (!parsed.options || parsed.options.length === 0) return [];
    if (viewMode === "concise") {
      const correctOnly = parsed.options.filter((opt) => opt.isCorrect);
      // If none explicitly matched as correct in parsed options, fallback to all options
      return correctOnly.length > 0 ? correctOnly : parsed.options;
    }
    return parsed.options;
  }, [parsed.options, viewMode]);

  // Graceful empty state
  if (!explanation || !explanation.trim()) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#0c101d] border border-indigo-500/20 p-4 text-xs text-slate-400 flex items-center gap-2 ${className}`}
      >
        <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
        <span>此題目前暫無詳細解析說明。</span>
      </div>
    );
  }

  const activeStyle = FONT_SIZE_STYLES[fontSize];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#0c101d] border border-indigo-500/20 shadow-xl shadow-indigo-950/20 text-slate-100 transition-all duration-200 ease-out before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-400/30 before:to-transparent ${
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5"
      } ${className}`}
    >
      {/* Header bar with title, mode pill, and controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/[0.08] select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="font-bold font-game text-sm text-white tracking-wide">{title}</span>

          {parsed.mode === "options" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-game px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
              <Layers className="w-3 h-3" />
              選項剖析
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-game px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              核心觀念
            </span>
          )}
        </div>

        {/* Reader controls */}
        <div className="flex items-center gap-2 shrink-0">
          {showControls && (
            <>
              {/* View mode toggle (Full vs Concise) */}
              <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setViewMode("full")}
                  title="完整剖析：展示全部選項與分析"
                  className={`px-2 py-1 rounded-md text-[11px] font-game font-semibold transition-all duration-200 ${
                    viewMode === "full"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  完整
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("concise")}
                  title="重點精簡：聚焦核心正解與考點"
                  className={`px-2 py-1 rounded-md text-[11px] font-game font-semibold transition-all duration-200 flex items-center gap-0.5 ${
                    viewMode === "concise"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  精簡
                </button>
              </div>

              {/* Font size segmented buttons (A- / A / A+) */}
              <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                {(["small", "medium", "large"] as ExplanationFontSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFontSizeChange(size)}
                    title={`字級調整：${
                      size === "small" ? "小 (13.5px)" : size === "medium" ? "中 (15.5px)" : "大 (17.5px)"
                    }`}
                    className={`px-2 py-1 rounded-md text-[11px] font-game font-bold transition-all duration-200 ${
                      fontSize === size
                        ? "bg-indigo-500/25 text-indigo-300 border border-indigo-400/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {FONT_SIZE_STYLES[size].label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* One-click copy button */}
          {showCopyButton && (
            <button
              type="button"
              onClick={handleCopy}
              title="複製原始解析文字"
              className={`min-h-[28px] px-2.5 py-1 rounded-lg text-xs font-game font-semibold flex items-center gap-1.5 transition-all duration-200 border ${
                copied
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40"
                  : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">已複製</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">複製解析</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Scoped Content Container */}
      <div
        className="mt-3.5 text-slate-200"
        style={{
          fontSize: activeStyle.fontSize,
          lineHeight: activeStyle.lineHeight,
        }}
      >
        {parsed.mode === "options" ? (
          <div className="space-y-3.5">
            {/* 1. 第一區【考點導讀】 */}
            {parsed.intro && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/30 text-slate-200 shadow-[0_0_15px_rgba(99,102,241,0.08)]">
                <div className="flex items-center gap-1.5 text-xs font-game font-bold text-amber-300/90 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>【考點導讀】</span>
                </div>
                <div className="whitespace-pre-wrap break-words leading-relaxed text-slate-200">
                  {renderMarkdownTokens(parsed.intro)}
                </div>
              </div>
            )}

            {/* 2. 第二區【各選項詳細解析】 */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-game font-bold text-indigo-300 px-1 pt-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>【各選項詳細解析】</span>
              </div>
              {displayedOptions.map((opt: ParsedOptionCard) => {
                const isUserChoice = userSelectedSet.has(opt.key);

                if (opt.isCorrect) {
                  return (
                    <div
                      key={opt.key}
                      className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.06)] transition-all duration-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold font-game text-xs flex items-center justify-center shrink-0">
                            {opt.key}
                          </span>
                          {opt.text && (
                            <span className="font-semibold text-emerald-200 text-sm">
                              {opt.text}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isUserChoice && (
                            <span className="text-[11px] font-game px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              您選擇的答案
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-bold font-game px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            正解選項
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-100 whitespace-pre-wrap break-words">
                        {renderMarkdownTokens(opt.explanation)}
                      </div>
                    </div>
                  );
                }

                // Incorrect option card
                return (
                  <div
                    key={opt.key}
                    className="p-3.5 sm:p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 text-slate-200 transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 font-bold font-game text-xs flex items-center justify-center shrink-0">
                          {opt.key}
                        </span>
                        {opt.text && (
                          <span className="font-medium text-slate-300 text-sm">{opt.text}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isUserChoice && (
                          <span className="text-[11px] font-game px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            您選擇的選項
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-bold font-game px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          錯誤剖析
                        </span>
                      </div>
                    </div>

                    <div className="text-slate-300 whitespace-pre-wrap break-words">
                      {renderMarkdownTokens(opt.explanation)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. 第三區【觀念說明】 */}
            {parsed.conceptNote && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.08)] mt-3">
                <div className="flex items-center gap-1.5 text-xs font-game font-bold text-sky-300 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>【觀念說明】</span>
                </div>
                <div className="text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
                  {renderMarkdownTokens(parsed.conceptNote)}
                </div>
              </div>
            )}

            {/* 4. 第四區【考試記憶重點】 */}
            {(parsed.examTakeaway || (parsed.takeaway && !parsed.conceptNote)) && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/35 bg-amber-950/25 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.1)] mt-3">
                <div className="flex items-center gap-1.5 text-xs font-game font-bold text-amber-400 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>【考試記憶重點】</span>
                </div>
                <div className="text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
                  {renderMarkdownTokens(parsed.examTakeaway || parsed.takeaway || "")}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Concept Monolithic Mode */
          <div className="space-y-3.5">
            {/* Optional Section 1: 【考點導讀】 */}
            {parsed.intro && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/30 text-slate-200 shadow-[0_0_15px_rgba(99,102,241,0.08)]">
                <div className="flex items-center gap-1.5 text-xs font-game font-bold text-amber-300/90 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>【考點導讀】</span>
                </div>
                <div className="whitespace-pre-wrap break-words leading-relaxed text-slate-200">
                  {renderMarkdownTokens(parsed.intro)}
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 text-xs font-game font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>核心考點剖析</span>
            </div>

            {/* Paragraphs with golden line-height and generous breathing room */}
            <div className="space-y-3 text-slate-100">
              {(parsed.conceptText || parsed.rawText)
                .split(/\n{2,}/)
                .map((paragraph, pIdx) => {
                  const trimmedP = paragraph.trim();
                  if (!trimmedP) return null;
                  return (
                    <p key={pIdx} className="whitespace-pre-wrap break-words">
                      {renderMarkdownTokens(trimmedP)}
                    </p>
                  );
                })}
            </div>

            {/* Optional Section 3: 【觀念說明】 */}
            {parsed.conceptNote && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.08)] mt-3">
                <div className="flex items-center gap-1.5 text-xs font-game font-bold text-sky-300 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>【觀念說明】</span>
                </div>
                <div className="text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
                  {renderMarkdownTokens(parsed.conceptNote)}
                </div>
              </div>
            )}

            {/* Optional Section 4: 【考試記憶重點】 in Concept Mode */}
            {(parsed.examTakeaway || (parsed.takeaway && !parsed.conceptNote)) && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/35 bg-amber-950/25 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.1)] mt-3">
                <div className="flex items-center gap-1.5 text-xs font-game font-bold text-amber-400 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>【考試記憶重點】</span>
                </div>
                <div className="text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
                  {renderMarkdownTokens(parsed.examTakeaway || parsed.takeaway || "")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default ExplanationCard;
