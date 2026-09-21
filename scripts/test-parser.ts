import { parseQuestionText } from "../src/lib/questionParser";

const cases = [
  {
    name: "1. User Original Example (Direct Task Prompt)",
    input: `8. 專案工作說明書（Statement of Work, SOW）主要是由下列哪一方提供？
(A) 需求者、業主或委託人

(B) 專案贊助者（Project Sponsor）

(C) 主承包商（Contractor）

(D) 專案經理（Project Manager）`,
    expected: {
      stem: "專案工作說明書（Statement of Work, SOW）主要是由下列哪一方提供？",
      optionA: "需求者、業主或委託人",
      optionB: "專案贊助者（Project Sponsor）",
      optionC: "主承包商（Contractor）",
      optionD: "專案經理（Project Manager）",
      correctAnswers: ["A"],
      type: "SINGLE",
      explanation: "",
    },
  },
  {
    name: "2. With Answer and Explanation at bottom",
    input: `8. 專案工作說明書（Statement of Work, SOW）主要是由下列哪一方提供？
(A) 需求者、業主或委託人
(B) 專案贊助者（Project Sponsor）
(C) 主承包商（Contractor）
(D) 專案經理（Project Manager）
答案：A
解析：專案工作說明書通常由需求者、客戶或買方撰寫。`,
    expected: {
      stem: "專案工作說明書（Statement of Work, SOW）主要是由下列哪一方提供？",
      optionA: "需求者、業主或委託人",
      optionB: "專案贊助者（Project Sponsor）",
      optionC: "主承包商（Contractor）",
      optionD: "專案經理（Project Manager）",
      correctAnswers: ["A"],
      type: "SINGLE",
      explanation: "專案工作說明書通常由需求者、客戶或買方撰寫。",
    },
  },
  {
    name: "3. Multiple Choice with tag and comma answer",
    input: `【複選題】15. 專案管理包含下列哪些構面？
(A) 範疇管理
(B) 時程管理
(C) 成本管理
(D) 品質管理
解答：A, B, C, D
詳解：九大知識領域均包含在內。`,
    expected: {
      stem: "專案管理包含下列哪些構面？",
      optionA: "範疇管理",
      optionB: "時程管理",
      optionC: "成本管理",
      optionD: "品質管理",
      correctAnswers: ["A", "B", "C", "D"],
      type: "MULTIPLE",
      explanation: "九大知識領域均包含在內。",
    },
  },
  {
    name: "4. Answer in question header and dot options",
    input: `(B) 22. 下列何者非專案三大限制之一？
A. 範疇
B. 薪資
C. 成本
D. 時間
說明：三大限制為範疇、時程、成本。`,
    expected: {
      stem: "下列何者非專案三大限制之一？",
      optionA: "範疇",
      optionB: "薪資",
      optionC: "成本",
      optionD: "時間",
      correctAnswers: ["B"],
      type: "SINGLE",
      explanation: "三大限制為範疇、時程、成本。",
    },
  },
  {
    name: "5. Inline options on single line",
    input: `Q3: 請問專案發起人的主要職責為？
(A) 提供資源與支援  (B) 撰寫底層程式碼  (C) 每日例會記錄  (D) 驗收測試執行
Ans: A`,
    expected: {
      stem: "請問專案發起人的主要職責為？",
      optionA: "提供資源與支援",
      optionB: "撰寫底層程式碼",
      optionC: "每日例會記錄",
      optionD: "驗收測試執行",
      correctAnswers: ["A"],
      type: "SINGLE",
    },
  },
  {
    name: "6. Fullwidth parentheses and Chinese dunhao with bracketed answer",
    input: `5、在敏捷開發（Scrum）架構中，Sprint 衝刺週期通常為多久？
（A）1 到 4 週
（B）半年
（C）一年
（D）不限時間
標準答案：【A】
題目解析：敏捷建議 1~4 週為一個迭代週期。`,
    expected: {
      stem: "在敏捷開發（Scrum）架構中，Sprint 衝刺週期通常為多久？",
      optionA: "1 到 4 週",
      optionB: "半年",
      optionC: "一年",
      optionD: "不限時間",
      correctAnswers: ["A"],
      explanation: "敏捷建議 1~4 週為一個迭代週期。",
    },
  },
  {
    name: "7. Multiline question stem with scenario",
    input: `情境題：甲公司欲更換內部 ERP 系統，目前處於規劃階段。
經費有限且期限緊迫。
第 10 題：專案經理應優先進行哪一項工作？
[A] 召開利害關係人會議確認範疇
[B] 直接購買套裝軟體上線
[C] 辭退現有資訊人員
[D] 無需處理
答案: [A]`,
    expected: {
      stem: `情境題：甲公司欲更換內部 ERP 系統，目前處於規劃階段。\n經費有限且期限緊迫。\n專案經理應優先進行哪一項工作？`,
      optionA: "召開利害關係人會議確認範疇",
      optionB: "直接購買套裝軟體上線",
      optionC: "辭退現有資訊人員",
      optionD: "無需處理",
      correctAnswers: ["A"],
    },
  },
  {
    name: "8. Multiple choice with concatenated answer AC",
    input: `題目：下列哪些項目屬於專案收尾階段工作？
A、移交專案產出物
B、發布專案章程
C、釋放專案資源
D、編列專案預算
答案：A、C`,
    expected: {
      stem: "下列哪些項目屬於專案收尾階段工作？",
      optionA: "移交專案產出物",
      optionB: "發布專案章程",
      optionC: "釋放專案資源",
      optionD: "編列專案預算",
      correctAnswers: ["A", "C"],
      type: "MULTIPLE",
    },
  },
  {
    name: "9. Lowercase options with trailing semicolons",
    input: `7、敏捷衝刺目標應具備何種特性？
(a) 明確且可衡量；
(b) 模糊且不可變更；
(c) 僅由產品負責人決定；
(d) 隨時可放棄。
解答: a
詳解:
1. 必須具備明確性
2. 必須具備可衡量性`,
    expected: {
      stem: "敏捷衝刺目標應具備何種特性？",
      optionA: "明確且可衡量",
      optionB: "模糊且不可變更",
      optionC: "僅由產品負責人決定",
      optionD: "隨時可放棄",
      correctAnswers: ["A"],
      type: "SINGLE",
      explanation: "1. 必須具備明確性\n2. 必須具備可衡量性",
    },
  },
  {
    name: "10. Bracketed answer tags with multiple choices",
    input: `9. 下列哪些屬於甘特圖（Gantt Chart）的主要優點？
A. 清楚視覺化各項活動之時間進度
B. 明確標示里程碑
C. 自動產生所有程式碼
D. 易於向利害關係人報告時程
正解：【A】【B】【D】`,
    expected: {
      stem: "下列哪些屬於甘特圖（Gantt Chart）的主要優點？",
      optionA: "清楚視覺化各項活動之時間進度",
      optionB: "明確標示里程碑",
      optionC: "自動產生所有程式碼",
      optionD: "易於向利害關係人報告時程",
      correctAnswers: ["A", "B", "D"],
      type: "MULTIPLE",
    },
  },
  {
    name: "11. Stem contains (A) in middle of sentence",
    input: `8. 依據某某計畫中的 (A) 級分級標準，下列何者正確？
(A) 項目一
(B) 項目二
(C) 項目三
(D) 項目四`,
    expected: {
      stem: "依據某某計畫中的 (A) 級分級標準，下列何者正確？",
      optionA: "項目一",
      optionB: "項目二",
      optionC: "項目三",
      optionD: "項目四",
      correctAnswers: ["A"],
      type: "SINGLE",
    },
  },
  {
    name: "12. Option contains internal parenthesized letters (維生素 (B) 群)",
    input: `1. 下列何者非水溶性維生素？
(A) 維生素 (B) 群
(B) 維生素 (C)
(C) 維生素 (A)
(D) 維生素 (D)`,
    expected: {
      stem: "下列何者非水溶性維生素？",
      optionA: "維生素 (B) 群",
      optionB: "維生素 (C)",
      optionC: "維生素 (A)",
      optionD: "維生素 (D)",
      correctAnswers: ["A"],
      type: "SINGLE",
    },
  },
  {
    name: "13. Answer format: 答案為 (A)",
    input: `8. 專案工作說明書主要由下列哪一方提供？
(A) 需求者、業主或委託人
(B) 專案贊助者
(C) 主承包商
(D) 專案經理
答案為 (A)`,
    expected: {
      stem: "專案工作說明書主要由下列哪一方提供？",
      optionA: "需求者、業主或委託人",
      optionB: "專案贊助者",
      optionC: "主承包商",
      optionD: "專案經理",
      correctAnswers: ["A"],
      type: "SINGLE",
    },
  },
  {
    name: "14. Stem contains numbered conditions list (1. 2. 3.)",
    input: `8. 專案有以下兩項限制：
1. 預算上限一百萬
2. 期限三個月
請問下列何者正確？
(A) 限制一
(B) 限制二
(C) 以上皆是
(D) 以上皆非`,
    expected: {
      stem: "專案有以下兩項限制：\n1. 預算上限一百萬\n2. 期限三個月\n請問下列何者正確？",
      optionA: "限制一",
      optionB: "限制二",
      optionC: "以上皆是",
      optionD: "以上皆非",
      correctAnswers: ["A"],
      type: "SINGLE",
    },
  },
  {
    name: "15. Fullwidth Latin Letters （Ａ）, （Ｂ）, （Ｃ）, （Ｄ） and 答案：Ａ",
    input: `8. 專案工作說明書主要是由下列哪一方提供？
（Ａ）需求者、業主或委託人
（Ｂ）專案贊助者
（Ｃ）主承包商
（Ｄ）專案經理
答案：Ａ`,
    expected: {
      stem: "專案工作說明書主要是由下列哪一方提供？",
      optionA: "需求者、業主或委託人",
      optionB: "專案贊助者",
      optionC: "主承包商",
      optionD: "專案經理",
      correctAnswers: ["A"],
      type: "SINGLE",
    },
  },
  {
    name: "16. Numeric options (1), (2), (3), (4) with 答案：1, 3",
    input: `10. 專案管理常用工具包括？
(1) 甘特圖
(2) 咖啡機
(3) 敏捷看板
(4) 辦公椅
答案：1, 3`,
    expected: {
      stem: "專案管理常用工具包括？",
      optionA: "甘特圖",
      optionB: "咖啡機",
      optionC: "敏捷看板",
      optionD: "辦公椅",
      correctAnswers: ["A", "C"],
      type: "MULTIPLE",
    },
  },
  {
    name: "18. Single Question with 正確解答：C",
    input: `9. 專案生命週期中，哪一階段通常耗費最多成本與人力？
(A) 起始階段
(B) 規劃階段
(C) 執行階段
(D) 結束階段
正確解答：C`,
    expected: {
      stem: "專案生命週期中，哪一階段通常耗費最多成本與人力？",
      optionA: "起始階段",
      optionB: "規劃階段",
      optionC: "執行階段",
      optionD: "結束階段",
      correctAnswers: ["C"],
      type: "SINGLE",
    },
  },
];

