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
  const [encoded, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

async function runTests() {
  console.log("=== 開始執行 Auth 與 模擬考/錯題 整合測試 ===");

  // 1. 密碼雜湊與驗證測試
  const testPass = "P@ssw0rd2026";
  const hashed = hashPassword(testPass);
  const isMatch = verifyPassword(testPass, hashed);
  const isBadMatch = verifyPassword("WrongPassword", hashed);
  console.log(`[測試 1] 密碼雜湊比對: 正確密碼=${isMatch}, 錯誤密碼=${isBadMatch}`);
  if (!isMatch || isBadMatch) throw new Error("密碼加鹽驗證邏輯錯誤");

  // 2. Token 簽發與驗證測試
  const dummyPayload = { userId: "test_user_id_123", username: "tester01", name: "測試員" };
  const token = createSessionToken(dummyPayload);
  const verified = verifySessionToken(token);
  console.log(`[測試 2] Token 簽章驗證: userId=${verified.userId}, username=${verified.username}`);
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
  const totalQuestions = await prisma.question.count();
  console.log(`[測試 5] 題庫總題數: ${totalQuestions} 題 (模擬考門檻: >= 50 題)`);
  if (totalQuestions < 50) throw new Error(`題庫題數不足 50 題，目前僅有 ${totalQuestions} 題`);

  // 5. 模擬 50 題模擬考抽題
  const mock50 = await prisma.question.findMany({ take: 50 });
  console.log(`[測試 6] 抽出 50 題模擬試卷: 總題數 ${mock50.length} 題, 總分 ${mock50.length * 2} 分`);
  if (mock50.length !== 50) throw new Error("無法抽出 50 題");

  // 6. 模擬答錯 3 題並寫入 WrongQuestionRecord
  const wrongQ1 = mock50[0];
  const wrongQ2 = mock50[1];
  const wrongQ3 = mock50[2];

  // 第一次答錯寫入
  await prisma.wrongQuestionRecord.upsert({
    where: { userId_questionId: { userId: user.id, questionId: wrongQ1.id } },
    update: { wrongCount: { increment: 1 }, lastUserAnswer: "B" },
    create: { userId: user.id, questionId: wrongQ1.id, wrongCount: 1, lastUserAnswer: "B" },
  });

  // 第二次同題目再錯，累計 wrongCount = 2
  await prisma.wrongQuestionRecord.upsert({
    where: { userId_questionId: { userId: user.id, questionId: wrongQ1.id } },
    update: { wrongCount: { increment: 1 }, lastUserAnswer: "C" },
    create: { userId: user.id, questionId: wrongQ1.id, wrongCount: 1, lastUserAnswer: "C" },
  });

  await prisma.wrongQuestionRecord.upsert({
    where: { userId_questionId: { userId: user.id, questionId: wrongQ2.id } },
    update: { wrongCount: { increment: 1 }, lastUserAnswer: "A" },
    create: { userId: user.id, questionId: wrongQ2.id, wrongCount: 1, lastUserAnswer: "A" },
  });

  // 更新 Question 上的 wrongCount
  await prisma.question.update({
    where: { id: wrongQ1.id },
    data: { wrongCount: { increment: 2 } },
  });
  await prisma.question.update({
    where: { id: wrongQ2.id },
    data: { wrongCount: { increment: 1 } },
  });

  // 7. 驗證個人錯題本查詢與排序
  const personalWrongs = await prisma.wrongQuestionRecord.findMany({
    where: { userId: user.id },
    include: { question: true },
    orderBy: [{ wrongCount: "desc" }, { updatedAt: "desc" }],
  });
  console.log(`[測試 7] 個人錯題紀錄筆數: ${personalWrongs.length} 題`);
  if (personalWrongs.length !== 2) throw new Error("個人錯題紀錄數量不符");
  console.log(`[測試 8] 榜首錯題做錯次數: ${personalWrongs[0].wrongCount} 次 (預期: 2 次)`);
  if (personalWrongs[0].wrongCount !== 2) throw new Error("錯題累計次數不正確");

  // 8. 驗證全站高頻錯題排行
  const globalWrongs = await prisma.question.findMany({
    where: { wrongCount: { gt: 0 } },
    orderBy: { wrongCount: "desc" },
    take: 10,
  });
  console.log(`[測試 9] 全站高頻錯題榜首: ${globalWrongs[0].stem.slice(0, 20)}... (錯題次數: ${globalWrongs[0].wrongCount})`);
  if (globalWrongs[0].wrongCount < 2) throw new Error("全站錯題次數未正確反映");

  // 9. 清理測試資料
  await prisma.wrongQuestionRecord.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("[測試 10] 測試資料清理完畢");

  console.log("=== 所有 Auth、50題模擬考、錯題排行榜整合測試 100% 全部通過！ ===");
}

runTests()
  .catch((e) => {
    console.error("測試失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
