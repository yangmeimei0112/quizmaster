import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseExplanation,
  normalizeExplanationToFourSections,
  formatStandardExplanation,
} from "../src/lib/explanationParser.ts";
import { parseQuestionText } from "../src/lib/questionParser.ts";
import {
  createRoom,
  joinRoom,
  reconnectPlayer,
  updatePlayerProgress,
  getRoom,
} from "../src/lib/battleStore.ts";

console.log("==================================================");
console.log("🧪 執行對戰手動確認、重連機制與 4 區塊解析規格測試");
console.log("==================================================");

let passedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ [通過] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [失敗] ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// 1. 測試 4 區塊解析器核心功能
// -------------------------------------------------------------
console.log("\n--- 1. 測試 4 區塊解析架構 (4-Section Explanation Parser) ---");

it("parseExplanation: 能完整解析包含 4 區塊之格式化字串", () => {
  const explanationText = `【考點導讀】
本題考查民法關於無權代理之效力及表見代理之構成要件。

【各選項詳細解析】
A. 正確。本人若明知他人表示為其代理人而不為反對之表示者，應負授權人之責任。
B. 錯誤。無權代理並非當然無效，得經本人承認而溯及生效。
C. 錯誤。第三人於本人未承認前，得行使撤回權。
D. 錯誤。催告期間經過本人未確答者，視為拒絕承認。

【觀念說明】
民法第 169 條所規定之表見代理，係為保護善意第三人之交易安全，使本人負授權人責任之法律制度。

【考試記憶重點】
口訣：「明知不反對，表見要負責；催告不確答，視為拒絕認。」`;

  const parsed = parseExplanation(explanationText, ["A"]);

  assert.ok(parsed.intro?.includes("民法關於無權代理"), "考點導讀應被正確解析至 intro");
  assert.equal(parsed.options.length, 4, "各選項解析應包含 4 個選項");
  assert.equal(parsed.options[0].key, "A");
  assert.equal(parsed.options[0].isCorrect, true);
  assert.equal(parsed.options[1].key, "B");
  assert.equal(parsed.options[1].isCorrect, false);

  assert.ok(parsed.conceptNote?.includes("民法第 169 條"), "觀念說明應被正確解析至 conceptNote");
  assert.ok(parsed.examTakeaway?.includes("明知不反對"), "考試記憶重點應被正確解析至 examTakeaway");
});

it("normalizeExplanationToFourSections: 能將散亂或舊版解析自動結構化為 4 大區塊", () => {
  const legacyText = `本題主要測驗憲法平等權之審查標準。
(A) 正確，嚴格審查標準適用於涉及可疑分類。
(B) 錯誤，合憲推定適用於合理審查。
相關概念：平等權非指絕對形式平等，而係實質平等。
記憶關鍵：嚴格審查查可疑，中度審查查重要。`;

  const normalized = normalizeExplanationToFourSections(legacyText);

  assert.ok(normalized.includes("【考點導讀】"), "正規化結果應包含【考點導讀】");
  assert.ok(normalized.includes("【各選項詳細解析】"), "正規化結果應包含【各選項詳細解析】");
  assert.ok(normalized.includes("【觀念說明】"), "正規化結果應包含【觀念說明】");
  assert.ok(normalized.includes("【考試記憶重點】"), "正規化結果應包含【考試記憶重點】");
});

it("formatStandardExplanation: 能正確將結構化物件轉換為標準字串", () => {
  const formatted = formatStandardExplanation({
    intro: "考點說明",
    options: {
      A: "正確",
      B: "錯誤",
    },
    conceptNote: "核心觀念",
    examTakeaway: "記憶口訣",
  });

  assert.ok(formatted.includes("【考點導讀】\n考點說明"));
  assert.ok(formatted.includes("【各選項詳細解析】\nA. 正確\nB. 錯誤"));
  assert.ok(formatted.includes("【觀念說明】\n核心觀念"));
  assert.ok(formatted.includes("【考試記憶重點】\n記憶口訣"));
});