let failed = 0;
for (const tc of cases) {
  const res = parseQuestionText(tc.input);

  let ok = true;
  for (const [key, val] of Object.entries(tc.expected)) {
    const actual = (res as any)[key];
    const match =
      Array.isArray(val)
        ? JSON.stringify(val) === JSON.stringify(actual)
        : val === actual;
    if (!match) {
      console.error(
        `❌ MISMATCH [${tc.name}] [${key}]: expected ${JSON.stringify(
          val
        )} but got ${JSON.stringify(actual)}`
      );
      ok = false;
    }
  }

  if (ok) {
    console.log(`✅ PASS: ${tc.name}`);
  } else {
    failed++;
  }
}

// 多題同時新增解析測試 (Multi-Question Batch Parsing Tests)
import { parseMultipleQuestions } from "../src/lib/questionParser";

const multiQuestionInput = `11. 發展專案團隊（Develop Project Team）的產出（Output）為下列哪一項？
(A) 團隊績效評估（Team Performance Assessment）

(B) 績效評鑑的投入（Input）與表揚獎勵系統

(C) 績效改善、績效評鑑的投入（Input）與績效報告（Performance Report）

(D) 工作成果、績效評鑑的投入（Input）與績效報告（Performance Report）

正確解答：A

12. 下列哪一項指的是工作結果的滿意度確認？
(A) 控制品質（Control Quality）

(B) 確認範疇（Validate Scope）

(C) 控制成本（Control Costs）

(D) 控制風險（Control Risks）

正確解答：B`;

