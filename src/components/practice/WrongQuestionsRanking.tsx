"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Flame,
  UserCheck,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Question } from "@/types/question";
import ExplanationCard from "@/components/ExplanationCard";

interface WrongRecord {
  id: string;
  userId?: string;
  questionId: string;
  wrongCount: number;
  totalAttempts?: number;
  correctCount?: number;
  lastUserAnswer?: string | null;
  updatedAt: string;
  question: Question;
}

interface OptionStat {
  key: "A" | "B" | "C" | "D";
  text: string;
  count: number;
  percent: number;
  percentText: string;
  isHighest: boolean;
  isCorrect: boolean;
}

interface QuestionAnalyticsResult {
  hasData: boolean;
  headerText: string;
  totalAttempts: number;
  accuracyRate: number | null;
  options: OptionStat[];
}

function computeQuestionAnalytics(
  q: Question,
  personalRecord?: WrongRecord
): QuestionAnalyticsResult {
  const totalAttempts = personalRecord
    ? Math.max(0, personalRecord.totalAttempts ?? personalRecord.wrongCount ?? q.totalAttempts ?? 0)
    : Math.max(0, q.totalAttempts ?? 0);

  const correctCount = personalRecord
    ? Math.max(0, personalRecord.correctCount ?? 0)
    : Math.max(0, q.correctCount ?? 0);

  const countA = Math.max(0, q.countA ?? 0);
  const countB = Math.max(0, q.countB ?? 0);
  const countC = Math.max(0, q.countC ?? 0);
  const countD = Math.max(0, q.countD ?? 0);

  const correctKeys = (q.correctAnswers || "")
    .split(",")
    .map((k) => k.trim().toUpperCase());

  // Cold start fallback when 0 attempts
  if (totalAttempts === 0) {
    return {
      hasData: false,
      headerText: "尚未有作答數據",
      totalAttempts: 0,
      accuracyRate: null,
      options: [
        { key: "A", text: q.optionA, count: 0, percent: 0, percentText: "0.0%", isHighest: false, isCorrect: correctKeys.includes("A") },
        { key: "B", text: q.optionB, count: 0, percent: 0, percentText: "0.0%", isHighest: false, isCorrect: correctKeys.includes("B") },
        { key: "C", text: q.optionC, count: 0, percent: 0, percentText: "0.0%", isHighest: false, isCorrect: correctKeys.includes("C") },
        { key: "D", text: q.optionD, count: 0, percent: 0, percentText: "0.0%", isHighest: false, isCorrect: correctKeys.includes("D") },
      ],
    };
  }

  // Exact 1 decimal place percentage
  const accuracyRate = Math.round((correctCount / totalAttempts) * 1000) / 10;
  const headerText = `作答總數 ${totalAttempts} 次 · 答對率 ${accuracyRate.toFixed(1)}%`;

  // Option percentages based on options denominator
  const qAttempts = Math.max(0, q.totalAttempts ?? 0);
  const sumCounts = countA + countB + countC + countD;
  const optionsDenominator = qAttempts > 0 ? qAttempts : (sumCounts > 0 ? sumCounts : totalAttempts);

  const pctA = optionsDenominator > 0 ? Math.round((countA / optionsDenominator) * 1000) / 10 : 0;
  const pctB = optionsDenominator > 0 ? Math.round((countB / optionsDenominator) * 1000) / 10 : 0;
  const pctC = optionsDenominator > 0 ? Math.round((countC / optionsDenominator) * 1000) / 10 : 0;
  const pctD = optionsDenominator > 0 ? Math.round((countD / optionsDenominator) * 1000) / 10 : 0;

  const maxCount = Math.max(countA, countB, countC, countD);
  const isHighestA = maxCount > 0 && countA === maxCount;
  const isHighestB = maxCount > 0 && countB === maxCount;
  const isHighestC = maxCount > 0 && countC === maxCount;
  const isHighestD = maxCount > 0 && countD === maxCount;

  return {
    hasData: true,
    headerText,
    totalAttempts,
    accuracyRate,
    options: [
      { key: "A", text: q.optionA, count: countA, percent: pctA, percentText: `${pctA.toFixed(1)}%`, isHighest: isHighestA, isCorrect: correctKeys.includes("A") },
      { key: "B", text: q.optionB, count: countB, percent: pctB, percentText: `${pctB.toFixed(1)}%`, isHighest: isHighestB, isCorrect: correctKeys.includes("B") },
      { key: "C", text: q.optionC, count: countC, percent: pctC, percentText: `${pctC.toFixed(1)}%`, isHighest: isHighestC, isCorrect: correctKeys.includes("C") },
      { key: "D", text: q.optionD, count: countD, percent: pctD, percentText: `${pctD.toFixed(1)}%`, isHighest: isHighestD, isCorrect: correctKeys.includes("D") },
    ],
  };
}

