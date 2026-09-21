"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flame,
  UserCheck,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  ExternalLink,
  X,
  AlertCircle,
  BookOpen,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Question } from "@/types/question";

interface WrongRecord {
  id: string;
  userId?: string;
  questionId: string;
  wrongCount: number;
  lastUserAnswer?: string | null;
  updatedAt: string;
  question: Question;
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

  // "看更多錯題" Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRecords, setModalRecords] = useState<any[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [isModalLoading, setIsModalLoading] = useState(false);

  const fetchTopRankings = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        const res = await fetch("/api/wrong-questions?mode=personal&limit=10");
        if (res.ok) {
          const data = await res.json();
          setPersonalRecords(data.records || []);
          setPersonalTotal(data.totalCount || 0);
        }
      }

      // Fetch global
      const globalRes = await fetch("/api/wrong-questions?mode=global&limit=10");
      if (globalRes.ok) {
        const data = await globalRes.json();
        setGlobalQuestions(data.questions || []);
        setGlobalTotal(data.totalCount || 0);
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

  // Open "看更多" modal
  const handleOpenMoreModal = async () => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalSearchQuery("");
    try {
      const mode = activeTab === "personal" && user ? "personal" : "global";
      const res = await fetch(`/api/wrong-questions?mode=${mode}&limit=all`);
      if (res.ok) {
        const data = await res.json();
        if (mode === "personal") {
          setModalRecords(data.records || []);
        } else {
          setModalRecords(data.questions || []);
        }
      }
    } catch (err) {
      console.error("載入完整錯題清單失敗:", err);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Filter modal items by search query
  const filteredModalItems = useMemo(() => {
    if (!modalSearchQuery.trim()) return modalRecords;
    const q = modalSearchQuery.toLowerCase();
    return modalRecords.filter((item) => {
      const targetQ = activeTab === "personal" ? item.question : item;
      return (
        targetQ?.stem?.toLowerCase().includes(q) ||
        targetQ?.category?.toLowerCase().includes(q) ||
        targetQ?.explanation?.toLowerCase().includes(q)
      );
    });
  }, [modalRecords, modalSearchQuery, activeTab]);

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
            onClick={() => setActiveTab("personal")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-game transition-all duration-200 ${
              activeTab === "personal"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>個人專屬錯題本</span>
            {user && personalTotal > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {personalTotal}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("global")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-game transition-all duration-200 ${
              activeTab === "global"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>全站高頻錯題排行</span>
            {globalTotal > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {globalTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: 個人專屬錯題本 */}
      {activeTab === "personal" && (
        <div className="space-y-4">
          {!user ? (
            /* 未登入引導卡片 */
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.08] text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-[#9AA5FF] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(94,106,210,0.3)]">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold font-game text-foreground">
                  登入即可啟用個人專屬錯題本
                </h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  註冊並登入後，您在即時刷題與 50 題模擬考中答錯的每一道題目，系統都會自動統計錯題頻率並列入個人弱點排行榜，方便隨時複習。
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow transition-all duration-200 active:scale-95"
              >
                <span>立即登入 / 註冊 帳號</span>
              </button>
            </div>
          ) : personalRecords.length === 0 ? (
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
                    onClick={handleOpenMoreModal}
                    className="text-[#9AA5FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>看更多錯題 ({personalTotal} 題)</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {personalRecords.map((item, index) => {
                  const q = item.question;
                  const isExpanded = !!expandedIds[q.id];
                  const rank = index + 1;

                  return (
                    <div
                      key={item.id}
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
                              className="px-2.5 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-[#9AA5FF] border border-accent/30 text-xs font-bold font-game transition-all flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="hidden sm:inline">單題重測</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExplanation(q.id)}
                            className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
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

                      {/* 展開之選項與詳解 */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-white/[0.06] space-y-2.5 animate-fade-in text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground-muted">
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">A.</span>
                              {q.optionA}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">B.</span>
                              {q.optionB}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">C.</span>
                              {q.optionC}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">D.</span>
                              {q.optionD}
                            </div>
                          </div>

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
                              <p className="text-[11px] text-emerald-300/80 leading-relaxed pt-1 border-t border-emerald-500/20 break-words whitespace-pre-wrap">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {personalTotal > 10 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleOpenMoreModal}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-xs font-bold font-game text-[#9AA5FF] transition-all"
                  >
                    看更多錯題（共 {personalTotal} 題完整排行）
                  </button>
                </div>
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
                    onClick={handleOpenMoreModal}
                    className="text-[#9AA5FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>看更多錯題 ({globalTotal} 題)</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {globalQuestions.map((q, index) => {
                  const isExpanded = !!expandedIds[q.id];
                  const rank = index + 1;

                  return (
                    <div
                      key={q.id}
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
                              className="px-2.5 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-[#9AA5FF] border border-accent/30 text-xs font-bold font-game transition-all flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="hidden sm:inline">單題重測</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExplanation(q.id)}
                            className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
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

                      {/* 展開之選項與詳解 */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-white/[0.06] space-y-2.5 animate-fade-in text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground-muted">
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">A.</span>
                              {q.optionA}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">B.</span>
                              {q.optionB}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">C.</span>
                              {q.optionC}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="font-bold text-foreground mr-1.5">D.</span>
                              {q.optionD}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                            <div className="font-bold font-game flex items-center gap-1.5">
                              <span>標準解答：</span>
                              <span className="text-white bg-emerald-600 px-2 py-0.5 rounded font-mono font-black">
                                {q.correctAnswers}
                              </span>
                            </div>
                            {q.explanation && (
                              <p className="text-[11px] text-emerald-300/80 leading-relaxed pt-1 border-t border-emerald-500/20 break-words whitespace-pre-wrap">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {globalTotal > 10 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleOpenMoreModal}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-xs font-bold font-game text-[#9AA5FF] transition-all"
                  >
                    看更多錯題（共 {globalTotal} 題完整排行）
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 看更多錯題 Modal 彈窗 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0c0c10]/95 border border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-scale-in text-foreground flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold font-game text-foreground">
                  {activeTab === "personal"
                    ? "個人專屬錯題本 · 全部錯題排行"
                    : "全站高頻錯題 · 全部排行清單"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.08] transition-colors"
                aria-label="關閉"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="py-4 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="搜尋錯題題幹關鍵字、分類或考點..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.10] text-sm text-foreground placeholder-white/30 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isModalLoading ? (
                <div className="py-12 text-center text-xs text-foreground-muted">
                  載入錯題排行榜中...
                </div>
              ) : filteredModalItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-foreground-muted">
                  無符合條件的錯題
                </div>
              ) : (
                filteredModalItems.map((item, idx) => {
                  const q: Question = activeTab === "personal" ? item.question : item;
                  const wrongCount = activeTab === "personal" ? item.wrongCount : q.wrongCount || 1;
                  const isExpanded = !!expandedIds[q.id];

                  return (
                    <div
                      key={item.id || q.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.08] font-game font-bold text-xs flex items-center justify-center shrink-0 text-foreground-muted">
                            #{idx + 1}
                          </span>
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold font-game px-2 py-0.5 rounded-full bg-accent/15 text-[#9AA5FF] border border-accent/30">
                                {q.type === "SINGLE" ? "單選題" : "複選題"}
                              </span>
                              {q.category && (
                                <span className="text-[10px] text-foreground-muted bg-white/[0.04] px-2 py-0.5 rounded-full">
                                  {q.category}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                做錯 {wrongCount} 次
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                              {q.stem}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExplanation(q.id)}
                          className="p-1 rounded-lg text-foreground-muted hover:text-foreground shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-foreground-muted text-[11px]">
                            <div className="p-2 rounded-lg bg-white/[0.02]">
                              <span className="font-bold text-foreground mr-1">A.</span> {q.optionA}
                            </div>
                            <div className="p-2 rounded-lg bg-white/[0.02]">
                              <span className="font-bold text-foreground mr-1">B.</span> {q.optionB}
                            </div>
                            <div className="p-2 rounded-lg bg-white/[0.02]">
                              <span className="font-bold text-foreground mr-1">C.</span> {q.optionC}
                            </div>
                            <div className="p-2 rounded-lg bg-white/[0.02]">
                              <span className="font-bold text-foreground mr-1">D.</span> {q.optionD}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
                            <span className="font-bold mr-1">標準解答：</span>
                            <span className="font-mono font-black">{q.correctAnswers}</span>
                            {q.explanation && (
                              <p className="text-[11px] text-emerald-300/80 mt-1 pt-1 border-t border-emerald-500/20 break-words whitespace-pre-wrap">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/[0.08] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-xs font-semibold text-foreground transition-all"
              >
                關閉清單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
