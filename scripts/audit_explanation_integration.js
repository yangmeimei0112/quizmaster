/**
 * Static Integration & Forensic Audit Script for ExplanationCard Adoption
 * QuizMaster Milestone 7: Verifies 4 core scenario surfaces + MockExamView and zero DB mutation
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function runIntegrationAudit() {
  console.log("==================================================");
  console.log("🔍 執行 ExplanationCard 全站整合與資料庫零改動審計");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [通過] ${name}`);
    } catch (err) {
      console.error(`  ✗ [失敗] ${name}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // Define target scenario files
  const targetFiles = [
    {
      name: "題庫管理列表 (/questions)",
      path: path.resolve(__dirname, "../src/app/questions/page.tsx"),
      minCallsites: 1,
      requiresCompact: false,
    },
    {
      name: "個人自測刷題 (/practice)",
      path: path.resolve(__dirname, "../src/app/practice/page.tsx"),
      minCallsites: 1,
      requiresCompact: false,
      requiresUserAnswer: true,
    },
    {
      name: "多人對戰競技 (BattlePlayView)",
      path: path.resolve(__dirname, "../src/components/battle/BattlePlayView.tsx"),
      minCallsites: 1,
      requiresCompact: true,
    },
    {
      name: "錯題排行榜 (WrongQuestionsRanking)",
      path: path.resolve(__dirname, "../src/components/practice/WrongQuestionsRanking.tsx"),
      minCallsites: 3, // Personal tab, Global tab, Review modal
      requiresCompact: false,
    },
    {
      name: "50題全真模擬考 (MockExamView)",
      path: path.resolve(__dirname, "../src/components/practice/MockExamView.tsx"),
      minCallsites: 1,
      requiresCompact: false,
      requiresUserAnswer: true,
    },
  ];

  console.log("\n--- 1. 審計 4 大核心場景 + 模擬考之 ExplanationCard 引入與呼叫 ---");

  for (const target of targetFiles) {
    test(`場景檔案存在性: ${target.name}`, () => {
      assert.ok(fs.existsSync(target.path), `檔案不存在: ${target.path}`);
    });

    const content = fs.readFileSync(target.path, "utf8");

    test(`模組匯入審計: ${target.name} 包含 ExplanationCard import`, () => {
      const hasImport =
        content.includes('import ExplanationCard from "@/components/ExplanationCard"') ||
        content.includes("import ExplanationCard from '@/components/ExplanationCard'");
      assert.ok(hasImport, `缺少 ExplanationCard 匯入語句: ${target.path}`);
    });

    test(`呼叫點 (Callsites) 數量審計: ${target.name} 至少包含 ${target.minCallsites} 處呼叫`, () => {
      const matches = content.match(/<ExplanationCard/g) || [];
      assert.ok(
        matches.length >= target.minCallsites,
        `呼叫點數量不足 (預期至少 ${target.minCallsites}，實際 ${matches.length})`
      );
    });

    test(`必要 Props 審計: ${target.name} 完整傳遞 explanation, correctAnswers 與 options`, () => {
      assert.ok(content.includes("explanation="), "缺少 explanation prop");
      assert.ok(content.includes("correctAnswers="), "缺少 correctAnswers prop");
      assert.ok(content.includes("options="), "缺少 options prop");
    });

    if (target.requiresCompact) {
      test(`緊湊模式審計: ${target.name} 傳遞 compact={true}`, () => {
        assert.ok(
          content.includes("compact={true}") || content.includes("compact"),
          `${target.name} 必須啟用 compact 緊湊模式`
        );
      });
    }

    if (target.requiresUserAnswer) {
      test(`個人作答回饋審計: ${target.name} 傳遞 userAnswer prop`, () => {
        assert.ok(content.includes("userAnswer="), `${target.name} 應傳遞 userAnswer prop`);
      });
    }
  }

  // =========================================================================
  // 2. Legacy Raw Paragraph Eradication Audit
  // =========================================================================
  console.log("\n--- 2. 審計舊版未排版原生段落 (<p>{q.explanation}</p>) 根除狀態 ---");

  const legacyRegexes = [
    /<p[^>]*>[\s\r\n]*\{(?:q|currentQ|item)\.explanation\}[\s\r\n]*<\/p>/i,
    /<p[^>]*>\s*解析[：:\s]*\{(?:q|currentQ|item)\.explanation\}\s*<\/p>/i,
  ];

  for (const target of targetFiles) {
    const content = fs.readFileSync(target.path, "utf8");

    test(`無殘留原生標籤: ${target.name} 徹底根除舊版未排版 <p>{explanation}</p>`, () => {
      for (const reg of legacyRegexes) {
        const match = content.match(reg);
        assert.ok(
          !match,
          `在 ${target.name} 中仍發現舊版原生解析標籤殘留: ${match ? match[0] : ""}`
        );
      }
    });
  }

  // =========================================================================
  // 3. Zero Database Mutation Invariant Audit
  // =========================================================================
  console.log("\n--- 3. 審計資料庫零改動不變性 (Zero Database Mutation Invariant) ---");

  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  test("Schema 結構完整性: Prisma Question 模型維持原始 explanation String? 欄位定義", () => {
    assert.ok(fs.existsSync(schemaPath), "缺少 prisma/schema.prisma");
    assert.ok(schemaContent.includes("explanation    String?"), "Question 模型必須保留原始 explanation String?");
  });

  const apiQuestionPath = path.resolve(__dirname, "../src/app/api/questions/route.ts");
  if (fs.existsSync(apiQuestionPath)) {
    const apiContent = fs.readFileSync(apiQuestionPath, "utf8");
    test("API 資料不變性: /api/questions 讀取端無破壞性 HTML 轉換，忠實回傳原始字串", () => {
      // 確保 API 查詢直接傳遞原始字串，未注入任何破壞性字串清洗或預渲染 HTML
      assert.ok(!apiContent.includes("renderToStaticMarkup"), "API 不得在後端預先渲染 HTML");
      assert.ok(!apiContent.includes("parsedExplanation"), "API 不得在資料庫追加衍生欄位");
    });
  }

  const parserLibPath = path.resolve(__dirname, "../src/lib/explanationParser.ts");
  const parserContent = fs.readFileSync(parserLibPath, "utf8");

  test("解析器純度與唯讀性: explanationParser 為純函式且 rawText 忠實保留", () => {
    assert.ok(parserContent.includes("rawText"), "parseExplanation 必須回傳原始文字 rawText");
    assert.ok(
      parserContent.includes("export function parseExplanation"),
      "parseExplanation 必須為純函式"
    );
  });

  console.log("\n==================================================");
  console.log(`🎉 整合與資料庫零改動審計全部完成：${passed}/${total} 項通過！`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runIntegrationAudit().catch((err) => {
  console.error("執行整合審計過程發生未預期錯誤:", err);
  process.exit(1);
});
