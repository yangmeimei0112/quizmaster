"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Dices, Layers, ShieldCheck, Zap } from "lucide-react";
import { BattleQuestion } from "@/lib/battleStore";
import { battleAudio } from "@/lib/battleAudio";

interface QuestionDrawAnimationProps {
  questions: BattleQuestion[];
  samplePool?: Array<{ id: string; stem: string; category?: string | null; type: string }>;
  mode: string;
  orderMode: string;
  onComplete: () => void;
}

export default function QuestionDrawAnimation({
  questions,
  samplePool = [],
  mode,
  orderMode,
  onComplete,
}: QuestionDrawAnimationProps) {
  // Phases: "ROLLING" -> "LOCKED" -> "COUNTDOWN"
  const [phase, setPhase] = useState<"ROLLING" | "LOCKED" | "COUNTDOWN">("ROLLING");
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [countdownNum, setCountdownNum] = useState<number | string>(3);
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pool of questions to rotate through
  const displayPool =
    samplePool.length > 0
      ? samplePool
      : questions.map((q) => ({ id: q.id, stem: q.stem, category: q.category, type: q.type }));

  useEffect(() => {
    // 1. ROLLING Phase (0s ~ 2.4s)
    let speed = 70;
    let elapsed = 0;

    const tick = () => {
      setActiveReelIndex((prev) => (prev + 1) % Math.max(displayPool.length, 1));
      battleAudio.playSlotTick(500 + Math.random() * 200);
      elapsed += speed;

      if (elapsed < 1300) {
        speed = 70;
      } else if (elapsed < 1900) {
        speed = 120; // Decelerating
      } else {
        // Switch to LOCKED phase
        clearInterval(rollIntervalRef.current!);
        setPhase("LOCKED");
        battleAudio.playLockFanfare();

        // 2. LOCKED Phase for 1.0s then COUNTDOWN
        setTimeout(() => {
          setPhase("COUNTDOWN");
          startCountdown();
        }, 1000);
        return;
      }

      rollIntervalRef.current = setTimeout(tick, speed);
    };

    rollIntervalRef.current = setTimeout(tick, speed);

    return () => {
      if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdownNum(3);
    battleAudio.playCountdownBeep(false);

    setTimeout(() => {
      setCountdownNum(2);
      battleAudio.playCountdownBeep(false);
    }, 550);

    setTimeout(() => {
      setCountdownNum(1);
      battleAudio.playCountdownBeep(false);
    }, 1100);

    setTimeout(() => {
      setCountdownNum("GO!");
      battleAudio.playCountdownBeep(true);
    }, 1650);

    setTimeout(() => {
      onComplete();
    }, 2200);
  };

  const currentReelItem = displayPool[activeReelIndex] || {
    stem: "正在從題庫抽取題目...",
    category: "綜合題庫",
    type: "SINGLE",
  };

  return (
    <div className="relative min-h-[500px] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden rounded-3xl bg-[#07070a]/90 border border-white/[0.12] shadow-2xl backdrop-blur-2xl">
      {/* Background arcade atmospheric particles and light beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent/25 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
      </div>

      {/* Top Banner */}
      <div className="relative z-10 space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold font-game bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-bounce-subtle">
          <Dices className="w-4 h-4 animate-spin-slow" />
          <span>街機抽卡系統 · 題庫即時抽選中</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-game text-foreground tracking-tight drop-shadow-md">
          {phase === "ROLLING" && "正在高速抽取本場對戰題目..."}
          {phase === "LOCKED" && "✦ 題庫鎖定！本場題目已確認 ✦"}
          {phase === "COUNTDOWN" && "各就各位 · 對戰即將展開！"}
        </h2>
        <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted">
          <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08]">
            {mode === "EXAM_50" ? "50題全真模擬考" : `自訂對戰 (${questions.length} 題)`}
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08]">
            {orderMode === "RANDOM" ? "隨機亂序作答" : "全員同題序作答"}
          </span>
        </div>
      </div>

      {/* Center Slot Machine & Drawn Cards Display */}
      {phase !== "COUNTDOWN" ? (
        <div className="relative z-10 w-full max-w-xl mx-auto space-y-6">
          {/* Main Slot Reel Card */}
          <div
            className={`relative p-6 sm:p-8 rounded-3xl transition-all duration-300 transform-gpu ${
              phase === "LOCKED"
                ? "bg-gradient-to-b from-amber-500/15 via-white/[0.05] to-black/60 border-2 border-amber-400/80 shadow-[0_0_45px_rgba(245,158,11,0.45)] scale-105"
                : "bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-2 border-white/20 shadow-[0_0_30px_rgba(94,106,210,0.3)]"
            }`}
          >
            {/* Top Reel Header */}
            <div className="flex items-center justify-between gap-3 text-xs mb-4">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/20 text-[#9AA5FF] font-game font-bold">
                <Layers className="w-3.5 h-3.5" />
                {currentReelItem.category || "精選考題"}
              </span>
              <span className="font-game font-bold text-amber-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {currentReelItem.type === "SINGLE" ? "單選題" : "複選題"}
              </span>
            </div>

            {/* Reel Content (Stems flying by) */}
            <div className="min-h-[90px] flex items-center justify-center px-2">
              <p
                className={`text-base sm:text-lg font-semibold text-foreground line-clamp-3 leading-relaxed transition-all duration-100 ${
                  phase === "ROLLING" ? "blur-[0.5px] scale-[0.98]" : "scale-100 font-bold"
                }`}
              >
                {phase === "LOCKED" ? questions[0]?.stem || currentReelItem.stem : currentReelItem.stem}
              </p>
            </div>

            {/* Glowing Scanlines overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl bg-[linear-gradient(rgba(255,255,255,0.02)_50%,transparent_50%)] bg-[length:100%_4px]" />
          </div>

          {/* Cards Mini Showcase Strip */}
          <div className="flex items-center justify-center gap-2 overflow-hidden py-2">
            {questions.slice(0, 5).map((q, idx) => (
              <div
                key={q.id || idx}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-game border transition-all duration-300 ${
                  phase === "LOCKED"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300 scale-100 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-white/[0.04] border-white/[0.08] text-foreground-muted scale-95 opacity-50"
                }`}
              >
                第 {idx + 1} 題 ✦
              </div>
            ))}
            {questions.length > 5 && (
              <div className="px-2.5 py-1.5 rounded-xl text-xs font-bold font-game text-foreground-muted bg-white/[0.04] border border-white/[0.08]">
                +{questions.length - 5} 題...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Giant Countdown 3, 2, 1, GO! */
        <div className="relative z-10 py-12 flex flex-col items-center justify-center">
          <div className="relative">
            {/* Pulsating Ring */}
            <div className="w-40 h-40 rounded-full border-4 border-white/20 animate-ping absolute inset-0 m-auto pointer-events-none" />
            <div
              className={`w-36 h-36 rounded-full flex items-center justify-center font-game font-black text-6xl shadow-2xl transition-all duration-300 transform scale-110 ${
                countdownNum === 3
                  ? "bg-rose-500/20 text-rose-400 border-4 border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.6)]"
                  : countdownNum === 2
                  ? "bg-amber-500/20 text-amber-400 border-4 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.6)]"
                  : countdownNum === 1
                  ? "bg-emerald-500/20 text-emerald-400 border-4 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.6)]"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-4 border-white shadow-[0_0_60px_rgba(139,92,246,0.8)] scale-125"
              }`}
            >
              {countdownNum}
            </div>
          </div>
          <p className="mt-8 text-sm font-game font-bold text-foreground-muted tracking-wider">
            {countdownNum === "GO!" ? "🚀 戰鬥開始！全速衝刺！" : "即將開始作答..."}
          </p>
        </div>
      )}

      {/* Manual Skip Button */}
      <div className="relative z-10 mt-6">
        <button
          type="button"
          onClick={onComplete}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all touch-tactile"
        >
          跳過動畫，直接進入作答 ➔
        </button>
      </div>
    </div>
  );
}
