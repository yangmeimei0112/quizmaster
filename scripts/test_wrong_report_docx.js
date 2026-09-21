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

async function testWrongReportDocx() {
  console.log("=== 測試模擬考錯題報告 DOCX 產生 ===");

  const stats = {
    totalScore: 74,
    isPassed: true,
    correctCount: 37,
    wrongCount: 13,
    unanswered: 0,
    elapsedSeconds: 1954,
    completedAt: "2026/09/22 04:15:30",
  };

  const items = [
    {
      originalIndex: 5,
      stem: "關於敏捷開發中的敏捷宣言，下列何者為非？",
      type: "SINGLE",
      optionA: "流程與工具高於個人與互動",
      optionB: "可用的軟體高於詳盡的文件",
      optionC: "與客戶合作高於合約協商",
      optionD: "回應變化高於遵循計劃",
      userAnswer: "B",
      correctAnswers: "A",
      explanation: "敏捷宣言核心為「個人與互動高於流程與工具」，因此選項 A 敘述相反，為非。",
    },
    {
      originalIndex: 12,
      stem: "下列哪些屬於專案風險管理的主要流程？（複選）",
      type: "MULTIPLE",
      optionA: "風險辨識",
      optionB: "定性風險分析",
      optionC: "規劃風險應變",
      optionD: "監督風險",
      userAnswer: "A,B",
      correctAnswers: "A,B,C,D",
      explanation: "PMBOK 規範之風險管理包含辨識、定性、定量分析、應變規劃、實施與監督，A/B/C/D 均正確。",
    },
  ];

  const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  const statsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
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
            children: [new Paragraph({ children: [new TextRun({ text: `${stats.totalScore} / 100 分`, bold: true, size: 22, color: "047857" })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "合格判定", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "合格通過 (PASS)", bold: true, size: 20, color: "047857" })] })],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "60分鐘模擬考試 · 錯題檢討與深度覆盤報告", bold: true, size: 36 })],
          }),
          statsTable,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  console.log(`[驗證成功] 錯題報告 docx 大小: ${buffer.length} bytes`);
  if (buffer.length < 5000) throw new Error("docx 大小不正確");
}

testWrongReportDocx().then(() => console.log("錯題報告 DOCX 測試通過！"));
