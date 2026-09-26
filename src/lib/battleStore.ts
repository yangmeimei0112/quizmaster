// Battle Room in-memory state store with cross-device real-time sync

export type BattleStage = "LOBBY" | "DRAWING" | "PLAYING" | "FINISHED";

export interface BattlePlayer {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  isFinished: boolean;
  finishedAt?: number;
  lastActiveAt: number;
}

export interface BattleSettings {
  maxPlayers: number; // 2 ~ 10
  mode: "CUSTOM" | "EXAM_50"; // custom question count or 50 mock exam
  questionCount: number; // 5, 10, 20, or custom number, or 50 if EXAM_50
  orderMode: "SAME" | "RANDOM"; // same order for all vs randomized order
  category?: string; // "ALL" or specific category
}

export interface BattleQuestion {
  id: string;
  stem: string;
  type: "SINGLE" | "MULTIPLE";
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string;
  explanation?: string | null;
  category?: string | null;
  difficulty?: string;
  imageUrl?: string | null;
}

export interface BattleReviewItem {
  questionIndex: number;
  question: BattleQuestion;
  userAnswer: string[];
  isCorrect: boolean;
}

export interface BattleRoom {
  code: string; // 4-digit numeric string (1000 ~ 9999), e.g. "8520"
  hostId: string;
  settings: BattleSettings;
  stage: BattleStage;
  players: BattlePlayer[];
  questions: BattleQuestion[];
  samplePool?: Array<{ id: string; stem: string; category?: string | null; type: string }>;
  playerQuestionOrders?: Record<string, string[]>; // if orderMode === "RANDOM", maps playerId to questionId array
  drawingStartTime?: number;
  playingStartTime?: number;
  createdAt: number;
  updatedAt: number;
}

// Global persistence across Next.js dev & node worker
const globalForBattle = globalThis as unknown as {
  __battleRoomsStore?: Map<string, BattleRoom>;
};

if (!globalForBattle.__battleRoomsStore) {
  globalForBattle.__battleRoomsStore = new Map<string, BattleRoom>();
}

const roomsStore = globalForBattle.__battleRoomsStore;

let lastCleanupTime = 0;

// Clean up stale rooms older than 2 hours or empty rooms older than 5 minutes
export function cleanupStaleRooms(force: boolean = false) {
  const now = Date.now();
  // Throttle automatic cleanups to at most once per 60 seconds unless forced
  if (!force && now - lastCleanupTime < 60000) {
    return;
  }
  lastCleanupTime = now;

  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const [code, room] of roomsStore.entries()) {
    if (
      room.updatedAt < twoHoursAgo ||
      (room.players.length === 0 && room.updatedAt < fiveMinutesAgo)
    ) {
      roomsStore.delete(code);
    }
  }
}

// 4-digit numeric code generator (1000 ~ 9999, non-zero first digit, purely numeric)
export function generateRoomCode(): string {
  cleanupStaleRooms(true);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = String(Math.floor(Math.random() * 9000) + 1000);
    if (!roomsStore.has(code)) {
      return code;
    }
  }
  // Fallback: scan available 1000~9999 sequentially if dense
  for (let c = 1000; c <= 9999; c++) {
    const code = String(c);
    if (!roomsStore.has(code)) {
      return code;
    }
  }
  throw new Error("房間代碼已用盡，無法建立更多房間");
}

