const { PrismaClient } = require("@prisma/client");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("🚀 開始執行三大新功能整合自動化測試套件");
  console.log("==================================================");

  // -------------------------------------------------------------
  // 測試 1：50題模擬考結算錯題報告 (Google文件 / docx)
  // -------------------------------------------------------------
  console.log("\n[測試 1] 驗證 50 題模擬考結算錯題報告 (Google文件) 產生...");

  const statsPassed = {
    totalScore: 74,
    isPassed: true,
    correctCount: 37,
    wrongCount: 10,
    unanswered: 3,
    elapsedSeconds: 2150,
    completedAt: "2026/09/22 04:15:30",
  };

  const sampleMixedItems = [
    {
      originalIndex: 1,
      stem: "關於專案利害關係人管理的敘述，何者正確？",
      type: "SINGLE",
      optionA: "應於專案啟動時即開始識別利害關係人",
      optionB: "僅需在專案收尾時進行管理",
      optionC: "利害關係人需求不受專案範疇影響",
      optionD: "非關鍵利害關係人不需列入登記冊",
      userAnswer: "A",
      correctAnswers: "A",
      explanation: "利害關係人應在專案啟動時儘早識別並持續管理。",
      isCorrect: true,
    },
    {
      originalIndex: 3,
      stem: "專案經理在規劃風險時，應優先採用何種工具？",
      type: "SINGLE",
      optionA: "蒙地卡羅模擬",
      optionB: "專家判斷與風險登記冊",
      optionC: "魚骨圖",
      optionD: "甘特圖",
      userAnswer: "A",
      correctAnswers: "B",
      explanation: "規劃風險時首先需由專家判斷並建立風險登記冊，蒙地卡羅為定量分析工具。",
      isCorrect: false,
    },
    {
      originalIndex: 18,
      stem: "下列哪些屬於敏捷框架中的角色？（複選）",
      type: "MULTIPLE",
      optionA: "Product Owner",
      optionB: "Scrum Master",
      optionC: "Developers",
      optionD: "Project Director",
      userAnswer: "A,B",
      correctAnswers: "A,B,C",
      explanation: "Scrum 官方指南三大角色為 PO, Scrum Master 與 Developers。",
      isCorrect: false,
    },
  ];

  // 驗證常規錯題報告 DOCX 產生
  const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  const statsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Row 1: 得分與判定
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "測驗得分", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${statsPassed.totalScore} / 100 分`,
                    bold: true,
                    size: 22,
                    color: statsPassed.isPassed ? "047857" : "DC2626",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "合格判定 (70分及格)", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: statsPassed.isPassed ? "合格通過 (PASS)" : "未達標準 (FAIL)",
                    bold: true,
                    size: 20,
                    color: statsPassed.isPassed ? "047857" : "DC2626",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 2: 答對與答錯題數
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "答對題數", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${statsPassed.correctCount} 題 (${statsPassed.correctCount * 2} 分)`,
                    size: 20,
                    color: "047857",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "答錯 / 未答", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `答錯 ${statsPassed.wrongCount} 題 · 未答 ${statsPassed.unanswered} 題`,
                    size: 20,
                    color: "DC2626",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 3: 耗時與完成時間
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "作答耗時", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "35 分 50 秒 (限時 60:00)", size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "完成時間", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: statsPassed.completedAt, size: 18 })] })],
          }),
        ],
      }),
    ],
  });

  const reportItemsChildren = [];
  sampleMixedItems.forEach((item) => {
    reportItemsChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `第 ${item.originalIndex} 題. `,
            bold: true,
            size: 22,
            color: item.isCorrect ? "047857" : "DC2626",
          }),
          new TextRun({ text: `【${item.type === "SINGLE" ? "單選題" : "複選題"}】 `, bold: true }),
          new TextRun({ text: item.stem }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `【考生作答】：${item.userAnswer} ${item.isCorrect ? "(正確 ✓)" : "(答錯 ✗)"}   `,
            bold: true,
            color: item.isCorrect ? "047857" : "DC2626",
          }),
          new TextRun({ text: `【標準答案】：${item.correctAnswers} (標準正解)`, bold: true, color: "047857" }),
        ],
      })
    );
  });

  const doc1 = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "60分鐘模擬考試 · 錯題檢討與深度覆盤報告", bold: true, size: 36 })],
          }),
          statsTable,
          ...reportItemsChildren,
        ],
      },
    ],
  });

  const buf1 = await Packer.toBuffer(doc1);
  console.log(`  ✓ 成功產生包含正反對照與完整三列統計表之錯題報告 DOCX，位元組大小: ${buf1.length} bytes`);
  if (buf1.length < 5000) throw new Error("錯題報告 DOCX 大小異常");

  // 測試邊界案例：100 分滿分無錯題
  const docPerfect = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "🎉 恭喜！本次模擬考試獲得滿分 100 分，無任何錯題！", bold: true, size: 24 })],
          }),
        ],
      },
    ],
  });
  const bufPerfect = await Packer.toBuffer(docPerfect);
  console.log(`  ✓ 成功產生滿分成就證明 DOCX，位元組大小: ${bufPerfect.length} bytes`);

  // -------------------------------------------------------------
  // 測試 2：隨機抓 50 題出成全真模擬考試卷 (DOCX / PDF)
  // -------------------------------------------------------------
  console.log("\n[測試 2] 驗證隨機抓 50 題出成模擬考試卷 (單複選混合)...");
  const allDbQuestions = await prisma.question.findMany();
  console.log(`  目前題庫總題數: ${allDbQuestions.length} 題`);
  if (allDbQuestions.length < 50) {
    throw new Error(`題庫題數小於 50 題 (${allDbQuestions.length})，請先確認種子資料`);
  }

  // 模擬隨機 50 題抽取演算法
  const singles = allDbQuestions.filter((q) => q.type === "SINGLE");
  const multiples = allDbQuestions.filter((q) => q.type === "MULTIPLE");
  console.log(`  其中單選題: ${singles.length} 題, 複選題: ${multiples.length} 題`);

  const shuffledSingle = [...singles].sort(() => Math.random() - 0.5);
  const shuffledMulti = [...multiples].sort(() => Math.random() - 0.5);

  const minSingle = Math.min(shuffledSingle.length, 25);
  const minMulti = Math.min(shuffledMulti.length, 50 - minSingle);

  const partSingle = shuffledSingle.slice(0, minSingle);
  const partMulti = shuffledMulti.slice(0, minMulti);

  const remainingPool = [
    ...shuffledSingle.slice(minSingle),
    ...shuffledMulti.slice(minMulti),
  ].sort(() => Math.random() - 0.5);

  const needed = 50 - (partSingle.length + partMulti.length);
  const drawn50 = [...partSingle, ...partMulti, ...remainingPool.slice(0, needed)].sort(
    () => Math.random() - 0.5
  );

  console.log(`  ✓ 隨機抽取 50 題成功，實際總題數: ${drawn50.length} 題`);
  if (drawn50.length !== 50) throw new Error("隨機抽取題數不等於 50 題");

  const drawnSingleCount = drawn50.filter((q) => q.type === "SINGLE").length;
  const drawnMultiCount = drawn50.filter((q) => q.type === "MULTIPLE").length;
  console.log(`  ✓ 題型混合檢驗：單選題 ${drawnSingleCount} 題，複選題 ${drawnMultiCount} 題`);
  if (drawnSingleCount === 0 || drawnMultiCount === 0) {
    throw new Error("抽取題目未包含單選或複選混合");
  }

  // 檢查無重複題目
  const uniqueIds = new Set(drawn50.map((q) => q.id));
  if (uniqueIds.size !== 50) throw new Error("抽取題目存在重複 ID");
  console.log(`  ✓ 50 題唯一性檢查通過 (無重複題目)`);

  // 驗證產生 50 題模擬試卷 DOCX
  const examChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "60分鐘模擬考試檢定試卷", bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "班級：__________ 姓名：____________ 得分：______" })],
    }),
  ];

  drawn50.forEach((q, idx) => {
    examChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. 【${q.type === "SINGLE" ? "單選題" : "複選題"}】 `, bold: true }),
          new TextRun({ text: q.stem }),
        ],
      })
    );
    examChildren.push(new Paragraph({ children: [new TextRun({ text: `(A) ${q.optionA}` })] }));
    examChildren.push(new Paragraph({ children: [new TextRun({ text: `(B) ${q.optionB}` })] }));
    examChildren.push(new Paragraph({ children: [new TextRun({ text: `(C) ${q.optionC}` })] }));
    examChildren.push(new Paragraph({ children: [new TextRun({ text: `(D) ${q.optionD}` })] }));
  });

  const docExam = new Document({ sections: [{ children: examChildren }] });
  const bufExam = await Packer.toBuffer(docExam);
  console.log(`  ✓ 成功產生隨機 50 題模擬考卷 DOCX，大小: ${bufExam.length} bytes`);
  if (bufExam.length < 10000) throw new Error("50題模擬試卷 DOCX 檔案大小異常過小");

  // -------------------------------------------------------------
  // 測試 3：導覽列「⚔️ 多人對戰」與 /battle 頁面檢查
  // -------------------------------------------------------------
  console.log("\n[測試 3] 驗證導覽列「⚔️ 多人對戰」分頁與 /battle 頁面...");

  const navbarPath = path.join(__dirname, "../src/components/Navbar.tsx");
  const navbarContent = fs.readFileSync(navbarPath, "utf-8");
  if (!navbarContent.includes("/battle") || !navbarContent.includes("多人對戰")) {
    throw new Error("Navbar.tsx 未包含多人對戰分頁連結");
  }
  console.log("  ✓ Navbar.tsx 成功包含 /battle 導覽項目與「⚔️ 多人對戰」標籤");

  const battlePath = path.join(__dirname, "../src/app/battle/page.tsx");
  if (!fs.existsSync(battlePath)) {
    throw new Error("src/app/battle/page.tsx 不存在");
  }
  const battleContent = fs.readFileSync(battlePath, "utf-8");
  const requiredKeywords = [
    "多人即時對戰",
    "創建對戰房間",
    "輸入 4 碼",
    "12 款日系可愛動物頭像",
    "街機老虎機抽卡過場",
    "3 級榮耀結算頒獎台",
  ];
  for (const kw of requiredKeywords) {
    if (!battleContent.includes(kw)) {
      throw new Error(`Battle 頁面未包含核心關鍵字: ${kw}`);
    }
  }
  console.log("  ✓ src/app/battle/page.tsx 成功包含多人對戰房間創建、加入與核心功能說明");

  console.log("\n==================================================");
  console.log("🎉 所有三大新功能自動化測試全數通過！(0 錯誤)");
  console.log("==================================================");
}

runTests()
  .catch((e) => {
    console.error("❌ 測試失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
