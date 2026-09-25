"use client";

import React, { useState, useMemo } from "react";
import { BattleQuestion, BattleReviewItem } from "@/lib/battleStore";
import { compareAnswers, formatAnswerDisplay } from "@/lib/answerUtils";
import ExplanationCard from "@/components/ExplanationCard";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Layers,
  Award,
} from "lucide-react";

export type ReviewFilter = "ALL" | "WRONG" | "CORRECT";

export interface BattleReviewPanelProps {
  questions?: BattleQuestion[];
  userAnswers?: Record<string, string[]>;
  reviewItems?: BattleReviewItem[];
  defaultFilter?: ReviewFilter;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  title?: string;
  className?: string;
}

export default function BattleReviewPanel({
  questions = [],
  userAnswers = {},
  reviewItems,
  defaultFilter = "ALL",
  collapsible = true,
  defaultExpanded = true,
  title = "📝 本局考題覆盤與解析",
  className = "",
}: BattleReviewPanelProps) {
  const [filter, setFilter] = useState<ReviewFilter>(defaultFilter);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Compute unified review items
  const items: BattleReviewItem[] = useMemo(() => {
    if (reviewItems && reviewItems.length > 0) {
      return reviewItems;
    }
    if (questions && questions.length > 0) {
      return questions.map((q, idx) => {
        const ans = userAnswers?.[q.id] || [];
        const isCorrect = compareAnswers(ans, q.correctAnswers);
        return {
          questionIndex: idx + 1,
          question: q,
          userAnswer: ans,
          isCorrect,
        };
      });
    }
    return [];
  }, [reviewItems, questions, userAnswers]);

  // Statistics calculation
  const totalCount = items.length;
  const correctCount = useMemo(
    () => items.filter((item) => item.isCorrect).length,
    [items]
  );
  const wrongCount = useMemo(
    () => items.filter((item) => !item.isCorrect).length,
    [items]
  );
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // Filtered list
  const filteredItems = useMemo(() => {
    if (filter === "WRONG") {
      return items.filter((item) => !item.isCorrect);
    }
    if (filter === "CORRECT") {
      return items.filter((item) => item.isCorrect);
    }
    return items;
  }, [items, filter]);

  return (
    <div
      className={`rounded-3xl bg-white/[0.03] border border-white/[0.08] shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 transition-all duration-300 ${className}`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-6 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-game text-base sm:text-lg text-foreground flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-game font-semibold bg-white/[0.06] text-foreground-muted border border-white/[0.08]">
                共 {totalCount} 題
              </span>
            </h3>
            <p className="text-xs text-foreground-muted">
              深入檢視本局作答對錯明細，強化核心考點記憶
            </p>
          </div>
        </div>

        {/* Stats Pill Badges & Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-game">
            <span className="text-foreground-muted">正確率</span>
            <span className="font-bold text-amber-300">{accuracy}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-game">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>答對 {correctCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-game">
            <XCircle className="w-3.5 h-3.5" />
            <span>答錯 {wrongCount}</span>
          </div>

          {collapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-label={isExpanded ? "收合考題覆盤面板" : "展開考題覆盤面板"}
              className="min-w-[40px] min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-game font-bold bg-white/[0.06] hover:bg-white/[0.12] text-foreground-muted hover:text-foreground border border-white/10 flex items-center gap-1.5 transition-colors touch-tactile"
            >
              <span>{isExpanded ? "收合" : "展開"}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Collapsible Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-game font-semibold text-foreground-muted">題目篩選：</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* All Filter */}
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-game font-bold transition-all duration-200 flex items-center gap-1.5 touch-tactile ${
                  filter === "ALL"
                    ? "bg-indigo-600 text-white shadow-glow border border-indigo-400/40"
                    : "bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08] hover:bg-white/[0.08]"
                }`}
              >
                <span>全部題目</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    filter === "ALL" ? "bg-white/20 text-white" : "bg-white/[0.08] text-foreground-muted"
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              {/* Wrong Only Filter */}
              <button
                type="button"
                onClick={() => setFilter("WRONG")}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-game font-bold transition-all duration-200 flex items-center gap-1.5 touch-tactile ${
                  filter === "WRONG"
                    ? "bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400/40"
                    : "bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08] hover:bg-white/[0.08]"
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>❌ 僅看錯題</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    wrongCount > 0
                      ? "bg-rose-500/30 text-rose-200 font-black"
                      : "bg-white/[0.08] text-foreground-muted"
                  }`}
                >
                  {wrongCount}
                </span>
              </button>

              {/* Correct Only Filter */}
              <button
                type="button"
                onClick={() => setFilter("CORRECT")}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-game font-bold transition-all duration-200 flex items-center gap-1.5 touch-tactile ${
                  filter === "CORRECT"
                    ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/40"
                    : "bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08] hover:bg-white/[0.08]"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>✓ 僅看答對</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    filter === "CORRECT" ? "bg-white/20 text-white" : "bg-white/[0.08] text-foreground-muted"
                  }`}
                >
                  {correctCount}
                </span>
              </button>
            </div>
          </div>

          {/* Empty States */}
          {totalCount === 0 ? (
            <div className="py-12 text-center space-y-3">
              <HelpCircle className="w-10 h-10 mx-auto text-foreground-muted opacity-40" />
              <p className="text-sm font-game text-foreground-muted">目前暫無本局作答紀錄</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              {filter === "WRONG" ? (
                <>
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce-subtle">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold font-game text-emerald-300">
                    太厲害了！本局全數答對，無任何錯題！🎉
                  </h4>
                  <p className="text-xs text-foreground-muted">可切換至「全部題目」或「僅看答對」查看考題解析。</p>
                </>
              ) : (
                <>
                  <HelpCircle className="w-10 h-10 mx-auto text-foreground-muted opacity-40" />
                  <h4 className="text-base font-bold font-game text-foreground-muted">
                    本局暫無答對題目，再接再厲！💪
                  </h4>
                  <p className="text-xs text-foreground-muted">可切換至「全部題目」或「僅看錯題」查看每題詳解與考點分析。</p>
                </>
              )}
            </div>
          ) : (
            /* Question Review Cards List */
            <div className="space-y-6">
              {filteredItems.map((item, idx) => {
                const q = item.question;
                const formattedUserAnswer =
                  formatAnswerDisplay(item.userAnswer) || "未作答";

                return (
                  <div
                    key={q.id || idx}
                    className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all space-y-4"
                  >
                    {/* Question Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="font-game font-black text-sm px-2.5 py-1 rounded-xl bg-accent/20 text-accent-bright border border-accent/30">
                          第 {item.questionIndex} 題
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-game font-semibold bg-white/[0.06] text-foreground-muted border border-white/[0.08]">
                          {q.type === "SINGLE" ? "單選題" : "複選題"}
                        </span>
                        {q.category && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-[#8B96F8] font-bold">
                            {q.category}
                          </span>
                        )}
                      </div>

                      {/* Correct / Wrong Result Badge */}
                      <div>
                        {item.isCorrect ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-game bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>答對</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-game bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>答錯</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Stem */}
                    <h4 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                      {q.stem}
                    </h4>

                    {/* Optional Question Image */}
                    {q.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-60 flex items-center justify-center p-2">
                        <img
                          src={q.imageUrl}
                          alt="題目附圖"
                          className="max-h-56 object-contain rounded-lg"
                        />
                      </div>
                    )}

                    {/* User Answer vs Correct Answer Summary Pill */}
                    <div
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-game ${
                        item.isCorrect
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                          : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground-muted">你的選擇：</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${
                            item.isCorrect
                              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {formattedUserAnswer}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground-muted">正解答案：</span>
                        <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                          {formatAnswerDisplay(q.correctAnswers) || "無"}
                        </span>
                      </div>
                    </div>

                    {/* Flagship Explanation Card Integration */}
                    <ExplanationCard
                      explanation={q.explanation}
                      correctAnswers={q.correctAnswers}
                      userAnswer={item.userAnswer}
                      options={{
                        A: q.optionA,
                        B: q.optionB,
                        C: q.optionC,
                        D: q.optionD,
                      }}
                      questionType={q.type}
                      compact={false}
                      showControls={true}
                      showCopyButton={true}
                      title="考題詳細剖析與考點"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