// Fisher-Yates shuffle
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createRoom(
  hostName: string,
  hostAvatar: string,
  settings: Partial<BattleSettings> = {}
): { room: BattleRoom; playerId: string } {
  const code = generateRoomCode();
  const hostId = "p_" + Math.random().toString(36).substring(2, 10);

  const cleanSettings: BattleSettings = {
    maxPlayers: Math.min(Math.max(Number(settings.maxPlayers) || 4, 2), 10),
    mode: settings.mode === "EXAM_50" ? "EXAM_50" : "CUSTOM",
    questionCount:
      settings.mode === "EXAM_50" ? 50 : Math.max(Number(settings.questionCount) || 10, 1),
    orderMode: settings.orderMode === "RANDOM" ? "RANDOM" : "SAME",
    category: settings.category || "ALL",
  };

  const hostPlayer: BattlePlayer = {
    id: hostId,
    name: hostName.trim() || "房主",
    avatarId: hostAvatar || "shiba",
    isHost: true,
    isReady: true,
    currentIndex: 0,
    correctCount: 0,
    wrongCount: 0,
    score: 0,
    isFinished: false,
    lastActiveAt: Date.now(),
  };

  const room: BattleRoom = {
    code,
    hostId,
    settings: cleanSettings,
    stage: "LOBBY",
    players: [hostPlayer],
    questions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  roomsStore.set(code, room);
  return { room, playerId: hostId };
}

export function getRoom(code: string): BattleRoom | null {
  cleanupStaleRooms();
  const upperCode = code.trim().toUpperCase();
  const room = roomsStore.get(upperCode);
  if (!room) return null;

  // Check if room has expired (> 2 hours inactive)
  if (Date.now() - room.updatedAt > 2 * 60 * 60 * 1000) {
    roomsStore.delete(upperCode);
    return null;
  }

  // Auto transition from DRAWING to PLAYING if drawing animation time (5.0s) has passed
  if (room.stage === "DRAWING" && room.drawingStartTime) {
    if (Date.now() - room.drawingStartTime >= 5000) {
      room.stage = "PLAYING";
      room.playingStartTime = room.playingStartTime || Date.now();
      room.updatedAt = Date.now();
    }
  }

  return room;
}

export function joinRoom(
  code: string,
  playerName: string,
  playerAvatar: string,
  existingPlayerId?: string
): { room: BattleRoom; playerId: string } {
  const upperCode = code.trim().toUpperCase();
  const room = getRoom(upperCode);

  if (!room) {
    throw new Error("查無此房間代碼，請確認代碼是否正確");
  }

  // If reconnecting with an existing player ID already present in the room
  if (existingPlayerId) {
    let existingPlayer = room.players.find((p) => p.id === existingPlayerId);
    if (existingPlayer) {
      existingPlayer.lastActiveAt = Date.now();
      room.updatedAt = Date.now();
      return { room, playerId: existingPlayer.id };
    } else if (
      room.stage === "PLAYING" ||
      room.stage === "DRAWING" ||
      room.stage === "FINISHED"
    ) {
      existingPlayer = {
        id: existingPlayerId,
        name: playerName.trim() || "冒險者",
        avatarId: playerAvatar || "panda",
        isHost: room.hostId === existingPlayerId,
        isReady: true,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        score: 0,
        isFinished: false,
        lastActiveAt: Date.now(),
      };
      if (
        room.questions.length > 0 &&
        (!room.playerQuestionOrders || !room.playerQuestionOrders[existingPlayerId])
      ) {
        if (!room.playerQuestionOrders) room.playerQuestionOrders = {};
        const qIds = room.questions.map((q) => q.id);
        room.playerQuestionOrders[existingPlayerId] =
          room.settings.orderMode === "RANDOM" ? shuffleArray(qIds) : [...qIds];
      }
      room.players.push(existingPlayer);
      room.updatedAt = Date.now();
      return { room, playerId: existingPlayer.id };
    }
  }

  if (room.stage !== "LOBBY") {
    throw new Error("對戰已在進行中或已結束，無法加入此房間");
  }

  if (room.players.length >= room.settings.maxPlayers) {
    throw new Error(`房間人數已達上限 (${room.settings.maxPlayers} 人)`);
  }

  const trimmedName = playerName.trim() || "冒險者";
  // Handle duplicate nickname in room
  let finalName = trimmedName;
  let counter = 2;
  while (room.players.some((p) => p.name === finalName)) {
    finalName = `${trimmedName} (${counter})`;
    counter++;
  }

  const playerId = "p_" + Math.random().toString(36).substring(2, 10);
  const newPlayer: BattlePlayer = {
    id: playerId,
    name: finalName,
    avatarId: playerAvatar || "panda",
    isHost: false,
    isReady: false,
    currentIndex: 0,
    correctCount: 0,
    wrongCount: 0,
    score: 0,
    isFinished: false,
    lastActiveAt: Date.now(),
  };

  room.players.push(newPlayer);
  room.updatedAt = Date.now();
  return { room, playerId };
}

export function getPlayerProgress(
  code: string,
  playerId: string
): { player: BattlePlayer; room: BattleRoom } | null {
  const room = getRoom(code);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;
  player.lastActiveAt = Date.now();
  return { player, room };
}

export function reconnectPlayer(
  code: string,
  playerId: string,
  progress?: Partial<BattlePlayer> & { name?: string; avatarId?: string }
): { room: BattleRoom; player: BattlePlayer } {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");

  let player = room.players.find((p) => p.id === playerId);
  if (!player) {
    if (
      room.stage === "PLAYING" ||
      room.stage === "DRAWING" ||
      room.stage === "FINISHED" ||
      (room.playerQuestionOrders && playerId in room.playerQuestionOrders)
    ) {
      player = {
        id: playerId,
        name: progress?.name?.trim() || "冒險者",
        avatarId: progress?.avatarId || "shiba",
        isHost: room.hostId === playerId,
        isReady: true,
        currentIndex: progress?.currentIndex || 0,
        correctCount: progress?.correctCount || 0,
        wrongCount: progress?.wrongCount || 0,
        score: progress?.score || 0,
        isFinished: progress?.isFinished || false,
        finishedAt: progress?.finishedAt,
        lastActiveAt: Date.now(),
      };
      if (
        room.questions.length > 0 &&
        (!room.playerQuestionOrders || !room.playerQuestionOrders[playerId])
      ) {
        if (!room.playerQuestionOrders) room.playerQuestionOrders = {};
        const qIds = room.questions.map((q) => q.id);
        room.playerQuestionOrders[playerId] =
          room.settings.orderMode === "RANDOM" ? shuffleArray(qIds) : [...qIds];
      }
      room.players.push(player);
    } else {
      throw new Error("玩家不在該房間內，無法重新連線");
    }
  }

  player.lastActiveAt = Date.now();
  if (progress) {
    if (typeof progress.currentIndex === "number" && progress.currentIndex > player.currentIndex) {
      player.currentIndex = progress.currentIndex;
    }
    if (typeof progress.score === "number" && progress.score > player.score) {
      player.score = progress.score;
    }
    if (typeof progress.correctCount === "number" && progress.correctCount > player.correctCount) {
      player.correctCount = progress.correctCount;
    }
    if (typeof progress.wrongCount === "number" && progress.wrongCount > player.wrongCount) {
      player.wrongCount = progress.wrongCount;
    }
    if (typeof progress.isFinished === "boolean") {
      player.isFinished = progress.isFinished;
    }
    if (typeof progress.finishedAt === "number") {
      player.finishedAt = progress.finishedAt;
    }
  }
  room.updatedAt = Date.now();
  return { room, player };
}

export function toggleReady(
  code: string,
  playerId: string,
  explicitReady?: boolean
): BattleRoom {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");

  if (room.stage !== "LOBBY") {
    throw new Error("房間非等待階段，無法變更準備狀態");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("玩家不存在於此房間");

  player.isReady = explicitReady !== undefined ? explicitReady : !player.isReady;
  player.lastActiveAt = Date.now();
  room.updatedAt = Date.now();
  return room;
}

export function updateAvatar(
  code: string,
  playerId: string,
  avatarId: string
): BattleRoom {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");

  if (room.stage !== "LOBBY") {
    throw new Error("房間非等待階段，無法更換頭像");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("玩家不存在於此房間");

  player.avatarId = avatarId;
  player.lastActiveAt = Date.now();
  room.updatedAt = Date.now();
  return room;
}

export function updateRoomSettings(
  code: string,
  hostId: string,
  settings: Partial<BattleSettings>
): BattleRoom {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");
  if (room.hostId !== hostId) throw new Error("只有房主可以變更房間設定");
  if (room.stage !== "LOBBY") throw new Error("對戰已開始，無法變更設定");

  if (settings.maxPlayers !== undefined) {
    room.settings.maxPlayers = Math.min(Math.max(Number(settings.maxPlayers) || 4, 2), 10);
  }
  if (settings.mode !== undefined) {
    room.settings.mode = settings.mode === "EXAM_50" ? "EXAM_50" : "CUSTOM";
    if (room.settings.mode === "EXAM_50") {
      room.settings.questionCount = 50;
    }
  }
  if (settings.questionCount !== undefined && room.settings.mode !== "EXAM_50") {
    room.settings.questionCount = Math.max(Number(settings.questionCount) || 10, 1);
  }
  if (settings.orderMode !== undefined) {
    room.settings.orderMode = settings.orderMode === "RANDOM" ? "RANDOM" : "SAME";
  }
  if (settings.category !== undefined) {
    room.settings.category = settings.category;
  }

  room.updatedAt = Date.now();
  return room;
}

export function startBattle(
  code: string,
  hostId: string,
  drawnQuestions: BattleQuestion[],
  samplePool?: Array<{ id: string; stem: string; category?: string | null; type: string }>
): BattleRoom {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");
  if (room.hostId !== hostId) throw new Error("只有房主可以開始對戰");
  if (room.stage !== "LOBBY") throw new Error("房間目前非等待階段");

  // Validate all players ready
  const unready = room.players.filter((p) => !p.isHost && !p.isReady);
  if (unready.length > 0) {
    throw new Error(`還有 ${unready.length} 位玩家尚未準備就緒`);
  }

  if (drawnQuestions.length === 0) {
    throw new Error("題庫抽取數量不足，無法開始對戰");
  }

  room.questions = drawnQuestions;
  room.samplePool =
    samplePool && samplePool.length > 0
      ? samplePool
      : drawnQuestions.map((q) => ({ id: q.id, stem: q.stem, category: q.category, type: q.type }));
  room.stage = "DRAWING";
  room.drawingStartTime = Date.now();
  room.playingStartTime = Date.now() + 5000; // Expected playing start after draw animation

  // Prepare question order for each player
  room.playerQuestionOrders = {};
  const questionIds = drawnQuestions.map((q) => q.id);

  room.players.forEach((player) => {
    player.currentIndex = 0;
    player.correctCount = 0;
    player.wrongCount = 0;
    player.score = 0;
    player.isFinished = false;
    player.finishedAt = undefined;
    player.lastActiveAt = Date.now();

    if (room.settings.orderMode === "RANDOM") {
      room.playerQuestionOrders![player.id] = shuffleArray(questionIds);
    } else {
      room.playerQuestionOrders![player.id] = [...questionIds];
    }
  });

  room.updatedAt = Date.now();
  return room;
}

export function updatePlayerProgress(
  code: string,
  playerId: string,
  progress: {
    currentIndex: number;
    correctCount: number;
    wrongCount: number;
    score: number;
    isFinished: boolean;
  }
): BattleRoom {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");

  if (room.stage === "LOBBY") {
    throw new Error("對戰尚未開始，非進行中階段");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("玩家不存在於此房間");

  player.currentIndex = progress.currentIndex;
  player.correctCount = progress.correctCount;
  player.wrongCount = progress.wrongCount;
  player.score = progress.score;
  player.isFinished = progress.isFinished;
  if (progress.isFinished && !player.finishedAt) {
    player.finishedAt = Date.now();
  }
  player.lastActiveAt = Date.now();

  // If all players have finished, advance room stage to FINISHED
  if (room.players.length > 0 && room.players.every((p) => p.isFinished)) {
    room.stage = "FINISHED";
  }

  room.updatedAt = Date.now();
  return room;
}

export function leaveRoom(
  code: string,
  playerId: string
): { success: boolean; room: BattleRoom | null } {
  const room = getRoom(code);
  if (!room) return { success: true, room: null };

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return { success: true, room };

  const leavingPlayer = room.players[playerIndex];
  room.players.splice(playerIndex, 1);

  if (room.players.length === 0) {
    roomsStore.delete(room.code);
    return { success: true, room: null };
  }

  // If host leaves, transfer host to next player
  if (leavingPlayer.isHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.players[0].isReady = true;
    room.hostId = room.players[0].id;
  }

  // If during battle, check if remaining players finished
  if (room.stage === "PLAYING" && room.players.every((p) => p.isFinished)) {
    room.stage = "FINISHED";
  }

  room.updatedAt = Date.now();
  return { success: true, room };
}

export function resetBattle(code: string, hostId: string): BattleRoom {
  const room = getRoom(code);
  if (!room) throw new Error("房間不存在");
  if (room.hostId !== hostId) throw new Error("只有房主可以重置對戰");

  room.stage = "LOBBY";
  room.questions = [];
  room.samplePool = undefined;
  room.drawingStartTime = undefined;
  room.playingStartTime = undefined;
  room.playerQuestionOrders = {};

  room.players.forEach((p) => {
    p.currentIndex = 0;
    p.correctCount = 0;
    p.wrongCount = 0;
    p.score = 0;
    p.isFinished = false;
    p.finishedAt = undefined;
    p.isReady = p.isHost; // host remains ready, others reset to unready
    p.lastActiveAt = Date.now();
  });

  room.updatedAt = Date.now();
  return room;
}
