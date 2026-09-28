/**
 * Automated Verification Script for Practice Mode Updates:
 * 1. Removal of "選項剖析" text in practice mode via ExplanationCard showModeBadge={false}.
 * 2. Renaming "個人自測刷題" to "刷題練習".
 * 3. Shortcut keys: 1 / 2 / 3 / 4 support and UI hint update.
 * 4. Relocating "前往下一題" button to between mastery button and ExplanationCard.
 * 5. Zero Emoji compliance and Lucide icon usage.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

console.log("==================================================");
console.log("🧪 刷題練習模式更新與 ExplanationCard 深度契約驗證套件");
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
    console.error(`  ✗ [失敗] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

// 讀取核心檔案
const practicePagePath = path.resolve(__dirname, "../src/app/practice/page.tsx");
const explanationCardPath = path.resolve(__dirname, "../src/components/ExplanationCard.tsx");

const practiceContent = fs.readFileSync(practicePagePath, "utf8");
const cardContent = fs.readFileSync(explanationCardPath, "utf8");

// --- Part 1: 標題與字串命名檢驗 ---
console.log("\n[Part 1] 標題與字串命名檢驗...");

test("1.1 刷題頁面移除「個人自測刷題」標題文字", () => {
  assert.ok(
    !practiceContent.includes("個人自測刷題"),
    "頁面不應再包含「個人自測刷題」文字"
  );
});

test("1.2 刷題頁面標題正確更新為「刷題練習」", () => {
  assert.ok(
    practiceContent.includes("刷題練習"),
    "頁面頂部標題必須包含「刷題練習」"
  );
});

// --- Part 2: 快捷鍵提示與按鍵監聽檢驗 ---
console.log("\n[Part 2] 快捷鍵提示與按鍵監聽檢驗...");

test("2.1 快捷鍵提示區塊包含 1 / 2 / 3 / 4 與 A / B / C / D", () => {
  assert.ok(
    practiceContent.includes("1 / 2 / 3 / 4") && practiceContent.includes("A / B / C / D"),
    "快捷鍵提示必須同時包含 1 / 2 / 3 / 4 與 A / B / C / D"
  );
});

test("2.2 鍵盤事件監聽支援 1 / 2 / 3 / 4 數字鍵與 Numpad 鍵映射至 A / B / C / D", () => {
  assert.ok(practiceContent.includes('"1": "A"'), "需支援數字鍵 1 映射至 A");
  assert.ok(practiceContent.includes('"2": "B"'), "需支援數字鍵 2 映射至 B");
  assert.ok(practiceContent.includes('"3": "C"'), "需支援數字鍵 3 映射至 C");
  assert.ok(practiceContent.includes('"4": "D"'), "需支援數字鍵 4 映射至 D");
  assert.ok(practiceContent.includes("Digit1"), "需支援 Digit1 事件代碼");
  assert.ok(practiceContent.includes("Numpad1"), "需支援 Numpad1 小鍵盤代碼");
});

// --- Part 3: 按鈕版面順序重排檢驗 ---
console.log("\n[Part 3] 按鈕版面順序重排檢驗...");

test("3.1 前往下一題按鈕文字存在", () => {
  assert.ok(
    practiceContent.includes("前往下一題"),
    "下一題按鈕需顯示「前往下一題」"
  );
});

test("3.2 按鈕順序嚴格符合：【這題我會了】->【前往下一題】->【ExplanationCard 解析】", () => {
  const masteryBtnIndex = practiceContent.indexOf("data-mastery-btn");
  const nextBtnIndex = practiceContent.indexOf("前往下一題");
  const explanationIndex = practiceContent.indexOf("<ExplanationCard");

  assert.ok(masteryBtnIndex > 0, "必須包含 data-mastery-btn 按鈕");
  assert.ok(nextBtnIndex > 0, "必須包含前往下一題按鈕");
  assert.ok(explanationIndex > 0, "必須包含 ExplanationCard 元件");

  assert.ok(
    nextBtnIndex > masteryBtnIndex,
    `前往下一題 (idx: ${nextBtnIndex}) 必須在 這題我會了 (idx: ${masteryBtnIndex}) 下方`
  );
  assert.ok(
    explanationIndex > nextBtnIndex,
    `ExplanationCard (idx: ${explanationIndex}) 必須在 前往下一題 (idx: ${nextBtnIndex}) 下方`
  );
});

// --- Part 4: 刷題練習模式移除「選項剖析」檢驗 ---
console.log("\n[Part 4] 刷題練習模式移除「選項剖析」檢驗...");

test("4.1 ExplanationCardProps 支援 showModeBadge 與 hideModeBadge 屬性", () => {
  assert.ok(cardContent.includes("showModeBadge?: boolean"), "需宣告 showModeBadge 型別");
  assert.ok(cardContent.includes("hideModeBadge?: boolean"), "需宣告 hideModeBadge 型別");
});

test("4.2 src/app/practice/page.tsx 傳遞 showModeBadge={false} 至 ExplanationCard", () => {
  assert.ok(
    practiceContent.includes("showModeBadge={false}"),
    "practice/page.tsx 必須設定 showModeBadge={false} 隱藏選項剖析標籤"
  );
});

// --- Part 5: SSR 渲染與 ExplanationCard 徽章行為檢核 ---
console.log("\n[Part 5] SSR 渲染與 ExplanationCard 徽章行為檢核...");

// 載入編譯後的 ExplanationCard
const ts = require("typescript");
const parserSourcePath = path.resolve(__dirname, "../src/lib/explanationParser.ts");

function loadTranspiled(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const m = { exports: {} };
  const req = (id) => {
    if (id === "@/lib/explanationParser" || id === "./explanationParser") {
      return loadTranspiled(parserSourcePath);
    }
    if (id === "react") return React;
    if (id === "lucide-react") {
      const MockIcon = (props) => React.createElement("svg", props);
      return new Proxy({}, { get: () => MockIcon });
    }
    return require(id);
  };
  const fn = new Function("require", "module", "exports", transpiled.outputText);
  fn(req, m, m.exports);
  return m.exports;
}

const { ExplanationCard } = loadTranspiled(explanationCardPath);

test("5.1 預設狀態 (showModeBadge 未傳或 true) 解析包含「選項剖析」", () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ExplanationCard, {
      explanation: "A. 第一個選項解析\nB. 第二個選項解析",
      correctAnswers: "A",
    })
  );
  assert.ok(html.includes("選項剖析"), "預設應渲染「選項剖析」徽章");
});

test("5.2 刷題練習模式 (showModeBadge={false}) 徹底不包含「選項剖析」", () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ExplanationCard, {
      explanation: "A. 第一個選項解析\nB. 第二個選項解析",
      correctAnswers: "A",
      showModeBadge: false,
    })
  );
  assert.ok(!html.includes("選項剖析"), "showModeBadge={false} 時不得渲染「選項剖析」");
  assert.ok(!html.includes("核心觀念"), "showModeBadge={false} 時不得渲染模式徽章");
  assert.ok(html.includes("第一個選項解析"), "仍應正常渲染解析內容");
});

test("5.3 傳遞 hideModeBadge={true} 亦能成功隱藏「選項剖析」", () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(ExplanationCard, {
      explanation: "A. 第一個選項解析\nB. 第二個選項解析",
      correctAnswers: "A",
      hideModeBadge: true,
    })
  );
  assert.ok(!html.includes("選項剖析"), "hideModeBadge={true} 時不得渲染「選項剖析」");
});

// --- Part 6: 全站規範：零 Emoji 違規檢驗 ---
console.log("\n[Part 6] 全站規範：零 Emoji 違規檢驗...");

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/u;

test("6.1 src/app/practice/page.tsx 零 Emoji 違規", () => {
  // 檢查原始碼中除去註解外是否含有 Emoji
  const lines = practiceContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      continue;
    }
    const match = line.match(EMOJI_REGEX);
    assert.ok(
      !match,
      `在第 ${i + 1} 行發現 Emoji 違規: "${match ? match[0] : ""}" -> ${line.trim()}`
    );
  }
});

test("6.2 src/components/ExplanationCard.tsx 零 Emoji 違規", () => {
  const lines = cardContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      continue;
    }
    const match = line.match(EMOJI_REGEX);
    assert.ok(
      !match,
      `在第 ${i + 1} 行發現 Emoji 違規: "${match ? match[0] : ""}" -> ${line.trim()}`
    );
  }
});

console.log("\n==================================================");
console.log(`總測試項目: ${total} | 通過: ${passed} | 失敗: ${total - passed}`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
