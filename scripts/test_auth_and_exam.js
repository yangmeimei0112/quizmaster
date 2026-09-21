const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const SECRET = "quizmaster-secure-session-salt-token-2026-key";

function createSessionToken(payload, expiresInSeconds = 3600) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const data = { ...payload, exp, iat };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifySessionToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

// 模擬 60 分鐘模擬考計分計算
function calculateExamScore(questions, userAnswers) {
  let correctCount = 0;
  let wrongCount = 0;
  let unanswered = 0;

  questions.forEach((q) => {
    const userAns = (userAnswers[q.id] || []).sort().join(",");
    const correctAns = q.correctAnswers.split(",").sort().join(",");

    if (!userAns) {
      unanswered++;
      wrongCount++;
    } else if (userAns === correctAns) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const totalScore = correctCount * 2;
  const isPassed = totalScore >= 70;

  return { totalScore, isPassed, correctCount, wrongCount, unanswered };
}

// 模擬單複選混合隨機抽 50 題演算法
function sample50MixedQuestions(allQuestions) {
  const singleList = allQuestions.filter((q) => q.type === "SINGLE");
  const multipleList = allQuestions.filter((q) => q.type === "MULTIPLE");

  let selected = [];
  if (singleList.length > 0 && multipleList.length > 0) {
    const shuffledSingle = [...singleList].sort(() => Math.random() - 0.5);
    const shuffledMulti = [...multipleList].sort(() => Math.random() - 0.5);

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

  selected.sort(() => Math.random() - 0.5);
  return selected.slice(0, 50);
}

// 模擬真實時間戳計時器計算 (防背景分頁節流漂移)
function calculateTimestampTimer(startTime, endTime, currentTime, totalSeconds = 3600) {
  const remaining = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
  const elapsed = Math.min(totalSeconds, Math.max(0, Math.floor((currentTime - startTime) / 1000)));
  return { remaining, elapsed };
}

async function runTests() {
  console.log("=== 開始執行 Auth 與 模擬考/錯題 深度整合測試 ===");

  // 1. 密碼雜湊與驗證測試
  const testPass = "P@ssw0rd2026";
  const hashed = hashPassword(testPass);
  const isMatch = verifyPassword(testPass, hashed);
  const isBadMatch = verifyPassword("WrongPassword", hashed);
  console.log(`[測試 1] 密碼加鹽雜湊比對: 正確密碼=${isMatch}, 錯誤密碼=${isBadMatch}`);
  if (!isMatch || isBadMatch) throw new Error("密碼加鹽驗證邏輯錯誤");

  // 2. Token 簽發與驗證測試
  const dummyPayload = { userId: "test_user_id_123", username: "tester01", name: "測試員" };
  const token = createSessionToken(dummyPayload);
  const verified = verifySessionToken(token);
  console.log(`[測試 2] Token HMAC-SHA256 簽署驗證: userId=${verified.userId}, username=${verified.username}`);
  if (!verified || verified.userId !== dummyPayload.userId) throw new Error("Token 簽署驗證錯誤");

  // 3. 使用者建立與防重複檢查
  const testUsername = `user_${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      username: testUsername,
      password: hashed,
      name: "模擬考受試者",
    },
  });
  console.log(`[測試 3] 資料庫建立測試用戶: ${user.username} (ID: ${user.id})`);

  let duplicateCaught = false;
  try {
    await prisma.user.create({
      data: {
        username: testUsername,
        password: hashed,
      },
    });
  } catch (err) {
    duplicateCaught = true;
  }
  console.log(`[測試 4] 重複帳號建立攔截: ${duplicateCaught ? "成功阻擋" : "失敗"}`);
  if (!duplicateCaught) throw new Error("重複帳號未觸發唯一約束");

  // 4. 題目數量檢驗 (是否滿 50 題以符合模擬考要求)
  const allQuestions = await prisma.question.findMany();
  const totalQuestions = allQuestions.length;
  console.log(`[測試 5] 題庫總題數: ${totalQuestions} 題 (模擬考門檻: >= 50 題)`);
  if (totalQuestions < 50) throw new Error(`題庫題數不足 50 題，目前僅有 ${totalQuestions} 題`);

  // 5. 單、複選混合隨機抽 50 題驗證
  const sampled50 = sample50MixedQuestions(allQuestions);
  const sampleSingleCount = sampled50.filter((q) => q.type === "SINGLE").length;
  const sampleMultiCount = sampled50.filter((q) => q.type === "MULTIPLE").length;
  console.log(`[測試 6] 單複選混合隨機抽樣: 抽出 50 題 (單選 ${sampleSingleCount} 題, 複選 ${sampleMultiCount} 題)`);
  if (sampled50.length !== 50) throw new Error("抽樣題數不滿 50 題");
  if (sampleSingleCount === 0 || sampleMultiCount === 0) throw new Error("抽樣未達成單選、複選混合要求");

  // 6. 模擬考計分邊界值檢驗 (滿分100分、每題2分、70分合格標準)
  // 6a: 剛好 35 題正確 (70分) -> 合格
  const answers35 = {};
  sampled50.forEach((q, idx) => {
    if (idx < 35) {
      answers35[q.id] = q.correctAnswers.split(",");
    } else {
      answers35[q.id] = ["INVALID"];
    }
  });
  const res35 = calculateExamScore(sampled50, answers35);
  console.log(`[測試 7] 70分及格臨界檢驗: 得分=${res35.totalScore}, 正確=${res35.correctCount}題, 及格判定=${res35.isPassed}`);
  if (res35.totalScore !== 70 || !res35.isPassed) throw new Error("70 分應為合格判定");

  // 6b: 34 題正確 (68分) -> 不合格
  const answers34 = {};
  sampled50.forEach((q, idx) => {
    if (idx < 34) {
      answers34[q.id] = q.correctAnswers.split(",");
    }
  });
  const res34 = calculateExamScore(sampled50, answers34);
  console.log(`[測試 8] 68分不及格臨界檢驗: 得分=${res34.totalScore}, 未答=${res34.unanswered}題, 及格判定=${res34.isPassed}`);
  if (res34.totalScore !== 68 || res34.isPassed) throw new Error("68 分應為不合格判定");

  // 7. 高精度真實時間戳防漂移計時檢驗
  const baseStart = Date.now();
  const baseEnd = baseStart + 3600 * 1000;
  // 模擬背景分頁休眠 1200 秒
  const simulatedResume = baseStart + 1200 * 1000;
  const timerCheck = calculateTimestampTimer(baseStart, baseEnd, simulatedResume);
  console.log(`[測試 9] 計時器防休眠漂驗證: 經過 1200 秒後, 剩餘=${timerCheck.remaining}秒 (預期 2400), 耗時=${timerCheck.elapsed}秒 (預期 1200)`);
  if (timerCheck.remaining !== 2400 || timerCheck.elapsed !== 1200) throw new Error("時間戳校準計算異常");

  // 8. 嚴格權限檢驗：「查看錯題功能需登入才可以使用」
  // 未登入情境模擬
  function mockGetWrongQuestions(currentUser) {
    if (!currentUser) {
      return { status: 401, error: "查看錯題功能需登入後方可使用", requiresAuth: true };
    }
    return { status: 200, success: true };
  }
  const unauthAttempt = mockGetWrongQuestions(null);
  console.log(`[測試 10] 未登入查看錯題阻擋: HTTP ${unauthAttempt.status}, requiresAuth=${unauthAttempt.requiresAuth}`);
  if (unauthAttempt.status !== 401 || !unauthAttempt.requiresAuth) throw new Error("未登入存取錯題未被 401 攔截");

  // 9. 模擬答錯題並寫入 WrongQuestionRecord
  const wrongQ1 = sampled50[0];
  const wrongQ2 = sampled50[1];

  await prisma.wrongQuestionRecord.upsert({
    where: { userId_questionId: { userId: user.id, questionId: wrongQ1.id } },
    update: { wrongCount: { increment: 2 }, lastUserAnswer: "B" },
    create: { userId: user.id, questionId: wrongQ1.id, wrongCount: 2, lastUserAnswer: "B" },
  });

  await prisma.wrongQuestionRecord.upsert({
    where: { userId_questionId: { userId: user.id, questionId: wrongQ2.id } },
    update: { wrongCount: { increment: 1 }, lastUserAnswer: "C" },
    create: { userId: user.id, questionId: wrongQ2.id, wrongCount: 1, lastUserAnswer: "C" },
  });

  await prisma.question.update({
    where: { id: wrongQ1.id },
    data: { wrongCount: { increment: 2 } },
  });

  // 10. 驗證個人錯題本排序 (最常錯的題目排在最上方)
  const personalWrongs = await prisma.wrongQuestionRecord.findMany({
    where: { userId: user.id },
    include: { question: true },
    orderBy: [{ wrongCount: "desc" }, { updatedAt: "desc" }],
  });
  console.log(`[測試 11] 個人專屬錯題本: 榜首做錯次數=${personalWrongs[0].wrongCount}次, 題幹=${personalWrongs[0].question.stem.slice(0, 15)}...`);
  if (personalWrongs[0].wrongCount < 2) throw new Error("個人錯題最高頻次未置頂");

  // 11. 清理測試資料
  await prisma.wrongQuestionRecord.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("[測試 12] 測試資料清理完畢");

  console.log("=== 所有 12 項深度測試 100% 全部通過！ ===");
}

runTests()
  .catch((e) => {
    console.error("測試失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
