"use client";

import React, { useState } from "react";
import { BattleRoom, BattleSettings } from "@/lib/battleStore";
import AnimalAvatar from "./AnimalAvatar";
import AnimalAvatarPicker from "./AnimalAvatarPicker";
import {
  Copy,
  Check,
  Crown,
  Users,
  Swords,
  Settings2,
  LogOut,
  Play,
  Shuffle,
  ListOrdered,
  Sparkles,
  Palette,
} from "lucide-react";
import { battleAudio } from "@/lib/battleAudio";

interface RoomLobbyViewProps {
  room: BattleRoom;
  currentPlayerId: string;
  categories?: string[];
  onStartGame: () => Promise<void>;
  onToggleReady: () => Promise<void>;
  onUpdateAvatar: (avatarId: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<BattleSettings>) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

export default function RoomLobbyView({
  room,
  currentPlayerId,
  categories = [],
  onStartGame,
  onToggleReady,
  onUpdateAvatar,
  onUpdateSettings,
  onLeaveRoom,
}: RoomLobbyViewProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [isCustomCount, setIsCustomCount] = useState(
    ![5, 10, 20].includes(room.settings.questionCount)
  );

  const myPlayer = room.players.find((p) => p.id === currentPlayerId);
  const isHost = myPlayer?.isHost || false;

  const nonHostPlayers = room.players.filter((p) => !p.isHost);
  const allReady = nonHostPlayers.length === 0 || nonHostPlayers.every((p) => p.isReady);

  const copyCode = () => {
    battleAudio.playClick();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    battleAudio.playClick();
    const url = typeof window !== "undefined" ? `${window.location.origin}/battle/${room.code}` : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStart = async () => {
    if (!allReady || isStarting) return;
    battleAudio.playClick();
    setIsStarting(true);
    try {
      await onStartGame();
    } catch (err: any) {
      alert(err.message || "發起對戰失敗");
      setIsStarting(false);
    }
  };

  const handleReady = async () => {
    battleAudio.playClick();
    setIsTogglingReady(true);
    try {
      await onToggleReady();
    } finally {
      setIsTogglingReady(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Top Header Room Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-accent/15 via-white/[0.04] to-purple-500/10 border border-white/[0.12] shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-game bg-accent/20 text-[#9AA5FF] border border-accent/30 mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>
                房間等待中 · {room.players.length} / {room.settings.maxPlayers} 人
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-game text-foreground tracking-tight flex items-center gap-3">
              對戰房間代碼：
              <span className="font-mono text-3xl sm:text-4xl tracking-widest text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                {room.code}
              </span>
            </h1>
          </div>

          {/* Quick Copy Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold font-game bg-white/[0.06] hover:bg-white/[0.12] text-foreground border border-white/10 flex items-center gap-1.5 transition-all touch-tactile"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "已複製代碼" : "複製代碼"}</span>
            </button>

            <button
              type="button"
              onClick={copyLink}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold font-game bg-white/[0.06] hover:bg-white/[0.12] text-foreground border border-white/10 flex items-center gap-1.5 transition-all touch-tactile"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              <span>{copiedLink ? "已複製連結" : "複製邀請連結"}</span>
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all touch-tactile"
              title="離開房間"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Waiting Room Layout: Players List & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Players Grid (2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-game text-foreground flex items-center gap-2">
              <Swords className="w-4 h-4 text-accent-bright" />
              <span>房間參賽選手 ({room.players.length} / {room.settings.maxPlayers})</span>
            </h2>

            {/* Quick change avatar button */}
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#9AA5FF] hover:text-white bg-accent/15 hover:bg-accent/25 border border-accent/30 flex items-center gap-1.5 transition-colors touch-tactile"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>更換頭像</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {room.players.map((player) => {
              const isMe = player.id === currentPlayerId;

              return (
                <div
                  key={player.id}
                  onClick={() => isMe && setShowAvatarModal(true)}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 ${
                    isMe
                      ? "cursor-pointer bg-white/[0.06] border-white/30 shadow-lg ring-1 ring-white/20 hover:scale-[1.02]"
                      : "bg-white/[0.02] border-white/[0.06]"
                  }`}
                >
                  <AnimalAvatar
                    id={player.avatarId}
                    size="lg"
                    isGlowing={player.isReady || player.isHost}
                    animate={isMe}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-foreground truncate">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-game font-bold flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          房主
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] text-[#9AA5FF] font-game">(你)</span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="mt-1.5">
                      {player.isHost ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-game font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Crown className="w-3 h-3" />
                          等待開賽
                        </span>
                      ) : player.isReady ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-game font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse">
                          <Check className="w-3 h-3 stroke-[3]" />
                          已就緒
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-game text-foreground-muted bg-white/[0.04] border border-white/[0.08]">
                          準備中...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, room.settings.maxPlayers - room.players.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-4 rounded-2xl border border-dashed border-white/[0.08] flex items-center justify-center text-foreground-muted text-xs font-game gap-2 min-h-[88px]"
                >
                  <Users className="w-4 h-4 opacity-40" />
                  <span>等待玩家加入...</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: Room Settings & Action Buttons */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4 backdrop-blur-xl">
            <h3 className="text-sm font-bold font-game text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-accent-bright" />
              <span>對戰規則設定 {isHost && <span className="text-xs text-[#9AA5FF]">(房主可調整)</span>}</span>
            </h3>

            {/* Mode selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                對戰題數模式
              </label>
              {isHost ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ mode: "CUSTOM" })}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-game font-bold border transition-all touch-tactile ${
                      room.settings.mode === "CUSTOM"
                        ? "bg-accent text-white border-accent shadow-glow"
                        : "bg-white/[0.04] text-foreground-muted border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    自訂題數
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ mode: "EXAM_50" })}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-game font-bold border transition-all touch-tactile ${
                      room.settings.mode === "EXAM_50"
                        ? "bg-accent text-white border-accent shadow-glow"
                        : "bg-white/[0.04] text-foreground-muted border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    50題模擬考
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-game font-bold text-foreground">
                  {room.settings.mode === "EXAM_50" ? "50 題全真模擬考模式" : `自訂 ${room.settings.questionCount} 題模式`}
                </div>
              )}
            </div>

            {/* Custom Question Count buttons */}
            {room.settings.mode === "CUSTOM" && isHost && (
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                  抽取題目數量 (5/10/20 題或自填)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setIsCustomCount(false);
                        onUpdateSettings({ questionCount: num });
                      }}
                      className={`min-h-[44px] py-1.5 rounded-xl text-xs font-game font-bold border transition-all touch-tactile ${
                        !isCustomCount && room.settings.questionCount === num
                          ? "bg-white/[0.15] text-white border-white/30 shadow-sm"
                          : "bg-white/[0.02] text-foreground-muted border-white/[0.04]"
                      }`}
                    >
                      {num} 題
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomCount(true)}
                    className={`min-h-[44px] py-1.5 rounded-xl text-xs font-game font-bold border transition-all touch-tactile ${
                      isCustomCount
                        ? "bg-accent/30 text-white border-accent shadow-sm"
                        : "bg-white/[0.02] text-foreground-muted border-white/[0.04]"
                    }`}
                  >
                    自填
                  </button>
                </div>

                {isCustomCount && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={room.settings.questionCount}
                      onChange={(e) =>
                        onUpdateSettings({
                          questionCount: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      placeholder="輸入題數..."
                      className="w-28 min-h-[44px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.12] focus:border-accent text-base text-foreground font-game font-bold text-center"
                    />
                    <span className="text-xs text-foreground-muted font-game">
                      題 (請輸入 1 ~ 100)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Order Mode (Same vs Random) */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                題目順序機制
              </label>
              {isHost ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ orderMode: "SAME" })}
                    className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-game font-bold border transition-all flex items-center justify-center gap-1.5 touch-tactile ${
                      room.settings.orderMode === "SAME"
                        ? "bg-white/[0.15] text-white border-white/30 shadow-sm"
                        : "bg-white/[0.02] text-foreground-muted border-white/[0.04]"
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>全員同序</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ orderMode: "RANDOM" })}
                    className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-game font-bold border transition-all flex items-center justify-center gap-1.5 touch-tactile ${
                      room.settings.orderMode === "RANDOM"
                        ? "bg-white/[0.15] text-white border-white/30 shadow-sm"
                        : "bg-white/[0.02] text-foreground-muted border-white/[0.04]"
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>隨機亂序</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-game text-foreground">
                  {room.settings.orderMode === "RANDOM" ? "隨機亂序 (各自洗牌作答)" : "全員同序 (作答順序一致)"}
                </div>
              )}
            </div>

            {/* Max players slider / selector */}
            {isHost && (
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                  房間人數上限 (2 ~ 10 人)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={room.settings.maxPlayers}
                    onChange={(e) => onUpdateSettings({ maxPlayers: Number(e.target.value) })}
                    className="flex-1 accent-[#5E6AD2]"
                  />
                  <span className="font-game font-bold text-xs text-foreground px-2">
                    {room.settings.maxPlayers} 人
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button: Ready / Start */}
          <div className="space-y-2 pt-2">
            {isHost ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={!allReady || isStarting}
                className={`w-full min-h-[52px] px-6 py-3 rounded-2xl font-game font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 touch-tactile shadow-xl ${
                  allReady
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 animate-pulse"
                    : "bg-white/[0.06] text-foreground-muted border border-white/[0.08] cursor-not-allowed"
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {isStarting
                    ? "正在抽選題目..."
                    : allReady
                    ? "全員就緒 · 開始對戰！"
                    : "等待玩家全員準備就緒..."}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReady}
                disabled={isTogglingReady}
                className={`w-full min-h-[52px] px-6 py-3 rounded-2xl font-game font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 touch-tactile ${
                  myPlayer?.isReady
                    ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                    : "bg-accent hover:bg-accent-bright text-white shadow-glow"
                }`}
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{myPlayer?.isReady ? "已準備就緒 (點擊取消)" : "準備就緒 (READY)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && myPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0a0a0e] border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="font-game font-bold text-base text-foreground flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent-bright" />
                <span>更換出戰動物頭像</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <AnimalAvatarPicker
              selectedId={myPlayer.avatarId}
              onSelect={async (newId) => {
                await onUpdateAvatar(newId);
                setShowAvatarModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
