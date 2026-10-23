/**
 * scripts/import_418_from_docx.js
 * Restores all 418 production questions from the exported DOCX exam file
 * (`C:\Users\yaco9\Downloads\個人題庫測驗試卷.docx` or parsed JSON fallback)
 * into `prisma/dev.db`, replacing the 72 default local test questions.
 *
 * Uses project-standard:
 * - `normalizeText(stem)` from `src/lib/similarity.ts` for `normalizedStem`
 * - `normalizeExplanationToFourSections(...)` from `src/lib/explanationParser.ts` for 4-section structured explanations
 */

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { PrismaClient } = require("@prisma/client");

const DEFAULT_DOCX_PATH = "C:/Users/yaco9/Downloads/個人題庫測驗試卷.docx";
const DEFAULT_JSON_FALLBACK_PATH =
  "C:/Users/yaco9/.gemini/antigravity/brain/f46b199f-fef8-4036-aa4e-1aa2230fa2b6/scratch/parsed_418_questions.json";

/**
 * Extracts `word/document.xml` from a .docx (ZIP) buffer using built-in Node.js zlib.
 */
function extractDocumentXmlFromDocx(docxBuffer) {
  let offset = 0;
  while (offset < docxBuffer.length - 4) {
    if (docxBuffer.readUInt32LE(offset) === 0x04034b50) {
      const compMethod = docxBuffer.readUInt16LE(offset + 8);
      const compSize = docxBuffer.readUInt32LE(offset + 18);
      const nameLen = docxBuffer.readUInt16LE(offset + 26);
      const extraLen = docxBuffer.readUInt16LE(offset + 28);
      const entryName = docxBuffer.toString("utf8", offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const dataEnd = dataStart + compSize;

      if (entryName === "word/document.xml") {
        const compressedSlice = docxBuffer.subarray(dataStart, dataEnd);
        if (compMethod === 0) {
          return compressedSlice.toString("utf8");
        }
        if (compMethod === 8) {
          return zlib.inflateRawSync(compressedSlice).toString("utf8");
        }
        throw new Error(`Unsupported ZIP compression method ${compMethod} for word/document.xml`);
      }
      offset = dataEnd;
    } else {
      offset++;
    }
  }
  throw new Error("Could not find word/document.xml inside the DOCX archive");
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parses all questions exported by `/api/export/docx` from `word/document.xml` string.
 */
function parseQuestionsFromDocumentXml(xml) {
  const pMatches = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];
  const paragraphs = pMatches
    .map((p) => {
      const withBr = p.replace(/<w:br\s*\/?>/g, "<w:t>\n</w:t>");
      const tMatches = withBr.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      return tMatches
        .map((t) => decodeXmlEntities(t.replace(/<\/?w:t\b[^>]*>/g, "")))
        .join("");
    })
    .filter((s) => s.trim().length > 0);

  const questions = [];
  let current = null;

  for (const p of paragraphs) {
    const qMatch = p.match(/^(\d+)\.\s*【(單選題|複選題)】\s*([\s\S]+)$/);
    if (qMatch) {
      if (current) questions.push(current);
      current = {
        num: Number(qMatch[1]),
        type: qMatch[2] === "單選題" ? "SINGLE" : "MULTIPLE",
        stem: qMatch[3].trim(),
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswers: "",
        explanation: "",
        imageUrl: null,
      };
    } else if (current) {
      if (p.startsWith("(A) ")) {
        current.optionA = p.slice(4).trim();
      } else if (p.startsWith("(B) ")) {
        current.optionB = p.slice(4).trim();
      } else if (p.startsWith("(C) ")) {
        current.optionC = p.slice(4).trim();
      } else if (p.startsWith("(D) ")) {
        current.optionD = p.slice(4).trim();
      } else if (p.startsWith("【標準答案】：")) {
        current.correctAnswers = p.replace("【標準答案】：", "").trim();
      } else if (p.startsWith("【題目解析】：")) {
        const exp = p.replace("【題目解析】：", "").trim();
        current.explanation = exp === "（出題者未填寫解析）" ? "" : exp;
      } else if (p.startsWith("【題目附圖】：")) {
        current.imageUrl = p.replace("【題目附圖】：", "").trim() || null;
      }
    }
  }

  if (current) {
    questions.push(current);
  }

  return questions;
}

async function import418Questions(options = {}) {
  const ownPrisma = !options.prisma;
  const prisma = options.prisma || new PrismaClient();
  const docxPath = options.docxPath || DEFAULT_DOCX_PATH;
  const jsonFallbackPath = options.jsonFallbackPath || DEFAULT_JSON_FALLBACK_PATH;

  try {
    const similarityModulePath = path.resolve(__dirname, "../src/lib/similarity.ts");
    const explanationParserModulePath = path.resolve(__dirname, "../src/lib/explanationParser.ts");

    const { normalizeText } = await import(
      "file://" + similarityModulePath.replace(/\\/g, "/")
    );
    const { normalizeExplanationToFourSections } = await import(
      "file://" + explanationParserModulePath.replace(/\\/g, "/")
    );

    let parsedQuestions = [];
    let sourceUsed = "";

    if (fs.existsSync(docxPath)) {
      const docxBuffer = fs.readFileSync(docxPath);
      const xml = extractDocumentXmlFromDocx(docxBuffer);
      parsedQuestions = parseQuestionsFromDocumentXml(xml);
      sourceUsed = docxPath;
    } else if (fs.existsSync(jsonFallbackPath)) {
      parsedQuestions = JSON.parse(fs.readFileSync(jsonFallbackPath, "utf8"));
      sourceUsed = jsonFallbackPath;
    } else {
      throw new Error(
        `Neither DOCX (${docxPath}) nor JSON fallback (${jsonFallbackPath}) could be found.`
      );
    }

    if (parsedQuestions.length !== 418) {
      throw new Error(
        `Expected exactly 418 questions from ${sourceUsed}, but parsed ${parsedQuestions.length}`
      );
    }

    // Sort strictly by question number 1..418
    parsedQuestions.sort((a, b) => a.num - b.num);

    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      if (q.num !== i + 1) {
        throw new Error(`Question sequence mismatch at index ${i}: expected num ${i + 1}, got ${q.num}`);
      }
      if (!q.stem || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctAnswers) {
        throw new Error(`Question #${q.num} is missing required fields`);
      }
    }

    console.log("==================================================");
    console.log("[Import 418] Starting full production question bank import");
    console.log(`  - Source:                ${sourceUsed}`);
    console.log(`  - Parsed Questions:      ${parsedQuestions.length}`);
    console.log("==================================================");

    const prevCount = await prisma.question.count();
    console.log(`  - Previous DB Questions: ${prevCount}`);

    // Clear old default 72 test questions and any linked records
    await prisma.$transaction([
      prisma.wrongQuestionRecord.deleteMany({}),
      prisma.userQuestionProgress.deleteMany({}),
      prisma.question.deleteMany({}),
    ]);

    // Base timestamp for deterministic sequential order (1 -> 418)
    const baseTimeMs = Date.UTC(2026, 9, 9, 7, 0, 0, 0);
    let structuredExplanationCount = 0;

    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      const stem = q.stem.trim();
      const optionA = q.optionA.trim();
      const optionB = q.optionB.trim();
      const optionC = q.optionC.trim();
      const optionD = q.optionD.trim();
      const type = q.type === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
      const correctAnswers = q.correctAnswers
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .sort()
        .join(",");

      const normalizedStem = normalizeText(stem);
      const rawExp = q.explanation ? q.explanation.trim() : "";
      const structuredExplanation = rawExp
        ? normalizeExplanationToFourSections(
            rawExp,
            { A: optionA, B: optionB, C: optionC, D: optionD },
            correctAnswers
          ) || null
        : null;

      if (structuredExplanation) {
        structuredExplanationCount++;
      }

      const itemTime = new Date(baseTimeMs + i * 1000);

      await prisma.question.create({
        data: {
          stem,
          normalizedStem,
          type,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswers,
          explanation: structuredExplanation,
          category: q.category ?? null,
          difficulty: q.difficulty || "MEDIUM",
          tags: q.tags ?? null,
          imageUrl: q.imageUrl ?? null,
          wrongCount: 0,
          totalAttempts: 0,
          correctCount: 0,
          countA: 0,
          countB: 0,
          countC: 0,
          countD: 0,
          createdAt: itemTime,
          updatedAt: itemTime,
        },
      });
    }

    const finalCount = await prisma.question.count();
    const singleCount = await prisma.question.count({ where: { type: "SINGLE" } });
    const multipleCount = await prisma.question.count({ where: { type: "MULTIPLE" } });

    if (finalCount !== 418) {
      throw new Error(`Import verification failed: expected 418 questions in DB, found ${finalCount}`);
    }

    console.log("==================================================");
    console.log("[Import 418] Production question bank imported successfully!");
    console.log(`  - Total Questions in DB: ${finalCount}`);
    console.log(`  - Single Choice (SINGLE):   ${singleCount}`);
    console.log(`  - Multiple Choice (MULTIPLE): ${multipleCount}`);
    console.log(`  - With 4-Section Explanations: ${structuredExplanationCount}`);
    console.log("==================================================");

    return {
      success: true,
      total: finalCount,
      singleCount,
      multipleCount,
      structuredExplanationCount,
    };
  } finally {
    if (ownPrisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  import418Questions().catch((err) => {
    console.error("[Import 418] Failed:", err);
    process.exit(1);
  });
}

module.exports = {
  import418Questions,
  extractDocumentXmlFromDocx,
  parseQuestionsFromDocumentXml,
};
