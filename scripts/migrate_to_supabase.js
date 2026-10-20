/**
 * scripts/migrate_to_supabase.js
 * Idempotent full data migration and restoration tool.
 * Restores all records from backups/latest_backup.json into the target database
 * (Supabase PostgreSQL or local SQLite) using safe upserts and verifies record counts.
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { convertLocalImageToDataUrl } = require("./backup_database.js");

async function migrateFromBackup(options = {}) {
  const ownPrisma = !options.prisma;
  const prisma = options.prisma || new PrismaClient();
  const rootDir = options.rootDir || path.join(__dirname, "..");
  const publicDir = options.publicDir || path.join(rootDir, "public");
  const backupPath =
    options.backupPath || path.join(rootDir, "backups", "latest_backup.json");

  try {
    let backupPayload = options.backupData;
    if (!backupPayload) {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found at: ${backupPath}`);
      }
      const rawContent = fs.readFileSync(backupPath, "utf8");
      backupPayload = JSON.parse(rawContent);
    }

    const data = backupPayload.data || backupPayload;
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const users = Array.isArray(data.users) ? data.users : [];
    const wrongQuestionRecords = Array.isArray(data.wrongQuestionRecords)
      ? data.wrongQuestionRecords
      : [];
    const userQuestionProgress = Array.isArray(data.userQuestionProgress)
      ? data.userQuestionProgress
      : [];

    console.log("==================================================");
    console.log("[Migrate/Restore] Starting idempotent data migration...");
    console.log(`  Source Questions:            ${questions.length}`);
    console.log(`  Source Users:                ${users.length}`);
    console.log(`  Source WrongQuestionRecords: ${wrongQuestionRecords.length}`);
    console.log(`  Source UserQuestionProgress: ${userQuestionProgress.length}`);
    console.log("==================================================");

    // 1. Upsert Questions
    let upsertedQuestions = 0;
    for (const q of questions) {
      const portableImageUrl = convertLocalImageToDataUrl(q.imageUrl, publicDir);
      const normalizedStem =
        q.normalizedStem ||
        String(q.stem || "")
          .toLowerCase()
          .replace(/\s+/g, "");

      const questionData = {
        stem: q.stem,
        normalizedStem,
        type: q.type || "SINGLE",
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswers: q.correctAnswers,
        explanation: q.explanation ?? null,
        category: q.category ?? null,
        difficulty: q.difficulty || "MEDIUM",
        tags: q.tags ?? null,
        imageUrl: portableImageUrl ?? null,
        wrongCount: Number(q.wrongCount) || 0,
        totalAttempts: Number(q.totalAttempts) || 0,
        correctCount: Number(q.correctCount) || 0,
        countA: Number(q.countA) || 0,
        countB: Number(q.countB) || 0,
        countC: Number(q.countC) || 0,
        countD: Number(q.countD) || 0,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
        updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(),
      };

      await prisma.question.upsert({
        where: { id: q.id },
        update: questionData,
        create: {
          id: q.id,
          ...questionData,
        },
      });
      upsertedQuestions++;
    }

    // 2. Upsert Users (handle both id and unique username safely)
    const userIdMap = new Map();
    let upsertedUsers = 0;
    for (const u of users) {
      const existingByUsername = await prisma.user.findUnique({
        where: { username: u.username },
      });

      if (existingByUsername && existingByUsername.id !== u.id) {
        const updated = await prisma.user.update({
          where: { username: u.username },
          data: {
            password: u.password,
            name: u.name ?? null,
          },
        });
        userIdMap.set(u.id, updated.id);
      } else {
        const userData = {
          username: u.username,
          password: u.password,
          name: u.name ?? null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        };
        const saved = await prisma.user.upsert({
          where: { id: u.id },
          update: userData,
          create: {
            id: u.id,
            ...userData,
          },
        });
        userIdMap.set(u.id, saved.id);
      }
      upsertedUsers++;
    }

    // 3. Upsert WrongQuestionRecords
    let upsertedWrongRecords = 0;
    for (const r of wrongQuestionRecords) {
      const targetUserId = userIdMap.get(r.userId) || r.userId;
      const recordData = {
        wrongCount: Number(r.wrongCount) || 1,
        totalAttempts: Number(r.totalAttempts) || 1,
        correctCount: Number(r.correctCount) || 0,
        lastUserAnswer: r.lastUserAnswer ?? null,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      };

      await prisma.wrongQuestionRecord.upsert({
        where: {
          userId_questionId: {
            userId: targetUserId,
            questionId: r.questionId,
          },
        },
        update: recordData,
        create: {
          id: r.id,
          userId: targetUserId,
          questionId: r.questionId,
          ...recordData,
        },
      });
      upsertedWrongRecords++;
    }

    // 4. Upsert UserQuestionProgress
    let upsertedProgress = 0;
    for (const p of userQuestionProgress) {
      const targetUserId = userIdMap.get(p.userId) || p.userId;
      const progressData = {
        isMastered: Boolean(p.isMastered),
        attemptCount: Number(p.attemptCount) || 0,
        correctCount: Number(p.correctCount) || 0,
        lastAnswer: p.lastAnswer ?? null,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      };

      await prisma.userQuestionProgress.upsert({
        where: {
          userId_questionId: {
            userId: targetUserId,
            questionId: p.questionId,
          },
        },
        update: progressData,
        create: {
          id: p.id,
          userId: targetUserId,
          questionId: p.questionId,
          ...progressData,
        },
      });
      upsertedProgress++;
    }

    // 5. Verify final counts in target database
    const targetQuestionsCount = await prisma.question.count();
    const targetUsersCount = await prisma.user.count();
    const targetWrongRecordsCount = await prisma.wrongQuestionRecord.count();
    const targetUserProgressCount = await prisma.userQuestionProgress.count();

    const verified =
      targetQuestionsCount >= questions.length &&
      targetUsersCount >= users.length &&
      targetWrongRecordsCount >= wrongQuestionRecords.length &&
      targetUserProgressCount >= userQuestionProgress.length;

    if (!verified) {
      throw new Error(
        `Migration count mismatch! Expected at least Q:${questions.length}, U:${users.length}, W:${wrongQuestionRecords.length}, P:${userQuestionProgress.length}, but found Q:${targetQuestionsCount}, U:${targetUsersCount}, W:${targetWrongRecordsCount}, P:${targetUserProgressCount}`
      );
    }

    console.log("==================================================");
    console.log("[Migrate/Restore] Verification passed! Target DB counts:");
    console.log(`  - Questions:             ${targetQuestionsCount} (upserted ${upsertedQuestions})`);
    console.log(`  - Users:                 ${targetUsersCount} (upserted ${upsertedUsers})`);
    console.log(`  - WrongQuestionRecords:  ${targetWrongRecordsCount} (upserted ${upsertedWrongRecords})`);
    console.log(`  - UserQuestionProgress:  ${targetUserProgressCount} (upserted ${upsertedProgress})`);
    console.log("==================================================");

    return {
      success: true,
      verified,
      upserted: {
        questions: upsertedQuestions,
        users: upsertedUsers,
        wrongQuestionRecords: upsertedWrongRecords,
        userQuestionProgress: upsertedProgress,
      },
      targetCounts: {
        questions: targetQuestionsCount,
        users: targetUsersCount,
        wrongQuestionRecords: targetWrongRecordsCount,
        userQuestionProgress: targetUserProgressCount,
      },
    };
  } finally {
    if (ownPrisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  migrateFromBackup().catch((err) => {
    console.error("[Migrate/Restore] Migration failed:", err);
    process.exit(1);
  });
}

module.exports = {
  migrateFromBackup,
};