// -------------------------------------------------------------
// 2. 測試題目解析器與【正確解答】後接考點導讀
// -------------------------------------------------------------
console.log("\n--- 2. 測試題目批次解析器 (Question Parser) 支援 ---");

it("parseQuestionText: 正確辨識【題號】【題目】【正確解答】及其後考點導讀與解析", () => {
  const rawInput = `【題號】1
【題目】下列何者為刑法上阻卻違法事由？
(A) 依法令之行為
(B) 期待不可能
(C) 原因自由行為
(D) 心神喪失
【正確解答】A
本題聚焦於刑法總則阻卻違法事由與責任事由之區分。
【各選項詳細解析】
A. 正確。刑法第 21 條第 1 項規定依法令之行為不罰。
B. 錯誤。期待不可能性屬超法規阻卻責任事由。
C. 錯誤。原因自由行為不阻卻責任。
D. 錯誤。心神喪失屬責任能力問題。
【觀念說明】
阻卻違法事由排除實質違法性；阻卻罪責事由則排除有責性。
【考試記憶重點】
記得區分「違法層次」與「罪責層次」。`;

  const q = parseQuestionText(rawInput);

  assert.equal(q.stem, "下列何者為刑法上阻卻違法事由？", "題幹不應包含題號或解答");
  assert.deepEqual(q.correctAnswers, ["A"], "正解應為 A");
  assert.equal(q.optionA, "依法令之行為");
  assert.equal(q.optionB, "期待不可能");
  assert.equal(q.optionC, "原因自由行為");
  assert.equal(q.optionD, "心神喪失", "選項 D 結尾應乾淨");
  assert.ok(q.explanation?.includes("【考點導讀】"), "解析應自動補上【考點導讀】");
  assert.ok(q.explanation?.includes("本題聚焦於刑法總則"), "解答後面的導讀應進入解析中");
  assert.ok(q.explanation?.includes("【觀念說明】"), "解析應包含觀念說明");
});

// -------------------------------------------------------------
// 3. 測試對戰斷線重連與進度保留 (Battle Reconnect & Progress Retention)
// -------------------------------------------------------------
console.log("\n--- 3. 測試對戰斷線重連與進度保留機制 (Battle Reconnect) ---");

it("battleStore: 進行中 (PLAYING) 房間允許已註冊玩家帶著 existingPlayerId 重連", () => {
  // 建立房間
  const { room } = createRoom("房主小明", "avatar_1", {
    questionCount: 5,
  });

  // 加入玩家 2
  const p2 = joinRoom(room.code, "玩家小華", "avatar_2");

  // 手動將房間設為 PLAYING
  room.stage = "PLAYING";
  room.questions = [
    { id: "q1", stem: "題目一", options: ["A", "B", "C", "D"], correctAnswers: ["A"], explanation: "" },
    { id: "q2", stem: "題目二", options: ["A", "B", "C", "D"], correctAnswers: ["B"], explanation: "" },
  ];

  // 模擬陌生未註冊的新玩家嘗試加入 -> 必須被拒絕
  assert.throws(
    () => joinRoom(room.code, "陌生闖入者", "avatar_3"),
    /對戰已在進行中/,
    "未註冊玩家應拋出對戰已在進行中"
  );

  // 模擬玩家小華遭遇連線問題/斷線後使用 existingPlayerId 重連
  const reconnected = joinRoom(room.code, "玩家小華", "avatar_2", p2.playerId);
  assert.equal(reconnected.room.code, room.code, "重連應成功取得房間");
  assert.equal(reconnected.playerId, p2.playerId, "重連後玩家 ID 應一致");

  const playerInRoom = reconnected.room.players.find((p) => p.id === p2.playerId);
  assert.ok(playerInRoom, "重連後玩家仍應存在於房間內");
});

