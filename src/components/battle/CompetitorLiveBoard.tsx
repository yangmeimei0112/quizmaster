"use client";

import React, { useState } from "react";
import { BattlePlayer } from "@/lib/battleStore";
import AnimalAvatar from "./AnimalAvatar";
import { Trophy, ChevronUp, ChevronDown, Check, X, Crown, Users } from "lucide-react";

interface CompetitorLiveBoardProps {
  players: BattlePlayer[];
  currentPlayerId: string;
  totalQuestions: number;
}

export default function CompetitorLiveBoard({
  players,
  currentPlayerId,
  totalQuestions,
}: CompetitorLiveBoardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const prevRanksRef = React.useRef<Map<string, number>>(new Map());

  // Sort players by score (desc), correctCount (desc), currentIndex (desc), finishedAt (asc)
  const rankedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (b.currentIndex !== a.currentIndex) return b.currentIndex - a.currentIndex;
    if (a.isFinished && b.isFinished && a.finishedAt && b.finishedAt) {
      return a.finishedAt - b.finishedAt;
    }
    return 0;
  });

  // Calculate rank changes (e.g. +1 if moved up from 2 to 1, -1 if moved down)
  const rankDeltas = React.useMemo(() => {
    const deltas = new Map<string, number>();
    rankedPlayers.forEach((player, idx) => {
      const currentRank = idx + 1;
      const prevRank = prevRanksRef.current.get(player.id);
      if (prevRank !== undefined) {
        deltas.set(player.id, prevRank - currentRank);
      } else {
        deltas.set(player.id, 0);
      }
    });

    // Update ref for next calculation
    const newMap = new Map<string, number>();
    rankedPlayers.forEach((p, idx) => newMap.set(p.id, idx + 1));
    prevRanksRef.current = newMap;

    return deltas;
  }, [rankedPlayers.map((p) => `${p.id}:${p.score}:${p.currentIndex}:${p.correctCount}`).join(",")]);

  return (
    <aside
      aria-label="即時對手動態看板"
      className="w-full lg:w-72 shrink-0 bg-[#07070a]/90 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-xl shadow-black/60 overflow-hidden transition-all duration-300"
    >
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <span className="font-game font-bold text-xs sm:text-sm text-foreground">
            即時戰況動態榜
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.08] text-[10px] font-game text-[#9AA5FF]">
            {players.length} 人
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/[0.06] transition-colors lg:hidden touch-tactile"
          aria-label={collapsed ? "展開戰況榜" : "收合戰況榜"}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Players List */}
      {!collapsed && (
        <div className="p-2 space-y-1.5 max-h-[360px] overflow-y-auto scroll-touch">
          {rankedPlayers.map((player, index) => {
            const isMe = player.id === currentPlayerId;
            const rank = index + 1;
            const progressPct = Math.min(
              100,
              Math.round(
                ((player.isFinished ? totalQuestions : player.currentIndex) /
                  Math.max(totalQuestions, 1)) *
                  100
              )
            );
            const delta = rankDeltas.get(player.id) || 0;

            return (
              <div
                key={player.id}
                className={`relative overflow-hidden p-2 rounded-xl transition-all duration-300 flex items-center gap-2.5 border ${
                  isMe
                    ? "bg-accent/15 border-accent/40 shadow-[0_0_15px_rgba(94,106,210,0.25)] ring-1 ring-accent/30"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                {/* Rank Badge & Delta Indicator */}
                <div className="w-7 flex flex-col items-center justify-center shrink-0">
                  {rank === 1 ? (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-black font-black text-[11px] shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                      1
                    </span>
                  ) : rank === 2 ? (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-black font-black text-[11px]">
                      2
                    </span>
                  ) : rank === 3 ? (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[11px]">
                      3
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-foreground-muted">{rank}</span>
                  )}
                  {delta > 0 && (
                    <span className="text-[9px] font-black text-emerald-400 leading-none mt-0.5 animate-pulse">
                      ↑{delta}
                    </span>
                  )}
                  {delta < 0 && (
                    <span className="text-[9px] font-black text-rose-400 leading-none mt-0.5">
                      ↓{Math.abs(delta)}
                    </span>
                  )}
                </div>

                {/* Animal Avatar */}
                <AnimalAvatar id={player.avatarId} size="xs" isGlowing={isMe} />

                {/* Player Info & Live Stats */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold truncate ${
                        isMe ? "text-accent-bright font-black" : "text-foreground"
                      }`}
                    >
                      {player.name}
                      {isMe && <span className="text-[10px] ml-1 text-[#9AA5FF]">(你)</span>}
                    </span>
                    <span className="font-game font-bold text-xs text-amber-300 shrink-0">
                      {player.score}分
                    </span>
                  </div>

                  {/* Progress Details */}
                  <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                    <span className="text-foreground-muted">
                      {player.isFinished ? (
                        <span className="text-emerald-400 font-bold">🏁 完賽</span>
                      ) : (
                        <span>
                          第 <strong className="text-foreground">{player.currentIndex + 1}</strong>/
                          {totalQuestions} 題
                        </span>
                      )}
                    </span>

                    {/* Correct / Wrong pills */}
                    <div className="flex items-center gap-1.5 font-bold font-game">
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[10px]"
                        title="答對題數"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        {player.correctCount}
                      </span>
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 text-[10px]"
                        title="答錯題數"
                      >
                        <X className="w-2.5 h-2.5 stroke-[3]" />
                        {player.wrongCount}
                      </span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full bg-white/[0.08] h-1 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        player.isFinished
                          ? "bg-emerald-400"
                          : isMe
                          ? "bg-accent-bright"
                          : "bg-[#8B96F8]"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
