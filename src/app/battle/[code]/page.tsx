"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { BattleRoom, BattleSettings } from "@/lib/battleStore";
import RoomLobbyView from "@/components/battle/RoomLobbyView";
import QuestionDrawAnimation from "@/components/battle/QuestionDrawAnimation";
import BattlePlayView from "@/components/battle/BattlePlayView";
import BattlePodiumView from "@/components/battle/BattlePodiumView";
import AnimalAvatarPicker from "@/components/battle/AnimalAvatarPicker";
import { Swords, ArrowLeft, RefreshCw, AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { battleAudio } from "@/lib/battleAudio";

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("quizmaster_device_id");
    if (!id || typeof id !== "string" || !id.trim()) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = crypto.randomUUID();
      } else {
        id = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      }
      localStorage.setItem("quizmaster_device_id", id);
    }
    return id.trim();
  } catch {
    return "dev_fallback_" + Math.random().toString(36).substring(2, 10);
  }
}

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = typeof params?.code === "string" ? params.code.trim() : "";
  const isValidCode = Boolean(rawParam.length === 4 && /^[1-9][0-9]{3}$/.test(rawParam));
  const roomCode = isValidCode ? rawParam : rawParam.replace(/\D/g, "").slice(0, 4);

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Room Dissolution State & Refs
  const [isDissolved, setIsDissolved] = useState<boolean>(false);
  const [dissolvedReason, setDissolvedReason] = useState<string>("房主已離開，房間已解散");
  const isDissolvedRef = useRef<boolean>(false);
  const isLeavingRef = useRef<boolean>(false);
  const roomRef = useRef<BattleRoom | null>(null);

  // Duplicate Device Kick State & Refs
  const [isKicked, setIsKicked] = useState<boolean>(false);
  const isKickedRef = useRef<boolean>(false);
  const playerIdRef = useRef<string>("");

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Client-side idempotency replay barrier for arcade drawing animation
  const completedDrawingSessionsRef = useRef<Set<number>>(new Set());

  // Player battle answer history: questionId -> array of selected option keys
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});

  // Need to Join Modal (if user accessed /battle/CODE directly without join form)
  const [showDirectJoin, setShowDirectJoin] = useState(false);
  const [directName, setDirectName] = useState("");
  const [directAvatar, setDirectAvatar] = useState("shiba");
  const [joiningDirect, setJoiningDirect] = useState(false);
  const [samplePool, setSamplePool] = useState<
    Array<{ id: string; stem: string; category?: string | null; type: string }>
  >([]);

  // Fetch latest room state
  const fetchRoom = useCallback(async (): Promise<BattleRoom | null> => {
    if (!isValidCode) return null;
    if (isDissolvedRef.current || isKickedRef.current) return null;
    try {
      const res = await fetch(`/api/battle/${roomCode}`);
      if (!res.ok) {
        let errData: any = null;
        try {
          errData = await res.json();
        } catch {}

        // Detect dissolution:
        // 1. Explicit server response code ROOM_DISSOLVED
        // 2. Error message mentioning dissolution
        // 3. Status 404 while the user was previously waiting in LOBBY
        const isDissolvedEvent =
          res.status === 404 &&
          (errData?.code === "ROOM_DISSOLVED" ||
            errData?.error?.includes("解散") ||
            (roomRef.current && roomRef.current.stage === "LOBBY"));

        if (isDissolvedEvent && !isLeavingRef.current) {
          isDissolvedRef.current = true;
          setIsDissolved(true);
          if (errData?.error) {
            setDissolvedReason(errData.error);
          }
          try {
            localStorage.removeItem(`battle_player_${roomCode}`);
            localStorage.removeItem("quizmaster_active_battle");
            if (roomCode && playerId) {
              localStorage.removeItem(`battle_user_answers_${roomCode}_${playerId}`);
            }
          } catch {}
          return null;
        }

        if (res.status === 404) {
          setError("查無此房間，可能已關閉或代碼不正確。");
        } else {
          setError("獲取房間狀態失敗");
        }
        return null;
      }
      const data = await res.json();
      let updatedRoom: BattleRoom = data.room;
      if (typeof data.totalQuestionsCount === "number") {
        setTotalQuestionsCount(data.totalQuestionsCount);
      }

      // Check if client was kicked due to duplicate device join
      let currentStoredPlayerId = playerIdRef.current || "";
      if (!currentStoredPlayerId && typeof window !== "undefined") {
        try {
          currentStoredPlayerId = localStorage.getItem(`battle_player_${roomCode}`) || "";
        } catch {}
      }

      if (
        currentStoredPlayerId &&
        updatedRoom &&
        Array.isArray(updatedRoom.players) &&
        !updatedRoom.players.some((p) => p.id === currentStoredPlayerId) &&
        !isLeavingRef.current &&
        !isDissolvedRef.current &&
        !isKickedRef.current
      ) {
        isKickedRef.current = true;
        setIsKicked(true);
        try {
          localStorage.removeItem(`battle_player_${roomCode}`);
          localStorage.removeItem("quizmaster_active_battle");
          if (roomCode && currentStoredPlayerId) {
            localStorage.removeItem(`battle_user_answers_${roomCode}_${currentStoredPlayerId}`);
          }
        } catch {}
        return null;
      }

      // Clean slate on LOBBY: When room transitions to LOBBY (e.g. host resets battle),
      // ensure all players (including non-host guests) purge previous match answers and barrier
      if (updatedRoom && updatedRoom.stage === "LOBBY") {
        completedDrawingSessionsRef.current.clear();
        setUserAnswers({});
        try {
          localStorage.removeItem("quizmaster_active_battle");
        } catch {}
        if (roomCode && playerId) {
          try {
            localStorage.removeItem(`battle_user_answers_${roomCode}_${playerId}`);
          } catch {}
        }
      }

      // Sync active battle session during ongoing game for reconnect preservation
      if (updatedRoom && (updatedRoom.stage === "DRAWING" || updatedRoom.stage === "PLAYING")) {
        const me = updatedRoom.players.find((p) => p.id === playerId);
        if (me) {
          try {
            const raw = localStorage.getItem("quizmaster_active_battle");
            const existing = raw ? JSON.parse(raw) : null;
            const activeSession = {
              code: roomCode,
              playerId,
              nickname: me.name,
              avatar: me.avatarId,
              currentIndex:
                typeof existing?.currentIndex === "number"
                  ? existing.currentIndex
                  : me.currentIndex,
              correctCount: Math.max(me.correctCount, existing?.correctCount || 0),
              wrongCount: Math.max(me.wrongCount, existing?.wrongCount || 0),
              score: Math.max(me.score, existing?.score || 0),
              userAnswers:
                Object.keys(userAnswers).length > 0
                  ? userAnswers
                  : existing?.userAnswers || {},
              stage: updatedRoom.stage,
              startedAt: updatedRoom.playingStartTime || Date.now(),
              finishedAt: me.finishedAt || existing?.finishedAt,
              updatedAt: Date.now(),
            };
            localStorage.setItem("quizmaster_active_battle", JSON.stringify(activeSession));
          } catch {}
        }
      }

      // Client-side Idempotency Replay Barrier:
      // If drawing animation for this session timestamp has already finished,
      // never let a stale server DRAWING stage drag the client backwards.
      if (
        updatedRoom &&
        updatedRoom.stage === "DRAWING" &&
        updatedRoom.drawingStartTime &&
        completedDrawingSessionsRef.current.has(updatedRoom.drawingStartTime)
      ) {
        updatedRoom = {
          ...updatedRoom,
          stage: "PLAYING",
        };
      }

      setRoom(updatedRoom);
      setError("");
      return updatedRoom;
    } catch (err: any) {
      const msg: string = err?.message || "網路連線異常";
      if (
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
      ) {
        setError("伺服器喚醒中，請稍候約 30 秒後重新整理或重試");
      } else {
        setError(msg);
      }
      return null;
    }
  }, [roomCode]);

  // Initial load with reconnect & resume support
  useEffect(() => {
    if (!isValidCode) {
      setLoading(false);
      setError("房間代碼格式不正確，請輸入 4 碼純數字 (1000 ~ 9999)。");
      return;
    }

    let storedPlayerId = localStorage.getItem(`battle_player_${roomCode}`) || "";
    let activeBattleData: any = null;
    try {
      const raw = localStorage.getItem("quizmaster_active_battle");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.code === roomCode && parsed.playerId) {
          activeBattleData = parsed;
          if (!storedPlayerId) {
            storedPlayerId = parsed.playerId;
            localStorage.setItem(`battle_player_${roomCode}`, parsed.playerId);
          }
          if (parsed.userAnswers && Object.keys(parsed.userAnswers).length > 0) {
            setUserAnswers(parsed.userAnswers);
          }
        }
      }
    } catch {}

    setPlayerId(storedPlayerId);

    fetchRoom().then(async (loadedRoom) => {
      setLoading(false);
      if (loadedRoom) {
        let inRoom = loadedRoom.players.some((p) => p.id === storedPlayerId);

        // If player is not currently listed in room, but has an active battle session in progress, attempt auto-reconnect
        if (!inRoom && activeBattleData && (loadedRoom.stage === "PLAYING" || loadedRoom.stage === "DRAWING")) {
          try {
            const reconRes = await fetch(`/api/battle/${roomCode}/reconnect`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playerId: activeBattleData.playerId,
                playerName: activeBattleData.nickname,
                playerAvatar: activeBattleData.avatar,
                progress: {
                  currentIndex: activeBattleData.currentIndex,
                  score: activeBattleData.score,
                  correctCount: activeBattleData.correctCount,
                  wrongCount: activeBattleData.wrongCount,
                  finishedAt: activeBattleData.finishedAt,
                },
              }),
            });
            if (reconRes.ok) {
              const reconData = await reconRes.json();
              if (reconData.room) {
                setRoom(reconData.room);
                setPlayerId(activeBattleData.playerId);
                inRoom = true;
                setError("");
              }
            }
          } catch (err) {
            console.warn("自動重連對戰嘗試失敗:", err);
          }
        }

        if (!storedPlayerId || !inRoom) {
          if (loadedRoom.stage === "LOBBY") {
            setShowDirectJoin(true);
          } else {
            setError("此對戰已在進行中或已結束，目前無法加入。");
          }
        }
      }
    });
  }, [roomCode, fetchRoom]);

  // Load cached answers for current battle room session
  useEffect(() => {
    if (!roomCode || !playerId) return;
    if (room?.stage === "LOBBY") {
      setUserAnswers({});
      try {
        localStorage.removeItem(`battle_user_answers_${roomCode}_${playerId}`);
      } catch {}
      return;
    }
    try {
      const cached = localStorage.getItem(`battle_user_answers_${roomCode}_${playerId}`);
      if (cached) {
        setUserAnswers(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to load cached battle user answers:", e);
    }
  }, [roomCode, playerId, room?.stage]);

  // Record an answer selection in state & localStorage
  const handleRecordAnswer = useCallback(
    (questionId: string, answers: string[]) => {
      setUserAnswers((prev) => {
        const next = { ...prev, [questionId]: answers };
        try {
          if (roomCode && playerId) {
            localStorage.setItem(
              `battle_user_answers_${roomCode}_${playerId}`,
              JSON.stringify(next)
            );
          }
        } catch (e) {
          console.error("Failed to cache battle user answers:", e);
        }
        return next;
      });
    },
    [roomCode, playerId]
  );

  // Smart Adaptive Polling during LOBBY and FINISHED stage
  const isFetchingRoomRef = useRef(false);
  useEffect(() => {
    if (!room) return;
    if (room.stage !== "LOBBY" && room.stage !== "FINISHED") return;

    let timer: NodeJS.Timeout | null = null;
    let isActive = true;

    const poll = async () => {
      if (!isActive || isFetchingRoomRef.current || isDissolvedRef.current || isKickedRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(poll, 4000);
        return;
      }

      isFetchingRoomRef.current = true;
      try {
        await fetchRoom();
      } catch (err) {
        // Silently tolerate network hiccups
      } finally {
        isFetchingRoomRef.current = false;
        if (isActive && !isDissolvedRef.current && !isKickedRef.current) {
          timer = setTimeout(poll, 1500);
        }
      }
    };

    timer = setTimeout(poll, 1500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive && !isDissolvedRef.current && !isKickedRef.current) {
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [room?.stage, fetchRoom]);

  // Auto-redirect timer when room is dissolved (3.5s)
  useEffect(() => {
    if (!isDissolved) return;
    const timer = setTimeout(() => {
      router.push("/battle");
    }, 3500);
    return () => clearTimeout(timer);
  }, [isDissolved, router]);

  // Auto-redirect timer when kicked due to duplicate device (3.5s)
  useEffect(() => {
    if (!isKicked) return;
    const timer = setTimeout(() => {
      router.push("/battle");
    }, 3500);
    return () => clearTimeout(timer);
  }, [isKicked, router]);

  // Handle direct join modal submit
  const handleDirectJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    battleAudio.playClick();
    setJoiningDirect(true);

    try {
      const res = await fetch("/api/battle/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: roomCode,
          playerName: directName.trim() || "冒險者",
          playerAvatar: directAvatar,
          deviceId: getOrCreateDeviceId(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "加入房間失敗");
      }

      setPlayerId(data.playerId);
      localStorage.setItem(`battle_player_${roomCode}`, data.playerId);
      setRoom(data.room);
      setError("");
      setShowDirectJoin(false);
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
      ) {
        alert("伺服器喚醒中，請稍候約 30 秒後重新整理或重試");
      } else {
        alert(msg || "加入房間失敗");
      }
    } finally {
      setJoiningDirect(false);
    }
  };

  // Host starts battle
  const handleStartGame = async () => {
    if (!room || !playerId) return;

    try {
      const res = await fetch(`/api/battle/${roomCode}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: playerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "發起對戰失敗");
      }

      if (data.samplePool) {
        setSamplePool(data.samplePool);
      }
      completedDrawingSessionsRef.current.clear();
      setUserAnswers({});
      if (roomCode && playerId) {
        try {
          localStorage.removeItem(`battle_user_answers_${roomCode}_${playerId}`);
        } catch {}
      }
      setRoom(data.room);
      setError("");
    } catch (err: any) {
      const msg: string = err?.message || "發起對戰失敗，請稍後重試";
      const friendlyMsg =
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
          ? "伺服器喚醒中，請稍候約 30 秒後重新整理或重試"
          : msg;
      setError(friendlyMsg);
    }
  };

  // Toggle ready status
  const handleToggleReady = async () => {
    if (!room || !playerId) return;

    try {
      const res = await fetch(`/api/battle/${roomCode}/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
        setError("");
      } else {
        const errText = data.error || "更新準備狀態失敗";
        if (errText.includes("玩家不存在") || errText.includes("玩家不在")) {
          isKickedRef.current = true;
          setIsKicked(true);
          return;
        }
        setError(errText);
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
      ) {
        setError("伺服器喚醒中，請稍候約 30 秒後重新整理或重試");
      } else {
        setError(msg || "更新準備狀態失敗");
      }
    }
  };

  // Update Avatar
  const handleUpdateAvatar = async (avatarId: string) => {
    if (!room || !playerId) return;

    try {
      const res = await fetch(`/api/battle/${roomCode}/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, avatarId }),
      });

      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
        setError("");
      } else {
        const errText = data.error || "更新頭像失敗";
        if (errText.includes("玩家不存在") || errText.includes("玩家不在")) {
          isKickedRef.current = true;
          setIsKicked(true);
          return;
        }
        setError(errText);
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
      ) {
        setError("伺服器喚醒中，請稍候約 30 秒後重新整理或重試");
      } else {
        setError(msg || "更新頭像失敗");
      }
    }
  };

  // Host updates settings
  const handleUpdateSettings = async (settings: Partial<BattleSettings>) => {
    if (!room || !playerId) return;

    try {
      const res = await fetch(`/api/battle/${roomCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: playerId, settings }),
      });

      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
        setError("");
      } else {
        const errText = data.error || "更新房間設定失敗";
        if (errText.includes("玩家不存在") || errText.includes("玩家不在")) {
          isKickedRef.current = true;
          setIsKicked(true);
          return;
        }
        setError(errText);
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
      ) {
        setError("伺服器喚醒中，請稍候約 30 秒後重新整理或重試");
      } else {
        setError(msg || "更新房間設定失敗");
      }
    }
  };

  // Leave room
  const handleLeaveRoom = async () => {
    battleAudio.playClick();
    isLeavingRef.current = true;
    if (room && playerId) {
      try {
        await fetch(`/api/battle/${roomCode}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
      } catch (err) {}
    }
    const isOngoingBattle = room && (room.stage === "PLAYING" || room.stage === "DRAWING");
    if (!isOngoingBattle) {
      localStorage.removeItem(`battle_player_${roomCode}`);
      try {
        localStorage.removeItem("quizmaster_active_battle");
      } catch {}
      if (roomCode && playerId) {
        try {
          localStorage.removeItem(`battle_user_answers_${roomCode}_${playerId}`);
        } catch {}
      }
    }
    router.push("/battle");
  };

  // Host resets battle for "再來一局"
  const handleResetBattle = async () => {
    if (!room || !playerId) return;
    battleAudio.playClick();

    try {
      const res = await fetch(`/api/battle/${roomCode}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: playerId }),
      });

      const data = await res.json();
      if (res.ok) {
        completedDrawingSessionsRef.current.clear();
        setRoom(data.room);
        setUserAnswers({});
        setError("");
        try {
          localStorage.removeItem("quizmaster_active_battle");
          if (roomCode && playerId) {
            localStorage.removeItem(`battle_user_answers_${roomCode}_${playerId}`);
          }
        } catch {}
      } else {
        setError(data.error || "重新開局失敗");
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (
        err instanceof TypeError ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("TIMED_OUT") ||
        msg.includes("timeout")
      ) {
        setError("伺服器喚醒中，請稍候約 30 秒後重新整理或重試");
      } else {
        setError(msg || "重新開局失敗");
      }
    }
  };

  // When QuestionDrawAnimation countdown finishes
  const handleDrawAnimationComplete = () => {
    if (!room) return;
    if (room.drawingStartTime) {
      completedDrawingSessionsRef.current.add(room.drawingStartTime);
    }
    setRoom({
      ...room,
      stage: "PLAYING",
    });
  };

  // When battle ends
  const handleFinishBattle = () => {
    if (!room) return;
    setRoom({
      ...room,
      stage: "FINISHED",
    });
  };

  // Duplicate Device Kick Friendly Dialog
  if (isKicked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0a0a0e] border border-white/20 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black font-game text-foreground">
              連線已中斷
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              此裝置已在另一視窗進入，原連線已中斷
            </p>
            <p className="text-xs text-foreground-muted/70">
              即將自動返回對戰首頁...
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                battleAudio.playClick();
                router.push("/battle");
              }}
              className="w-full min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-game font-bold bg-accent hover:bg-accent-bright text-white shadow-glow flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>確認並返回對戰首頁</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Room Dissolution Friendly Dialog
  if (isDissolved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0a0a0e] border border-white/20 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black font-game text-foreground">
              房間已解散
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              {dissolvedReason || "房主已離開，房間已解散"}
            </p>
            <p className="text-xs text-foreground-muted/70">
              即將自動返回對戰首頁...
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                battleAudio.playClick();
                router.push("/battle");
              }}
              className="w-full min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-game font-bold bg-accent hover:bg-accent-bright text-white shadow-glow flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>確認並返回對戰首頁</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center animate-spin text-accent-bright">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="font-game font-bold text-sm text-foreground-muted">
          正在連接對戰房間 ({roomCode})...
        </p>
      </div>
    );
  }

  // 2. Error state (if room could not be loaded)
  if (!room) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-game text-foreground">無法進入對戰房間</h2>
        <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
          {error || "查無此房間，可能已逾期或被房主關閉。"}
        </p>
        <Link
          href="/battle"
          className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-game font-bold text-xs bg-accent hover:bg-accent-bright text-white shadow-glow transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回對戰大廳</span>
        </Link>
      </div>
    );
  }

  // Replay Barrier Check for View Router
  const isDrawingCompleted = room?.drawingStartTime
    ? completedDrawingSessionsRef.current.has(room.drawingStartTime)
    : false;
  const effectiveStage =
    room.stage === "DRAWING" && isDrawingCompleted ? "PLAYING" : room.stage;

  return (
    <div className="relative">
      {/* On-screen Action & Notification Banner */}
      {error && (
        <div className="mb-4 max-w-5xl mx-auto p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-between gap-3 animate-fade-in font-game font-bold text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs text-rose-300 hover:text-white px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 transition-colors"
          >
            關閉
          </button>
        </div>
      )}
      {/* Direct Join Modal if user arrived without session */}
      {showDirectJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <form
            onSubmit={handleDirectJoinSubmit}
            className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#0a0a0e] border border-white/20 shadow-2xl space-y-6"
          >
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-game bg-amber-500/15 text-amber-400 border border-amber-500/30">
                房間代碼：{roomCode}
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-game text-foreground">
                加入多人對戰房間
              </h2>
              <p className="text-xs text-foreground-muted">
                請輸入你的暱稱並挑選出戰動物頭像
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                你的暱稱
              </label>
              <input
                type="text"
                value={directName}
                onChange={(e) => setDirectName(e.target.value)}
                placeholder="例如：考場衝鋒王..."
                maxLength={20}
                required
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] focus:border-accent text-base text-foreground focus:outline-none"
              />
            </div>

            <AnimalAvatarPicker selectedId={directAvatar} onSelect={setDirectAvatar} />

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/battle"
                className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-game font-bold text-foreground-muted hover:text-foreground bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={joiningDirect}
                className="flex-1 min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-game font-bold bg-accent hover:bg-accent-bright text-white shadow-glow flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{joiningDirect ? "正在加入..." : "確認加入房間"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main View Router based on effectiveStage (with Replay Barrier) */}
      {effectiveStage === "LOBBY" && (
        <RoomLobbyView
          room={room}
          currentPlayerId={playerId}
          totalQuestionsCount={totalQuestionsCount}
          onStartGame={handleStartGame}
          onToggleReady={handleToggleReady}
          onUpdateAvatar={handleUpdateAvatar}
          onUpdateSettings={handleUpdateSettings}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {effectiveStage === "DRAWING" && (
        <QuestionDrawAnimation
          questions={room.questions}
          samplePool={room.samplePool || samplePool}
          mode={room.settings.mode}
          orderMode={room.settings.orderMode}
          onComplete={handleDrawAnimationComplete}
        />
      )}

      {effectiveStage === "PLAYING" && (
        <BattlePlayView
          room={room}
          currentPlayerId={playerId}
          userAnswers={userAnswers}
          onRecordAnswer={handleRecordAnswer}
          onRefreshRoom={fetchRoom}
          onFinishBattle={handleFinishBattle}
        />
      )}

      {effectiveStage === "FINISHED" && (
        <BattlePodiumView
          room={room}
          currentPlayerId={playerId}
          userAnswers={userAnswers}
          onResetBattle={handleResetBattle}
          onLeaveBattle={handleLeaveRoom}
        />
      )}
    </div>
  );
}
