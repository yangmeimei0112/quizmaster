"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  Flame,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { Question } from "@/types/question";
import { useAuth } from "@/lib/AuthContext";
import ExamWrongReportModal from "./ExamWrongReportModal";

interface MockExamViewProps {
  questions: Question[]; // 50 questions
  onExit: () => void;
  onRestart: () => void;
}

export default function MockExamView({
  questions,
  onExit,
  onRestart,
}: MockExamViewProps) {
  const { user } = useAuth();

  // 60 分鐘倒數計時（3600 秒）
  const TOTAL_TIME_SECONDS = 60 * 60;
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_SECONDS);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 每題使用者的作答紀錄：questionId -> string[]
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const userAnswersRef = useRef<Record<string, string[]>>(userAnswers);
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // 測驗狀態
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showWrongReportModal, setShowWrongReportModal] = useState(false);
  const [completedAt, setCompletedAt] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // 狀態防禦 Refs (防 stale closure 與防重複交卷)
  const isSubmittedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const endTimeRef = useRef<number>(Date.now() + TOTAL_TIME_SECONDS * 1000);

  // 覆盤篩選狀態
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "WRONG" | "CORRECT">("ALL");

  // 提交交卷 (以 userAnswersRef 為準，徹底根除計時超時自動交卷的 stale closure 缺陷)
  const executeSubmission = useCallback(async () => {
    if (isSubmittedRef.current || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    isSubmittedRef.current = true;
    setIsSubmitted(true);
    setShowSubmitModal(false);

    const now = Date.now();
    setCompletedAt(new Date(now).toLocaleString("zh-TW", { hour12: false }));
    const finalElapsed = Math.min(
      TOTAL_TIME_SECONDS,
      Math.max(1, Math.floor((now - startTimeRef.current) / 1000))
    );
    setElapsedSeconds(finalElapsed);

    const currentAnswers = userAnswersRef.current;
    // 收集所有做錯的題目
    const wrongItems: Array<{ questionId: string; userAnswer?: string }> = [];

    questions.forEach((q) => {
      const userAns = (currentAnswers[q.id] || []).sort().join(",");
      const correctAns = q.correctAnswers.split(",").sort().join(",");
      if (userAns !== correctAns) {
        wrongItems.push({
          questionId: q.id,
          userAnswer: userAns || "未填答",
        });
      }
    });

    // 自動同步錯題至後端 API
    if (wrongItems.length > 0) {
      try {
        const res = await fetch("/api/wrong-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: wrongItems }),
        });
        if (res.ok) {
          const data = await res.json();
          setSyncStatus(
            data.savedToPersonal
              ? `已將 ${wrongItems.length} 道錯題自動同步至您的個人錯題本！`
              : `已記錄 ${wrongItems.length} 道錯題至全站統計（登入後可同步至個人錯題本）`
          );
        }
      } catch (err) {
        console.error("同步錯題失敗:", err);
      }
    }
  }, [questions, TOTAL_TIME_SECONDS]);

  // 高精度真實時間戳計時器 (防背景分頁節流與作業系統睡眠漂移)
  useEffect(() => {
    if (isSubmitted) return;

    const checkTimer = () => {
      if (isSubmittedRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      const elapsed = Math.min(
        TOTAL_TIME_SECONDS,
        Math.floor((now - startTimeRef.current) / 1000)
      );

      setTimeRemaining(remaining);
      setElapsedSeconds(elapsed);

      if (remaining <= 0) {
        executeSubmission();
      }
    };

    checkTimer();
    const timer = setInterval(checkTimer, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSubmitted, executeSubmission, TOTAL_TIME_SECONDS]);

  // 當前題目
  const currentQ = questions[currentIndex];

  // 選項對應
  const currentOptions = useMemo(() => {
    if (!currentQ) return [];
    return [
      { key: "A", text: currentQ.optionA },
      { key: "B", text: currentQ.optionB },
      { key: "C", text: currentQ.optionC },
      { key: "D", text: currentQ.optionD },
    ];
  }, [currentQ]);

  // 選取選項
  const handleSelectOption = useCallback(
    (key: string) => {
      if (isSubmitted || !currentQ) return;

      setUserAnswers((prev) => {
        const existing = prev[currentQ.id] || [];
        if (currentQ.type === "SINGLE") {
          return { ...prev, [currentQ.id]: [key] };
        } else {
          // 複選題
          const next = existing.includes(key)
            ? existing.filter((k) => k !== key)
            : [...existing, key].sort();
          return { ...prev, [currentQ.id]: next };
        }
      });
    },
    [isSubmitted, currentQ]
  );

  // 計算已填答題數
  const answeredCount = useMemo(() => {
    return questions.filter((q) => (userAnswers[q.id] || []).length > 0).length;
  }, [questions, userAnswers]);

  const unansweredCount = questions.length - answeredCount;

  // 鍵盤快捷鍵：A/B/C/D 與 1/2/3/4 選取選項，左右箭頭切換題目
  useEffect(() => {
    if (isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping) return;

      // 若交卷防呆彈窗開啟中，只監聽 Escape 關閉，避免背後誤按選題或跳題
      if (showSubmitModal) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSubmitModal(false);
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const numMap: Record<string, string> = {
          "1": "A",
          "2": "B",
          "3": "C",
          "4": "D",
        };
        const keyUpper = e.key.toUpperCase();
        const resolvedKey = numMap[e.key] || keyUpper;

        if (["A", "B", "C", "D"].includes(resolvedKey)) {
          e.preventDefault();
          handleSelectOption(resolvedKey);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setCurrentIndex((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitted, showSubmitModal, questions.length, handleSelectOption]);

  // 時間格式化 MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // 結算計算：每題 2 分，總計 100 分，70 分以上合格
  const scoreResults = useMemo(() => {
    let correctCount = 0;
    let wrongCount = 0;
    let unanswered = 0;

    questions.forEach((q) => {
      const userAns = (userAnswers[q.id] || []).sort().join(",");
      const correctAns = q.correctAnswers.split(",").sort().join(",");

      if (!userAns) {
        unanswered++;
      } else if (userAns === correctAns) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const totalScore = correctCount * 2; // 每題 2 分
    const isPassed = totalScore >= 70; // 70 分合格

    return {
      totalScore,
      isPassed,
      correctCount,
      wrongCount,
      unanswered,
    };
  }, [questions, userAnswers]);

  // 覆盤過濾題目清單
  const filteredReviewQuestions = useMemo(() => {
    if (!isSubmitted) return [];
    return questions.filter((q) => {
      const userAns = (userAnswers[q.id] || []).sort().join(",");
      const correctAns = q.correctAnswers.split(",").sort().join(",");
      const isCorrect = userAns === correctAns;

      if (reviewFilter === "WRONG") return !isCorrect;
      if (reviewFilter === "CORRECT") return isCorrect;
      return true;
    });
  }, [isSubmitted, questions, userAnswers, reviewFilter]);

  // ==================== 測驗進行中畫面 ====================
  if (!isSubmitted && currentQ) {
    const currentSelected = userAnswers[currentQ.id] || [];
    const isTimeUrgent = timeRemaining < 300; // 低於 5 分鐘警示

    return (
      <div className="space-y-6 animate-fade-in">
        {/* 頂部控制與狀態列 */}
        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-4 sm:p-6 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
              title="離開考試回到大廳"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-game text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" />
                60分鐘模擬考試
              </h1>
              <p className="text-xs text-foreground-muted hidden sm:block">
                單複選混合共 50 題 · 每題 2 分 · 滿分 100 分 · 70 分及格
              </p>
            </div>
          </div>

          {/* 右上方倒數計時器與交卷按鈕 */}
          <div className="flex items-center gap-3">
            {/* 60:00 倒數計時器 */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-sm sm:text-base transition-colors ${
                isTimeUrgent
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse"
                  : "bg-white/[0.05] text-foreground border-white/[0.10]"
              }`}
            >
              <Clock
                className={`w-4 h-4 ${isTimeUrgent ? "text-rose-400" : "text-accent"}`}
              />
              <span>{formatTime(timeRemaining)}</span>
              {isTimeUrgent && (
                <span className="text-[10px] font-sans font-bold text-rose-400 hidden sm:inline">
                  (即將截止)
                </span>
              )}
            </div>

            {/* 提前交卷按鈕 */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow transition-all duration-200 flex items-center gap-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>交卷結算</span>
            </button>
          </div>
        </div>

        {/* 50 題答題卡切換矩陣 (Answer Sheet Matrix) */}
        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-4 sm:p-6 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold font-game text-foreground flex items-center gap-1.5">
              <span>50 題答題卡矩陣</span>
              <span className="text-foreground-muted font-normal">
                (點擊題號可自由跳轉題號)
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5E6AD2]" />
                已填答：{answeredCount}
              </span>
              <span className="flex items-center gap-1.5 text-foreground-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                未填答：{unansweredCount}
              </span>
            </div>
          </div>

          {/* 1 ~ 50 矩陣按鈕 */}
          <div className="grid grid-cols-10 sm:grid-cols-25 gap-1.5 sm:gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = (userAnswers[q.id] || []).length > 0;

              let btnStyle =
                "bg-white/[0.03] text-foreground-muted border-white/[0.06] hover:bg-white/[0.08]";

              if (isCurrent) {
                btnStyle =
                  "bg-accent text-white border-accent shadow-glow ring-2 ring-white/40 font-black scale-105";
              } else if (isAnswered) {
                btnStyle =
                  "bg-[#5E6AD2]/30 text-[#C5CCFF] border-[#5E6AD2]/50 font-bold";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-8 sm:h-9 rounded-xl border text-xs font-mono font-medium flex items-center justify-center transition-all duration-150 touch-manipulation active:scale-95 ${btnStyle}`}
                  title={`第 ${idx + 1} 題 (${isAnswered ? "已填答" : "未填答"})`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* 作答主卡片 */}
        <div className="bg-[#0a0a0c]/95 rounded-3xl border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-xl relative overflow-hidden">
          {/* 題號與題型狀態標籤 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="font-bold font-game text-[#9AA5FF] bg-accent/15 px-3 py-1 rounded-full border border-accent/30 text-xs shadow-sm">
                第 {currentIndex + 1} / {questions.length} 題
              </span>
              <span
                className={`font-game font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${
                  currentQ.type === "SINGLE"
                    ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                    : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                }`}
              >
                {currentQ.type === "SINGLE" ? "單選題 (2分)" : "複選題 (2分)"}
              </span>
              {currentQ.category && (
                <span className="text-[10px] text-foreground-muted bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                  {currentQ.category}
                </span>
              )}
            </div>

            <div className="text-xs text-foreground-muted hidden sm:flex items-center gap-1.5">
              <span>鍵盤選取：</span>
              <span className="font-mono text-[#9AA5FF] font-bold">A / B / C / D</span>
              <span>· 切換：</span>
              <span className="font-mono text-[#9AA5FF] font-bold">← / →</span>
            </div>
          </div>

          {/* 題幹內容 */}
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold font-game text-foreground leading-relaxed break-words whitespace-pre-wrap">
              {currentQ.stem}
            </h2>
            <p className="text-xs text-foreground-muted">
              {currentQ.type === "SINGLE"
                ? "請點選一個正確選項："
                : "本題為複選題，請點選一個或多個選項："}
            </p>
          </div>

          {/* 選項卡片列表 */}
          <div className="grid gap-3">
            {currentOptions.map((opt) => {
              const isSelected = currentSelected.includes(opt.key);

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectOption(opt.key)}
                  className={`p-4 min-h-[52px] rounded-2xl border text-left text-xs sm:text-sm flex items-center justify-between gap-3.5 transition-all duration-200 ease-expo-out touch-manipulation touch-tactile ${
                    isSelected
                      ? "border-accent bg-accent/20 text-white shadow-glow ring-1 ring-accent"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05] text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl border font-bold text-xs flex items-center justify-center flex-shrink-0 font-game transition-colors ${
                        isSelected
                          ? "bg-accent text-white font-bold shadow-[0_0_12px_rgba(94,106,210,0.5)] border-white/40"
                          : "bg-white/[0.05] border-white/[0.08] text-foreground-muted"
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="leading-snug min-w-0 break-words whitespace-pre-wrap">
                      {opt.text}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="font-game text-[11px] font-bold text-[#9AA5FF] bg-accent/25 border border-accent/40 px-2.5 py-0.5 rounded-lg flex-shrink-0 shadow-sm animate-fade-in">
                      ✓ 已選取
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 底部上一題 / 下一題控制導覽列 */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-xs sm:text-sm font-semibold text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一題</span>
            </button>

            {/* 清空本作答 */}
            {currentSelected.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setUserAnswers((prev) => {
                    const next = { ...prev };
                    delete next[currentQ.id];
                    return next;
                  })
                }
                className="text-xs text-foreground-muted hover:text-rose-400 transition-colors"
              >
                清除本作答
              </button>
            )}

            {currentIndex + 1 < questions.length ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow flex items-center gap-1.5 transition-all"
              >
                <span>下一題</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold font-game shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-1.5 transition-all"
              >
                <span>前往交卷</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 提前交卷防呆確認彈窗 */}
        {showSubmitModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSubmitModal(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md bg-[#0c0c10]/95 border border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-center space-y-5 animate-scale-in text-foreground">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                  unansweredCount > 0
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                }`}
              >
                {unansweredCount > 0 ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold font-game text-foreground">
                  {unansweredCount > 0 ? "確定要提前交卷嗎？" : "確定要完成交卷嗎？"}
                </h3>
                {unansweredCount > 0 ? (
                  <p className="text-xs text-rose-300 font-medium leading-relaxed bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                    您尚有 <strong className="text-rose-400 text-sm font-bold">{unansweredCount}</strong> 題未填答！
                    <br />
                    未填答題目將視同 0 分計算。
                  </p>
                ) : (
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    您已完整填答全部 50 道題目！交卷後將立刻結算成績與產出完整對錯詳解。
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="min-h-[44px] py-2.5 rounded-xl border border-white/[0.10] text-xs sm:text-sm font-semibold text-foreground hover:bg-white/[0.05] transition-colors"
                >
                  繼續作答
                </button>
                <button
                  type="button"
                  onClick={executeSubmission}
                  className="min-h-[44px] py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow transition-all"
                >
                  {unansweredCount > 0 ? "確認提前交卷" : "確認交卷結算"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 考後結算與覆盤畫面 ====================
  const { totalScore, isPassed, correctCount, wrongCount, unanswered } = scoreResults;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* 結算大卡片 */}
      <div className="bg-[#0a0a0c]/95 rounded-3xl border border-white/[0.08] shadow-2xl p-6 sm:p-10 text-center space-y-6 backdrop-blur-xl relative overflow-hidden">
        {/* 背景氛圍光 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-72 h-72 rounded-full blur-3xl opacity-20 ${
              isPassed ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
        </div>

        {/* 獎章 / 狀態圖示 */}
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border shadow-2xl relative z-10 ${
            isPassed
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)]"
              : "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.35)]"
          }`}
        >
          {isPassed ? <Award className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
        </div>

        {/* 標題與合格判定 */}
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-game border">
            {isPassed ? (
              <span className="text-emerald-300 bg-emerald-500/10 border-emerald-500/30">
                🎉 本次測驗：合格通過 (PASS)
              </span>
            ) : (
              <span className="text-rose-300 bg-rose-500/10 border-rose-500/30">
                ⚠️ 本次測驗：未達合格標準 (FAIL)
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-game text-foreground">
            {isPassed ? "恭喜您通過 50 題模擬考！" : "模擬考試結束，再接再厲！"}
          </h2>
          <p className="text-xs text-foreground-muted max-w-md mx-auto">
            {isPassed
              ? "您的成績已達到 70 分合格門檻，展現出紮實的考點掌握度！"
              : "合格門檻為 70 分，建議詳細覆盤下方錯題並強化高頻考點。"}
          </p>
        </div>

        {/* 分數與統計板 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto relative z-10">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <div className="text-[11px] text-foreground-muted font-semibold">本次總分</div>
            <div
              className={`text-3xl sm:text-4xl font-black font-game ${
                isPassed ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {totalScore}
              <span className="text-xs font-normal text-foreground-muted ml-1">/ 100</span>
            </div>
            <div className="text-[10px] text-foreground-muted">70 分合格</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <div className="text-[11px] text-foreground-muted font-semibold">答對題數</div>
            <div className="text-3xl sm:text-4xl font-black font-game text-emerald-400">
              {correctCount}
              <span className="text-xs font-normal text-foreground-muted ml-1">/ 50</span>
            </div>
            <div className="text-[10px] text-emerald-400/80">獲得 {correctCount * 2} 分</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <div className="text-[11px] text-foreground-muted font-semibold">答錯 / 未答</div>
            <div className="text-3xl sm:text-4xl font-black font-game text-rose-400">
              {wrongCount}
              <span className="text-xs font-normal text-foreground-muted ml-1">題</span>
            </div>
            <div className="text-[10px] text-rose-400/80">未填答 {unanswered} 題</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <div className="text-[11px] text-foreground-muted font-semibold">考試耗時</div>
            <div className="text-2xl sm:text-3xl font-black font-game text-cyan-300">
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-[10px] text-foreground-muted">限時 60:00</div>
          </div>
        </div>

        {/* 錯題同步通知提示 */}
        {syncStatus && (
          <div className="max-w-md mx-auto p-3 rounded-xl bg-accent/15 border border-accent/30 text-xs text-indigo-200 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 relative z-10">
          <button
            type="button"
            onClick={() => setShowWrongReportModal(true)}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold font-game shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all flex items-center gap-2 active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>印出錯題報告 (Google文件)</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新隨機抽題 50 題</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[46px] px-6 py-2.5 rounded-xl border border-white/[0.10] text-foreground text-xs sm:text-sm font-semibold hover:bg-white/[0.05] transition-colors"
          >
            返回刷題大廳
          </button>
        </div>
      </div>

      {/* 50 題完整解析對錯覆盤清單 */}
      <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-6 sm:p-8 space-y-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-lg font-bold font-game text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              50 題完整試卷覆盤與詳解
            </h3>
            <p className="text-xs text-foreground-muted">
              深入檢視每一道題目的標準解答、您的回答與考點剖析。
            </p>
          </div>

          {/* 篩選切換標籤 */}
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setReviewFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-game transition-all ${
                reviewFilter === "ALL"
                  ? "bg-accent text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              全部 (50)
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter("WRONG")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-game transition-all ${
                reviewFilter === "WRONG"
                  ? "bg-rose-500 text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              答錯 / 未答 ({wrongCount})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter("CORRECT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-game transition-all ${
                reviewFilter === "CORRECT"
                  ? "bg-emerald-600 text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              答對 ({correctCount})
            </button>
          </div>
        </div>

        {/* 題目詳細清單 */}
        <div className="space-y-4">
          {filteredReviewQuestions.map((q) => {
            const originalIndex = questions.findIndex((item) => item.id === q.id);
            const userAnsList = (userAnswers[q.id] || []).sort();
            const userAnsStr = userAnsList.join(",");
            const correctAnsStr = q.correctAnswers.split(",").sort().join(",");
            const isCorrect = userAnsStr === correctAnsStr;
            const isUnanswered = userAnsList.length === 0;

            const opts = [
              { key: "A", text: q.optionA },
              { key: "B", text: q.optionB },
              { key: "C", text: q.optionC },
              { key: "D", text: q.optionD },
            ];

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition-all space-y-3.5 ${
                  isCorrect
                    ? "bg-emerald-950/15 border-emerald-500/25"
                    : "bg-rose-950/15 border-rose-500/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl font-game font-bold text-xs flex items-center justify-center shrink-0 border ${
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {originalIndex + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
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
                          <span className="text-[10px] text-foreground-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                            {q.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-relaxed break-words whitespace-pre-wrap">
                        {q.stem}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-game">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>答對 (+2分)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-game">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isUnanswered ? "未填答 (0分)" : "答錯 (0分)"}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 四個選項展示 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {opts.map((opt) => {
                    const isStandardCorrect = q.correctAnswers.split(",").includes(opt.key);
                    const isUserChosen = userAnsList.includes(opt.key);

                    let optStyle = "bg-white/[0.02] border-white/[0.05] text-foreground-muted";
                    if (isStandardCorrect) {
                      optStyle =
                        "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold";
                    } else if (isUserChosen && !isStandardCorrect) {
                      optStyle =
                        "bg-rose-500/15 border-rose-500/40 text-rose-200 line-through opacity-80";
                    }

                    return (
                      <div
                        key={opt.key}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${optStyle}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold">{opt.key}.</span>
                          <span className="truncate">{opt.text}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-[10px]">
                          {isStandardCorrect && (
                            <span className="text-emerald-400 font-bold">✓ 正解</span>
                          )}
                          {isUserChosen && !isStandardCorrect && (
                            <span className="text-rose-400 font-bold">✗ 您的選擇</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 詳解說明 */}
                {q.explanation && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-foreground-muted space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>題目詳解與考點：</span>
                    </div>
                    <p className="text-foreground-subtle leading-relaxed break-words whitespace-pre-wrap">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 錯題報告 (Google文件) 彈窗 */}
      <ExamWrongReportModal
        isOpen={showWrongReportModal}
        onClose={() => setShowWrongReportModal(false)}
        questions={questions}
        userAnswers={userAnswers}
        scoreResults={scoreResults}
        elapsedSeconds={elapsedSeconds}
        completedAt={completedAt}
      />
    </div>
  );
}
