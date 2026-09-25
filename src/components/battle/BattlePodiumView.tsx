"use client";

import React, { useEffect, useState } from "react";
import { BattleRoom, BattlePlayer } from "@/lib/battleStore";
import AnimalAvatar from "./AnimalAvatar";
import { battleAudio } from "@/lib/battleAudio";
import {
  Trophy,
  Crown,
  RotateCcw,
  Home,
  Medal,
  CheckCircle2,
  XCircle,
  Sparkles,
  Share2,
  BookOpen,
} from "lucide-react";
import BattleReviewPanel from "./BattleReviewPanel";
import { BattleQuestion } from "@/lib/battleStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BattlePodiumViewProps {
  room: BattleRoom;
  currentPlayerId: string;
  userAnswers?: Record<string, string[]>;
  onResetBattle?: () => Promise<void>;
  onLeaveBattle: () => void;
}

export default function BattlePodiumView({
  room,
  currentPlayerId,
  userAnswers = {},
  onResetBattle,
  onLeaveBattle,
}: BattlePodiumViewProps) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  // Play victory sound on mount
  useEffect(() => {
    battleAudio.playVictory();
  }, []);

  // Sort players for leaderboard
  const rankedPlayers = [...room.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    return 0;
  });

  const first = rankedPlayers[0];
  const second = rankedPlayers[1];
  const third = rankedPlayers[2];

  const myPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = myPlayer?.isHost || false;

  // Preserve player-specific question ordering in review
  const orderedQuestions: BattleQuestion[] = React.useMemo(() => {
    if (!room.playerQuestionOrders || !room.playerQuestionOrders[currentPlayerId]) {
      return room.questions;
    }
    const orderIds = room.playerQuestionOrders[currentPlayerId];
    const qMap = new Map(room.questions.map((q) => [q.id, q]));
    return orderIds.map((id) => qMap.get(id)).filter(Boolean) as BattleQuestion[];
  }, [room.questions, room.playerQuestionOrders, currentPlayerId]);

  // Fallback to localStorage if userAnswers is temporarily empty during hydration/reload
  const effectiveUserAnswers = React.useMemo(() => {
    if (userAnswers && Object.keys(userAnswers).length > 0) {
      return userAnswers;
    }
    if (typeof window !== "undefined" && room.code && currentPlayerId) {
      try {
        const cached = localStorage.getItem(`battle_user_answers_${room.code}_${currentPlayerId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}
    }
    return userAnswers || {};
  }, [userAnswers, room.code, currentPlayerId]);

  const handleReset = async () => {
    if (!onResetBattle) return;
    setResetting(true);
    try {
      await onResetBattle();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold font-game bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-bounce-subtle">
          <Trophy className="w-4 h-4 text-amber-300" />
          <span>對戰結算 · 榮耀頒獎台</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-game text-foreground tracking-tight drop-shadow-md">
          🏆 優勝榮耀頒獎典禮
        </h1>
        <p className="text-xs sm:text-sm text-foreground-muted">
          本場共進行 {room.questions.length} 題對決 · 恭喜所有堅持奮戰到底的答題大師！
        </p>
      </div>

      {/* Nintendo Style 3-Tier Podium */}
      <div className="relative pt-12 pb-4 px-4 overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.04] to-black/60 border border-white/[0.10] shadow-2xl backdrop-blur-xl">
        {/* Celebration Particles / Fireworks background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-4 left-1/4 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-75" />
          <div className="absolute top-12 right-1/4 w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping opacity-75" />
          <div className="absolute top-20 left-1/3 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-60" />
          <div className="absolute top-8 right-1/3 w-3 h-3 rounded-full bg-indigo-400 animate-ping opacity-60" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Podium Pillars Flexbox Container */}
        <div className="relative z-10 flex items-end justify-center gap-3 sm:gap-6 pt-16 pb-2 min-h-[320px]">
          {/* 2nd Place Pedestal (Left) */}
          {second ? (
            <div className="flex-1 max-w-[170px] flex flex-col items-center animate-fade-in-up">
              {/* Player Avatar */}
              <div className="relative mb-2 flex flex-col items-center">
                <AnimalAvatar id={second.avatarId} size="lg" isGlowing className="border-2 border-slate-300" />
                <span className="mt-1.5 text-xs font-bold text-slate-200 truncate max-w-[120px]">
                  {second.name}
                </span>
                <span className="font-game font-bold text-xs text-amber-300">{second.score} 分</span>
              </div>
              {/* Silver Pillar */}
              <div className="w-full h-32 rounded-t-2xl bg-gradient-to-b from-slate-400/30 to-slate-700/50 border-t-2 border-x-2 border-slate-300/40 flex flex-col items-center justify-start pt-3 shadow-[0_10px_30px_rgba(148,163,184,0.15)]">
                <span className="font-game font-black text-3xl text-slate-200 drop-shadow">2</span>
                <span className="text-[10px] font-game font-bold text-slate-300 mt-1">SILVER 🥈</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 max-w-[170px]" />
          )}

          {/* 1st Place Pedestal (Center - Tallest) */}
          {first && (
            <div className="flex-1 max-w-[200px] flex flex-col items-center z-10 animate-fade-in-up">
              {/* Crown & Golden Avatar */}
              <div className="relative mb-3 flex flex-col items-center">
                <div className="absolute -top-7 text-amber-400 animate-bounce">
                  <Crown className="w-8 h-8 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] fill-amber-400 stroke-amber-200" />
                </div>
                <AnimalAvatar
                  id={first.avatarId}
                  size="xl"
                  isGlowing
                  className="border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)]"
                />
                <span className="mt-2 text-sm font-black text-amber-300 truncate max-w-[150px]">
                  {first.name}
                </span>
                <span className="font-game font-black text-sm text-amber-400 shadow-glow">
                  {first.score} 分 👑
                </span>
              </div>
              {/* Gold Pillar */}
              <div className="w-full h-44 rounded-t-2xl bg-gradient-to-b from-amber-500/40 via-amber-600/30 to-amber-900/50 border-t-4 border-x-4 border-amber-400/70 flex flex-col items-center justify-start pt-3 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                <span className="font-game font-black text-5xl text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]">
                  1
                </span>
                <span className="text-xs font-game font-black text-amber-200 mt-1 tracking-wider">
                  CHAMPION 🥇
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place Pedestal (Right) */}
          {third ? (
            <div className="flex-1 max-w-[170px] flex flex-col items-center animate-fade-in-up">
              {/* Player Avatar */}
              <div className="relative mb-2 flex flex-col items-center">
                <AnimalAvatar id={third.avatarId} size="lg" isGlowing className="border-2 border-amber-700" />
                <span className="mt-1.5 text-xs font-bold text-amber-600 truncate max-w-[120px]">
                  {third.name}
                </span>
                <span className="font-game font-bold text-xs text-amber-300">{third.score} 分</span>
              </div>
              {/* Bronze Pillar */}
              <div className="w-full h-24 rounded-t-2xl bg-gradient-to-b from-amber-700/30 to-amber-950/50 border-t-2 border-x-2 border-amber-700/40 flex flex-col items-center justify-start pt-3 shadow-[0_10px_30px_rgba(180,83,9,0.15)]">
                <span className="font-game font-black text-2xl text-amber-500 drop-shadow">3</span>
                <span className="text-[10px] font-game font-bold text-amber-400 mt-1">BRONZE 🥉</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 max-w-[170px]" />
          )}
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
        <h3 className="text-base font-bold font-game text-foreground mb-4 flex items-center gap-2">
          <Medal className="w-4 h-4 text-accent-bright" />
          <span>全體參賽選手戰績總表</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-foreground-muted">
                <th className="pb-3 pl-3 font-semibold">名次</th>
                <th className="pb-3 font-semibold">選手</th>
                <th className="pb-3 text-center font-semibold">答對</th>
                <th className="pb-3 text-center font-semibold">答錯</th>
                <th className="pb-3 text-center font-semibold">正確率</th>
                <th className="pb-3 pr-3 text-right font-semibold">總得分</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rankedPlayers.map((player, idx) => {
                const totalAnswered = player.correctCount + player.wrongCount;
                const accuracy =
                  totalAnswered > 0
                    ? Math.round((player.correctCount / totalAnswered) * 100)
                    : 0;
                const isMe = player.id === currentPlayerId;

                return (
                  <tr
                    key={player.id}
                    className={`transition-colors ${
                      isMe ? "bg-accent/10 font-bold" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-3 pl-3 font-game font-bold">
                      {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : `#${idx + 1}`}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <AnimalAvatar id={player.avatarId} size="xs" />
                        <span className="truncate max-w-[140px] text-foreground">
                          {player.name} {isMe && <span className="text-[#9AA5FF]">(你)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-emerald-400 font-game font-bold">
                      {player.correctCount}
                    </td>
                    <td className="py-3 text-center text-rose-400 font-game font-bold">
                      {player.wrongCount}
                    </td>
                    <td className="py-3 text-center font-game">{accuracy}%</td>
                    <td className="py-3 pr-3 text-right font-game font-bold text-amber-300">
                      {player.score} 分
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entrance B: Battle Review & Explanation Panel */}
      <BattleReviewPanel
        questions={orderedQuestions}
        userAnswers={effectiveUserAnswers}
        collapsible={true}
        defaultExpanded={true}
        title="📝 本局考題覆盤與解析"
      />

      {/* Action Buttons: Play Again & Return */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        {isHost && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="min-h-[48px] px-6 py-3 rounded-2xl font-game font-bold text-sm bg-accent hover:bg-accent-bright text-white shadow-glow transition-all duration-200 active:scale-95 flex items-center gap-2 touch-tactile"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "正在重置..." : "再來一局 (房主重啟)"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLeaveBattle}
          className="min-h-[48px] px-6 py-3 rounded-2xl font-game font-bold text-sm bg-white/[0.06] hover:bg-white/[0.12] text-foreground border border-white/10 transition-all duration-200 active:scale-95 flex items-center gap-2 touch-tactile"
        >
          <Home className="w-4 h-4" />
          <span>返回對戰大廳</span>
        </button>
      </div>
    </div>
  );
}
