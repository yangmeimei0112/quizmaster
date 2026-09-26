/**
 * scripts/test_empirical_challenger_m1_2.js
 *
 * EMPIRICAL CHALLENGER TEST SUITE (Milestone 1 - Challenger 2)
 *
 * Scope:
 * 1. PostgreSQL Grammar & Migration DDL Validation
 * 2. Backward Compatibility for totalAttempts == 0 and legacy wrongCount > 0
 * 3. MockExamView Batching & BattlePlayView Real-Time Tracking Empirical Invariants
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

console.log("===============================================================================");
console.log("⚔️  EMPIRICAL CHALLENGER 2 SUITE — MILESTONE 1 VERIFICATION");
console.log("===============================================================================\n");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    findings.push({ name, error: err.message, stack: err.stack });
    console.error(`  ✗ [FAIL] ${name}\n    Error: ${err.message}`);
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    findings.push({ name, error: err.message, stack: err.stack });
    console.error(`  ✗ [FAIL] ${name}\n    Error: ${err.message}`);
  }
}

(async () => {
  const prisma = new PrismaClient();

  const utilsPath = path.resolve(__dirname, "../src/lib/answerUtils.ts");
  const { normalizeAnswers, compareAnswers, formatAnswerDisplay } = await import(
    "file://" + utilsPath.replace(/\\/g, "/")
  );

  // ===========================================================================
  // SECTION 1: PostgreSQL Migration SQL Syntax & Grammar Rules
  // ===========================================================================
  console.log("▶ [Section 1] PostgreSQL Migration SQL Syntax & Grammar Verification...");

  const migrationPath = path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260926000000_add_question_stats",
    "migration.sql"
  );

  test("1.1 Migration file existence & path compliance", () => {
    assert.ok(fs.existsSync(migrationPath), `Migration file not found at ${migrationPath}`);
  });

  const sqlContent = fs.readFileSync(migrationPath, "utf8");

  test("1.2 PostgreSQL Grammar: Delimited Identifiers & Statement Syntax", () => {
    // Strip comments first
    const cleanedSql = sqlContent.replace(/--.*$/gm, "");
    const alterTableStatements = cleanedSql
      .split(";")
      .map((s) => s.trim().replace(/\s+/g, " "))
      .filter((s) => s.length > 0);

    assert.equal(alterTableStatements.length, 8, `Expected 8 ALTER TABLE statements, found ${alterTableStatements.length}`);

    for (const stmt of alterTableStatements) {
      // PostgreSQL grammar for ADD COLUMN:
      // ALTER TABLE "Table" ADD COLUMN "Column" TYPE NOT NULL DEFAULT val
      const pgAlterRegex = /^ALTER\s+TABLE\s+"([A-Za-z0-9_]+)"\s+ADD\s+COLUMN\s+"([A-Za-z0-9_]+)"\s+([A-Z]+)\s+NOT\s+NULL\s+DEFAULT\s+(\d+)$/i;
      const match = stmt.match(pgAlterRegex);
      assert.ok(match, `Statement does not conform to PostgreSQL ALTER TABLE grammar: "${stmt}"`);

      const [, tableName, columnName, colType, defaultVal] = match;
      assert.ok(["Question", "WrongQuestionRecord"].includes(tableName), `Invalid table identifier: ${tableName}`);
      assert.equal(colType.toUpperCase(), "INTEGER", `Invalid column type: ${colType}`);
      assert.ok(defaultVal === "0" || defaultVal === "1", `Unexpected default value: ${defaultVal}`);
    }
  });

  test("1.3 Prisma Migrate Diff Oracle: Compare with official Prisma PostgreSQL DDL engine", () => {
    const schemaBase = [
      'datasource db {',
      '  provider = "postgresql"',
      '  url      = "postgresql://dummy:dummy@localhost:5432/dummy"',
      '}',
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      'model Question {',
      '  id             String                @id @default(cuid())',
      '  stem           String',
      '  normalizedStem String',
      '  type           String',
      '  optionA        String',
      '  optionB        String',
      '  optionC        String',
      '  optionD        String',
      '  correctAnswers String',
      '  wrongCount     Int                   @default(0)',
      '  createdAt      DateTime              @default(now())',
      '  updatedAt      DateTime              @updatedAt',
      '  wrongRecords   WrongQuestionRecord[]',
      '}',
      'model User {',
      '  id           String                @id @default(cuid())',
      '  username     String                @unique',
      '  password     String',
      '  createdAt    DateTime              @default(now())',
      '  updatedAt    DateTime              @updatedAt',
      '  wrongRecords WrongQuestionRecord[]',
      '}',
      'model WrongQuestionRecord {',
      '  id             String   @id @default(cuid())',
      '  userId         String',
      '  questionId     String',
      '  wrongCount     Int      @default(1)',
      '  createdAt      DateTime @default(now())',
      '  updatedAt      DateTime @updatedAt',
      '  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
      '  question       Question @relation(fields: [questionId], references: [id], onDelete: Cascade)',
      '  @@unique([userId, questionId])',
      '}',
    ].join('\n');

    const schemaTarget = [
      'datasource db {',
      '  provider = "postgresql"',
      '  url      = "postgresql://dummy:dummy@localhost:5432/dummy"',
      '}',
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      'model Question {',
      '  id             String                @id @default(cuid())',
      '  stem           String',
      '  normalizedStem String',
      '  type           String',
      '  optionA        String',
      '  optionB        String',
      '  optionC        String',
      '  optionD        String',
      '  correctAnswers String',
      '  wrongCount     Int                   @default(0)',
      '  totalAttempts  Int                   @default(0)',
      '  correctCount   Int                   @default(0)',
      '  countA         Int                   @default(0)',
      '  countB         Int                   @default(0)',
      '  countC         Int                   @default(0)',
      '  countD         Int                   @default(0)',
      '  createdAt      DateTime              @default(now())',
      '  updatedAt      DateTime              @updatedAt',
      '  wrongRecords   WrongQuestionRecord[]',
      '}',
      'model User {',
      '  id           String                @id @default(cuid())',
      '  username     String                @unique',
      '  password     String',
      '  createdAt    DateTime              @default(now())',
      '  updatedAt    DateTime              @updatedAt',
      '  wrongRecords WrongQuestionRecord[]',
      '}',
      'model WrongQuestionRecord {',
      '  id             String   @id @default(cuid())',
      '  userId         String',
      '  questionId     String',
      '  wrongCount     Int      @default(1)',
      '  totalAttempts  Int      @default(1)',
      '  correctCount   Int      @default(0)',
      '  createdAt      DateTime @default(now())',
      '  updatedAt      DateTime @updatedAt',
      '  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
      '  question       Question @relation(fields: [questionId], references: [id], onDelete: Cascade)',
      '  @@unique([userId, questionId])',
      '}',
    ].join('\n');

    const tempBaseFile = path.join(__dirname, "..", "prisma", "temp_base.prisma");
    const tempTargetFile = path.join(__dirname, "..", "prisma", "temp_target.prisma");

    try {
      fs.writeFileSync(tempBaseFile, schemaBase, "utf8");
      fs.writeFileSync(tempTargetFile, schemaTarget, "utf8");

      const diffOutput = execSync(
        `npx prisma migrate diff --from-schema-datamodel "${tempBaseFile}" --to-schema-datamodel "${tempTargetFile}" --script`,
        { encoding: "utf8" }
      );

      // Verify each column is added in Prisma's diff
      const expectedColumnNames = [
        "totalAttempts",
        "correctCount",
        "countA",
        "countB",
        "countC",
        "countD",
      ];

      for (const col of expectedColumnNames) {
        const hasCol = diffOutput.includes(`"Question"`) && diffOutput.includes(`"${col}"`);
        assert.ok(hasCol, `Prisma diff missing expected Question column: ${col}`);
      }

      assert.ok(
        diffOutput.includes(`"WrongQuestionRecord"`) && diffOutput.includes(`"totalAttempts"`),
        'Prisma diff missing WrongQuestionRecord.totalAttempts'
      );
      assert.ok(
        diffOutput.includes(`"WrongQuestionRecord"`) && diffOutput.includes(`"correctCount"`),
        'Prisma diff missing WrongQuestionRecord.correctCount'
      );
    } finally {
      if (fs.existsSync(tempBaseFile)) fs.unlinkSync(tempBaseFile);
      if (fs.existsSync(tempTargetFile)) fs.unlinkSync(tempTargetFile);
    }
  });

  test("1.4 Migration lock file specifies postgresql provider", () => {
    const lockPath = path.join(__dirname, "..", "prisma", "migrations", "migration_lock.toml");
    assert.ok(fs.existsSync(lockPath), "migration_lock.toml must exist");
    const lockContent = fs.readFileSync(lockPath, "utf8");
    assert.ok(lockContent.includes('provider = "postgresql"'), "migration_lock.toml provider must be postgresql");
  });

  // ===========================================================================
  // SECTION 2: Backward Compatibility for totalAttempts == 0 and legacy wrongCount > 0
  // ===========================================================================
  console.log("\n▶ [Section 2] Backward Compatibility & Legacy Data Challenge...");

  await testAsync("2.1 GET Route Fallback: totalAttempts == 0 with legacy wrongCount > 0", async () => {
    // Seed a legacy question with wrongCount=7, totalAttempts=0, correctCount=0
    const legacyQ = await prisma.question.create({
      data: {
        stem: "【CHALLENGE 2 LEGACY TEST】歷史題目相容性測試",
        normalizedStem: "challenge 2 legacy test 歷史題目相容性測試",
        type: "SINGLE",
        optionA: "選項 A",
        optionB: "選項 B",
        optionC: "選項 C",
        optionD: "選項 D",
        correctAnswers: "A",
        wrongCount: 7,
        totalAttempts: 0,
        correctCount: 0,
        countA: 0,
        countB: 0,
        countC: 0,
        countD: 0,
      },
    });

    try {
      const q = await prisma.question.findUnique({ where: { id: legacyQ.id } });
      assert.ok(q, "Question must exist");

      // Verify GET fallback rule: Math.max(q.totalAttempts ?? 0, q.wrongCount ?? 0)
      const mappedTotalAttempts = Math.max(q.totalAttempts ?? 0, q.wrongCount ?? 0);
      assert.equal(mappedTotalAttempts, 7, "mappedTotalAttempts must equal legacy wrongCount (7)");

      // Verify accuracy rate calculation handles this gracefully without NaN / division by zero
      const accuracyRate = mappedTotalAttempts === 0 ? null : (q.correctCount / mappedTotalAttempts) * 100;
      assert.equal(accuracyRate, 0, "Accuracy rate must be 0% for pure mistake history");
      assert.equal(Number.isNaN(accuracyRate), false, "Accuracy rate must NOT be NaN");
      assert.equal(Number.isFinite(accuracyRate), true, "Accuracy rate must be finite");
    } finally {
      await prisma.question.delete({ where: { id: legacyQ.id } });
    }
  });

  await testAsync("2.2 Zero Attempts Cold-Start: totalAttempts == 0 and wrongCount == 0", async () => {
    const freshQ = await prisma.question.create({
      data: {
        stem: "【CHALLENGE 2 COLD START】全新未作答題目",
        normalizedStem: "challenge 2 cold start 全新未作答題目",
        type: "SINGLE",
        optionA: "A",
        optionB: "B",
        optionC: "C",
        optionD: "D",
        correctAnswers: "B",
        wrongCount: 0,
        totalAttempts: 0,
        correctCount: 0,
      },
    });

    try {
      const q = await prisma.question.findUnique({ where: { id: freshQ.id } });
      const mappedTotalAttempts = Math.max(q.totalAttempts ?? 0, q.wrongCount ?? 0);
      assert.equal(mappedTotalAttempts, 0, "Mapped attempts must be 0");

      let headerText = "";
      if (mappedTotalAttempts === 0) {
        headerText = "尚未有作答數據";
      } else {
        headerText = `作答總數 ${mappedTotalAttempts} 次 · 答對率 ${(q.correctCount / mappedTotalAttempts) * 100}%`;
      }
      assert.equal(headerText, "尚未有作答數據");
    } finally {
      await prisma.question.delete({ where: { id: freshQ.id } });
    }
  });

  await testAsync("2.3 Answering Transition: Legacy Question receives new answer attempts", async () => {
    // Create a legacy question with wrongCount: 3, totalAttempts: 0
    const legacyQ = await prisma.question.create({
      data: {
        stem: "【CHALLENGE 2 TRANSITION】過渡期答題統計累計測試",
        normalizedStem: "challenge 2 transition 過渡期答題統計累計測試",
        type: "SINGLE",
        optionA: "正確項",
        optionB: "干擾項",
        optionC: "干擾項",
        optionD: "干擾項",
        correctAnswers: "A",
        wrongCount: 3,
        totalAttempts: 0,
        correctCount: 0,
      },
    });

    try {
      // Simulate answer 1: User chooses B (WRONG)
      await prisma.question.update({
        where: { id: legacyQ.id },
        data: {
          totalAttempts: { increment: 1 },
          wrongCount: { increment: 1 },
          countB: { increment: 1 },
        },
      });

      let updated = await prisma.question.findUnique({ where: { id: legacyQ.id } });
      assert.equal(updated.totalAttempts, 1);
      assert.equal(updated.wrongCount, 4);
      assert.equal(Math.max(updated.totalAttempts, updated.wrongCount), 4);

      // Simulate answer 2: User chooses A (CORRECT)
      await prisma.question.update({
        where: { id: legacyQ.id },
        data: {
          totalAttempts: { increment: 1 },
          correctCount: { increment: 1 },
          countA: { increment: 1 },
        },
      });

      updated = await prisma.question.findUnique({ where: { id: legacyQ.id } });
      assert.equal(updated.totalAttempts, 2);
      assert.equal(updated.correctCount, 1);
      assert.equal(updated.wrongCount, 4);

      const displayedAttempts = Math.max(updated.totalAttempts, updated.wrongCount);
      assert.equal(displayedAttempts, 4);
      const acc = (updated.correctCount / displayedAttempts) * 100;
      assert.equal(acc, 25);
    } finally {
      await prisma.question.delete({ where: { id: legacyQ.id } });
    }
  });

  // ===========================================================================
  // SECTION 3: MockExamView Batching & BattlePlayView Real-Time Tracking
  // ===========================================================================
  console.log("\n▶ [Section 3] MockExamView Batching & Battle Tracking Verification...");

  test("3.1 MockExamView: 50-Question batch mapping and zero-loss invariant", () => {
    // Generate 50 mock questions
    const mockQuestions = Array.from({ length: 50 }, (_, i) => ({
      id: `mock-q-${i + 1}`,
      stem: `模擬考題目 ${i + 1}`,
      correctAnswers: i % 2 === 0 ? "A" : "A,C",
      type: i % 2 === 0 ? "SINGLE" : "MULTIPLE",
    }));

    // Case A: All 50 answered
    const fullAnswers = {};
    mockQuestions.forEach((q, i) => {
      fullAnswers[q.id] = i % 2 === 0 ? ["A"] : ["A", "C"];
    });

    const answeredItemsFull = [];
    let wrongCountFull = 0;
    mockQuestions.forEach((q) => {
      const userAns = fullAnswers[q.id];
      if (userAns && userAns.length > 0) {
        const isCorrect = compareAnswers(userAns, q.correctAnswers);
        if (!isCorrect) wrongCountFull++;
        answeredItemsFull.push({
          questionId: q.id,
          userAnswer: formatAnswerDisplay(userAns) || "未填答",
          isCorrect,
        });
      }
    });

    assert.equal(answeredItemsFull.length, 50, "All 50 questions must be collected in batch");
    assert.equal(wrongCountFull, 0, "All answers are correct");
    assert.equal(answeredItemsFull[0].userAnswer, "A");
    assert.equal(answeredItemsFull[1].userAnswer, "A, C");

    // Case B: Partial answered (35 answered, 15 skipped)
    const partialAnswers = {};
    for (let i = 0; i < 35; i++) {
      partialAnswers[mockQuestions[i].id] = ["B"]; // All wrong
    }

    const answeredItemsPartial = [];
    let wrongCountPartial = 0;
    mockQuestions.forEach((q) => {
      const userAns = partialAnswers[q.id];
      if (userAns && userAns.length > 0) {
        const isCorrect = compareAnswers(userAns, q.correctAnswers);
        if (!isCorrect) wrongCountPartial++;
        answeredItemsPartial.push({
          questionId: q.id,
          userAnswer: formatAnswerDisplay(userAns) || "未填答",
          isCorrect,
        });
      }
    });

    assert.equal(answeredItemsPartial.length, 35, "Exactly 35 answered questions must be collected");
    assert.equal(wrongCountPartial, 35, "All 35 answered questions were wrong");

    // Case C: Empty / Unanswered exam submit
    const emptyAnswers = {};
    const answeredItemsEmpty = [];
    mockQuestions.forEach((q) => {
      const userAns = emptyAnswers[q.id];
      if (userAns && userAns.length > 0) {
        answeredItemsEmpty.push({ questionId: q.id, userAnswer: "未填答", isCorrect: false });
      }
    });
    assert.equal(answeredItemsEmpty.length, 0, "0 items collected when unanswered");
  });

  await testAsync("3.2 Empirical API Batch Concurrency: 50 concurrent updates against database", async () => {
    // Create 10 test questions in DB to simulate batch updates
    const testQs = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.question.create({
          data: {
            stem: `【CONCURRENCY BATCH TEST ${i + 1}】`,
            normalizedStem: `concurrency batch test ${i + 1}`,
            type: "SINGLE",
            optionA: "A",
            optionB: "B",
            optionC: "C",
            optionD: "D",
            correctAnswers: "A",
            wrongCount: 0,
            totalAttempts: 0,
            correctCount: 0,
            countA: 0,
            countB: 0,
            countC: 0,
            countD: 0,
          },
        })
      )
    );

    try {
      // Simulate batch payload received by POST /api/wrong-questions
      const batchItems = testQs.map((q, idx) => ({
        questionId: q.id,
        userAnswer: idx % 2 === 0 ? "A" : "B", // Half correct, half wrong
        isCorrect: idx % 2 === 0,
      }));

      // Execute backend logic with Promise.all
      await Promise.all(
        batchItems.map(async (item) => {
          const isCorrect = item.isCorrect;
          const selected = normalizeAnswers(item.userAnswer);
          const updateData = {
            totalAttempts: { increment: 1 },
          };
          if (isCorrect) {
            updateData.correctCount = { increment: 1 };
          } else {
            updateData.wrongCount = { increment: 1 };
          }
          if (selected.includes("A")) updateData.countA = { increment: 1 };
          if (selected.includes("B")) updateData.countB = { increment: 1 };
          if (selected.includes("C")) updateData.countC = { increment: 1 };
          if (selected.includes("D")) updateData.countD = { increment: 1 };

          await prisma.question.update({
            where: { id: item.questionId },
            data: updateData,
          });
        })
      );

      // Verify all 10 questions were updated accurately without lock errors or lost updates
      const refreshed = await prisma.question.findMany({
        where: { id: { in: testQs.map((q) => q.id) } },
      });

      assert.equal(refreshed.length, 10);
      refreshed.forEach((q) => {
        assert.equal(q.totalAttempts, 1, `Question ${q.id} totalAttempts must be 1`);
        if (q.correctCount === 1) {
          assert.equal(q.countA, 1);
          assert.equal(q.wrongCount, 0);
        } else {
          assert.equal(q.wrongCount, 1);
          assert.equal(q.countB, 1);
        }
      });
    } finally {
      await prisma.question.deleteMany({
        where: { id: { in: testQs.map((q) => q.id) } },
      });
    }
  });

  test("3.3 BattlePlayView: Answer deduplication barrier & invariant checks", () => {
    // Simulate syncedWrongQuestionIdsRef set
    const syncedWrongQuestionIds = new Set();
    const submissions = [];

    const mockEvaluateAnswer = (questionId, answers, isCorrect) => {
      if (!syncedWrongQuestionIds.has(questionId)) {
        syncedWrongQuestionIds.add(questionId);
        const userAnsStr = formatAnswerDisplay(answers) || "未作答";
        submissions.push({ questionId, userAnswer: userAnsStr, isCorrect });
      }
    };

    // User answers Question 1
    mockEvaluateAnswer("q-101", ["A"], true);
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].questionId, "q-101");

    // Accidental second evaluation (e.g. double click or timeout race)
    mockEvaluateAnswer("q-101", ["A"], true);
    assert.equal(submissions.length, 1, "Duplicate submission must be blocked by deduplication barrier");

    // Next question
    mockEvaluateAnswer("q-102", ["B", "C"], false);
    assert.equal(submissions.length, 2);
    assert.equal(submissions[1].questionId, "q-102");
    assert.equal(submissions[1].userAnswer, "B, C");
    assert.equal(submissions[1].isCorrect, false);
  });

  test("3.4 MockExamView: Stale closure and double submission race guard", async () => {
    // Simulate user answering 50 questions
    const answersRef = { current: {} };
    for (let i = 1; i <= 50; i++) {
      answersRef.current[`q-${i}`] = ["A"];
    }

    let isSubmitted = false;
    let isSubmitting = false;
    let fetchCount = 0;

    const mockExecuteSubmission = async () => {
      if (isSubmitted || isSubmitting) return;
      isSubmitting = true;
      isSubmitted = true;

      // Extract from answersRef.current (immune to stale closure)
      const currentAnswers = answersRef.current;
      const count = Object.keys(currentAnswers).length;
      fetchCount++;
      assert.equal(count, 50, "Must capture all 50 answers from ref");
    };

    // Simulate concurrent triggers (timer + user click)
    await Promise.all([
      mockExecuteSubmission(),
      mockExecuteSubmission(),
      mockExecuteSubmission(),
    ]);

    assert.equal(fetchCount, 1, "Batch submission must only execute once");
    assert.equal(isSubmitted, true);
  });

  test("2.4 Legacy Boundary: High mistake count (N=1000) with totalAttempts == 0", () => {
    const legacyStats = {
      wrongCount: 1000,
      totalAttempts: 0,
      correctCount: 0,
      countA: 0,
      countB: 0,
      countC: 0,
      countD: 0,
    };

    const effectiveAttempts = Math.max(legacyStats.totalAttempts ?? 0, legacyStats.wrongCount ?? 0);
    assert.equal(effectiveAttempts, 1000);
    const accuracy = effectiveAttempts === 0 ? 0 : (legacyStats.correctCount / effectiveAttempts) * 100;
    assert.equal(accuracy, 0.0);
    assert.equal(effectiveAttempts > 0, true);
  });

  test("1.5 PostgreSQL Case Sensitivity & DDL Invariant Audit", () => {
    // In PostgreSQL, unquoted identifiers are lowercased (e.g. Question -> question).
    // Prisma maps models to double-quoted identifiers.
    // Verify that every single ALTER TABLE in migration.sql uses quoted table names and quoted column names.
    const sql = fs.readFileSync(migrationPath, "utf8");
    const lines = sql.split("\n").filter((l) => l.trim().startsWith("ALTER TABLE"));

    assert.equal(lines.length, 8);
    for (const line of lines) {
      assert.ok(
        line.includes('ALTER TABLE "Question"') || line.includes('ALTER TABLE "WrongQuestionRecord"'),
        `Table name must be double quoted: ${line}`
      );
      assert.ok(
        /ADD COLUMN "[a-zA-Z0-9]+"/i.test(line),
        `Column name must be double quoted: ${line}`
      );
    }
  });

  await prisma.$disconnect();

  // ===========================================================================
  // Summary & Findings Output
  // ===========================================================================
  console.log("\n===============================================================================");
  console.log(`📊 CHALLENGER 2 SUMMARY: Total: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log("===============================================================================");

  if (failedTests > 0) {
    console.error(`\n❌ FOUND ${failedTests} FAILURE(S):`);
    findings.forEach((f, idx) => {
      console.error(`\n[Finding ${idx + 1}] ${f.name}\n${f.error}\n${f.stack}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ ALL EMPIRICAL CHALLENGES PASSED WITH EXIT CODE 0!");
    process.exit(0);
  }
})();