export default function WrongQuestionsRanking({
  onQuickPractice,
}: {
  onQuickPractice?: (question: Question) => void;
}) {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"personal" | "global">("personal");
  const [personalRecords, setPersonalRecords] = useState<WrongRecord[]>([]);
  const [personalTotal, setPersonalTotal] = useState(0);
  const [globalQuestions, setGlobalQuestions] = useState<Question[]>([]);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Expanded explanations state (map question id to boolean)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // In-Place Downward Smooth Expansion State (#11+)
  const [isExpandedBeyond10, setIsExpandedBeyond10] = useState(false);
  const [isBeyond10Loading, setIsBeyond10Loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SINGLE" | "MULTIPLE">("ALL");
  const question10Ref = useRef<HTMLDivElement>(null);

  const fetchTopRankings = useCallback(async () => {
    if (!user) {
      setPersonalRecords([]);
      setPersonalTotal(0);
      setGlobalQuestions([]);
      setGlobalTotal(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [personalRes, globalRes] = await Promise.all([
        fetch("/api/wrong-questions?mode=personal&limit=all"),
        fetch("/api/wrong-questions?mode=global&limit=all"),
      ]);

      if (personalRes.ok) {
        const data = await personalRes.json();
        setPersonalRecords(data.records || []);
        setPersonalTotal(data.totalCount || data.records?.length || 0);
      }

      if (globalRes.ok) {
        const data = await globalRes.json();
        setGlobalQuestions(data.questions || []);
        setGlobalTotal(data.totalCount || data.questions?.length || 0);
      }
    } catch (err) {
      console.error("載入錯題排行失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTopRankings();
  }, [fetchTopRankings]);

  // Toggle explanation
  const toggleExplanation = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTabChange = (tab: "personal" | "global") => {
    setActiveTab(tab);
    setIsExpandedBeyond10(false);
    setSearchQuery("");
    setTypeFilter("ALL");
  };

  // Expand beyond 10 handler
  const handleExpandBeyond10 = async () => {
    setIsExpandedBeyond10(true);
    const currentTotal = activeTab === "personal" ? personalTotal : globalTotal;
    const currentList = activeTab === "personal" ? personalRecords : globalQuestions;

    if (currentList.length < currentTotal) {
      setIsBeyond10Loading(true);
      try {
        const mode = activeTab === "personal" ? "personal" : "global";
        const res = await fetch(`/api/wrong-questions?mode=${mode}&limit=all`);
        if (res.ok) {
          const data = await res.json();
          if (mode === "personal") {
            setPersonalRecords(data.records || []);
            setPersonalTotal(data.totalCount || data.records?.length || 0);
          } else {
            setGlobalQuestions(data.questions || []);
            setGlobalTotal(data.totalCount || data.questions?.length || 0);
          }
        }
      } catch (err) {
        console.error("載入完整錯題清單失敗:", err);
      } finally {
        setIsBeyond10Loading(false);
      }
    }
  };

  // Filtered remaining items (#11+)
  const filteredRemaining = useMemo(() => {
    const list = (activeTab === "personal" ? personalRecords : globalQuestions).slice(10);

    return list
      .map((item, idx) => ({
        item,
        rank: idx + 11,
      }))
      .filter(({ item }) => {
        const q: Question = activeTab === "personal" ? (item as WrongRecord).question : (item as Question);

        // Type filter: 全部, 單選題 (SINGLE), 複選題 (MULTIPLE)
        if (typeFilter === "SINGLE" && q.type !== "SINGLE") return false;
        if (typeFilter === "MULTIPLE" && q.type !== "MULTIPLE") return false;

        // Search query filter: stem, category, options, explanation
        if (searchQuery && searchQuery.trim()) {
          const qLower = searchQuery.trim().toLowerCase();
          const matchStem = q.stem && q.stem.toLowerCase().includes(qLower);
          const matchA = q.optionA && q.optionA.toLowerCase().includes(qLower);
          const matchB = q.optionB && q.optionB.toLowerCase().includes(qLower);
          const matchC = q.optionC && q.optionC.toLowerCase().includes(qLower);
          const matchD = q.optionD && q.optionD.toLowerCase().includes(qLower);
          const matchExp = q.explanation && q.explanation.toLowerCase().includes(qLower);
          const matchCat = q.category && q.category.toLowerCase().includes(qLower);
          return matchStem || matchA || matchB || matchC || matchD || matchExp || matchCat;
        }

        return true;
      });
  }, [activeTab, personalRecords, globalQuestions, typeFilter, searchQuery]);

  // Render in-place downward smooth expansion section
  const renderExpandedSection = () => {
    const totalCount = activeTab === "personal" ? personalTotal : globalTotal;
    const remainingCount = Math.max(0, totalCount - 10);

    return (
      <div className="pt-4 border-t border-white/10 space-y-4 animate-fade-in-down">
        {/* Header with Search and Question Type Filter Tabs */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-bold font-game text-foreground">
                {activeTab === "personal"
                  ? "個人專屬錯題本 · 排行榜以外錯題"
                  : "全站高頻錯題 · 排行榜以外錯題"}
              </span>
              <span className="text-xs text-foreground-muted">
                (第 11 題起，共 {remainingCount} 題)
              </span>
            </div>

            {/* Question Type Filter Tabs: 全部, 單選題, 複選題 */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] shrink-0 self-start sm:self-center">
              {(
                [
                  { label: "全部", value: "ALL" },
                  { label: "單選題", value: "SINGLE" },
                  { label: "複選題", value: "MULTIPLE" },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeFilter(t.value)}
                  className={`min-h-[36px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-game font-bold transition-all touch-tactile ${
                    typeFilter === t.value
                      ? "bg-[#9AA5FF] text-slate-950 shadow-md font-black"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋錯題題幹關鍵字、選項、解析或分類..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-base sm:text-sm text-foreground placeholder-white/30 focus:outline-none focus:border-accent shadow-inner"
            />
          </div>
        </div>

        {/* Expanded Items List (#11 to #N) */}
        {isBeyond10Loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            載入排行榜以外的錯題中...
          </div>
        ) : filteredRemaining.length === 0 ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            無符合條件的錯題
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredRemaining.map(({ item, rank }) => {
              const q: Question = activeTab === "personal" ? (item as WrongRecord).question : (item as Question);
              const wrongCount = activeTab === "personal" ? (item as WrongRecord).wrongCount : q.wrongCount || 1;
              const lastUserAnswer = activeTab === "personal" ? (item as WrongRecord).lastUserAnswer : undefined;
              const isExpanded = !!expandedIds[q.id];
              const analytics = computeQuestionAnalytics(q, activeTab === "personal" ? (item as WrongRecord) : undefined);

              return (
                <div
                  key={item.id || q.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all duration-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-xl font-game font-black text-xs flex items-center justify-center shrink-0 border bg-white/[0.05] text-foreground-muted border-white/[0.08]">
                        #{rank}
                      </span>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold font-game px-2 py-0.5 rounded-full border ${
                              q.type === "SINGLE"
                                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                            }`}
                          >
                            {q.type === "SINGLE" ? "單選題" : "複選題"}
                          </span>
                          {q.category && (
                            <span className="text-[10px] font-medium text-foreground-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                              {q.category}
                            </span>
                          )}

                          {analytics.hasData ? (
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {analytics.headerText}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-foreground-muted bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                              {analytics.headerText}
                            </span>
                          )}

                          {activeTab === "personal" ? (
                            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                              做錯 {wrongCount} 次
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              全站累積錯題 {wrongCount} 次
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                          {q.stem}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onQuickPractice && (
                        <button
                          type="button"
                          onClick={() => onQuickPractice(q)}
                          title="立即重測本題"
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-[#9AA5FF] border border-accent/30 text-xs font-bold font-game transition-all flex items-center gap-1 touch-tactile"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">單題重測</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExplanation(q.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors touch-tactile"
                        aria-label={isExpanded ? "收合選項與詳解" : "展開選項與詳解"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-2 pt-2">
                    {analytics.options.map((opt) => (
                      <div
                        key={opt.key}
                        className={`flex items-start sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          opt.isCorrect
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                            : "bg-white/[0.02] border-white/[0.05] text-foreground"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-game font-bold flex items-center justify-center shrink-0 ${
                              opt.isCorrect
                                ? "bg-emerald-500 text-slate-950 font-black"
                                : "bg-white/[0.06] text-foreground-muted border border-white/[0.08]"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="flex-1 min-w-0 break-words whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                            {opt.text}
                          </span>
                        </div>

                        <div className="shrink-0 ml-auto flex items-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border shrink-0 ${
                              opt.isCorrect
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {opt.isCorrect && (
                              <span className="font-bold font-game text-[11px] text-emerald-300">
                                ✓ 正解
                              </span>
                            )}
                            <span
                              className={
                                opt.isHighest
                                  ? "font-black font-bold text-white text-sm"
                                  : "font-medium"
                              }
                            >
                              {opt.percentText}
                            </span>
                            <span className="text-[10px] opacity-75">
                              ({opt.count}次)
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Explanation Area (Callsite 3) */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-2.5 animate-fade-in text-xs">
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                        <div className="font-bold font-game flex items-center gap-1.5">
                          <span>標準解答：</span>
                          <span className="text-white bg-emerald-600 px-2 py-0.5 rounded font-mono font-black">
                            {q.correctAnswers}
                          </span>
                          {lastUserAnswer && (
                            <span className="ml-2 text-rose-300 text-[11px] font-normal">
                              (您上次作答：{lastUserAnswer})
                            </span>
                          )}
                        </div>
                        {q.explanation && (
                          <ExplanationCard
                            explanation={q.explanation}
                            correctAnswers={q.correctAnswers}
                            userAnswer={lastUserAnswer || undefined}
                            options={{
                              A: q.optionA,
                              B: q.optionB,
                              C: q.optionC,
                              D: q.optionD,
                            }}
                            questionType={q.type}
                            className="mt-2.5"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Collapse Button with Smooth Scroll to #10 */}
        <div className="pt-6 pb-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              question10Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              setIsExpandedBeyond10(false);
            }}
            className="min-h-[44px] px-8 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-xs sm:text-sm font-bold font-game text-[#9AA5FF] hover:text-white transition-all flex items-center gap-2 active:scale-95 touch-tactile shadow-lg"
          >
            <ChevronUp className="w-4 h-4" />
            <span>收合回前 10 題</span>
          </button>
        </div>
      </div>
    );
  };

  // 未登入時呈現會員解鎖導引，嚴格落實「查看錯題功能需登入才可以使用」
  if (!user) {
    return (
      <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-6 sm:p-8 space-y-6 backdrop-blur-md animate-fade-in-up">
        <div className="border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold font-game text-foreground">
              錯題排行榜 · 考點弱項突破
            </h2>
          </div>
          <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
            系統精準記錄歷次做錯的題目與答錯頻率，鎖定高頻陷阱題，快速攻克知識盲區。
          </p>
        </div>

        <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.08] text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-[#9AA5FF] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(94,106,210,0.3)]">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold font-game text-foreground">
              查看錯題排行榜需登入帳號
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              錯題分析與排行榜功能僅限登入會員使用。登入後系統將自動為您統計歷次練習與 50 題模擬考答錯的題目，並將最常做錯的題目列在最上方（展示前 10 名），更支援原地向下平滑展開檢視完整排行與單題一鍵重測！
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow transition-all duration-200 active:scale-95 min-h-[44px]"
          >
            <span>立即登入 / 註冊 帳號</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-6 sm:p-8 space-y-6 backdrop-blur-md animate-fade-in-up">
      {/* 區塊標頭 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold font-game text-foreground">
              錯題排行榜 · 考點弱項突破
            </h2>
          </div>
          <p className="text-xs text-foreground-muted leading-relaxed">
            系統精準記錄歷次做錯的題目與答錯頻率，鎖定高頻陷阱題，快速攻克知識盲區。
          </p>
        </div>

        {/* 雙分頁標籤切換 */}
        <div className="inline-flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("personal")}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-game transition-all duration-200 touch-tactile ${
              activeTab === "personal"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>個人專屬錯題本</span>
            {personalTotal > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {personalTotal}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("global")}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-game transition-all duration-200 touch-tactile ${
              activeTab === "global"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>全站高頻錯題排行</span>
            {globalTotal > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {globalTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: 個人專屬錯題本 */}
      {activeTab === "personal" && (
        <div className="space-y-4">
          {personalRecords.length === 0 ? (
            /* 已登入但尚無錯題紀錄 */
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-game text-foreground">
                  太棒了！您目前沒有任何錯題紀錄
                </h3>
                <p className="text-xs text-foreground-muted">
                  參加 50 題模擬考或即時練習，系統會自動將答錯的題目彙整至此！
                </p>
              </div>
            </div>
          ) : (
            /* 已登入且有個人錯題 TOP 10 */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
                <span>
                  共記錄 <strong className="text-foreground">{personalTotal}</strong> 道個人錯題，此處展示做錯頻率最高前 10 名：
                </span>
                {personalTotal > 10 && (
                  <button
                    type="button"
                    onClick={handleExpandBeyond10}
                    className="text-[#9AA5FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>查看排行榜以外的更多錯題 ({personalTotal} 題)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {personalRecords.slice(0, 10).map((item, index) => {
                  const q = item.question;
                  const isExpanded = !!expandedIds[q.id];
                  const rank = index + 1;
                  const isRank10 = rank === 10;
                  const analytics = computeQuestionAnalytics(q, item);

                  return (
                    <div
                      key={item.id}
                      ref={isRank10 ? question10Ref : undefined}
                      id={isRank10 ? "question-card-10" : undefined}
                      className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all duration-200 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* 排名徽章 */}
                          <span
                            className={`w-7 h-7 rounded-xl font-game font-black text-xs flex items-center justify-center shrink-0 border ${
                              rank === 1
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                : rank === 2
                                ? "bg-slate-300/20 text-slate-200 border-slate-300/40"
                                : rank === 3
                                ? "bg-amber-700/20 text-amber-200 border-amber-700/40"
                                : "bg-white/[0.05] text-foreground-muted border-white/[0.08]"
                            }`}
                          >
                            #{rank}
                          </span>

                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold font-game px-2 py-0.5 rounded-full border ${
                                  q.type === "SINGLE"
                                    ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                    : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                }`}
                              >
                                {q.type === "SINGLE" ? "單選題" : "複選題"}
                              </span>
                              {q.category && (
                                <span className="text-[10px] font-medium text-foreground-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                                  {q.category}
                                </span>
                              )}

                              {analytics.hasData ? (
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  {analytics.headerText}
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-foreground-muted bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                                  {analytics.headerText}
                                </span>
                              )}

                              <span className="text-[11px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                做錯 {item.wrongCount} 次
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                              {q.stem}
                            </p>
                          </div>
                        </div>

                        {/* 動作按鈕 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onQuickPractice && (
                            <button
                              type="button"
                              onClick={() => onQuickPractice(q)}
                              title="立即重測本題"
                              className="min-h-[44px] px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-[#9AA5FF] border border-accent/30 text-xs font-bold font-game transition-all flex items-center gap-1 touch-tactile"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">單題重測</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExplanation(q.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors touch-tactile"
                            aria-label={isExpanded ? "收合選項與詳解" : "展開選項與詳解"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="flex flex-col gap-2 pt-2">
                        {analytics.options.map((opt) => (
                          <div
                            key={opt.key}
                            className={`flex items-start sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                              opt.isCorrect
                                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                                : "bg-white/[0.02] border-white/[0.05] text-foreground"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-game font-bold flex items-center justify-center shrink-0 ${
                                  opt.isCorrect
                                    ? "bg-emerald-500 text-slate-950 font-black"
                                    : "bg-white/[0.06] text-foreground-muted border border-white/[0.08]"
                                }`}
                              >
                                {opt.key}
                              </span>
                              <span className="flex-1 min-w-0 break-words whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                                {opt.text}
                              </span>
                            </div>

                            <div className="shrink-0 ml-auto flex items-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border shrink-0 ${
                                  opt.isCorrect
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                }`}
                              >
                                {opt.isCorrect && (
                                  <span className="font-bold font-game text-[11px] text-emerald-300">
                                    ✓ 正解
                                  </span>
                                )}
                                <span
                                  className={
                                    opt.isHighest
                                      ? "font-black font-bold text-white text-sm"
                                      : "font-medium"
                                  }
                                >
                                  {opt.percentText}
                                </span>
                                <span className="text-[10px] opacity-75">
                                  ({opt.count}次)
                                </span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 展開之詳解 (Callsite 1) */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-white/[0.06] space-y-2.5 animate-fade-in text-xs">
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                            <div className="font-bold font-game flex items-center gap-1.5">
                              <span>標準解答：</span>
                              <span className="text-white bg-emerald-600 px-2 py-0.5 rounded font-mono font-black">
                                {q.correctAnswers}
                              </span>
                              {item.lastUserAnswer && (
                                <span className="ml-2 text-rose-300 text-[11px] font-normal">
                                  (您上次作答：{item.lastUserAnswer})
                                </span>
                              )}
                            </div>
                            {q.explanation && (
                              <ExplanationCard
                                explanation={q.explanation}
                                correctAnswers={q.correctAnswers}
                                userAnswer={item.lastUserAnswer || undefined}
                                options={{
                                  A: q.optionA,
                                  B: q.optionB,
                                  C: q.optionC,
                                  D: q.optionD,
                                }}
                                questionType={q.type}
                                className="mt-2.5"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* In-Place Expansion Trigger or Expanded Section */}
              {personalTotal > 10 && (
                !isExpandedBeyond10 ? (
                  <div className="pt-3 text-center">
                    <button
                      type="button"
                      onClick={handleExpandBeyond10}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-xs font-bold font-game text-[#9AA5FF] hover:text-white transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95 touch-tactile shadow-md"
                    >
                      <span>查看排行榜以外的更多錯題 (共 {personalTotal} 題) ↓</span>
                    </button>
                  </div>
                ) : (
                  renderExpandedSection()
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 全站高頻錯題排行 */}
      {activeTab === "global" && (
        <div className="space-y-4">
          {globalQuestions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
              <p className="text-xs text-foreground-muted">
                全站尚無累積錯題統計，歡迎開始進行 50 題模擬考或自測練習！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
                <span>
                  全站共 <strong className="text-foreground">{globalTotal}</strong> 道題目曾被答錯，展示高頻陷阱題前 10 名：
                </span>
                {globalTotal > 10 && (
                  <button
                    type="button"
                    onClick={handleExpandBeyond10}
                    className="text-[#9AA5FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>查看排行榜以外的更多錯題 ({globalTotal} 題)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {globalQuestions.slice(0, 10).map((q, index) => {
                  const isExpanded = !!expandedIds[q.id];
                  const rank = index + 1;
                  const isRank10 = rank === 10;
                  const analytics = computeQuestionAnalytics(q);

                  return (
                    <div
                      key={q.id}
                      ref={isRank10 ? question10Ref : undefined}
                      id={isRank10 ? "question-card-10" : undefined}
                      className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all duration-200 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* 排名徽章 */}
                          <span
                            className={`w-7 h-7 rounded-xl font-game font-black text-xs flex items-center justify-center shrink-0 border ${
                              rank === 1
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                : rank === 2
                                ? "bg-slate-300/20 text-slate-200 border-slate-300/40"
                                : rank === 3
                                ? "bg-amber-700/20 text-amber-200 border-amber-700/40"
                                : "bg-white/[0.05] text-foreground-muted border-white/[0.08]"
                            }`}
                          >
                            #{rank}
                          </span>

                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold font-game px-2 py-0.5 rounded-full border ${
                                  q.type === "SINGLE"
                                    ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                    : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                }`}
                              >
                                {q.type === "SINGLE" ? "單選題" : "複選題"}
                              </span>
                              {q.category && (
                                <span className="text-[10px] font-medium text-foreground-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                                  {q.category}
                                </span>
                              )}

                              {analytics.hasData ? (
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  {analytics.headerText}
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-foreground-muted bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                                  {analytics.headerText}
                                </span>
                              )}

                              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                全站累積錯題 {q.wrongCount || 1} 次
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                              {q.stem}
                            </p>
                          </div>
                        </div>

                        {/* 動作按鈕 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onQuickPractice && (
                            <button
                              type="button"
                              onClick={() => onQuickPractice(q)}
                              title="立即重測本題"
                              className="min-h-[44px] px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-[#9AA5FF] border border-accent/30 text-xs font-bold font-game transition-all flex items-center gap-1 touch-tactile"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">單題重測</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExplanation(q.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors touch-tactile"
                            aria-label={isExpanded ? "收合選項與詳解" : "展開選項與詳解"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="flex flex-col gap-2 pt-2">
                        {analytics.options.map((opt) => (
                          <div
                            key={opt.key}
                            className={`flex items-start sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                              opt.isCorrect
                                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                                : "bg-white/[0.02] border-white/[0.05] text-foreground"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-game font-bold flex items-center justify-center shrink-0 ${
                                  opt.isCorrect
                                    ? "bg-emerald-500 text-slate-950 font-black"
                                    : "bg-white/[0.06] text-foreground-muted border border-white/[0.08]"
                                }`}
                              >
                                {opt.key}
                              </span>
                              <span className="flex-1 min-w-0 break-words whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                                {opt.text}
                              </span>
                            </div>

                            <div className="shrink-0 ml-auto flex items-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border shrink-0 ${
                                  opt.isCorrect
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                }`}
                              >
                                {opt.isCorrect && (
                                  <span className="font-bold font-game text-[11px] text-emerald-300">
                                    ✓ 正解
                                  </span>
                                )}
                                <span
                                  className={
                                    opt.isHighest
                                      ? "font-black font-bold text-white text-sm"
                                      : "font-medium"
                                  }
                                >
                                  {opt.percentText}
                                </span>
                                <span className="text-[10px] opacity-75">
                                  ({opt.count}次)
                                </span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 展開之詳解 (Callsite 2) */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-white/[0.06] space-y-2.5 animate-fade-in text-xs">
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                            <div className="font-bold font-game flex items-center gap-1.5">
                              <span>標準解答：</span>
                              <span className="text-white bg-emerald-600 px-2 py-0.5 rounded font-mono font-black">
                                {q.correctAnswers}
                              </span>
                            </div>
                            {q.explanation && (
                              <ExplanationCard
                                explanation={q.explanation}
                                correctAnswers={q.correctAnswers}
                                options={{
                                  A: q.optionA,
                                  B: q.optionB,
                                  C: q.optionC,
                                  D: q.optionD,
                                }}
                                questionType={q.type}
                                className="mt-2.5"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* In-Place Expansion Trigger or Expanded Section */}
              {globalTotal > 10 && (
                !isExpandedBeyond10 ? (
                  <div className="pt-3 text-center">
                    <button
                      type="button"
                      onClick={handleExpandBeyond10}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-xs font-bold font-game text-[#9AA5FF] hover:text-white transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95 touch-tactile shadow-md"
                    >
                      <span>查看排行榜以外的更多錯題 (共 {globalTotal} 題) ↓</span>
                    </button>
                  </div>
                ) : (
                  renderExpandedSection()
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
