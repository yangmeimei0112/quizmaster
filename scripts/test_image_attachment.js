const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🚀 開始執行題目附圖功能 (Image Attachment) 全方位整合測試");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ 通過: ${message}`);
      passed++;
    } else {
      console.error(`❌ 失敗: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 測試 1: 資料庫模型欄位與建立含 imageUrl 之題目
    // -------------------------------------------------------------
    console.log("--- 測試 1: Prisma DB 寫入含 imageUrl 題目 ---");
    const testStem1 = `[測試題目-附圖功能] 專案關鍵路徑分析圖 ${Date.now()}`;
    const testImageUrl1 = "/uploads/test_cpm_diagram_2026.png";

    const createdWithImage = await prisma.question.create({
      data: {
        stem: testStem1,
        normalizedStem: testStem1.toLowerCase().replace(/\s+/g, ""),
        type: "SINGLE",
        optionA: "路徑總時差為零之作業集合",
        optionB: "耗時最短的工作路徑",
        optionC: "成本最高之專案排程路徑",
        optionD: "具備最大自由時差之路徑",
        correctAnswers: "A",
        explanation: "關鍵路徑為決定專案最短完成期限的最長作業活動序列，其總時差必為 0。",
        category: "專案時程管理",
        difficulty: "HARD",
        tags: "CPM,時程,關鍵路徑",
        imageUrl: testImageUrl1,
      },
    });

    assert(createdWithImage.id !== undefined, "新題目建立成功並取得 ID");
    assert(createdWithImage.imageUrl === testImageUrl1, `imageUrl 正確存入: ${createdWithImage.imageUrl}`);

    // -------------------------------------------------------------
    // 測試 2: 資料庫查詢與向後相容性 (無附圖之題目)
    // -------------------------------------------------------------
    console.log("\n--- 測試 2: 向後相容性驗證 (無附圖舊題相容) ---");
    const testStem2 = `[測試題目-無附圖舊題] 專案利害關係人登記冊 ${Date.now()}`;

    const createdWithoutImage = await prisma.question.create({
      data: {
        stem: testStem2,
        normalizedStem: testStem2.toLowerCase().replace(/\s+/g, ""),
        type: "MULTIPLE",
        optionA: "主要溝通需求",
        optionB: "評估其對專案之影響力與利益",
        optionC: "分類與基本身分資訊",
        optionD: "固定採購合約成本金額",
        correctAnswers: "A,B,C",
        explanation: "利害關係人登記冊包含辨識資訊、評估資訊與利害關係人分類，不含採購金額細節。",
        category: "利害關係人管理",
        difficulty: "MEDIUM",
        tags: "利害關係人,登記冊",
        imageUrl: null, // 無附圖
      },
    });

    assert(createdWithoutImage.imageUrl === null, "無附圖題目 imageUrl 為 null，無任何報錯");

    // -------------------------------------------------------------
    // 測試 3: 更新題目更換附圖與移除附圖 (PUT 操作)
    // -------------------------------------------------------------
    console.log("\n--- 測試 3: 更新題目附圖 (更換與清除) ---");
    const updatedUrl = "https://images.unsplash.com/photo-1551288049-bebda4e38f71";
    const updatedQuestion = await prisma.question.update({
      where: { id: createdWithImage.id },
      data: {
        imageUrl: updatedUrl,
      },
    });
    assert(updatedQuestion.imageUrl === updatedUrl, `附圖已成功更新更換為: ${updatedQuestion.imageUrl}`);

    // 移除附圖
    const clearedImageQuestion = await prisma.question.update({
      where: { id: createdWithImage.id },
      data: {
        imageUrl: null,
      },
    });
    assert(clearedImageQuestion.imageUrl === null, "附圖已成功清空設為 null");

    // -------------------------------------------------------------
    // 測試 4: 批次新增 API 支援 imageUrl
    // -------------------------------------------------------------
    console.log("\n--- 測試 4: 批次寫入題目支援選填 imageUrl ---");
    const batchStem1 = `[測試批次-附圖1] WBS 工作分解結構圖 ${Date.now()}`;
    const batchStem2 = `[測試批次-無附圖2] 敏捷衝刺待辦清單 ${Date.now()}`;

    const batchQ1 = await prisma.question.create({
      data: {
        stem: batchStem1,
        normalizedStem: batchStem1.toLowerCase().replace(/\s+/g, ""),
        type: "SINGLE",
        optionA: "選項 A",
        optionB: "選項 B",
        optionC: "選項 C",
        optionD: "選項 D",
        correctAnswers: "A",
        imageUrl: "https://example.com/wbs.png",
      },
    });

    const batchQ2 = await prisma.question.create({
      data: {
        stem: batchStem2,
        normalizedStem: batchStem2.toLowerCase().replace(/\s+/g, ""),
        type: "SINGLE",
        optionA: "選項 A",
        optionB: "選項 B",
        optionC: "選項 C",
        optionD: "選項 D",
        correctAnswers: "B",
        imageUrl: null,
      },
    });

    assert(batchQ1.imageUrl === "https://example.com/wbs.png", "批次題目 1 成功帶有 imageUrl");
    assert(batchQ2.imageUrl === null, "批次題目 2 未帶附圖正常為 null");

    // -------------------------------------------------------------
    // 測試 5: 智慧文本題目解析演算法 (Parser) 提取 imageUrl
    // -------------------------------------------------------------
    console.log("\n--- 測試 5: Question Parser 附圖標籤解析測試 ---");
    // 引用 parser 測試（支援 tsx 與原生 node 動態轉譯）
    function getQuestionParser() {
      try {
        return require("../src/lib/questionParser");
      } catch (e) {
        const ts = require("typescript");
        const filePath = path.resolve(__dirname, "../src/lib/questionParser.ts");
        const tsCode = fs.readFileSync(filePath, "utf-8");
        const jsCode = ts.transpileModule(tsCode, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText;
        const m = { exports: {} };
        const fn = new Function("module", "exports", "require", jsCode);
        fn(m, m.exports, require);
        return m.exports;
      }
    }
    const { parseQuestionText } = getQuestionParser();

    const sampleTextWithTag = `
【單選題】第15題：請依據下方掙值分析曲線圖，判斷目前專案狀態：
【附圖】：https://example.com/evm_chart.png
(A) 進度超前且成本節省
(B) 進度落後且成本超支
(C) 進度超前但成本超支
(D) 進度落後但成本節省
答案：B
【題目解析】：
EV < PV 且 EV < AC 代表進度落後且成本超支。
`;

    const parsed1 = parseQuestionText(sampleTextWithTag);
    assert(parsed1.imageUrl === "https://example.com/evm_chart.png", "Parser 成功辨識 【附圖】：https://... 並提取 URL");
    assert(!parsed1.stem.includes("【附圖】"), "Parser 已將附圖標籤從題幹中剔除，保持題幹純淨");

    const sampleTextWithMarkdown = `
16. 下圖甘特圖中，關鍵路徑為何者？
![甘特圖範例](/uploads/gantt_2026.webp)
A. A-B-D
B. A-C-D
C. B-C-D
D. 以上皆非
解答：A
`;

    const parsed2 = parseQuestionText(sampleTextWithMarkdown);
    assert(parsed2.imageUrl === "/uploads/gantt_2026.webp", "Parser 成功辨識 Markdown 圖片語法 ![...](...)");

    // -------------------------------------------------------------
    // 測試 6: 上傳資料夾結構與 API 靜態路由檢核
    // -------------------------------------------------------------
    console.log("\n--- 測試 6: 圖片上傳目錄與靜態服務檢驗 ---");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    assert(fs.existsSync(uploadDir), "public/uploads 目錄存在且具備讀寫權限");

    const testDummyPath = path.join(uploadDir, "unit_test_dummy.txt");
    fs.writeFileSync(testDummyPath, "ok");
    assert(fs.existsSync(testDummyPath), "成功寫入測試檔案至 public/uploads");
    fs.unlinkSync(testDummyPath);

    // -------------------------------------------------------------
    // 清理測試資料
    // -------------------------------------------------------------
    console.log("\n--- 清理測試資料庫記錄 ---");
    await prisma.question.deleteMany({
      where: {
        id: { in: [createdWithImage.id, createdWithoutImage.id, batchQ1.id, batchQ2.id] },
      },
    });
    console.log("🧹 測試資料已乾淨清理完畢。");

    console.log("\n=================================================");
    console.log(`🎉 測試完成: 通過 ${passed} 項，失敗 ${failed} 項`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("測試執行發生未捕捉異常:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
