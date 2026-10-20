/**
 * scripts/test_supabase_vercel_migration.js
 * Comprehensive automated test suite for:
 * R1. Full database backup (JSON + SQLite binary) & idempotent Supabase/SQLite restore/migration
 * R2. Dual-environment Prisma provider switching (SQLite <-> Supabase PostgreSQL + DIRECT_URL)
 * R3. Vercel Serverless persistence (BattleRoomRecord DB recovery across cold starts & stateless /api/upload)
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  backupDatabase,
  convertLocalImageToDataUrl,
} = require("./backup_database.js");
const { migrateFromBackup } = require("./migrate_to_supabase.js");
const { syncProvider } = require("./sync-db-provider.js");

const prisma = new PrismaClient();

async function runMigrationTests() {
  console.log("==================================================");
  console.log("[Test] Starting Supabase + Vercel Migration & Serverless Persistence Suite");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      failed++;
      console.error(`  [FAIL] ${name}:`, err);
      process.exitCode = 1;
    }
  }

  const rootDir = path.resolve(__dirname, "..");
  const backupDir = path.join(rootDir, "backups");
  const latestBackupPath = path.join(backupDir, "latest_backup.json");
  const binaryBackupPath = path.join(backupDir, "dev_backup.db");

  // =========================================================================
  // Part 1: Full Database Backup & Portable Image Conversion
  // =========================================================================
  console.log("\n--- Part 1: Full Database Backup & Checksum Verification ---");

  await test("1.1 Execute backupDatabase and verify JSON + binary backup files exist", async () => {
    const res = await backupDatabase({ prisma, writeTimestamped: false });
    assert.equal(res.success, true);
    assert.ok(fs.existsSync(latestBackupPath), "backups/latest_backup.json must exist");
    assert.ok(fs.existsSync(binaryBackupPath), "backups/dev_backup.db must exist");

    const statBin = fs.statSync(binaryBackupPath);
    assert.ok(statBin.size > 10000, "dev_backup.db should be a non-empty SQLite file");
  });

  await test("1.2 Verify backup JSON contains all 72 questions, metadata counts, and valid SHA-256 checksum", async () => {
    const rawJson = fs.readFileSync(latestBackupPath, "utf8");
    const parsed = JSON.parse(rawJson);

    const dbQuestionCount = await prisma.question.count();
    const dbUserCount = await prisma.user.count();
    const dbWrongCount = await prisma.wrongQuestionRecord.count();
    const dbProgressCount = await prisma.userQuestionProgress.count();

    assert.equal(parsed.metadata.counts.questions, dbQuestionCount);
    assert.ok(parsed.metadata.counts.questions >= 72, `Expected at least 72 questions, got ${parsed.metadata.counts.questions}`);
    assert.equal(parsed.metadata.counts.users, dbUserCount);
    assert.equal(parsed.metadata.counts.wrongQuestionRecords, dbWrongCount);
    assert.equal(parsed.metadata.counts.userQuestionProgress, dbProgressCount);

    assert.equal(parsed.data.questions.length, dbQuestionCount);
    const recomputedHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(parsed.data))
      .digest("hex");
    assert.equal(parsed.metadata.checksum, recomputedHash, "SHA-256 checksum must match data payload");

    for (const q of parsed.data.questions) {
      assert.ok(q.id && q.stem && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswers);
    }
  });

  await test("1.3 Verify convertLocalImageToDataUrl converts local /uploads/ files to Base64 Data URLs", async () => {
    const uploadDir = path.join(rootDir, "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const dummyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const tempFileName = `test_portable_${Date.now()}.png`;
    const tempFilePath = path.join(uploadDir, tempFileName);
    fs.writeFileSync(tempFilePath, Buffer.from(dummyPngBase64, "base64"));

    try {
      const converted = convertLocalImageToDataUrl(`/uploads/${tempFileName}`);
      assert.equal(converted, `data:image/png;base64,${dummyPngBase64}`);

      // Query string, hash fragment, and ./ or public/ prefixes
      assert.equal(
        convertLocalImageToDataUrl(`/uploads/${tempFileName}?v=123#section`),
        `data:image/png;base64,${dummyPngBase64}`
      );
      assert.equal(
        convertLocalImageToDataUrl(`public/uploads/${tempFileName}`),
        `data:image/png;base64,${dummyPngBase64}`
      );

      // External URLs and existing Data URLs remain untouched
      assert.equal(
        convertLocalImageToDataUrl("https://example.com/chart.png"),
        "https://example.com/chart.png"
      );
      assert.equal(
        convertLocalImageToDataUrl(`data:image/png;base64,${dummyPngBase64}`),
        `data:image/png;base64,${dummyPngBase64}`
      );
      assert.equal(convertLocalImageToDataUrl(null), null);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  // =========================================================================
  // Part 2: Idempotent Restore / Migration Verification
  // =========================================================================
  console.log("\n--- Part 2: Idempotent Migration & Relational Integrity ---");

  await test("2.1 Verify migrateFromBackup idempotently upserts Questions, Users, WrongRecords, and Progress", async () => {
    const tempQId = `mig_test_q_${Date.now()}`;
    const tempUId = `mig_test_u_${Date.now()}`;
    const tempWId = `mig_test_w_${Date.now()}`;
    const tempPId = `mig_test_p_${Date.now()}`;

    const syntheticBackup = {
      data: {
        questions: [
          {
            id: tempQId,
            stem: "[Migration Test] Idempotent Upsert Question",
            normalizedStem: "[migrationtest]idempotentupsertquestion",
            type: "SINGLE",
            optionA: "Option A",
            optionB: "Option B",
            optionC: "Option C",
            optionD: "Option D",
            correctAnswers: "A",
            explanation: "Test explanation",
            category: "MigrationTest",
            difficulty: "MEDIUM",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            wrongCount: 2,
            totalAttempts: 5,
            correctCount: 3,
          },
        ],
        users: [
          {
            id: tempUId,
            username: `mig_user_${Date.now()}`,
            password: "hashed_password_123",
            name: "Migration Tester",
          },
        ],
        wrongQuestionRecords: [
          {
            id: tempWId,
            userId: tempUId,
            questionId: tempQId,
            wrongCount: 2,
            totalAttempts: 5,
            correctCount: 3,
            lastUserAnswer: "B",
          },
        ],
        userQuestionProgress: [
          {
            id: tempPId,
            userId: tempUId,
            questionId: tempQId,
            isMastered: true,
            attemptCount: 5,
            correctCount: 3,
            lastAnswer: "A",
          },
        ],
      },
    };

    try {
      // First run
      const run1 = await migrateFromBackup({ prisma, backupData: syntheticBackup });
      assert.equal(run1.success, true);
      assert.equal(run1.verified, true);

      // Second run (idempotency check: must not throw or duplicate)
      syntheticBackup.data.questions[0].correctCount = 4;
      const run2 = await migrateFromBackup({ prisma, backupData: syntheticBackup });
      assert.equal(run2.success, true);

      const savedQ = await prisma.question.findUnique({ where: { id: tempQId } });
      assert.equal(savedQ.correctCount, 4, "Second idempotent run must update existing record");

      const savedW = await prisma.wrongQuestionRecord.findUnique({
        where: { userId_questionId: { userId: tempUId, questionId: tempQId } },
      });
      assert.ok(savedW, "WrongQuestionRecord must be preserved and linked");

      const savedP = await prisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId: tempUId, questionId: tempQId } },
      });
      assert.equal(savedP.isMastered, true, "UserQuestionProgress must be preserved and linked");
    } finally {
      await prisma.wrongQuestionRecord.deleteMany({ where: { questionId: tempQId } });
      await prisma.userQuestionProgress.deleteMany({ where: { questionId: tempQId } });
      await prisma.user.deleteMany({ where: { id: tempUId } });
      await prisma.question.deleteMany({ where: { id: tempQId } });
    }
  });

  await test("2.2 Verify migrateFromBackup rejects corrupted backup with mismatched SHA-256 checksum", async () => {
    const corruptedBackup = {
      metadata: {
        checksum: "0000000000000000000000000000000000000000000000000000000000000000",
      },
      data: {
        questions: [],
        users: [],
        wrongQuestionRecords: [],
        userQuestionProgress: [],
      },
    };

    await assert.rejects(
      async () => {
        await migrateFromBackup({ prisma, backupData: corruptedBackup });
      },
      /Backup checksum mismatch/
    );
  });

  // =========================================================================
  // Part 3: Dual-Environment Prisma Provider Switching (SQLite <-> Supabase)
  // =========================================================================
  console.log("\n--- Part 3: Prisma Provider Switching (SQLite <-> Supabase PostgreSQL) ---");

  await test("3.1 Verify syncProvider switches between SQLite and Supabase PostgreSQL (with & without DIRECT_URL)", async () => {
    const realSchemaPath = path.join(rootDir, "prisma", "schema.prisma");
    const tempSchemaPath = path.join(backupDir, "temp_test_schema.prisma");
    fs.copyFileSync(realSchemaPath, tempSchemaPath);

    try {
      // Case A: Supabase PostgreSQL with both DATABASE_URL (Pooler 6543) and DIRECT_URL (5432)
      const pgWithDirect = syncProvider({
        schemaPath: tempSchemaPath,
        databaseUrl:
          "postgresql://postgres.abcdef:secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
        directUrl:
          "postgresql://postgres.abcdef:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
      });
      assert.equal(pgWithDirect.provider, "postgresql");
      assert.equal(pgWithDirect.hasDirectUrl, true);
      assert.match(pgWithDirect.schema, /provider\s*=\s*"postgresql"/);
      assert.match(pgWithDirect.schema, /directUrl\s*=\s*env\("DIRECT_URL"\)/);

      // Case B: PostgreSQL without DIRECT_URL
      const pgWithoutDirect = syncProvider({
        schemaPath: tempSchemaPath,
        databaseUrl: "postgres://postgres:secret@db.supabase.co:5432/postgres",
        directUrl: "",
      });
      assert.equal(pgWithoutDirect.provider, "postgresql");
      assert.equal(pgWithoutDirect.hasDirectUrl, false);
      assert.match(pgWithoutDirect.schema, /provider\s*=\s*"postgresql"/);
      assert.doesNotMatch(pgWithoutDirect.schema, /directUrl/);

      // Case C: Local SQLite (file:./dev.db)
      const sqliteMode = syncProvider({
        schemaPath: tempSchemaPath,
        databaseUrl: "file:./dev.db",
        directUrl: "",
      });
      assert.equal(sqliteMode.provider, "sqlite");
      assert.equal(sqliteMode.hasDirectUrl, false);
      assert.match(sqliteMode.schema, /provider\s*=\s*"sqlite"/);
      assert.doesNotMatch(sqliteMode.schema, /directUrl/);
    } finally {
      if (fs.existsSync(tempSchemaPath)) {
        fs.unlinkSync(tempSchemaPath);
      }
      // Ensure real schema.prisma is synced with current local environment
      syncProvider();
    }
  });

  // =========================================================================
  // Part 4: Vercel Serverless Multi-Instance Battle Room Persistence
  // =========================================================================
  console.log("\n--- Part 4: Serverless Battle Room Persistence & Cold Start Recovery ---");

  await test("4.1 BattleRoom survives in-memory Map wipe (Serverless cold start) across full lifecycle", async () => {
    const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
    const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));

    const {
      createRoomAsync,
      joinRoomAsync,
      toggleReadyAsync,
      startBattleAsync,
      updatePlayerProgressAsync,
      reconnectPlayerAsync,
      resetBattleAsync,
      leaveRoomAsync,
      getRoom,
      getRoomAsync,
      loadRoomFromDb,
      clearMemoryRooms,
      deleteRoomFromDb,
    } = battleStore;

    // 1. Instance A creates room and player 2 joins
    const { room: createdRoom, playerId: hostId } = await createRoomAsync(
      "ServerlessHost",
      "shiba",
      { maxPlayers: 4, mode: "CUSTOM", questionCount: 2, timeLimitPerQuestion: 15 }
    );
    const code = createdRoom.code;

    try {
      const { playerId: guestId } = await joinRoomAsync(code, "ServerlessGuest", "panda");
      await toggleReadyAsync(code, guestId, true);

      // 2. Simulate Vercel Serverless Instance Switch #1 (clear memory Map)
      clearMemoryRooms();
      assert.equal(getRoom(code), null, "Memory store must be empty after clearMemoryRooms()");

      // Instance B starts the battle by loading room from DB first
      const sampleQuestions = [
        {
          id: "srv_q1",
          stem: "Serverless Question 1",
          type: "SINGLE",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          correctAnswers: "A",
        },
        {
          id: "srv_q2",
          stem: "Serverless Question 2",
          type: "SINGLE",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          correctAnswers: "B",
        },
      ];

      const startedRoom = await startBattleAsync(code, hostId, sampleQuestions);
      assert.equal(startedRoom.stage, "DRAWING");
      assert.equal(startedRoom.questions.length, 2);

      // 3. Simulate Vercel Serverless Instance Switch #2 during battle
      clearMemoryRooms();
      assert.equal(getRoom(code), null);

      const updatedRoom = await updatePlayerProgressAsync(code, guestId, {
        currentIndex: 1,
        correctCount: 1,
        wrongCount: 0,
        score: 20,
        isFinished: false,
      });
      const guestPlayer = updatedRoom.players.find((p) => p.id === guestId);
      assert.equal(guestPlayer.score, 20);
      assert.equal(guestPlayer.currentIndex, 1);

      // 4. Simulate Vercel Serverless Instance Switch #3 & Player Reconnect
      clearMemoryRooms();
      const loadedFromDb = await loadRoomFromDb(code);
      assert.ok(loadedFromDb, "Room must be loaded from BattleRoomRecord table");
      assert.equal(loadedFromDb.players.length, 2);

      const reconnected = await reconnectPlayerAsync(code, guestId, {
        currentIndex: 2,
        correctCount: 2,
        wrongCount: 0,
        score: 40,
        isFinished: true,
      });
      assert.equal(reconnected.player.score, 40);
      assert.equal(reconnected.player.isFinished, true);

      // 5. Reset battle and leave room across cold start
      clearMemoryRooms();
      const resetRoom = await resetBattleAsync(code, hostId);
      assert.equal(resetRoom.stage, "LOBBY");

      await leaveRoomAsync(code, guestId);
      const finalLeave = await leaveRoomAsync(code, hostId);
      assert.equal(finalLeave.room, null, "Room should close when all players leave");

      clearMemoryRooms();
      const afterDelete = await getRoomAsync(code);
      assert.equal(afterDelete, null, "Closed room must be removed from database");
    } finally {
      await deleteRoomFromDb(code);
    }
  });

  await test("4.2 Concurrent multi-instance battle progress updates reconcile without clobbering and advance to FINISHED", async () => {
    const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
    const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
    const {
      createRoomAsync,
      joinRoomAsync,
      toggleReadyAsync,
      startBattleAsync,
      syncRoomToDb,
      getRoomAsync,
      clearMemoryRooms,
      deleteRoomFromDb,
    } = battleStore;

    const { room: createdRoom, playerId: hostId } = await createRoomAsync(
      "ConcHost",
      "shiba",
      { maxPlayers: 4, mode: "CUSTOM", questionCount: 1 }
    );
    const code = createdRoom.code;

    try {
      const { playerId: guestId } = await joinRoomAsync(code, "ConcGuest", "panda");
      await toggleReadyAsync(code, guestId, true);

      await startBattleAsync(code, hostId, [
        {
          id: "conc_q1",
          stem: "Concurrent Q1",
          type: "SINGLE",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          correctAnswers: "A",
        },
      ]);

      // Both Instance 1 and Instance 2 read the same initial state from DB before either writes back
      const baseRoom = await getRoomAsync(code);
      const instance1Snapshot = JSON.parse(JSON.stringify(baseRoom));
      const instance2Snapshot = JSON.parse(JSON.stringify(baseRoom));

      // Instance 1 updates Host progress (score 20, finished) and writes to DB
      const hostInInst1 = instance1Snapshot.players.find((p) => p.id === hostId);
      hostInInst1.currentIndex = 1;
      hostInInst1.correctCount = 1;
      hostInInst1.score = 20;
      hostInInst1.isFinished = true;
      hostInInst1.finishedAt = Date.now();
      await syncRoomToDb(instance1Snapshot);

      // Instance 2 (which still has Host at score 0, isFinished: false in its snapshot!)
      // updates Guest progress (score 10, finished) and writes to DB
      const guestInInst2 = instance2Snapshot.players.find((p) => p.id === guestId);
      guestInInst2.currentIndex = 1;
      guestInInst2.correctCount = 1;
      guestInInst2.score = 10;
      guestInInst2.isFinished = true;
      guestInInst2.finishedAt = Date.now();
      await syncRoomToDb(instance2Snapshot);

      // Verify after cold start that BOTH players' progress was preserved and stage advanced to FINISHED
      clearMemoryRooms();
      const finalRoom = await getRoomAsync(code);
      assert.ok(finalRoom);
      const finalHost = finalRoom.players.find((p) => p.id === hostId);
      const finalGuest = finalRoom.players.find((p) => p.id === guestId);

      assert.equal(finalHost.score, 20, "Host score must not be clobbered by concurrent Instance 2 write");
      assert.equal(finalHost.isFinished, true, "Host finished state must be preserved");
      assert.equal(finalGuest.score, 10, "Guest score must be saved");
      assert.equal(finalGuest.isFinished, true, "Guest finished state must be saved");
      assert.equal(finalRoom.stage, "FINISHED", "Room stage must advance to FINISHED when reconciled players all finish");
    } finally {
      await deleteRoomFromDb(code);
    }
  });

  // =========================================================================
  // Part 5: Stateless Image Upload on Read-Only Filesystem (/api/upload)
  // =========================================================================
  console.log("\n--- Part 5: Stateless Image Upload on Read-Only Filesystem ---");

  await test("5.1 /api/upload works in read-only mode (VERCEL=1) for multipart, multi-line Base64 JSON, and rejects invalid/empty/oversized inputs", async () => {
    const ts = require("typescript");
    const uploadRoutePath = path.resolve(__dirname, "../src/app/api/upload/route.ts");
    const tsCode = fs.readFileSync(uploadRoutePath, "utf8");
    const jsCode = ts.transpileModule(tsCode, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    const m = { exports: {} };
    const fn = new Function("module", "exports", "require", "__dirname", "__filename", jsCode);
    fn(m, m.exports, require, path.dirname(uploadRoutePath), uploadRoutePath);
    const { POST } = m.exports;

    const prevVercel = process.env.VERCEL;
    const prevReadonly = process.env.READONLY_FS;
    process.env.VERCEL = "1";
    process.env.READONLY_FS = "1";

    try {
      const dummyPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const pngBuffer = Buffer.from(dummyPngBase64, "base64");

      // Test Mode 1: multipart/form-data
      const formData = new FormData();
      const blob = new Blob([pngBuffer], { type: "image/png" });
      formData.append("file", blob, "vercel_serverless_test.png");

      const mockMultipartReq = {
        headers: new Headers({ "content-type": "multipart/form-data; boundary=---test" }),
        formData: async () => formData,
      };

      const res1 = await POST(mockMultipartReq);
      assert.equal(res1.status, 201, "Multipart upload in read-only mode should return 201");
      const json1 = await res1.json();
      assert.equal(json1.success, true);
      assert.equal(json1.url, `data:image/png;base64,${dummyPngBase64}`);

      // Test Mode 2: application/json Base64 Data URL (including multi-line wrapped Base64)
      const wrappedBase64 = dummyPngBase64.slice(0, 30) + "\r\n" + dummyPngBase64.slice(30);
      const dataUrlInput = `  data:image/png;base64,${wrappedBase64}  `;
      const mockJsonReq = {
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ dataUrl: dataUrlInput, fileName: "clipboard.png" }),
      };

      const res2 = await POST(mockJsonReq);
      assert.equal(res2.status, 201, "Multi-line JSON Base64 upload in read-only mode should return 201");
      const json2 = await res2.json();
      assert.equal(json2.success, true);
      assert.equal(json2.url, `data:image/png;base64,${dummyPngBase64}`);

      // Test Invalid MIME rejection
      const badFormData = new FormData();
      badFormData.append("file", new Blob([Buffer.from("bad")], { type: "text/plain" }), "bad.txt");
      const mockBadReq = {
        headers: new Headers({ "content-type": "multipart/form-data" }),
        formData: async () => badFormData,
      };
      const resBad = await POST(mockBadReq);
      assert.equal(resBad.status, 400, "Unsupported MIME type must return 400");

      // Test 0-byte empty file rejection
      const emptyFormData = new FormData();
      emptyFormData.append("file", new Blob([], { type: "image/png" }), "empty.png");
      const mockEmptyReq = {
        headers: new Headers({ "content-type": "multipart/form-data" }),
        formData: async () => emptyFormData,
      };
      const resEmpty = await POST(mockEmptyReq);
      assert.equal(resEmpty.status, 400, "0-byte multipart file must return 400");

      // Test corrupted non-base64 JSON payload rejection
      const mockCorruptJsonReq = {
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ dataUrl: "data:image/png;base64,$$$!!!" }),
      };
      const resCorrupt = await POST(mockCorruptJsonReq);
      assert.equal(resCorrupt.status, 400, "Corrupted non-base64 payload must return 400");

      // Test >10MB oversized file rejection
      const oversizedFormData = new FormData();
      oversizedFormData.append(
        "file",
        new Blob([Buffer.alloc(10 * 1024 * 1024 + 64)], { type: "image/png" }),
        "huge.png"
      );
      const mockOversizedReq = {
        headers: new Headers({ "content-type": "multipart/form-data" }),
        formData: async () => oversizedFormData,
      };
      const resOversized = await POST(mockOversizedReq);
      assert.equal(resOversized.status, 400, "File > 10MB must return 400");
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
      if (prevReadonly === undefined) delete process.env.READONLY_FS;
      else process.env.READONLY_FS = prevReadonly;
    }
  });

  // Refresh final backup to ensure backups/latest_backup.json and backups/dev_backup.db are 100% clean
  await backupDatabase({ prisma, writeTimestamped: false });

  console.log("\n==================================================");
  console.log(`[Summary] Passed: ${passed}, Failed: ${failed}`);
  console.log("==================================================");

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

runMigrationTests().catch(async (err) => {
  console.error("Unhandled error in test_supabase_vercel_migration:", err);
  await prisma.$disconnect();
  process.exit(1);
});
