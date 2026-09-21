"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Question } from "@/types/question";
import { getCachedQuestions, setCachedQuestions } from "@/lib/questionsCache";

export default function PracticePage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => getCachedQuestions() || []);
  const [quizQueue, setQuizQueue] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(() => !getCachedQuestions());

  // 測驗設定
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [quizStarted, setQuizStarted] = useState(false);

  // 測驗進行狀態
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // 載入題目
  useEffect(() => {
    async function loadQuestions() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/questions");
        if (res.ok) {
          const data = await res.json();
          const list = data.questions || [];
          setAllQuestions(list);
          setCachedQuestions(list);
        }
      } catch (err) {
        console.error("載入題庫失敗:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestions();
  }, []);

  // 依篩選過濾可用的題目
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (selectedType !== "ALL" && q.type !== selectedType) return false;
      return true;
    });
  }, [allQuestions, selectedType]);

  // 開始測驗
  const handleStartQuiz = useCallback(() => {
    if (filteredQuestions.length === 0) return;
    // 隨機打亂題目順序
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setQuizQueue(shuffled);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    setQuizStarted(true);
  }, [filteredQuestions]);

  const currentQ = quizQueue[currentIndex];

  // 當前題目的選項與正解集合
  const currentOptions = useMemo(() => {
    if (!currentQ) return [];
    return [
      { key: "A", text: currentQ.optionA },
      { key: "B", text: currentQ.optionB },
      { key: "C", text: currentQ.optionC },
      { key: "D", text: currentQ.optionD },
    ];
  }, [currentQ]);

  const currentCorrectSet = useMemo(() => {
    if (!currentQ) return new Set<string>();
    return new Set(currentQ.correctAnswers.split(","));
  }, [currentQ]);

  // 選取選項
  const handleSelectOption = useCallback((key: string) => {
    if (isAnswerSubmitted || !currentQ) return; // 已送出答案不可再改

    if (currentQ.type === "SINGLE") {
      setSelectedAnswers([key]);
    } else {
      setSelectedAnswers((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()
      );
    }
  }, [isAnswerSubmitted, currentQ]);

  // 提交作答
  const handleSubmitAnswer = useCallback(() => {
    if (selectedAnswers.length === 0 || !currentQ) return;

    const userAnsStr = [...selectedAnswers].sort().join(",");
    const correctAnsStr = currentQ.correctAnswers
      .split(",")
      .sort()
      .join(",");

    const isCorrect = userAnsStr === correctAnsStr;
    if (isCorrect) {
      setScore((s) => s + 1);
    }
    setIsAnswerSubmitted(true);
  }, [selectedAnswers, currentQ]);

  // 下一題
  const handleNextQuestion = useCallback(() => {
    if (currentIndex + 1 < quizQueue.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  }, [currentIndex, quizQueue.length]);

  // 重新測驗
  const handleRestart = useCallback(() => {
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setScore(0);
  }, []);

  // 鍵盤快捷鍵：自測刷題 A/B/C/D 選擇選項、Enter 送出作答或進入下一題
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略輸入法組字中
      if (e.isComposing) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable);

      if (isTyping) return;

      // 1. Enter 快捷鍵
      if (e.key === "Enter") {
        if (quizStarted && !quizCompleted) {
          if (!isAnswerSubmitted) {
            if (selectedAnswers.length > 0) {
              e.preventDefault();
              handleSubmitAnswer();
            }
          } else {
            e.preventDefault();
            handleNextQuestion();
          }
        } else if (!quizStarted && filteredQuestions.length > 0) {
          e.preventDefault();
          handleStartQuiz();
        } else if (quizCompleted) {
          e.preventDefault();
          handleRestart();
        }
        return;
      }

      // 2. A / B / C / D (及 1 / 2 / 3 / 4) 選擇選項
      if (quizStarted && !quizCompleted && !isAnswerSubmitted) {
        const keyUpper = e.key.toUpperCase();
        const numMap: Record<string, string> = {
          "1": "A",
          "2": "B",
          "3": "C",
          "4": "D",
        };
        const resolvedKey = numMap[e.key] || keyUpper;

        if (["A", "B", "C", "D"].includes(resolvedKey)) {
          e.preventDefault();
          handleSelectOption(resolvedKey);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    quizStarted,
    quizCompleted,
    isAnswerSubmitted,
    selectedAnswers.length,
    filteredQuestions.length,
    handleSelectOption,
    handleSubmitAnswer,
    handleNextQuestion,
    handleStartQuiz,
    handleRestart,
  ]);

  const totalQuestionsCount = quizStarted ? quizQueue.length : filteredQuestions.length;
  const progressPercent = totalQuestionsCount > 0
    ? Math.round(((currentIndex + (isAnswerSubmitted ? 1 : 0)) / totalQuestionsCount) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 頂部標題 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-game text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-accent" />
            個人自測刷題
          </h1>
        </div>

        {quizStarted && !quizCompleted && (
          <button
            type="button"
            onClick={handleRestart}
            className="min-h-[44px] text-xs sm:text-sm font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-200 ease-expo-out active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>結束測驗</span>
          </button>
        )}
      </div>

      {/* 1. 測驗準備與篩選設定 (尚未開始時 - Switch Game Lobby) */}
      {!quizStarted && (
        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-6 sm:p-8 space-y-6 backdrop-blur-md animate-fade-in-up">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-[#9AA5FF] text-[11px] font-bold font-game border border-accent/30 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>GAME LOBBY · 測驗設定大廳</span>
            </div>
            <h2 className="text-xl font-bold font-game text-foreground pt-1">
              選擇練習範圍與題型
            </h2>
            <p className="text-xs text-foreground-muted leading-relaxed">
              您可以針對特定單複選題型展開專項自測，或隨機打亂抽取全題庫進行綜合考評。
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <label className="font-bold font-game text-foreground">題型偏好：</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "ALL", label: "全部題型" },
                { key: "SINGLE", label: "僅單選題" },
                { key: "MULTIPLE", label: "僅複選題" },
              ].map((t) => {
                const isSelected = selectedType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedType(t.key)}
                    className={`min-h-[48px] p-3 rounded-2xl font-bold font-game border text-center flex items-center justify-center transition-all duration-200 ease-expo-out touch-manipulation active:scale-95 touch-tactile ${
                      isSelected
                        ? "bg-white/[0.10] text-foreground border-white/[0.18] shadow-[0_0_15px_rgba(94,106,210,0.25)] font-semibold"
                        : "bg-white/[0.03] text-foreground-muted border-white/[0.06] hover:bg-white/[0.06] hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 題目數量統計卡片 */}
          <div className="bg-accent/10 p-4 rounded-2xl border border-accent/25 flex items-center justify-between shadow-sm">
            <div className="text-xs flex items-center gap-2">
              <span className="text-foreground font-bold">符合條件的題庫數：</span>
              <span className="text-[#9AA5FF] font-extrabold text-lg font-game">
                {filteredQuestions.length}
              </span>
              <span className="text-foreground-muted">題</span>
            </div>
            {filteredQuestions.length === 0 && (
              <span className="text-xs text-rose-400 font-medium">
                此篩選條件下無題目，請調整篩選或先新增題目。
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartQuiz}
            disabled={filteredQuestions.length === 0}
            className={`w-full min-h-[48px] py-3.5 rounded-2xl font-bold font-game text-sm shadow-md transition-all duration-200 ease-expo-out flex items-center justify-center gap-2.5 touch-manipulation touch-tactile ${
              filteredQuestions.length > 0
                ? "bg-accent hover:bg-accent-bright text-white shadow-glow"
                : "bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed"
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span>開始隨機抽題測驗</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
              Enter
            </kbd>
          </button>
        </div>
      )}

      {/* 2. 測驗進行中 (Gamified Quiz Card) */}
      {quizStarted && !quizCompleted && currentQ && (
        <div
          key={`question-${currentQ.id || currentIndex}`}
          className="bg-[#0a0a0c]/95 rounded-3xl border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-xl relative overflow-hidden animate-fade-in-up"
        >
          {/* Glowing Top Progress Bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent via-[#8B5CF6] to-cyan-400 transition-[width] duration-300 ease-expo-out shadow-[0_0_10px_rgba(94,106,210,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 進度與得分狀態列 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-3 border-b border-white/[0.06] text-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-bold font-game text-[#9AA5FF] bg-accent/15 px-3 py-1 rounded-full border border-accent/30 shadow-sm">
                  第 {currentIndex + 1} / {quizQueue.length} 題
                </span>
                <span
                  className={`font-game font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${
                    currentQ.type === "SINGLE"
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                      : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                  }`}
                >
                  {currentQ.type === "SINGLE" ? "單選題" : "複選題"}
                </span>
              </div>

              {/* 鍵盤快捷鍵操作提示 */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-foreground-muted bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-xl">
                <span>快捷鍵：</span>
                <span className="font-mono text-[#9AA5FF] font-bold">A / B / C / D</span>
                <span>選取 ·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-foreground font-mono text-[10px]">
                  Enter
                </kbd>
                <span>送出</span>
              </div>

              <div className="font-semibold text-foreground-muted flex items-center gap-1.5">
                <span>目前答對：</span>
                <span className="font-game font-bold text-emerald-400 text-sm">{score}</span>
                <span>題</span>
              </div>
            </div>
          </div>

          {/* 題幹內容 (Nintendo Switch Dialog Feel) */}
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold font-game text-foreground leading-relaxed break-words whitespace-pre-wrap">
              {currentQ.stem}
            </h2>
            <p className="text-xs text-foreground-muted">
              {currentQ.type === "SINGLE"
                ? "請點選一個正確選項作答："
                : "本題為複選題，可點選多個選項作答："}
            </p>
          </div>

          {/* 4 個選項作答區塊 (Tactile Option Cards with Neon Glow) */}
          <div className="grid gap-3">
            {currentOptions.map((opt) => {
              const isSelected = selectedAnswers.includes(opt.key);
              const isCorrectAnswer = currentCorrectSet.has(opt.key);

              // 樣式判定
              let cardStyle =
                "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05] text-foreground";
              let badgeStyle = "bg-white/[0.05] border border-white/[0.08] text-foreground-muted";

              if (!isAnswerSubmitted) {
                if (isSelected) {
                  cardStyle =
                    "border-accent bg-accent/15 text-white shadow-glow ring-1 ring-accent";
                  badgeStyle = "bg-accent text-white font-bold shadow-[0_0_12px_rgba(94,106,210,0.5)]";
                }
              } else {
                // 已送出作答，揭曉反饋
                if (isCorrectAnswer) {
                  cardStyle =
                    "border-emerald-500/80 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.25)] font-medium";
                  badgeStyle = "bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]";
                } else if (isSelected && !isCorrectAnswer) {
                  cardStyle =
                    "border-rose-500/80 bg-rose-950/40 text-rose-200 ring-1 ring-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.25)]";
                  badgeStyle = "bg-rose-500 text-white font-black shadow-[0_0_12px_rgba(244,63,94,0.5)]";
                } else {
                  cardStyle = "border-white/[0.04] bg-white/[0.01] text-foreground-muted opacity-60";
                }
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectOption(opt.key)}
                  disabled={isAnswerSubmitted}
                  title={`按鍵盤 [${opt.key}] 快速選取`}
                  className={`p-4 min-h-[52px] rounded-2xl border text-left text-xs sm:text-sm flex items-center justify-between gap-3.5 transition-all duration-200 ease-expo-out touch-manipulation touch-tactile ${cardStyle}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl border font-bold text-xs flex items-center justify-center flex-shrink-0 font-game transition-colors duration-180 ${badgeStyle}`}
                    >
                      {opt.key}
                    </span>
                    <span className="leading-snug min-w-0 break-words whitespace-pre-wrap">{opt.text}</span>
                  </div>

                  {isAnswerSubmitted && isCorrectAnswer && (
                    <span className="font-game text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex-shrink-0 shadow-sm animate-fade-in">
                      ✓ 標準答案
                    </span>
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrectAnswer && (
                    <span className="font-game text-[11px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-lg flex-shrink-0 shadow-sm animate-fade-in">
                      ✗ 您的回答
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 送出或對錯回饋區塊 (Thumb-Friendly CTA) */}
          {!isAnswerSubmitted ? (
            <div className="pt-2 flex justify-end w-full">
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={selectedAnswers.length === 0}
                className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 sm:py-3 rounded-xl text-sm font-bold font-game shadow-md transition-all duration-200 ease-expo-out flex items-center justify-center gap-2 touch-manipulation touch-tactile ${
                  selectedAnswers.length > 0
                    ? "bg-accent hover:bg-accent-bright text-white shadow-glow"
                    : "bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed"
                }`}
              >
                <span>確認送出答案</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                  Enter
                </kbd>
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-white/[0.06] space-y-4 animate-fade-in-up">
              {/* 對錯評判提示 (立體揭曉橫幅) */}
              {selectedAnswers.sort().join(",") ===
              currentQ.correctAnswers.split(",").sort().join(",") ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-bold font-game flex items-center gap-2.5 shadow-[0_0_24px_rgba(16,185,129,0.15)] animate-fade-in-up">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>🎉 太棒了，完全答對！得分 +1</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-bold font-game flex items-center gap-2.5 shadow-[0_0_24px_rgba(244,63,94,0.15)] animate-fade-in-up">
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <span>
                    答錯了！標準解答為：
                    <strong className="text-emerald-400 ml-1.5 font-bold">
                      {currentQ.correctAnswers}
                    </strong>
                  </span>
                </div>
              )}

              {/* 詳解說明 (Dark Glass Container) */}
              {currentQ.explanation && currentQ.explanation.trim() && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-foreground-muted space-y-1.5 leading-relaxed animate-fade-in-up stagger-1">
                  <p className="font-bold font-game text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    題目詳解與考點：
                  </p>
                  <p className="text-foreground-subtle leading-relaxed break-words whitespace-pre-wrap">{currentQ.explanation}</p>
                </div>
              )}

              {/* 下一題按鈕 (Thumb-Friendly CTA) */}
              <div className="flex justify-end w-full">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 sm:py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold font-game shadow-glow flex items-center justify-center gap-2 transition-all duration-200 ease-expo-out touch-manipulation touch-tactile animate-fade-in-up stagger-2"
                >
                  <span>
                    {currentIndex + 1 < quizQueue.length
                      ? "下一題"
                      : "查看測驗結算"}
                  </span>
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                    Enter
                  </kbd>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 測驗結束結算畫面 (Award / Settlement Screen) */}
      {quizCompleted && (
        <div className="bg-[#0a0a0c]/95 rounded-3xl border border-white/[0.08] shadow-2xl p-6 sm:p-12 text-center space-y-6 backdrop-blur-xl animate-scale-in relative overflow-hidden">
          {/* Ambient Blurred Circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          </div>

          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(245,158,11,0.35)] relative z-10 animate-fade-in-up">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2 relative z-10 animate-fade-in-up stagger-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-game text-foreground">
              測驗結束！
            </h2>
            <p className="text-xs text-foreground-muted">
              恭喜您完成本次隨機抽題自測，再接再厲！
            </p>
          </div>

          <div className="bg-white/[0.03] p-7 rounded-3xl border border-white/[0.08] max-w-sm mx-auto space-y-3 relative z-10 shadow-inner animate-fade-in-up stagger-2">
            <div className="text-xs text-foreground-muted font-semibold">本次得分</div>
            <div className="text-5xl font-black font-game text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-300 to-cyan-300">
              {score}{" "}
              <span className="text-base text-foreground-muted font-normal">
                / {quizQueue.length}
              </span>
            </div>
            <div className="text-xs text-foreground-muted font-medium pt-1 border-t border-white/[0.06]">
              整體答對率：
              <span className="font-bold font-game text-emerald-400 text-sm ml-1">
                {quizQueue.length > 0
                  ? Math.round((score / quizQueue.length) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-3 relative z-10 w-full max-w-sm mx-auto animate-fade-in-up stagger-3">
            <button
              type="button"
              onClick={handleRestart}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 sm:py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold font-game shadow-glow flex items-center justify-center gap-2 transition-all duration-200 ease-expo-out touch-manipulation touch-tactile"
            >
              <RotateCcw className="w-4 h-4" />
              <span>再來一次</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                Enter
              </kbd>
            </button>
            <Link
              href="/questions"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 sm:py-3 rounded-xl border border-white/[0.10] text-foreground text-sm font-semibold hover:bg-white/[0.05] transition-colors duration-200 ease-expo-out flex items-center justify-center text-center touch-manipulation touch-tactile"
            >
              返回題庫清單
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}