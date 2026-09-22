"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  Clock,
  Flame,
  Check,
  AlertTriangle,
  FileDown,
  Maximize2,
} from "lucide-react";
import { Question } from "@/types/question";
import { getCachedQuestions, setCachedQuestions } from "@/lib/questionsCache";
import MockExamView from "@/components/practice/MockExamView";
import WrongQuestionsRanking from "@/components/practice/WrongQuestionsRanking";
import ExportModal from "@/components/ExportModal";
import ImageLightboxModal from "@/components/ImageLightboxModal";

type PracticeMode = "NONE" | "INSTANT" | "MOCK_EXAM";

export default function PracticePage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => getCachedQuestions() || []);
  const [quizQueue, setQuizQueue] = useState<Question[]>([]);
  const [mockExamQueue, setMockExamQueue] = useState<Question[]>([]);
  const [mockExamKey, setMockExamKey] = useState(1);
  const [isLoading, setIsLoading] = useState(() => !getCachedQuestions());
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // 模式：NONE (大廳) | INSTANT (即時隨機練習) | MOCK_EXAM (60分鐘模擬考)
  const [quizMode, setQuizMode] = useState<PracticeMode>("NONE");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 即時測驗設定
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // 即時測驗進行狀態
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // 載入題庫
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

  // 依篩選過濾可用的題目 (即時練習模式)
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (selectedType !== "ALL" && q.type !== selectedType) return false;
      return true;
    });
  }, [allQuestions, selectedType]);

  // 開始即時隨機練習
  const handleStartQuiz = useCallback(() => {
    if (filteredQuestions.length === 0) return;
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setQuizQueue(shuffled);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    setQuizMode("INSTANT");
  }, [filteredQuestions]);

  // 開始 60 分鐘模擬考試 (單複選混合隨機抽 50 題)
  const handleStartMockExam = useCallback(() => {
    if (allQuestions.length < 50) return;

    // 嚴格確保「單、複選混合隨機抽出共50題」
    const singleList = allQuestions.filter((q) => q.type === "SINGLE");
    const multipleList = allQuestions.filter((q) => q.type === "MULTIPLE");

    let selected: Question[] = [];
    if (singleList.length > 0 && multipleList.length > 0) {
      // 兩類題型均存在時，打散並混合抽取
      const shuffledSingle = [...singleList].sort(() => Math.random() - 0.5);
      const shuffledMulti = [...multipleList].sort(() => Math.random() - 0.5);

      // 各自抽樣，其餘從綜合題庫補齊至 50 題
      const minSingle = Math.min(shuffledSingle.length, 25);
      const minMulti = Math.min(shuffledMulti.length, 50 - minSingle);

      const partSingle = shuffledSingle.slice(0, minSingle);
      const partMulti = shuffledMulti.slice(0, minMulti);

      const remainingPool = [
        ...shuffledSingle.slice(minSingle),
        ...shuffledMulti.slice(minMulti),
      ].sort(() => Math.random() - 0.5);

      const needed = 50 - (partSingle.length + partMulti.length);
      selected = [...partSingle, ...partMulti, ...remainingPool.slice(0, needed)];
    } else {
      selected = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 50);
    }

    // 再次全隨機洗牌題目順序
    selected.sort(() => Math.random() - 0.5);
    setMockExamQueue(selected.slice(0, 50));
    setMockExamKey((k) => k + 1);
    setQuizMode("MOCK_EXAM");
  }, [allQuestions]);

  // 單題自測快速練習（從錯題排行榜點擊「單題重測」）
  const handleQuickPracticeSingle = useCallback((question: Question) => {
    setQuizQueue([question]);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    setQuizMode("INSTANT");
  }, []);

  // 即時模式之當前題目
  const currentQ = quizQueue[currentIndex];

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

  // 即時練習：選取選項
  const handleSelectOption = useCallback(
    (key: string) => {
      if (isAnswerSubmitted || !currentQ) return;

      if (currentQ.type === "SINGLE") {
        setSelectedAnswers([key]);
      } else {
        setSelectedAnswers((prev) =>
          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()
        );
      }
    },
    [isAnswerSubmitted, currentQ]
  );

  // 即時練習：提交作答並揭曉
  const handleSubmitAnswer = useCallback(() => {
    if (selectedAnswers.length === 0 || !currentQ) return;

    const userAnsStr = [...selectedAnswers].sort().join(",");
    const correctAnsStr = currentQ.correctAnswers.split(",").sort().join(",");
    const isCorrect = userAnsStr === correctAnsStr;

    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      // 答錯自動非同步記錄到錯題 API
      fetch("/api/wrong-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQ.id, userAnswer: userAnsStr }),
      }).catch(console.error);
    }

    setIsAnswerSubmitted(true);
  }, [selectedAnswers, currentQ]);

  // 即時練習：下一題
  const handleNextQuestion = useCallback(() => {
    if (currentIndex + 1 < quizQueue.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  }, [currentIndex, quizQueue.length]);

  // 退出即時練習回到大廳
  const handleRestart = useCallback(() => {
    setQuizMode("NONE");
    setQuizCompleted(false);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setScore(0);
  }, []);

  // 鍵盤快捷鍵：自測刷題 A/B/C/D 選擇選項、Enter 送出作答或進入下一題
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          (target as HTMLElement).isContentEditable);

      if (isTyping) return;

      // 1. Enter 快捷鍵
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (target && (target.tagName === "A" || target.closest("a"))) {
          return;
        }

        if (quizMode === "NONE" && target && target.tagName === "BUTTON" && !target.hasAttribute("data-start-btn")) {
          return;
        }

        if (quizMode === "INSTANT" && !quizCompleted && target && target.tagName === "BUTTON" && !target.hasAttribute("data-quiz-action")) {
          return;
        }

        if (quizMode === "INSTANT" && !quizCompleted) {
          if (!isAnswerSubmitted) {
            if (selectedAnswers.length > 0) {
              e.preventDefault();
              handleSubmitAnswer();
            }
          } else {
            e.preventDefault();
            handleNextQuestion();
          }
        } else if (quizMode === "NONE" && filteredQuestions.length > 0) {
          e.preventDefault();
          handleStartQuiz();
        } else if (quizCompleted) {
          e.preventDefault();
          handleRestart();
        }
        return;
      }

      // 2. A / B / C / D (及 1 / 2 / 3 / 4) 選擇選項
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (quizMode === "INSTANT" && !quizCompleted && !isAnswerSubmitted) {
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    quizMode,
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

  const totalQuestionsCount = quizMode === "INSTANT" ? quizQueue.length : filteredQuestions.length;
  const progressPercent =
    totalQuestionsCount > 0
      ? Math.round(((currentIndex + (isAnswerSubmitted ? 1 : 0)) / totalQuestionsCount) * 100)
      : 0;

  // ==================== 1. 60分鐘沉浸式模擬考試模式 ====================
  if (quizMode === "MOCK_EXAM") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <MockExamView
          key={`mock-exam-${mockExamKey}`}
          questions={mockExamQueue}
          onExit={() => setQuizMode("NONE")}
          onRestart={handleStartMockExam}
        />
      </div>
    );
  }

  // ==================== 2. 即時隨機練習進行中 ====================
  if (quizMode === "INSTANT" && !quizCompleted && currentQ) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold font-game text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-accent" />
            個人自測刷題
          </h1>

          <button
            type="button"
            onClick={handleRestart}
            className="min-h-[44px] text-xs sm:text-sm font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-200 active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>結束測驗回到大廳</span>
          </button>
        </div>

        {/* 做題卡片 */}
        <div
          key={`question-${currentQ.id || currentIndex}`}
          className="bg-[#0a0a0c]/95 rounded-3xl border border-white/[0.08] shadow-2xl p-4 sm:p-8 space-y-6 backdrop-blur-xl relative overflow-hidden animate-fade-in-up"
        >
          {/* 進度條 */}
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent via-[#8B5CF6] to-cyan-400 transition-[width] duration-300 ease-expo-out shadow-[0_0_10px_rgba(94,106,210,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

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

          {/* 題幹內容 */}
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold font-game text-foreground leading-relaxed break-words whitespace-pre-wrap">
              {currentQ.stem}
            </h2>
            <p className="text-xs text-foreground-muted">
              {currentQ.type === "SINGLE"
                ? "請點選一個正確選項作答："
                : "本題為複選題，可點選多個選項作答："}
            </p>

            {/* 題目附圖 */}
            {currentQ.imageUrl && (
              <div className="pt-2 pb-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setLightboxImageUrl(currentQ.imageUrl!)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setLightboxImageUrl(currentQ.imageUrl!);
                    }
                  }}
                  className="group relative inline-block rounded-2xl overflow-hidden border border-white/[0.12] bg-black/50 hover:border-cyan-500/50 p-2 cursor-pointer transition-all max-w-full"
                  title="點擊放大檢視附圖"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQ.imageUrl}
                    alt="題目附圖"
                    className="max-h-64 sm:max-h-80 w-auto object-contain rounded-xl transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1 opacity-90 group-hover:opacity-100 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>點擊放大</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4 個選項作答區塊 */}
          <div className="grid gap-3">
            {currentOptions.map((opt) => {
              const isSelected = selectedAnswers.includes(opt.key);
              const isCorrectAnswer = currentCorrectSet.has(opt.key);

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
                if (isCorrectAnswer) {
                  cardStyle =
                    "border-emerald-500/80 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.25)] font-medium";
                  badgeStyle =
                    "bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]";
                } else if (isSelected && !isCorrectAnswer) {
                  cardStyle =
                    "border-rose-500/80 bg-rose-950/40 text-rose-200 ring-1 ring-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.25)]";
                  badgeStyle =
                    "bg-rose-500 text-white font-black shadow-[0_0_12px_rgba(244,63,94,0.5)]";
                } else {
                  cardStyle = "border-white/[0.04] bg-white/[0.01] text-foreground-muted opacity-60";
                }
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  data-quiz-action="true"
                  onClick={() => handleSelectOption(opt.key)}
                  disabled={isAnswerSubmitted}
                  className={`p-4 min-h-[52px] rounded-2xl border text-left text-xs sm:text-sm flex items-center justify-between gap-3.5 transition-all duration-200 touch-manipulation touch-tactile ${cardStyle}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl border font-bold text-xs flex items-center justify-center flex-shrink-0 font-game ${badgeStyle}`}
                    >
                      {opt.key}
                    </span>
                    <span className="leading-snug min-w-0 break-words whitespace-pre-wrap">
                      {opt.text}
                    </span>
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

          {/* 送出或對錯回饋區塊 */}
          {!isAnswerSubmitted ? (
            <div className="pt-2 flex justify-end w-full">
              <button
                type="button"
                data-quiz-action="true"
                onClick={handleSubmitAnswer}
                disabled={selectedAnswers.length === 0}
                className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 sm:py-3 rounded-xl text-sm font-bold font-game shadow-md transition-all duration-200 flex items-center justify-center gap-2 touch-manipulation touch-tactile ${
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

              {currentQ.explanation && currentQ.explanation.trim() && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-foreground-muted space-y-1.5 leading-relaxed animate-fade-in-up">
                  <p className="font-bold font-game text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    題目詳解與考點：
                  </p>
                  <p className="text-foreground-subtle leading-relaxed break-words whitespace-pre-wrap">
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              <div className="flex justify-end w-full">
                <button
                  type="button"
                  data-quiz-action="true"
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 sm:py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold font-game shadow-glow flex items-center justify-center gap-2 transition-all duration-200 touch-manipulation touch-tactile"
                >
                  <span>
                    {currentIndex + 1 < quizQueue.length ? "下一題" : "查看測驗結算"}
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

        {/* 燈箱放大檢視 */}
        <ImageLightboxModal
          imageUrl={lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      </div>
    );
  }

  // ==================== 3. 即時練習結算畫面 ====================
  if (quizMode === "INSTANT" && quizCompleted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-[#0a0a0c]/95 rounded-3xl border border-white/[0.08] shadow-2xl p-4 sm:p-12 text-center space-y-6 backdrop-blur-xl animate-scale-in relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(245,158,11,0.35)] relative z-10 animate-fade-in-up">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2 relative z-10 animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-game text-foreground">
              練習結束！
            </h2>
            <p className="text-xs text-foreground-muted">
              恭喜您完成本次隨機練習，答錯的題目已為您同步記錄！
            </p>
          </div>

          <div className="bg-white/[0.03] p-7 rounded-3xl border border-white/[0.08] max-w-sm mx-auto space-y-3 relative z-10 shadow-inner animate-fade-in-up">
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
                {quizQueue.length > 0 ? Math.round((score / quizQueue.length) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-3 relative z-10 w-full max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleRestart}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 sm:py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold font-game shadow-glow flex items-center justify-center gap-2 transition-all duration-200 touch-manipulation touch-tactile active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>再來一次</span>
            </button>
            <button
              type="button"
              onClick={() => setQuizMode("NONE")}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 sm:py-3 rounded-xl border border-white/[0.10] text-foreground text-sm font-semibold hover:bg-white/[0.05] transition-colors flex items-center justify-center text-center touch-manipulation touch-tactile active:scale-95"
            >
              返回刷題大廳
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 4. 刷題大廳雙模式入口卡片 + 錯題排行榜 ====================
  const isMockExamAvailable = allQuestions.length >= 50;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* 頂部歡迎標題 */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-game text-foreground flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-accent" />
          <span>刷題測驗中心</span>
        </h1>
        <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
          提供「即時單題反饋」與「60分鐘 50 題沉浸式模擬考試」雙模式，並具備錯題排行榜針對弱項深度複習。
        </p>
      </div>

      {/* 雙模式入口卡片並列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 卡片 1: 即時隨機練習 */}
        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-6 sm:p-7 space-y-6 backdrop-blur-md flex flex-col justify-between hover:border-white/[0.14] transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold font-game px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                單題即時反饋
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-game text-foreground">
                即時隨機練習
              </h2>
              <p className="text-xs text-foreground-muted leading-relaxed">
                適合利用零碎時間衝刺練習！作答當下立即揭曉正解與詳解，支援單選/複選自訂題型，隨時可結束。
              </p>
            </div>

            {/* 題型偏好選擇 */}
            <div className="space-y-2 text-xs pt-1">
              <label className="font-bold font-game text-foreground">題型偏好：</label>
              <div className="grid grid-cols-3 gap-2">
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
                      className={`min-h-[44px] p-2.5 rounded-xl font-bold font-game text-xs border text-center flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-white/[0.12] text-foreground border-white/[0.2] shadow-sm font-semibold"
                          : "bg-white/[0.03] text-foreground-muted border-white/[0.06] hover:bg-white/[0.06] hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 數量提示 */}
            <div className="text-xs text-foreground-muted flex items-center gap-1.5 pt-1">
              <span>可練習題目：</span>
              <strong className="text-cyan-300 font-mono font-bold text-sm">
                {filteredQuestions.length}
              </strong>
              <span>題</span>
            </div>
          </div>

          <button
            type="button"
            data-start-btn="true"
            onClick={handleStartQuiz}
            disabled={filteredQuestions.length === 0}
            className={`w-full min-h-[48px] py-3.5 rounded-2xl font-bold font-game text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-manipulation touch-tactile active:scale-95 ${
              filteredQuestions.length > 0
                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                : "bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>開始即時隨機練習</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
              Enter
            </kbd>
          </button>
        </div>

        {/* 卡片 2: 60分鐘模擬考試 */}
        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] shadow-linear-card p-6 sm:p-7 space-y-6 backdrop-blur-md flex flex-col justify-between hover:border-white/[0.14] transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 text-[#9AA5FF] flex items-center justify-center shadow-[0_0_20px_rgba(94,106,210,0.35)]">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold font-game px-3 py-1 rounded-full bg-accent/15 text-[#9AA5FF] border border-accent/30">
                標準全真檢定
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-game text-foreground flex items-center gap-2">
                <span>60分鐘模擬考試</span>
                <span className="text-xs font-normal text-foreground-muted">
                  (50題 · 滿分100分)
                </span>
              </h2>
              <p className="text-xs text-foreground-muted leading-relaxed">
                單選、複選混合隨機抽出共 50 題，每題 2 分，總計 100 分。限制 60 分鐘內作答完畢，成績加總達 70 分（含）以上合格。
              </p>
            </div>

            {/* 規則特色項目 */}
            <div className="space-y-2 text-xs text-foreground-muted pt-1">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>右上方配置 60:00 即時倒數計時器</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>50 題答題卡切換矩陣，清晰掌握已答/未答題</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>提前交卷防呆通知，考後結算與 50 題對錯覆盤詳解</span>
              </div>
            </div>

            {/* 門檻檢查提示 */}
            {!isMockExamAvailable && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>題庫需達 50 題才能開啟模擬考（目前 {allQuestions.length} 題）</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleStartMockExam}
              disabled={!isMockExamAvailable}
              className={`w-full min-h-[48px] py-3.5 px-4 rounded-2xl font-bold font-game text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-manipulation touch-tactile active:scale-95 ${
                isMockExamAvailable
                  ? "bg-accent hover:bg-accent-bright text-white shadow-glow"
                  : "bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>
                {isMockExamAvailable
                  ? "開始 50 題模擬考"
                  : `需達 50 題才能開考 (${allQuestions.length}/50)`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              disabled={allQuestions.length === 0}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl font-bold font-game text-xs sm:text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all flex items-center justify-center gap-1.5 touch-manipulation touch-tactile active:scale-95 disabled:opacity-40"
            >
              <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
              <span>匯出 50 題考卷 (Docx/PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 錯題排行榜系統區塊 */}
      <WrongQuestionsRanking onQuickPractice={handleQuickPracticeSingle} />

      {/* 50 題考卷匯出彈窗 */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        questions={allQuestions}
        initialMode="RANDOM_50"
      />

      {/* 燈箱放大檢視 */}
      <ImageLightboxModal
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </div>
  );
}