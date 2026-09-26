/**
 * challenger_m1_stress_and_edge_cases.js
 * 
 * Empirical Challenger Verification Harness for Milestone 1:
 * - Edge Cases & Unusual Payloads for POST /api/wrong-questions
 * - Atomic Counter Invariants (totalAttempts, correctCount, wrongCount, countA..countD)
 * - Concurrent Stress Testing on Atomic Increments (High Concurrency & Zero Lost Updates)
 * - Authenticated Personal Notebook Synchronization
 * - Cold Start, Fallback, and GET Endpoint Invariants
 * 
 * Target Endpoint: http://localhost:3055/api/wrong-questions
 */

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3055";
const AUTH_COOKIE_NAME = "quizmaster_session";
const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "quizmaster-secure-session-salt-token-2026-key";

function createSessionToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const data = { ...payload, exp, iat };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTestCase(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Details: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("================================================================================");
  console.log("🛡️ [EMPIRICAL CHALLENGER] Milestone 1 Stress & Adversarial Test Harness");
  console.log("================================================================================\n");

  // Fixtures tracking
  const createdQuestionIds = [];
  const createdUserIds = [];

  // Helper to create test question
  async function createTestQuestion(overrides = {}) {
    const stem = overrides.stem || `[ChallengerTest] ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const q = await prisma.question.create({
      data: {
        stem,
        normalizedStem: stem.toLowerCase().replace(/\s+/g, ""),
        optionA: "Option A text",
        optionB: "Option B text",
        optionC: "Option C text",
        optionD: "Option D text",
        correctAnswers: "A",
        type: "SINGLE",
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        countA: 0,
        countB: 0,
        countC: 0,
        countD: 0,
        ...overrides,
      },
    });
    createdQuestionIds.push(q.id);
    return q;
  }

  // Helper to create test user
  async function createTestUser() {
    const u = await prisma.user.create({
      data: {
        username: `challenger_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        password: "hashed_dummy_password",
        name: "Challenger Verifier",
      },
    });
    createdUserIds.push(u.id);
    const token = createSessionToken({ userId: u.id, username: u.username, name: u.name });
    const cookieHeader = `${AUTH_COOKIE_NAME}=${token}`;
    return { user: u, cookieHeader };
  }

  try {
    // =========================================================================
    // SECTION 1: Unusual Payloads & Edge Cases on POST /api/wrong-questions
    // =========================================================================
    console.log(">>> SECTION 1: Unusual Payloads & Edge Cases (POST /api/wrong-questions)");

    await runTestCase("1.1 Empty JSON payload {} returns HTTP 400 with descriptive error", async () => {
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "無題目需要記錄");
    });

    await runTestCase("1.2 Empty items array { items: [] } returns HTTP 400", async () => {
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "無題目需要記錄");
    });

    await runTestCase("1.3 Malformed non-JSON payload returns HTTP 500 without crashing server", async () => {
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "NOT_A_JSON_STRING",
      });
      assert.equal(res.status, 500);
      const data = await res.json();
      assert.ok(data.error.includes("記錄錯題失敗"));
    });

    await runTestCase("1.4 Missing answers: { questionId, userAnswer: undefined } increments totalAttempts and wrongCount", async () => {
      const q = await createTestQuestion();
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.wrongCount, 1);
      assert.equal(updated.correctCount, 0);
      assert.equal(updated.countA, 0);
      assert.equal(updated.countB, 0);
      assert.equal(updated.countC, 0);
      assert.equal(updated.countD, 0);
    });

    await runTestCase("1.5 Missing answers: { questionId, userAnswer: '' } (empty string) increments totalAttempts and wrongCount", async () => {
      const q = await createTestQuestion();
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "" }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.wrongCount, 1);
      assert.equal(updated.correctCount, 0);
      assert.equal(updated.countA, 0);
    });

    await runTestCase("1.6 Whitespace only answer: { questionId, userAnswer: '   ' } handled as unselected wrong attempt", async () => {
      const q = await createTestQuestion();
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "   " }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.wrongCount, 1);
      assert.equal(updated.countA, 0);
    });

    await runTestCase("1.7 Lowercase letter normalization: userAnswer: 'a' matches correctAnswers 'A'", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "a" }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.correctCount, 1);
      assert.equal(updated.wrongCount, 0);
      assert.equal(updated.countA, 1);
    });

    await runTestCase("1.8 Lowercase with surrounding whitespace: userAnswer: '   b   '", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "   b   " }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.correctCount, 0);
      assert.equal(updated.wrongCount, 1);
      assert.equal(updated.countB, 1);
    });

    await runTestCase("1.9 Multiple answers with messy whitespace & arbitrary order: '  c  ,   a   '", async () => {
      const q = await createTestQuestion({ correctAnswers: "A, C", type: "MULTIPLE" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "  c  ,   a   " }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.correctCount, 1);
      assert.equal(updated.wrongCount, 0);
      assert.equal(updated.countA, 1);
      assert.equal(updated.countC, 1);
    });

    await runTestCase("1.10 Duplicate option entries in answer: 'A, A, A' increments countA strictly ONCE", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "A, A, A" }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.correctCount, 1);
      assert.equal(updated.countA, 1, "Duplicate 'A, A, A' must deduplicate and increment countA only once");
    });

    await runTestCase("1.11 Options outside A-D: 'E, Z, 9' handled without SQL column error", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "E, Z, 9" }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.wrongCount, 1);
      assert.equal(updated.countA, 0);
      assert.equal(updated.countB, 0);
      assert.equal(updated.countC, 0);
      assert.equal(updated.countD, 0);
    });

    await runTestCase("1.12 Undefined questionId in batch does not break valid items", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { questionId: undefined, userAnswer: "A" },
            { questionId: null, userAnswer: "B" },
            { questionId: q.id, userAnswer: "A" },
          ],
        }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.correctCount, 1);
      assert.equal(updated.countA, 1);
    });

    await runTestCase("1.13 Non-existent questionId is safely ignored via try/catch without 500 error", async () => {
      const fakeId = "non-existent-uuid-challenger-9999999";
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: fakeId, userAnswer: "A" }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
    });

    // =========================================================================
    // SECTION 2: Atomic Counter Invariants (Single, Multiple, Mixed Batch)
    // =========================================================================
    console.log("\n>>> SECTION 2: Atomic Counter Invariants Verification");

    await runTestCase("2.1 Mathematical invariant: totalAttempts strictly equals correctCount + wrongCount", async () => {
      const q = await createTestQuestion({ correctAnswers: "B" });

      // Send 3 correct (B) and 4 wrong (A, C, D)
      const attempts = [
        { questionId: q.id, userAnswer: "B" },
        { questionId: q.id, userAnswer: "B" },
        { questionId: q.id, userAnswer: "A" },
        { questionId: q.id, userAnswer: "C" },
        { questionId: q.id, userAnswer: "B" },
        { questionId: q.id, userAnswer: "D" },
        { questionId: q.id, userAnswer: "A" },
      ];

      for (const item of attempts) {
        const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        assert.equal(res.status, 200);
      }

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 7);
      assert.equal(updated.correctCount, 3);
      assert.equal(updated.wrongCount, 4);
      assert.equal(updated.totalAttempts, updated.correctCount + updated.wrongCount);
      assert.equal(updated.countA, 2);
      assert.equal(updated.countB, 3);
      assert.equal(updated.countC, 1);
      assert.equal(updated.countD, 1);
    });

    await runTestCase("2.2 Batch answering correctly aggregates all individual questions and options", async () => {
      const q1 = await createTestQuestion({ correctAnswers: "A" });
      const q2 = await createTestQuestion({ correctAnswers: "C, D", type: "MULTIPLE" });

      const batchPayload = {
        items: [
          { questionId: q1.id, userAnswer: "a" },
          { questionId: q2.id, userAnswer: "c, d" },
        ],
      };

      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchPayload),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.count, 2);

      const updatedQ1 = await prisma.question.findUnique({ where: { id: q1.id } });
      const updatedQ2 = await prisma.question.findUnique({ where: { id: q2.id } });

      assert.equal(updatedQ1.totalAttempts, 1);
      assert.equal(updatedQ1.correctCount, 1);
      assert.equal(updatedQ1.countA, 1);

      assert.equal(updatedQ2.totalAttempts, 1);
      assert.equal(updatedQ2.correctCount, 1);
      assert.equal(updatedQ2.countC, 1);
      assert.equal(updatedQ2.countD, 1);
    });

    // =========================================================================
    // SECTION 3: Concurrent Stress Testing on Atomic Increments
    // =========================================================================
    console.log("\n>>> SECTION 3: High-Concurrency Stress Testing (Zero Lost Updates)");

    await runTestCase("3.1 50 Parallel HTTP POST requests to the SAME question (Zero Lost Updates)", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const CONCURRENCY = 50;

      const requests = Array.from({ length: CONCURRENCY }, () =>
        fetch(`${BASE_URL}/api/wrong-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, userAnswer: "A" }),
        })
      );

      const responses = await Promise.all(requests);
      assert.ok(responses.every((r) => r.status === 200), "All 50 concurrent requests must return HTTP 200");

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, CONCURRENCY, `Expected totalAttempts = ${CONCURRENCY}, got ${updated.totalAttempts}`);
      assert.equal(updated.correctCount, CONCURRENCY, `Expected correctCount = ${CONCURRENCY}, got ${updated.correctCount}`);
      assert.equal(updated.wrongCount, 0);
      assert.equal(updated.countA, CONCURRENCY, `Expected countA = ${CONCURRENCY}, got ${updated.countA}`);
      assert.equal(updated.countB, 0);
    });

    await runTestCase("3.2 60 Mixed Parallel Requests (20 Correct 'A', 20 Wrong 'B', 20 Wrong 'C')", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });

      const answers = [
        ...Array(20).fill("A"),
        ...Array(20).fill("B"),
        ...Array(20).fill("C"),
      ];
      // Shuffle requests to maximize race condition entropy
      answers.sort(() => Math.random() - 0.5);

      const requests = answers.map((ans) =>
        fetch(`${BASE_URL}/api/wrong-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, userAnswer: ans }),
        })
      );

      const responses = await Promise.all(requests);
      assert.ok(responses.every((r) => r.status === 200));

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 60);
      assert.equal(updated.correctCount, 20);
      assert.equal(updated.wrongCount, 40);
      assert.equal(updated.totalAttempts, updated.correctCount + updated.wrongCount);
      assert.equal(updated.countA, 20);
      assert.equal(updated.countB, 20);
      assert.equal(updated.countC, 20);
      assert.equal(updated.countD, 0);
    });

    await runTestCase("3.3 20 Concurrent Batch Requests (Each batch with 5 items = 100 simultaneous updates)", async () => {
      const qTarget = await createTestQuestion({ correctAnswers: "D" });
      const BATCH_COUNT = 20;
      const ITEMS_PER_BATCH = 5;

      const batchRequests = Array.from({ length: BATCH_COUNT }, () => {
        const items = Array.from({ length: ITEMS_PER_BATCH }, () => ({
          questionId: qTarget.id,
          userAnswer: "D",
        }));
        return fetch(`${BASE_URL}/api/wrong-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      });

      const responses = await Promise.all(batchRequests);
      assert.ok(responses.every((r) => r.status === 200));

      const updated = await prisma.question.findUnique({ where: { id: qTarget.id } });
      const expectedTotal = BATCH_COUNT * ITEMS_PER_BATCH; // 100
      assert.equal(updated.totalAttempts, expectedTotal);
      assert.equal(updated.correctCount, expectedTotal);
      assert.equal(updated.countD, expectedTotal);
    });

    // =========================================================================
    // SECTION 4: Authenticated User Mistake Sync & Personal Invariants
    // =========================================================================
    console.log("\n>>> SECTION 4: Authenticated User Mistake Book Synchronization");

    const { user: testUser, cookieHeader } = await createTestUser();

    await runTestCase("4.1 Unauthenticated request returns savedToPersonal: false", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "B" }),
      });
      const data = await res.json();
      assert.equal(data.savedToPersonal, false);
      assert.ok(data.message.includes("登入後可自動同步"));
    });

    await runTestCase("4.2 Authenticated wrong answer creates WrongQuestionRecord with initial counters", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({ questionId: q.id, userAnswer: "B" }),
      });
      const data = await res.json();
      assert.equal(data.savedToPersonal, true);

      const record = await prisma.wrongQuestionRecord.findUnique({
        where: { userId_questionId: { userId: testUser.id, questionId: q.id } },
      });
      assert.ok(record, "WrongQuestionRecord must be created");
      assert.equal(record.wrongCount, 1);
      assert.equal(record.totalAttempts, 1);
      assert.equal(record.correctCount, 0);
      assert.equal(record.lastUserAnswer, "B");
    });

    await runTestCase("4.3 Authenticated subsequent correct answer updates mastery counters without creating false mistake", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });

      // First attempt: Wrong (Option C)
      await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader },
        body: JSON.stringify({ questionId: q.id, userAnswer: "C" }),
      });

      // Second attempt: Correct (Option A)
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader },
        body: JSON.stringify({ questionId: q.id, userAnswer: "A" }),
      });
      assert.equal(res.status, 200);

      const record = await prisma.wrongQuestionRecord.findUnique({
        where: { userId_questionId: { userId: testUser.id, questionId: q.id } },
      });
      assert.equal(record.wrongCount, 1, "wrongCount should not increase on correct answer");
      assert.equal(record.totalAttempts, 2, "totalAttempts must increase to 2");
      assert.equal(record.correctCount, 1, "correctCount must increase to 1");
      assert.equal(record.lastUserAnswer, "A");
    });

    // =========================================================================
    // SECTION 5: GET Endpoint Verification & Backward Compatibility
    // =========================================================================
    console.log("\n>>> SECTION 5: GET /api/wrong-questions Security & Compatibility");

    await runTestCase("5.1 Unauthenticated GET returns HTTP 401 with requiresAuth: true", async () => {
      const res = await fetch(`${BASE_URL}/api/wrong-questions`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.requiresAuth, true);
    });

    await runTestCase("5.2 Authenticated GET mode=personal returns personal records with counters", async () => {
      const res = await fetch(`${BASE_URL}/api/wrong-questions?mode=personal`, {
        headers: { Cookie: cookieHeader },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.mode, "personal");
      assert.ok(Array.isArray(data.records));
      assert.ok(data.records.length > 0);
      const rec = data.records[0];
      assert.ok(typeof rec.totalAttempts === "number");
      assert.ok(typeof rec.correctCount === "number");
      assert.ok(typeof rec.question.countA === "number");
    });

    await runTestCase("5.3 Authenticated GET mode=global returns leaderboard with option statistics", async () => {
      const res = await fetch(`${BASE_URL}/api/wrong-questions?mode=global&limit=5`, {
        headers: { Cookie: cookieHeader },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.mode, "global");
      assert.ok(Array.isArray(data.questions));
      data.questions.forEach((q) => {
        assert.ok(typeof q.totalAttempts === "number");
        assert.ok(typeof q.correctCount === "number");
        assert.ok(typeof q.countA === "number");
        assert.ok(typeof q.countB === "number");
        assert.ok(typeof q.countC === "number");
        assert.ok(typeof q.countD === "number");
      });
    });

    await runTestCase("5.4 Backward compatibility: Questions with totalAttempts: 0 use Math.max(totalAttempts, wrongCount)", async () => {
      const legacyQ = await createTestQuestion({
        stem: "[LegacyQuestion] Cold start backward compatibility check",
        wrongCount: 9,
        totalAttempts: 0,
        correctCount: 0,
      });

      const res = await fetch(`${BASE_URL}/api/wrong-questions?mode=global&limit=50`, {
        headers: { Cookie: cookieHeader },
      });
      const data = await res.json();
      const found = data.questions.find((q) => q.id === legacyQ.id);
      assert.ok(found, "Legacy question should be returned in global ranking");
      assert.equal(found.totalAttempts, 9, "Legacy question totalAttempts should fallback to wrongCount (9)");
    });

    // =========================================================================
    // SECTION 7: Client-Side isCorrect vs Server-Side Auto-Evaluation
    // =========================================================================
    console.log("\n>>> SECTION 7: Client-Side isCorrect vs Server-Side Auto-Evaluation");

    await runTestCase("7.1 Client-provided isCorrect: false overrides answer that matches correctAnswers", async () => {
      const q = await createTestQuestion({ correctAnswers: "A" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "A", isCorrect: false }),
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.wrongCount, 1);
      assert.equal(updated.correctCount, 0);
      assert.equal(updated.countA, 1);
    });

    await runTestCase("7.2 Client-omitted isCorrect automatically triggers server-side compareAnswers", async () => {
      const q = await createTestQuestion({ correctAnswers: "B, D", type: "MULTIPLE" });
      const res = await fetch(`${BASE_URL}/api/wrong-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: "d, b" }), // Omit isCorrect
      });
      assert.equal(res.status, 200);

      const updated = await prisma.question.findUnique({ where: { id: q.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.correctCount, 1);
      assert.equal(updated.wrongCount, 0);
      assert.equal(updated.countB, 1);
      assert.equal(updated.countD, 1);
    });

    // =========================================================================
    // SECTION 8: Same-User Concurrent Upsert Race Stress Test
    // =========================================================================
    console.log("\n>>> SECTION 8: Same-User Concurrent Upsert Race Condition Stress Test");

    await runTestCase("8.1 20 Concurrent Upserts for the SAME user and SAME question (Race Condition Guard)", async () => {
      const qRace = await createTestQuestion({ correctAnswers: "A" });
      const { user: raceUser, cookieHeader: raceCookie } = await createTestUser();
      const CONCURRENCY = 20;

      const requests = Array.from({ length: CONCURRENCY }, () =>
        fetch(`${BASE_URL}/api/wrong-questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: raceCookie,
          },
          body: JSON.stringify({ questionId: qRace.id, userAnswer: "B" }), // wrong answer
        })
      );

      const responses = await Promise.all(requests);
      assert.ok(responses.every((r) => r.status === 200), "All 20 concurrent user requests must return HTTP 200 without crashing");

      // Verify question table atomic counter integrity
      const updatedQ = await prisma.question.findUnique({ where: { id: qRace.id } });
      assert.equal(updatedQ.totalAttempts, CONCURRENCY);
      assert.equal(updatedQ.wrongCount, CONCURRENCY);
      assert.equal(updatedQ.countB, CONCURRENCY);

      // Verify user's personal WrongQuestionRecord exists and has accumulated counts
      const record = await prisma.wrongQuestionRecord.findUnique({
        where: { userId_questionId: { userId: raceUser.id, questionId: qRace.id } },
      });
      assert.ok(record, "User WrongQuestionRecord must exist");
      assert.ok(record.wrongCount > 0, "Record wrongCount must be positive");
      assert.ok(record.totalAttempts > 0, "Record totalAttempts must be positive");
    });

    // =========================================================================
    // SECTION 9: 150-Request Extreme Concurrency & Entropy Blast Test
    // =========================================================================
    console.log("\n>>> SECTION 9: 150-Request Extreme Concurrency Blast Test");

    await runTestCase("9.1 150 Extreme Concurrency Blast across 3 different questions simultaneously", async () => {
      const qA = await createTestQuestion({ correctAnswers: "A" });
      const qB = await createTestQuestion({ correctAnswers: "B" });
      const qC = await createTestQuestion({ correctAnswers: "C" });
      const questions = [qA, qB, qC];

      const TOTAL_REQUESTS = 150;
      const options = ["A", "B", "C", "D"];

      let expectedQA = 0, expectedQB = 0, expectedQC = 0;
      const qACounts = { A: 0, B: 0, C: 0, D: 0 };
      const qBCounts = { A: 0, B: 0, C: 0, D: 0 };
      const qCCounts = { A: 0, B: 0, C: 0, D: 0 };

      const blastRequests = Array.from({ length: TOTAL_REQUESTS }, (_, idx) => {
        const targetQ = questions[idx % 3];
        const chosenOpt = options[idx % 4];

        if (targetQ.id === qA.id) {
          expectedQA++;
          qACounts[chosenOpt]++;
        } else if (targetQ.id === qB.id) {
          expectedQB++;
          qBCounts[chosenOpt]++;
        } else {
          expectedQC++;
          qCCounts[chosenOpt]++;
        }

        return fetch(`${BASE_URL}/api/wrong-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: targetQ.id, userAnswer: chosenOpt }),
        });
      });

      const blastResponses = await Promise.all(blastRequests);
      assert.ok(blastResponses.every((r) => r.status === 200), "All 150 blast requests must succeed with HTTP 200");

      const [resQA, resQB, resQC] = await Promise.all([
        prisma.question.findUnique({ where: { id: qA.id } }),
        prisma.question.findUnique({ where: { id: qB.id } }),
        prisma.question.findUnique({ where: { id: qC.id } }),
      ]);

      assert.equal(resQA.totalAttempts, expectedQA, `Question A totalAttempts: expected ${expectedQA}, got ${resQA.totalAttempts}`);
      assert.equal(resQA.countA, qACounts.A);
      assert.equal(resQA.countB, qACounts.B);
      assert.equal(resQA.countC, qACounts.C);
      assert.equal(resQA.countD, qACounts.D);

      assert.equal(resQB.totalAttempts, expectedQB, `Question B totalAttempts: expected ${expectedQB}, got ${resQB.totalAttempts}`);
      assert.equal(resQB.countA, qBCounts.A);
      assert.equal(resQB.countB, qBCounts.B);
      assert.equal(resQB.countC, qBCounts.C);
      assert.equal(resQB.countD, qBCounts.D);

      assert.equal(resQC.totalAttempts, expectedQC, `Question C totalAttempts: expected ${expectedQC}, got ${resQC.totalAttempts}`);
      assert.equal(resQC.countA, qCCounts.A);
      assert.equal(resQC.countB, qCCounts.B);
      assert.equal(resQC.countC, qCCounts.C);
      assert.equal(resQC.countD, qCCounts.D);
    });

  } finally {
    // =========================================================================
    // SECTION 6: Fixture Cleanup
    // =========================================================================
    console.log("\n>>> SECTION 6: Cleaning up test fixtures...");
    if (createdUserIds.length > 0) {
      await prisma.wrongQuestionRecord.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdQuestionIds.length > 0) {
      await prisma.wrongQuestionRecord.deleteMany({ where: { questionId: { in: createdQuestionIds } } });
      await prisma.question.deleteMany({ where: { id: { in: createdQuestionIds } } });
    }
    await prisma.$disconnect();
    console.log("  ✓ Fixtures deleted cleanly from database");
  }

  // ===========================================================================
  // Summary & Empirical Challenger Verdict
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`📊 CHALLENGER SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  if (failedTests === 0) {
    console.log("🏆 VERDICT: APPROVE (Zero bugs found across all edge cases & stress harnesses)");
  } else {
    console.log("🚫 VERDICT: REJECT (Bugs identified, see logs above)");
  }
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Fatal test harness error:", err);
  process.exit(1);
});