console.log("\n🧪 執行多題同時解析測試...");
const multiResults = parseMultipleQuestions(multiQuestionInput);

if (multiResults.length !== 2) {
  console.error(`❌ Multi-Question Count Mismatch: expected 2 but got ${multiResults.length}`);
  failed++;
} else {
  console.log(`✅ PASS: Successfully split into 2 questions!`);
  
  // 檢驗第 11 題
  const q1 = multiResults[0];
  if (
    q1.stem === "發展專案團隊（Develop Project Team）的產出（Output）為下列哪一項？" &&
    q1.optionA === "團隊績效評估（Team Performance Assessment）" &&
    q1.optionB === "績效評鑑的投入（Input）與表揚獎勵系統" &&
    q1.optionC === "績效改善、績效評鑑的投入（Input）與績效報告（Performance Report）" &&
    q1.optionD === "工作成果、績效評鑑的投入（Input）與績效報告（Performance Report）" &&
    JSON.stringify(q1.correctAnswers) === JSON.stringify(["A"]) &&
    q1.type === "SINGLE"
  ) {
    console.log("✅ PASS: Multi-Question Q1 (第11題) verified correctly");
  } else {
    console.error("❌ Q1 Mismatch:", q1);
    failed++;
  }

  // 檢驗第 12 題
  const q2 = multiResults[1];
  if (
    q2.stem === "下列哪一項指的是工作結果的滿意度確認？" &&
    q2.optionA === "控制品質（Control Quality）" &&
    q2.optionB === "確認範疇（Validate Scope）" &&
    q2.optionC === "控制成本（Control Costs）" &&
    q2.optionD === "控制風險（Control Risks）" &&
    JSON.stringify(q2.correctAnswers) === JSON.stringify(["B"]) &&
    q2.type === "SINGLE"
  ) {
    console.log("✅ PASS: Multi-Question Q2 (第12題) verified correctly");
  } else {
    console.error("❌ Q2 Mismatch:", q2);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n❌ Total Failures: ${failed}`);
  process.exit(1);
} else {
  console.log(`\n🎉 All single & multi-question tests passed successfully!`);
}
