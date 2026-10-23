/**
 * scripts/backup_database.js
 * Full safety backup utility for local SQLite (prisma/dev.db) or PostgreSQL database.
 * Exports all tables (Question, User, WrongQuestionRecord, UserQuestionProgress) to:
 * 1. backups/latest_backup.json (structured JSON with metadata, counts, and SHA-256 checksum)
 * 2. backups/backup_<timestamp>.json (timestamped JSON archive)
 * 3. backups/dev_backup.db (raw binary SQLite database snapshot)
 * Also converts any local /uploads/... image attachments on disk into portable Base64 Data URLs.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Converts a local /uploads/... path to a portable Base64 Data URL if the file exists on disk.
 * Returns the original imageUrl if it is already a Data URL, an external HTTP(S) URL, or if the file is missing.
 */
function convertLocalImageToDataUrl(imageUrl, publicDir) {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  const basePublicDir = publicDir || path.join(__dirname, "..", "public");
  let relPath = trimmed.split(/[?#]/)[0];
  relPath = relPath.replace(/^(?:\.\/|\/)+/, "");
  if (relPath.startsWith("public/")) {
    relPath = relPath.slice("public/".length);
  }

  const fullFilePath = path.join(basePublicDir, relPath);
  if (fs.existsSync(fullFilePath) && fs.statSync(fullFilePath).isFile()) {
    const ext = path.extname(fullFilePath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] || "image/png";
    const fileBuffer = fs.readFileSync(fullFilePath);
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  }

  return trimmed;
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // busy wait fallback
    }
  }
}

function writeFileSafe(filePath, content, encoding = "utf8") {
  let lastErr;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      if (fs.existsSync(filePath)) {
        try {
          const existing = fs.readFileSync(filePath, encoding);
          if (existing === content) return;
        } catch {
          // ignore read error and proceed to write
        }
      }
      fs.writeFileSync(filePath, content, encoding);
      return;
    } catch (err) {
      lastErr = err;
      if (
        err &&
        (err.code === "UNKNOWN" ||
          err.code === "EBUSY" ||
          err.code === "EPERM" ||
          err.code === "EACCES")
      ) {
        sleepSync(40 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function copyFileSafe(srcPath, destPath) {
  let lastErr;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      fs.copyFileSync(srcPath, destPath);
      return;
    } catch (err) {
      lastErr = err;
      if (
        err &&
        (err.code === "UNKNOWN" ||
          err.code === "EBUSY" ||
          err.code === "EPERM" ||
          err.code === "EACCES")
      ) {
        sleepSync(40 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function backupDatabase(options = {}) {
  const ownPrisma = !options.prisma;
  const prisma = options.prisma || new PrismaClient();
  const rootDir = options.rootDir || path.join(__dirname, "..");
  const backupDir = options.backupDir || path.join(rootDir, "backups");
  const publicDir = options.publicDir || path.join(rootDir, "public");
  const sqliteDbPath = options.sqliteDbPath || path.join(rootDir, "prisma", "dev.db");

  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 1. Copy binary SQLite database if present
    const binaryBackupPath = path.join(backupDir, "dev_backup.db");
    let binaryCopied = false;
    if (fs.existsSync(sqliteDbPath)) {
      copyFileSafe(sqliteDbPath, binaryBackupPath);
      binaryCopied = true;
    }

    // 2. Fetch all records from the 4 core tables
    const rawQuestions = await prisma.question.findMany({
      orderBy: { createdAt: "asc" },
    });
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });
    const wrongQuestionRecords = await prisma.wrongQuestionRecord.findMany({
      orderBy: { createdAt: "asc" },
    });
    const userQuestionProgress = await prisma.userQuestionProgress.findMany({
      orderBy: { createdAt: "asc" },
    });

    // 3. Convert any local /uploads/... image files into portable Base64 Data URLs
    let convertedImagesCount = 0;
    const questions = [];
    for (const q of rawQuestions) {
      const portableImageUrl = convertLocalImageToDataUrl(q.imageUrl, publicDir);
      if (portableImageUrl !== q.imageUrl) {
        convertedImagesCount++;
        if (options.updateDbImages !== false) {
          await prisma.question.update({
            where: { id: q.id },
            data: { imageUrl: portableImageUrl },
          });
        }
      }
      questions.push({
        ...q,
        imageUrl: portableImageUrl,
      });
    }

    const dataPayload = {
      questions,
      users,
      wrongQuestionRecords,
      userQuestionProgress,
    };

    const serializedData = JSON.stringify(dataPayload);
    const checksum = crypto.createHash("sha256").update(serializedData).digest("hex");
    const nowIso = new Date().toISOString();
    const safeTimestamp = nowIso.replace(/[:.]/g, "-");

    const backupObject = {
      metadata: {
        version: "1.0.0",
        timestamp: nowIso,
        source: fs.existsSync(sqliteDbPath) ? "prisma/dev.db" : "database",
        binaryBackupPath: binaryCopied ? "backups/dev_backup.db" : null,
        convertedImagesCount,
        counts: {
          questions: questions.length,
          users: users.length,
          wrongQuestionRecords: wrongQuestionRecords.length,
          userQuestionProgress: userQuestionProgress.length,
        },
        checksum,
      },
      data: dataPayload,
    };

    const jsonString = JSON.stringify(backupObject, null, 2);
    const latestBackupPath = path.join(backupDir, "latest_backup.json");
    const timestampedBackupPath = path.join(backupDir, `backup_${safeTimestamp}.json`);

    writeFileSafe(latestBackupPath, jsonString, "utf8");
    if (options.writeTimestamped !== false) {
      writeFileSafe(timestampedBackupPath, jsonString, "utf8");
    }

    console.log("==================================================");
    console.log("[Backup] Database full backup completed successfully");
    console.log(`  - Questions:             ${questions.length}`);
    console.log(`  - Users:                 ${users.length}`);
    console.log(`  - WrongQuestionRecords:  ${wrongQuestionRecords.length}`);
    console.log(`  - UserQuestionProgress:  ${userQuestionProgress.length}`);
    console.log(`  - Converted Local Imgs:  ${convertedImagesCount}`);
    console.log(`  - SHA-256 Checksum:      ${checksum}`);
    console.log(`  - Latest JSON Backup:    ${latestBackupPath}`);
    if (binaryCopied) {
      console.log(`  - Binary SQLite Backup:  ${binaryBackupPath}`);
    }
    console.log("==================================================");

    return {
      success: true,
      latestBackupPath,
      timestampedBackupPath: options.writeTimestamped !== false ? timestampedBackupPath : null,
      binaryBackupPath: binaryCopied ? binaryBackupPath : null,
      backupObject,
    };
  } finally {
    if (ownPrisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  backupDatabase().catch((err) => {
    console.error("[Backup] Failed to backup database:", err);
    process.exit(1);
  });
}

module.exports = {
  backupDatabase,
  convertLocalImageToDataUrl,
};
