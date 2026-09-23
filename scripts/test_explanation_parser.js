/**
 * Automated Unit Test Suite for explanationParser.ts
 * QuizMaster Milestone 7: Pure Node.js v22 execution with node:assert
 */

const assert = require("node:assert/strict");
const path = require("node:path");

async function runParserTests() {
  console.log("==================================================");
  console.log("🧪 執行 explanationParser 模組自動化單元測試");
  console.log("==================================================");

  const parserModulePath = path.resolve(__dirname, "../src/lib/explanationParser.ts");
  const { parseExplanation, renderMarkdownTokens, normalizeAnswers } = await import(
    "file://" + parserModulePath.replace(/\\/g, "/")
  );

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
      if (err.actual !== undefined && err.expected !== undefined) {
        console.error(`    實際值: ${JSON.stringify(err.actual)}`);
        console.error(`    預期值: ${JSON.stringify(err.expected)}`);
      }
      process.exitCode = 1;
    }
  }

  // =========================================================================
  // 1. 12 Option Detection Formats
  // =========================================================================
  console.log("\n--- 1. 測試 12 種選項標記偵測格式 ---");

  test("格式 1: 點號標記 (A. 說明 \\n B. 說明 \\n C. 說明 \\n D. 說明)", () => {
    const text = "A. 第一項分析說明\nB. 第二項分析說明\nC. 第三項分析說明\nD. 第四項分析說明";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.deepEqual(res.options.map((o) => o.key), ["A", "B", "C", "D"]);
    assert.equal(res.options[0].explanation, "第一項分析說明");
    assert.equal(res.options[1].explanation, "第二項分析說明");
  });

  test("格式 2: 半形圓括號 ((A) 說明 (B) 說明 (C) 說明 (D) 說明)", () => {
    const text = "(A) 這是A選項 (B) 這是B選項 (C) 這是C選項 (D) 這是D選項";
    const res = parseExplanation(text, "B");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.deepEqual(res.options.map((o) => o.key), ["A", "B", "C", "D"]);
    assert.equal(res.options[1].isCorrect, true);
    assert.equal(res.options[0].isCorrect, false);
  });

  test("格式 3: 全形圓括號 （A）說明 （B）說明 （C）說明 （D）說明", () => {
    const text = "（A）全形圓括號A （B）全形圓括號B （C）全形圓括號C （D）全形圓括號D";
    const res = parseExplanation(text, "C");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.deepEqual(res.options.map((o) => o.key), ["A", "B", "C", "D"]);
    assert.equal(res.options[2].isCorrect, true);
    assert.equal(res.options[0].explanation, "全形圓括號A");
  });

  test("格式 4: 半形方括號 [A] 說明 \\n [B] 說明 \\n [C] 說明 \\n [D] 說明", () => {
    const text = "[A] 方括號A解析\n[B] 方括號B解析\n[C] 方括號C解析\n[D] 方括號D解析";
    const res = parseExplanation(text, "D");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.deepEqual(res.options.map((o) => o.key), ["A", "B", "C", "D"]);
    assert.equal(res.options[3].isCorrect, true);
  });

  test("格式 5: 全形黑方頭括號 【A】說明 \\n 【B】說明 \\n 【C】說明 \\n 【D】說明", () => {
    const text = "【A】黑頭括號A說明\n【B】黑頭括號B說明\n【C】黑頭括號C說明\n【D】黑頭括號D說明";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.equal(res.options[0].explanation, "黑頭括號A說明");
  });

  test("格式 6: 半形冒號 A: 說明 \\n B: 說明 \\n C: 說明 \\n D: 說明", () => {
    const text = "A: 半形冒號A\nB: 半形冒號B\nC: 半形冒號C\nD: 半形冒號D";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.equal(res.options[0].explanation, "半形冒號A");
  });

  test("格式 7: 全形冒號 A：說明 \\n B：說明 \\n C：說明 \\n D：說明", () => {
    const text = "A：全形冒號A\nB：全形冒號B\nC：全形冒號C\nD：全形冒號D";
    const res = parseExplanation(text, "B");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.equal(res.options[1].explanation, "全形冒號B");
  });

  test("格式 8: 後綴 A選項 (A選項錯誤 \\n B選項正確 \\n C選項...)", () => {
    const text = "A選項：這是A選項內容\nB選項：這是B選項內容\nC選項：這是C選項內容\nD選項：這是D選項內容";
    const res = parseExplanation(text, "B");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.equal(res.options[1].isCorrect, true);
    assert.equal(res.options[0].explanation, "這是A選項內容");
  });

  test("格式 9: 前綴 選項A (選項A：說明 \\n 選項B：說明 \\n 選項C：說明)", () => {
    const text = "選項A：選項A的詳解內容\n選項B：選項B的詳解內容\n選項C：選項C的詳解內容";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 3);
    assert.deepEqual(res.options.map((o) => o.key), ["A", "B", "C"]);
    assert.equal(res.options[0].explanation, "選項A的詳解內容");
  });

  test("格式 10: 前綴兼括號 選項(A) (選項(A) 說明 \\n 選項(B) 說明)", () => {
    const text = "選項(A) 說明第一項\n選項(B) 說明第二項\n選項(C) 說明第三項";
    const res = parseExplanation(text, "C");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 3);
    assert.equal(res.options[2].isCorrect, true);
    assert.equal(res.options[0].explanation, "說明第一項");
  });

  test("格式 11: 頓號 A、說明 \\n B、說明 \\n C、說明 \\n D、說明", () => {
    const text = "A、頓號選項A說明\nB、頓號選項B說明\nC、頓號選項C說明\nD、頓號選項D說明";
    const res = parseExplanation(text, "D");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.equal(res.options[3].isCorrect, true);
    assert.equal(res.options[0].explanation, "頓號選項A說明");
  });

  test("格式 12: 混搭風格 (A) ... \\n B. ... \\n 【C】 ... \\n 選項D：...", () => {
    const text = "(A) 混搭第一項\nB. 混搭第二項\n【C】 混搭第三項\n選項D：混搭第四項";
    const res = parseExplanation(text, "C");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 4);
    assert.deepEqual(res.options.map((o) => o.key), ["A", "B", "C", "D"]);
    assert.equal(res.options[0].explanation, "混搭第一項");
    assert.equal(res.options[1].explanation, "混搭第二項");
    assert.equal(res.options[2].explanation, "混搭第三項");
    assert.equal(res.options[3].explanation, "混搭第四項");
  });

  // =========================================================================
  // 2. Dual Mode Switching & Guardrails
  // =========================================================================
  console.log("\n--- 2. 測試雙模式切換與防誤判機制 (Dual Mode & Guardrails) ---");

  test("雙模式門檻: >= 2 個選項切換為選項卡模式 (Option Card Mode)", () => {
    const text = "A. 選項一剖析\nB. 選項二剖析";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 2);
  });

  test("雙模式門檻: 僅 1 個選項標記時保持為概念模式 (Concept Mode)", () => {
    const text = "本題重點在於 A. 說明某個重要定義，全體應當共同遵循。";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
    assert.equal(res.conceptText, text);
  });

  test("概念模式: 連續理論長文無選項標籤保持為概念模式", () => {
    const theory =
      "敏捷軟體開發中，Scrum 框架定義了三種核心角色：產品負責人（PO）、Scrum Master 與開發團隊。\n" +
      "每日站立會議（Daily Scrum）的時間限制為 15 分鐘，主要聚焦於昨天的產出、今天的規劃與所遇到的障礙。";
    const res = parseExplanation(theory, "A");
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
    assert.equal(res.conceptText, theory);
  });

  test("防誤判: 自然語言包含 A-D 英文單字或縮寫不誤判 (DNA, RNA, Scenario B, AAA 評級)", () => {
    const text =
      "分子生物學中 DNA 雙股螺旋結構由腺嘌呤（A）與胸腺嘧啶（T）配對。\n" +
      "在 RNA 病毒研究中，AAA 級防護實驗室在 Scenario B 的環境條件下進行嚴格檢驗。";
    const res = parseExplanation(text);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
  });

  test("防誤判: PERT 期望值計算公式不誤判為選項卡 (Continuous Formula)", () => {
    const pert =
      "在專案時程管理中，PERT 期望工期計算公式為：\n" +
      "TE = (To + 4Tm + Tp) / 6\n" +
      "標準差公式為：σ = (Tp - To) / 6\n" +
      "變異數為標準差的平方：V = σ^2 = ((Tp - To) / 6)^2";
    const res = parseExplanation(pert);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
    assert.equal(res.conceptText, pert);
  });

  test("防誤判: 數學算式 (A + 4B + C) / 6 不誤判為獨立選項卡", () => {
    const math = "加權平均計算公式：Result = (A + 4B + C) / 6，其中 B 的權重最高。";
    const res = parseExplanation(math);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
  });

  test("防誤判: 數理函式與複雜度 notation 如 O(A)、sin(B) 不誤判為選項卡", () => {
    const math = "此演算法之時間複雜度為 O(A)，而在特定分支情況下空間複雜度為 O(B)。sin(C) 函數之週期特性亦同。";
    const res = parseExplanation(math);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
  });

  test("防誤判: STEM 條件機率公式 P(A) 與 P(B) 保持概念模式 (Concept Mode)", () => {
    const text = "已知 P(A) = 0.4 且 P(B) = 0.6，求 P(A ∩ B)";
    const res = parseExplanation(text);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
    assert.equal(res.conceptText, text);
  });

  test("防誤判: STEM 線性代數矩陣記號 [A] 與 [B] 保持概念模式 (Concept Mode)", () => {
    const text = "線性代數中，已知矩陣 [A] 與矩陣 [B] 為...";
    const res = parseExplanation(text);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
    assert.equal(res.conceptText, text);
  });

  test("防誤判: 程式碼屬性/方法呼叫 A.execute() 與 B.execute() 保持概念模式 (Concept Mode)", () => {
    const text = "呼叫範例：\nresult = A.execute();\nresult2 = B.execute();";
    const res = parseExplanation(text);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
    assert.equal(res.conceptText, text);
  });

  test("防誤判: Markdown 代碼區塊 ``` 內部之選項標記不誤判為題卡", () => {
    const text = "以下是配置檔範例：\n```text\nA. server=localhost\nB. port=8080\n```\n請確認以上參數。";
    const res = parseExplanation(text);
    assert.equal(res.mode, "concept");
    assert.equal(res.options.length, 0);
  });

  // =========================================================================
  // 3. Zero-loss Markdown Formatting
  // =========================================================================
  console.log("\n--- 3. 測試零文字丟失 Markdown 標記渲染器 (Zero-loss Markdown) ---");

  test("Markdown 粗體語法: **粗體文字** 轉換為 strong 節點", () => {
    const nodes = renderMarkdownTokens("這是**重要考點**說明");
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0], "這是");
    assert.equal(nodes[1].type, "strong");
    assert.equal(nodes[1].props.children, "重要考點");
    assert.equal(nodes[1].props.className, "font-bold text-white");
    assert.equal(nodes[2], "說明");
  });

  test("Markdown 行內程式碼語法: `code` 轉換為 code 節點", () => {
    const nodes = renderMarkdownTokens("使用 `useMemo()` 進行效能快取");
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0], "使用 ");
    assert.equal(nodes[1].type, "code");
    assert.equal(nodes[1].props.children, "useMemo()");
    assert.ok(nodes[1].props.className.includes("font-mono"));
    assert.equal(nodes[2], " 進行效能快取");
  });

  test("複合語法: 一行內同時包含多個 **粗體** 與 `代碼`", () => {
    const text = "**提示：** 執行 `npm test` 指令以驗證 **21條路由** 正確性。";
    const nodes = renderMarkdownTokens(text);
    const strongs = nodes.filter((n) => n && n.type === "strong");
    const codes = nodes.filter((n) => n && n.type === "code");
    assert.equal(strongs.length, 2);
    assert.equal(strongs[0].props.children, "提示：");
    assert.equal(strongs[1].props.children, "21條路由");
    assert.equal(codes.length, 1);
    assert.equal(codes[0].props.children, "npm test");
  });

  test("零文字丟失: 未閉合星號與算術運算子 (2 * 3 = 6) 完整保留不丟失字元", () => {
    const text = "注意：2 * 3 = 6 且 4 * 5 = 20，未閉合的 **半途文字";
    const nodes = renderMarkdownTokens(text);
    // Concatenate all text content
    const fullText = nodes
      .map((n) => (typeof n === "string" ? n : n.props.children))
      .join("");
    // Every original character must be present
    assert.ok(fullText.includes("2 * 3 = 6"));
    assert.ok(fullText.includes("4 * 5 = 20"));
    assert.ok(fullText.includes("半途文字"));
  });

  test("零文字丟失: 數學運算子與特殊符號 (<, >, *, /, ^, <=, >=) 完整保留", () => {
    const text = "條件判斷：x < 10 且 y > 20，代數關係 a / b * c ^ 2 <= 100 >= 50";
    const nodes = renderMarkdownTokens(text);
    const fullText = nodes
      .map((n) => (typeof n === "string" ? n : n.props.children))
      .join("");
    assert.equal(fullText, text);
  });

  test("空標籤防護: 空星號 **** 或空引號 `` 容錯處理不產生空白標籤", () => {
    const text = "無效標籤 **** 與 ```` 不應導致系統崩潰";
    const nodes = renderMarkdownTokens(text);
    assert.ok(Array.isArray(nodes));
    assert.ok(nodes.length > 0);
  });

  // =========================================================================
  // 4. Intro & Takeaway Extraction
  // =========================================================================
  console.log("\n--- 4. 測試導讀前言 (Intro) 與總結考點 (Takeaway) 提取 ---");

  test("選項卡模式: 提取選項前方的導讀引言 (Intro)", () => {
    const text =
      "本題測驗敏捷開發的基本觀念：\n" +
      "A. 選項A詳解說明\n" +
      "B. 選項B詳解說明\n" +
      "C. 選項C詳解說明";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.intro, "本題測驗敏捷開發的基本觀念：");
    assert.equal(res.options.length, 3);
  });

  test("選項卡模式: 提取末尾核心考點總結 (Takeaway)", () => {
    const text =
      "A. 選項A詳解\n" +
      "B. 選項B詳解\n" +
      "【核心考點】\n" +
      "本題核心在於區分 Scrum 與 Kanban 的在製品（WIP）限制機制。";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 2);
    assert.equal(res.options[1].explanation, "選項B詳解");
    assert.ok(res.takeaway);
    assert.ok(res.takeaway.includes("【核心考點】"));
    assert.ok(res.takeaway.includes("WIP"));
  });

  test("選項卡模式: 支援多種總結關鍵字 (故本題：、因此本題：、💡 總結)", () => {
    const text =
      "A: 正確做法\nB: 錯誤做法\n故本題：解答應選 A，其符合最佳實務原則。";
    const res = parseExplanation(text, "A");
    assert.equal(res.mode, "options");
    assert.equal(res.options.length, 2);
    assert.ok(res.takeaway);
    assert.ok(res.takeaway.includes("故本題：解答應選 A"));
  });

  test("概念模式: 提取連續長文後的解題關鍵總結 (Takeaway in Concept Mode)", () => {
    const text =
      "瀑布式開發流程講求嚴格的階段交付與文件規範，每個階段皆有明確的進出場條件。\n\n" +
      "💡 核心考點：瀑布模型最大的風險在於需求變更成本高昂。";
    const res = parseExplanation(text);
    assert.equal(res.mode, "concept");
    assert.equal(res.conceptText, "瀑布式開發流程講求嚴格的階段交付與文件規範，每個階段皆有明確的進出場條件。");
    assert.ok(res.takeaway);
    assert.ok(res.takeaway.includes("需求變更成本高昂"));
  });

  // =========================================================================
  // 5. Correct/Wrong Option Tagging & Options Enrichment
  // =========================================================================
  console.log("\n--- 5. 測試正解/錯項標籤比對與選項題幹豐富化 ---");

  test("單選題正解標記: 僅正確選項標記 isCorrect = true", () => {
    const text = "A. 選項A\nB. 選項B\nC. 選項C\nD. 選項D";
    const res = parseExplanation(text, "B");
    assert.equal(res.options.find((o) => o.key === "A").isCorrect, false);
    assert.equal(res.options.find((o) => o.key === "B").isCorrect, true);
    assert.equal(res.options.find((o) => o.key === "C").isCorrect, false);
    assert.equal(res.options.find((o) => o.key === "D").isCorrect, false);
  });

  test("複選題多正解標記: 字串 'A, C' 與陣列 ['A', 'C'] 均正確標記", () => {
    const text = "A. 選項A\nB. 選項B\nC. 選項C\nD. 選項D";
    const res1 = parseExplanation(text, "A, C");
    assert.equal(res1.options.find((o) => o.key === "A").isCorrect, true);
    assert.equal(res1.options.find((o) => o.key === "B").isCorrect, false);
    assert.equal(res1.options.find((o) => o.key === "C").isCorrect, true);
    assert.equal(res1.options.find((o) => o.key === "D").isCorrect, false);

    const res2 = parseExplanation(text, ["B", "D"]);
    assert.equal(res2.options.find((o) => o.key === "B").isCorrect, true);
    assert.equal(res2.options.find((o) => o.key === "D").isCorrect, true);
  });

  test("大小寫容錯: 'b, d' 自動轉大寫並正確標記", () => {
    const text = "A. 選項A\nB. 選項B\nC. 選項C\nD. 選項D";
    const res = parseExplanation(text, "b, d");
    assert.equal(res.options.find((o) => o.key === "B").isCorrect, true);
    assert.equal(res.options.find((o) => o.key === "D").isCorrect, true);
  });

  test("缺省正解: correctAnswers 為 null 或未傳遞時，全部標記為 isCorrect = false 不報錯", () => {
    const text = "A. 選項A\nB. 選項B";
    const res = parseExplanation(text, null);
    assert.equal(res.options[0].isCorrect, false);
    assert.equal(res.options[1].isCorrect, false);
  });

  test("選項題幹注入 (Options Enrichment): 支援 Record 格式", () => {
    const text = "A. 這是A詳解\nB. 這是B詳解";
    const res = parseExplanation(text, "A", {
      A: "敏捷開發",
      B: "瀑布開發",
    });
    assert.equal(res.options[0].text, "敏捷開發");
    assert.equal(res.options[1].text, "瀑布開發");
  });

  test("選項題幹注入: 支援 Prisma 題目格式 (optionA, optionB)", () => {
    const text = "A. 這是A詳解\nB. 這是B詳解";
    const res = parseExplanation(text, "A", {
      optionA: "持續整合 CI",
      optionB: "持續部署 CD",
    });
    assert.equal(res.options[0].text, "持續整合 CI");
    assert.equal(res.options[1].text, "持續部署 CD");
  });

  test("選項題幹注入: 支援陣列物件格式 [{ key, text }]", () => {
    const text = "A. 這是A詳解\nB. 這是B詳解";
    const res = parseExplanation(text, "A", [
      { key: "A", text: "單元測試" },
      { key: "B", text: "整合測試" },
    ]);
    assert.equal(res.options[0].text, "單元測試");
    assert.equal(res.options[1].text, "整合測試");
  });

  // =========================================================================
  // 6. Null / Empty / Edge Case Robustness
  // =========================================================================
  console.log("\n--- 6. 測試空值與異常邊界容錯 (Edge Cases & Invariants) ---");

  test("空值安全: null, undefined, 空字串與空白字串安全回傳", () => {
    const rNull = parseExplanation(null);
    assert.equal(rNull.mode, "concept");
    assert.equal(rNull.options.length, 0);
    assert.equal(rNull.rawText, "");

    const rUndef = parseExplanation(undefined);
    assert.equal(rUndef.mode, "concept");
    assert.equal(rUndef.options.length, 0);

    const rEmpty = parseExplanation("");
    assert.equal(rEmpty.mode, "concept");
    assert.equal(rEmpty.options.length, 0);

    const rSpaces = parseExplanation("   \n\t  ");
    assert.equal(rSpaces.mode, "concept");
    assert.equal(rSpaces.options.length, 0);
  });

  test("非字串型別容錯: 傳入非字串真值（數字 12345、布林值 true、物件）安全防護不崩潰並回傳空/概念模式", () => {
    const rNum = parseExplanation(12345);
    assert.equal(rNum.mode, "concept");
    assert.equal(rNum.conceptText, "");
    assert.equal(rNum.options.length, 0);

    const rBool = parseExplanation(true);
    assert.equal(rBool.mode, "concept");
    assert.equal(rBool.conceptText, "");
    assert.equal(rBool.options.length, 0);

    const rObj = parseExplanation({ text: "abc" });
    assert.equal(rObj.mode, "concept");
    assert.equal(rObj.conceptText, "");
    assert.equal(rObj.options.length, 0);
  });

  test("資料庫原始字串不變性 (Zero Mutation Invariant): 原始文字 100% 完整保留在 rawText", () => {
    const complexOriginal =
      "本題原文字串包含：特殊符號 <>&\"' 以及 **Markdown** 語法，\n" +
      "A. 選項一 2*3=6\nB. 選項二 4/2=2\n" +
      "【核心考點總結】\n不允許任何欄位字串變更。";
    const res = parseExplanation(complexOriginal, "A");
    assert.equal(res.rawText, complexOriginal);
  });

  console.log("\n==================================================");
  console.log(`🎉 explanationParser 測試全部完成：${passed}/${total} 項通過！`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runParserTests().catch((err) => {
  console.error("執行測試過程發生未預期錯誤:", err);
  process.exit(1);
});
