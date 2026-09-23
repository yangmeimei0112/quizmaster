"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Swords,
  PlusCircle,
  LogIn,
  Dices,
  Trophy,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import AnimalAvatarPicker from "@/components/battle/AnimalAvatarPicker";
import { battleAudio } from "@/lib/battleAudio";

export default function BattlePortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"CREATE" | "JOIN">("CREATE");

  // Create Room Form State
  const [hostName, setHostName] = useState("");
  const [hostAvatar, setHostAvatar] = useState("shiba");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<"CUSTOM" | "EXAM_50">("CUSTOM");
  const [questionCount, setQuestionCount] = useState(10);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [orderMode, setOrderMode] = useState<"SAME" | "RANDOM">("SAME");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join Room Form State
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinAvatar, setJoinAvatar] = useState("panda");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    battleAudio.playClick();
    setIsCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/battle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: hostName.trim() || "房主",
          hostAvatar,
          settings: {
            maxPlayers,
            mode,
            questionCount: mode === "EXAM_50" ? 50 : questionCount,
            orderMode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "創建房間失敗");
      }

      // Store player identification for this room in localStorage
      localStorage.setItem(`battle_player_${data.room.code}`, data.playerId);
      router.push(`/battle/${data.room.code}`);
    } catch (err: any) {
      setCreateError(err.message);
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    battleAudio.playClick();
    setIsJoining(true);
    setJoinError("");

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError("請輸入4碼房間代碼");
      setIsJoining(false);
      return;
    }

    try {
      const res = await fetch("/api/battle/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          playerName: joinName.trim() || "冒險者",
          playerAvatar: joinAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "加入房間失敗");
      }

      // Store player identification
      localStorage.setItem(`battle_player_${cleanCode}`, data.playerId);
      router.push(`/battle/${cleanCode}`);
    } catch (err: any) {
      setJoinError(err.message);
      setIsJoining(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a0a0c] via-[#050506] to-[#020203] border border-white/[0.08] p-6 sm:p-10 text-foreground shadow-2xl shadow-black/80">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-20 w-72 h-72 rounded-full bg-purple-600/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 top-1/2 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-game bg-accent/20 text-[#9AA5FF] border border-accent/30 shadow-[0_0_20px_rgba(94,106,210,0.3)]">
            <Swords className="w-4 h-4 text-accent-bright" />
            <span>多人連線競技模式 · 4碼代碼極速開戰</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight font-game text-foreground">
            QuizMaster 多人即時對戰競技場
          </h1>

          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            與朋友或同學們同台競技！自訂人數創建專屬 4 碼房間，全員答題即時同步、右上角實況看板即時超車，搭配街機風抽題滾輪與任天堂三層冠軍頒獎台，帶來最熱血的刷題體驗。
          </p>

          {/* Quick Stats Highlights */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground font-game font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              12 款日系可愛動物頭像
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground font-game font-bold">
              <Dices className="w-3.5 h-3.5 text-cyan-400" />
              街機老虎機抽卡過場
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground font-game font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              3 級榮耀結算頒獎台
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs (Create Room / Join Room) */}
      <div className="space-y-6">
        <div className="flex items-center justify-center p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("CREATE")}
            className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-game font-bold text-sm transition-all duration-200 touch-tactile flex items-center justify-center gap-2 ${
              activeTab === "CREATE"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>創建對戰房間</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("JOIN")}
            className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-game font-bold text-sm transition-all duration-200 touch-tactile flex items-center justify-center gap-2 ${
              activeTab === "JOIN"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>輸入 4 碼加入</span>
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {activeTab === "CREATE" ? (
          <form
            onSubmit={handleCreateRoom}
            className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6 max-w-2xl mx-auto"
          >
            <h2 className="text-lg font-bold font-game text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-accent-bright" />
              <span>設定對戰房間資訊</span>
            </h2>

            {createError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {createError}
              </div>
            )}

            {/* Host Nickname */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                房主暱稱
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="例如：刷題戰神、考霸小明..."
                maxLength={20}
                required
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-accent text-base text-foreground focus:outline-none transition-colors"
              />
            </div>

            {/* Animal Avatar Picker */}
            <AnimalAvatarPicker selectedId={hostAvatar} onSelect={setHostAvatar} />

            {/* Mode selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                對戰題數模式
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("CUSTOM")}
                  className={`min-h-[46px] p-3 rounded-xl border text-xs sm:text-sm font-game font-bold transition-all text-left flex flex-col gap-1 touch-tactile ${
                    mode === "CUSTOM"
                      ? "bg-accent/20 border-accent text-white shadow-glow"
                      : "bg-white/[0.03] border-white/[0.06] text-foreground-muted hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-foreground">自訂題數模式</span>
                  <span className="text-[11px] text-foreground-muted font-normal">
                    可自由選擇 5/10/20 題速戰速決
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("EXAM_50")}
                  className={`min-h-[46px] p-3 rounded-xl border text-xs sm:text-sm font-game font-bold transition-all text-left flex flex-col gap-1 touch-tactile ${
                    mode === "EXAM_50"
                      ? "bg-accent/20 border-accent text-white shadow-glow"
                      : "bg-white/[0.03] border-white/[0.06] text-foreground-muted hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-foreground">50 題全真模擬考</span>
                  <span className="text-[11px] text-foreground-muted font-normal">
                    標準 50 題檢定規格深度較量
                  </span>
                </button>
              </div>
            </div>

            {/* Question count if CUSTOM */}
            {mode === "CUSTOM" && (
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                  自訂題數 (可選 5/10/20 題或自填)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setQuestionCount(num);
                        setIsCustomCount(false);
                      }}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-game font-bold border transition-all touch-tactile ${
                        !isCustomCount && questionCount === num
                          ? "bg-white/[0.15] text-white border-white/40 shadow-sm"
                          : "bg-white/[0.02] text-foreground-muted border-white/[0.05]"
                      }`}
                    >
                      {num} 題
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomCount(true)}
                    className={`min-h-[44px] py-2 rounded-xl text-xs font-game font-bold border transition-all touch-tactile ${
                      isCustomCount
                        ? "bg-accent/30 text-white border-accent shadow-sm"
                        : "bg-white/[0.02] text-foreground-muted border-white/[0.05]"
                    }`}
                  >
                    自填題數
                  </button>
                </div>

                {isCustomCount && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value) || 1))}
                      placeholder="輸入題數..."
                      className="w-32 min-h-[44px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.12] focus:border-accent text-base text-foreground font-game font-bold text-center"
                    />
                    <span className="text-xs text-foreground-muted font-game">
                      題 (請輸入 1 ~ 100)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Order mode */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                題目順序模式
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderMode("SAME")}
                  className={`min-h-[46px] p-3 rounded-xl border text-xs sm:text-sm font-game font-bold transition-all text-left touch-tactile ${
                    orderMode === "SAME"
                      ? "bg-accent/20 border-accent text-white shadow-glow"
                      : "bg-white/[0.03] border-white/[0.06] text-foreground-muted hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-foreground">全員題目順序相同</span>
                  <p className="text-[11px] text-foreground-muted font-normal mt-0.5">
                    所有人面臨相同題目的即時對決
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderMode("RANDOM")}
                  className={`min-h-[46px] p-3 rounded-xl border text-xs sm:text-sm font-game font-bold transition-all text-left touch-tactile ${
                    orderMode === "RANDOM"
                      ? "bg-accent/20 border-accent text-white shadow-glow"
                      : "bg-white/[0.03] border-white/[0.06] text-foreground-muted hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-foreground">題目隨機亂序</span>
                  <p className="text-[11px] text-foreground-muted font-normal mt-0.5">
                    每位玩家各自打亂順序，防止偷看
                  </p>
                </button>
              </div>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                房間人數上限：{maxPlayers} 人 (2 ~ 10 人)
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-[#5E6AD2]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full min-h-[52px] px-6 py-3 rounded-2xl font-game font-black text-base bg-accent hover:bg-accent-bright text-white shadow-glow transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 touch-tactile"
              >
                <span>{isCreating ? "正在建立房間..." : "立即創建對戰房間"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Join Room */
          <form
            onSubmit={handleJoinRoom}
            className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6 max-w-2xl mx-auto"
          >
            <h2 className="text-lg font-bold font-game text-foreground flex items-center gap-2">
              <LogIn className="w-5 h-5 text-accent-bright" />
              <span>輸入 4 碼房間代碼加入</span>
            </h2>

            {joinError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {joinError}
              </div>
            )}

            {/* 4-digit Code input */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                4 碼房間代碼 (英數不分大小寫)
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="例如：R7X2"
                maxLength={4}
                required
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-white/[0.04] border-2 border-white/[0.12] focus:border-amber-400 text-center font-mono font-black text-2xl tracking-[0.4em] text-amber-300 focus:outline-none transition-all placeholder:text-foreground-muted/40 uppercase"
              />
            </div>

            {/* Player Nickname */}
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                玩家暱稱
              </label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="輸入你的遊戲暱稱..."
                maxLength={20}
                required
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-accent text-base text-foreground focus:outline-none transition-colors"
              />
            </div>

            {/* Animal Avatar Picker */}
            <AnimalAvatarPicker selectedId={joinAvatar} onSelect={setJoinAvatar} />

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isJoining || joinCode.length < 4}
                className="w-full min-h-[52px] px-6 py-3 rounded-2xl font-game font-black text-base bg-accent hover:bg-accent-bright disabled:opacity-40 text-white shadow-glow transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 touch-tactile"
              >
                <span>{isJoining ? "正在加入房間..." : "加入對戰房間"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Switch Style Game Rules & Features Section */}
      <div className="pt-8 border-t border-white/[0.06] space-y-6">
        <div className="text-center space-y-1">
          <h3 className="font-game font-bold text-xl text-foreground">
            🎮 多人對戰競技特色介紹
          </h3>
          <p className="text-xs text-foreground-muted">
            專為團隊模擬檢定、班級競賽、考前衝刺打造的全功能遊戲化系統
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              🐕
            </div>
            <h4 className="font-game font-bold text-sm text-foreground">12 款動物頭像</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              柴犬、熊貓、赤狐、小獅等 12 種日系 Switch 向量可愛動物，隨心自選代表出戰。
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              🎰
            </div>
            <h4 className="font-game font-bold text-sm text-foreground">街機抽題過場</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              全員準備後觸發震撼的老虎機抽卡過場，真實題目滾動定格，伴隨 3-2-1-GO 倒數。
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              📊
            </div>
            <h4 className="font-game font-bold text-sm text-foreground">即時動態看板</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              右上角懸浮即時顯示所有人的答題進度、答對錯題數與排名變化，體驗超車刺激感。
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              🏆
            </div>
            <h4 className="font-game font-bold text-sm text-foreground">三層頒獎典禮</h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              對戰結束後展開任天堂風金、銀、銅牌三層頒獎台，並提供完整名次數據與再來一局。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
