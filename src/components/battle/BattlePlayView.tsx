"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { BattleRoom, BattleQuestion, BattlePlayer } from "@/lib/battleStore";
import { battleAudio } from "@/lib/battleAudio";
import { compareAnswers, formatAnswerDisplay } from "@/lib/answerUtils";
import ExplanationCard from "@/components/ExplanationCard";
import CompetitorLiveBoard from "./CompetitorLiveBoard";
import AnimalAvatar from "./AnimalAvatar";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
  Trophy,
  X,
  BookOpen,
} from "lucide-react";
import BattleReviewPanel from "./BattleReviewPanel";

interface BattlePlayViewProps {
  room: BattleRoom;
  currentPlayerId: string;
  userAnswers?: Record<string, string[]>;
  onRecordAnswer?: (questionId: string, answers: string[]) => void;
  onRefreshRoom: () => Promise<BattleRoom | null>;
  onFinishBattle: () => void;
}

// Helper function to retry network requests once on transient network or server failure (approx 2s interval)
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
  delayMs = 2000
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs);
    }
    throw err;
  }
}

export default function BattlePlayView({
  room,
  currentPlayerId,
  userAnswers = {},
  onRecordAnswer,
  onRefreshRoom,
  onFinishBattle,
}: BattlePlayViewProps) {
  // Determine this player's question sequence
  const myPlayer = room.players.find((p) => p.id === currentPlayerId);
  const totalQuestions = room.questions.length;

  // Ordered questions for this player
  const orderedQuestions: BattleQuestion[] = React.useMemo(() => {
    if (!room.playerQuestionOrders || !room.playerQuestionOrders[currentPlayerId]) {
      return room.questions;
    }
    const orderIds = room.playerQuestionOrders[currentPlayerId];
    const qMap = new Map(room.questions.map((q) => [q.id, q]));
    return orderIds.map((id) => qMap.get(id)).filter(Boolean) as BattleQuestion[];
  }, [room.questions, room.playerQuestionOrders, currentPlayerId]);

  const [currentIndex, setCurrentIndex] = useState(myPlayer?.currentIndex || 0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isMuted, setIsMuted] = useState(battleAudio.getMuted());
  const [submitting, setSubmitting] = useState(false);
  const [isFinishedLocal, setIsFinishedLocal] = useState(myPlayer?.isFinished || false);
  const [showMobileBoard, setShowMobileBoard] = useState(false);
  const [stats, setStats] = useState({
    correct: myPlayer?.correctCount || 0,
    wrong: myPlayer?.wrongCount || 0,
    score: myPlayer?.score || 0,
  });

  // Track player answers locally for instant review availability
  const [localAnswers, setLocalAnswers] = useState<Record<string, string[]>>(() => ({
    ...userAnswers,
  }));

  useEffect(() => {
    if (userAnswers && Object.keys(userAnswers).length > 0) {
      setLocalAnswers((prev) => ({ ...prev, ...userAnswers }));
    }
  }, [userAnswers]);

  const currentQ = orderedQuestions[currentIndex] || orderedQuestions[0];
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncedWrongQuestionIdsRef = useRef<Set<string>>(new Set());

  // Reset synced wrong question tracking on new game session
  useEffect(() => {
    syncedWrongQuestionIdsRef.current.clear();
  }, [room.drawingStartTime]);

  // Poll room updates for live scoreboard with Smart Adaptive Polling
  const isFetchingRef = useRef(false);
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isActive = true;

    const poll = async () => {
      if (!isActive || isFetchingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        // Slow down polling when user has tab hidden/backgrounded
        timer = setTimeout(poll, 4000);
        return;
      }

      isFetchingRef.current = true;
      try {
        const updated = await onRefreshRoom();
        if (updated && updated.stage === "FINISHED" && isActive) {
          onFinishBattle();
          return;
        }
      } catch (err) {
        // Silently tolerate transient network glitches
      } finally {
        isFetchingRef.current = false;
        if (isActive) {
          timer = setTimeout(poll, 1200);
        }
      }
    };

    timer = setTimeout(poll, 1200);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive) {
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onRefreshRoom, onFinishBattle]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasSubmitted || isFinishedLocal || !currentQ) return;
      const key = e.key.toUpperCase();
      const keyMap: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", A: "A", B: "B", C: "C", D: "D" };
      if (keyMap[key]) {
        e.preventDefault();
        handleOptionClick(keyMap[key]);
      } else if (e.key === "Enter" && currentQ.type === "MULTIPLE" && selectedAnswers.length > 0) {
        e.preventDefault();
        submitAnswer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSubmitted, isFinishedLocal, currentQ, selectedAnswers]);

  // Handle option click
  const handleOptionClick = (opt: string) => {
    if (hasSubmitted || isFinishedLocal) return;

    if (currentQ.type === "SINGLE") {
      battleAudio.playClick();
      setSelectedAnswers([opt]);
      // For single choice, evaluate immediately
      evaluateAnswer([opt]);
    } else {
      // Multiple choice toggling
      battleAudio.playClick();
      setSelectedAnswers((prev) =>
        prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt].sort()
      );
    }
  };

  // Evaluate Answer and submit progress
  const evaluateAnswer = async (answers: string[]) => {
    if (hasSubmitted || !currentQ) return;
    setHasSubmitted(true);

    setLocalAnswers((prev) => ({ ...prev, [currentQ.id]: answers }));
    if (onRecordAnswer) {
      onRecordAnswer(currentQ.id, answers);
    }

    const isCorrect = compareAnswers(answers, currentQ.correctAnswers);

    let newCorrect = stats.correct;
    let newWrong = stats.wrong;
    let newScore = stats.score;

    if (isCorrect) {
      newCorrect += 1;
      newScore += 100;
      battleAudio.playCorrect();
    } else {
      newWrong += 1;
      battleAudio.playWrong();
    }

    // 自動記錄作答至錯題與統計系統 (個人專屬錯題本與全站高頻錯題統計，遭遇網路失敗自動重試 1 次)
    if (!syncedWrongQuestionIdsRef.current.has(currentQ.id)) {
      syncedWrongQuestionIdsRef.current.add(currentQ.id);
      const userAnsStr = formatAnswerDisplay(answers) || "未作答";
      fetchWithRetry("/api/wrong-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQ.id, userAnswer: userAnsStr, isCorrect }),
      }).catch((err) => console.error("同步對戰錯題至錯題系統失敗 (重試後仍失敗):", err));
    }

    setStats({ correct: newCorrect, wrong: newWrong, score: newScore });

    const isLastQuestion = currentIndex + 1 >= totalQuestions;

    // Send progress to server with retry mechanism (1 retry after 2s interval)
    try {
      await fetchWithRetry(`/api/battle/${room.code}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayerId,
          currentIndex: isLastQuestion ? currentIndex + 1 : currentIndex + 1,
          correctCount: newCorrect,
          wrongCount: newWrong,
          score: newScore,
          isFinished: isLastQuestion,
        }),
      });
    } catch (err) {
      console.error("Failed to sync progress (重試後仍失敗):", err);
    }

    if (isLastQuestion) {
      setIsFinishedLocal(true);
      const othersFinished = room.players
        .filter((p) => p.id !== currentPlayerId)
        .every((p) => p.isFinished);
      if (othersFinished) {
        autoNextTimerRef.current = setTimeout(() => {
          onFinishBattle();
        }, 1500);
      }
    } else {
      // Auto advance to next question after 1.2s delay
      autoNextTimerRef.current = setTimeout(() => {
        advanceNextQuestion();
      }, 1200);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswers.length === 0 || hasSubmitted) return;
    evaluateAnswer(selectedAnswers);
  };

  const advanceNextQuestion = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswers([]);
      setHasSubmitted(false);
    } else {
      setIsFinishedLocal(true);
      onFinishBattle();
    }
  };

  const toggleSound = () => {
    const muted = battleAudio.toggleMute();
    setIsMuted(muted);
  };

  const options = [
    { key: "A", text: currentQ?.optionA },
    { key: "B", text: currentQ?.optionB },
    { key: "C", text: currentQ?.optionC },
    { key: "D", text: currentQ?.optionD },
  ].filter((opt) => typeof opt.text === "string" && opt.text.trim().length > 0);

  const correctAnswersList = (currentQ?.correctAnswers || "")
    .split(",")
    .map((s) => s.trim().toUpperCase());

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Top Bar: Progress, Room Info, Mute Toggle, Mobile Board Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-game font-bold text-sm px-3 py-1 rounded-xl bg-accent/20 text-[#9AA5FF] border border-accent/40">
            ⚔️ 對戰中 · 房號 {room.code}
          </span>
          <span className="text-xs text-foreground-muted hidden sm:inline">
            題目順序：{room.settings.orderMode === "RANDOM" ? "隨機亂序" : "全員同序"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mobile Floating Board Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileBoard(true)}
            className="lg:hidden min-h-[44px] px-3 py-1.5 rounded-xl font-game font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 touch-tactile shadow-sm"
            aria-label="查看即時戰況動態看板"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>戰況動態榜</span>
          </button>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:text-foreground bg-white/[0.04] border border-white/[0.08] transition-colors touch-tactile"
            aria-label={isMuted ? "開啟音效" : "靜音"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Current Score Pill */}
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-game font-bold text-sm flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Zap className="w-4 h-4" />
            <span>{stats.score} 分</span>
          </div>
        </div>
      </div>

      {/* Main Play Area: Question Box on Left, Competitor Board on Right */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Question Box */}
        <div className="flex-1 w-full space-y-4">
          {!isFinishedLocal && currentQ ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/[0.12] shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-game font-black text-lg text-accent-bright">
                    Q {currentIndex + 1}
                  </span>
                  <span className="text-xs text-foreground-muted font-game">/ {totalQuestions}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-game font-bold bg-white/[0.06] text-[#9AA5FF] border border-white/[0.08]">
                    {currentQ.type === "SINGLE" ? "單選題" : "複選題 (可多選)"}
                  </span>
                </div>

                {currentQ.category && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-[#8B96F8] font-bold">
                    {currentQ.category}
                  </span>
                )}
              </div>

              {/* Question Stem */}
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-relaxed mb-4">
                {currentQ.stem}
              </h2>

              {/* Optional Question Image */}
              {currentQ.imageUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 bg-black/40 max-h-64 flex items-center justify-center p-2">
                  <img
                    src={currentQ.imageUrl}
                    alt="題目附圖"
                    className="max-h-60 object-contain rounded-xl"
                  />
                </div>
              )}

              {/* Options Grid */}
              <div className="space-y-3">
                {options.map((opt) => {
                  const isSelected = selectedAnswers.includes(opt.key);
                  const isCorrectAnswer = correctAnswersList.includes(opt.key);

                  // Color state after submit
                  let stateStyle = "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20";
                  if (isSelected && !hasSubmitted) {
                    stateStyle = "bg-accent/25 border-accent-bright shadow-glow ring-2 ring-accent/30";
                  } else if (hasSubmitted) {
                    if (isCorrectAnswer) {
                      stateStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/40";
                    } else if (isSelected && !isCorrectAnswer) {
                      stateStyle = "bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.35)]";
                    } else {
                      stateStyle = "opacity-40 bg-white/[0.01] border-white/[0.04]";
                    }
                  }

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={hasSubmitted}
                      onClick={() => handleOptionClick(opt.key)}
                      className={`w-full min-h-[52px] text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 touch-tactile ${stateStyle}`}
                    >
                      {/* Option Key Badge */}
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black font-game shrink-0 transition-colors ${
                          isSelected
                            ? "bg-accent-bright text-white"
                            : "bg-white/[0.08] text-foreground-muted"
                        }`}
                      >
                        {opt.key}
                      </span>

                      {/* Option Text */}
                      <span className="text-sm sm:text-base font-medium flex-1 pt-0.5 leading-snug text-foreground">
                        {opt.text}
                      </span>

                      {/* Correct / Wrong icon reveal */}
                      {hasSubmitted && isCorrectAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce-subtle" />
                      )}
                      {hasSubmitted && isSelected && !isCorrectAnswer && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Multiple Choice Submit Button */}
              {currentQ.type === "MULTIPLE" && !hasSubmitted && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={selectedAnswers.length === 0}
                    className="min-h-[46px] px-6 py-2.5 rounded-xl font-game font-bold text-sm bg-accent hover:bg-accent-bright disabled:opacity-40 disabled:pointer-events-none text-white shadow-glow transition-all duration-200 flex items-center gap-2 touch-tactile"
                  >
                    <span>確認送出答案</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Instant Explanation / Next Button after submit */}
              {hasSubmitted && (
                <div className="mt-6 pt-4 border-t border-white/[0.08] flex flex-col gap-3 animate-fade-in">
                  <div className="w-full text-xs text-foreground-muted">
                    {currentQ.explanation ? (
                      <ExplanationCard
                        explanation={currentQ.explanation}
                        correctAnswers={currentQ.correctAnswers}
                        userAnswer={selectedAnswers}
                        options={{
                          A: currentQ.optionA,
                          B: currentQ.optionB,
                          C: currentQ.optionC,
                          D: currentQ.optionD,
                        }}
                        questionType={currentQ.type}
                        compact={true}
                        className="w-full"
                      />
                    ) : (
                      <span>答題完畢，正在前往下一題...</span>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={advanceNextQuestion}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold font-game bg-white/[0.08] hover:bg-white/[0.15] text-foreground border border-white/10 transition-colors shrink-0 flex items-center gap-1.5 touch-tactile"
                    >
                      <span>下一題</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Finished Answering Waiting Card & Battle Review Panel */
            <div className="space-y-6">
              <div className="p-8 sm:p-12 rounded-3xl bg-white/[0.04] border border-white/[0.12] text-center space-y-4 backdrop-blur-xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce-subtle">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black font-game text-foreground">
                  🎉 你已完成所有題目！
                </h3>
                <p className="text-sm text-foreground-muted max-w-md mx-auto leading-relaxed">
                  最終得分：<strong className="text-amber-400 font-game text-lg">{stats.score} 分</strong>
                  （答對 {stats.correct} 題，答錯 {stats.wrong} 題）
                  <br />
                  請稍候，正在等待其他參賽者完成對戰，即將揭曉頒獎台...
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={onFinishBattle}
                    className="min-h-[46px] px-6 py-2.5 rounded-xl font-game font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg hover:brightness-110 transition-all touch-tactile"
                  >
                    提前前往結算頒獎台 🏆
                  </button>
                </div>
              </div>

              {/* Early Finisher Waiting Screen Review Panel (Entrance A) */}
              <BattleReviewPanel
                questions={orderedQuestions}
                userAnswers={Object.keys(localAnswers).length > 0 ? localAnswers : userAnswers}
                collapsible={true}
                defaultExpanded={true}
                title="📝 本局考題覆盤與解析"
              />
            </div>
          )}
        </div>

        {/* Right Floating Competitor Live Board (Sticky on Desktop) */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 space-y-4">
          <CompetitorLiveBoard
            players={room.players}
            currentPlayerId={currentPlayerId}
            totalQuestions={totalQuestions}
          />
        </div>
      </div>

      {/* Mobile Floating Overlay Modal */}
      {showMobileBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md lg:hidden animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#0a0a0e] border border-white/20 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="font-game font-bold text-sm text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                即時戰況動態看板
              </span>
              <button
                type="button"
                onClick={() => setShowMobileBoard(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/[0.06] text-foreground-muted hover:text-foreground"
                aria-label="關閉戰況看板"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CompetitorLiveBoard
              players={room.players}
              currentPlayerId={currentPlayerId}
              totalQuestions={totalQuestions}
            />
          </div>
        </div>
      )}
    </div>
  );
}