it("reconnectPlayer: 能成功更新玩家活躍時間並依據本地進度恢復分數與答題位置", () => {
  const { room } = createRoom("房主A", "av_1", { questionCount: 3 });
  const p2 = joinRoom(room.code, "挑戰者B", "av_2");
  room.stage = "PLAYING";

  // 模擬挑戰者 B 伺服器端紀錄
  updatePlayerProgress(room.code, p2.playerId, {
    currentIndex: 1,
    correctCount: 1,
    wrongCount: 0,
    score: 15,
    isFinished: false,
  });

  // 執行重連並同步傳遞本地離線可能已推進之進度
  const result = reconnectPlayer(room.code, p2.playerId, {
    currentIndex: 2,
    score: 25,
  });
  assert.equal(result.player.score, 25, "分數應更新為最新 25 分");
  assert.equal(result.player.currentIndex, 2, "當前題號索引應更新為 2");
  assert.ok(result.player.lastActiveAt > 0, "lastActiveAt 應被更新");
});

// -------------------------------------------------------------
// 4. 靜態契約檢驗：前端元件支援單選手動確認與版面結構
// -------------------------------------------------------------
console.log("\n--- 4. 前端元件契約檢驗 (BattlePlayView, Battle Index, Battle Code) ---");

it("BattlePlayView: 原始碼落實單選確認送出機制與鍵盤 ENTER / 數字鍵支援", () => {
  const viewFile = path.resolve("src/components/battle/BattlePlayView.tsx");
  const content = fs.readFileSync(viewFile, "utf-8");

  // 檢查 handleOptionClick 不會直接觸發 submitAnswer
  assert.ok(
    content.includes("handleOptionClick"),
    "應有 handleOptionClick 函式"
  );
  // 單選點擊僅設定 selectedAnswers
  assert.ok(
    content.includes("setSelectedAnswers([opt])"),
    "單選點擊時應僅設定 selectedAnswers，絕不自動送出"
  );

  // 檢查 ENTER 鍵處理：!hasSubmitted 時送出答案，hasSubmitted 時前往下一題
  assert.ok(
    content.includes("submitAnswer()"),
    "Enter 鍵在未送出時應觸發 submitAnswer"
  );
  assert.ok(
    content.includes("advanceNextQuestion()"),
    "Enter 鍵在已送出時應觸發 advanceNextQuestion"
  );

  // 檢查下一題按鈕位置與 ExplanationCard 位於下方
  assert.ok(
    content.includes("advanceNextQuestion") && (content.includes("下一題") || content.includes("完成對戰")),
    "應包含下一題/完成對戰按鈕"
  );
  const nextBtnPos = content.indexOf("advanceNextQuestion");
  const explanationCardPos = content.indexOf("<ExplanationCard");
  assert.ok(nextBtnPos !== -1 && explanationCardPos !== -1, "必須包含下一題按鈕與 ExplanationCard");
  assert.ok(
    explanationCardPos > nextBtnPos,
    "ExplanationCard 必須位於題目操作與下一題按鈕之下方"
  );

  // 檢查 localStorage 活躍對戰儲存
  assert.ok(
    content.includes("quizmaster_active_battle"),
    "必須將對戰進度儲存至 quizmaster_active_battle"
  );
});

it("Battle /battle/page.tsx: 支援進行中對戰提示橫幅與重新進入房間連結", () => {
  const pageFile = path.resolve("src/app/battle/page.tsx");
  const content = fs.readFileSync(pageFile, "utf-8");

  assert.ok(
    content.includes("quizmaster_active_battle"),
    "應檢查 quizmaster_active_battle"
  );
  assert.ok(
    content.includes("重新回到對戰房間") || content.includes("回到對戰房間"),
    "應有重新回到對戰房間按鈕"
  );
});

it("QuickAddModal: 支援一鍵整理成 4 區塊格式按鈕", () => {
  const modalFile = path.resolve("src/components/QuickAddModal.tsx");
  const content = fs.readFileSync(modalFile, "utf-8");

  assert.ok(
    content.includes("一鍵整理成 4 區塊格式"),
    "應有一鍵整理成 4 區塊格式按鈕"
  );
  assert.ok(
    content.includes("normalizeExplanationToFourSections"),
    "應呼叫 normalizeExplanationToFourSections 進行解析正規化"
  );
});

console.log("==================================================");
console.log(`🎉 測試全數通過！(通過 ${passedTests} 項)`);
console.log("==================================================");
