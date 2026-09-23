/**
 * Automated Component Contract & SSR Test Suite for ExplanationCard.tsx
 * QuizMaster Milestone 7: Pure Node.js execution with node:assert
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

async function runExplanationCardTests() {
  console.log("==================================================");
  console.log("🧪 執行 ExplanationCard 元件契約與 SSR 渲染測試");
  console.log("==================================================");

  const cardSourcePath = path.resolve(__dirname, "../src/components/ExplanationCard.tsx");
  const parserSourcePath = path.resolve(__dirname, "../src/lib/explanationParser.ts");
  const cardSourceCode = fs.readFileSync(cardSourcePath, "utf8");

  // Load and transpile modules for genuine runtime SSR testing in Node
  function loadTranspiledModule(filePath) {
    const code = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    });

    const mod = { exports: {} };
    const customRequire = (id) => {
      if (id === "@/lib/explanationParser" || id === "./explanationParser") {
        return loadTranspiledModule(parserSourcePath);
      }
      if (id === "react") return React;
      if (id === "lucide-react") {
        // Return lightweight Lucide mock components for SSR SVG rendering
        return new Proxy(
          {},
          {
            get: (_, propName) => {
              return (props) =>
                React.createElement("svg", {
                  "data-lucide": propName,
                  className: props.className,
                  width: props.size || 16,
                  height: props.size || 16,
                });
            },
          }
        );
      }
      return require(id);
    };

    const fn = new Function("require", "module", "exports", transpiled.outputText);
    fn(customRequire, mod, mod.exports);
    return mod.exports;
  }

  const { ExplanationCard, default: DefaultCard } = loadTranspiledModule(cardSourcePath);

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
  // 1. Component Export & Interface Contracts
  // =========================================================================
  console.log("\n--- 1. 測試元件匯出介面與 Props 預設契約 ---");

  test("元件匯出規範: 同時支援具名匯出 ExplanationCard 與預設匯出 default", () => {
    assert.equal(typeof ExplanationCard, "function");
    assert.equal(typeof DefaultCard, "function");
    assert.equal(ExplanationCard, DefaultCard);
  });

  test("靜態 Props 契約檢核: 原始碼定義完整 ExplanationCardProps 介面", () => {
    assert.ok(cardSourceCode.includes("export interface ExplanationCardProps"), "缺少介面定義");
    assert.ok(cardSourceCode.includes("explanation?: string | null"), "缺少 explanation 欄位");
    assert.ok(cardSourceCode.includes("correctAnswers?: string | string[] | null"), "缺少 correctAnswers 欄位");
    assert.ok(cardSourceCode.includes("userAnswer?: string | string[] | null"), "缺少 userAnswer 欄位");
    assert.ok(cardSourceCode.includes("compact?: boolean"), "缺少 compact 欄位");
    assert.ok(cardSourceCode.includes("defaultFontSize?: ExplanationFontSize"), "缺少 defaultFontSize 欄位");
    assert.ok(cardSourceCode.includes("defaultViewMode?: ExplanationViewMode"), "缺少 defaultViewMode 欄位");
    assert.ok(cardSourceCode.includes("showControls?: boolean"), "缺少 showControls 欄位");
    assert.ok(cardSourceCode.includes("showCopyButton?: boolean"), "缺少 showCopyButton 欄位");
  });

  test("預設值契約: compact=false, defaultFontSize='medium', defaultViewMode='full'", () => {
    assert.ok(cardSourceCode.includes("compact = false"));
    assert.ok(cardSourceCode.includes('defaultFontSize = "medium"'));
    assert.ok(cardSourceCode.includes('defaultViewMode = "full"'));
    assert.ok(cardSourceCode.includes("showControls = true"));
    assert.ok(cardSourceCode.includes("showCopyButton = true"));
    assert.ok(cardSourceCode.includes('title = "題目詳解與考點"'));
  });

  // =========================================================================
  // 2. SSR Hydration Safety & Defensive Architecture
  // =========================================================================
  console.log("\n--- 2. 測試 SSR 水合防護機制 (Hydration Safety #418) ---");

  test("水合安全: useState 嚴格初始化自 defaultFontSize (絕不於 SSR 階段直接同步讀取 localStorage)", () => {
    // 檢查 useState 初始化邏輯，避免 Next.js #418 伺服器/用戶端 DOM 不一致
    assert.ok(
      cardSourceCode.includes("const [fontSize, setFontSize] = useState<ExplanationFontSize>(defaultFontSize)"),
      "fontSize 必須初始化自 defaultFontSize"
    );
  });

  test("防禦式存取: localStorage 讀取與寫入皆嚴格包覆於 try...catch 內", () => {
    const useEffectIdx = cardSourceCode.indexOf("useEffect(() => {");
    assert.ok(useEffectIdx !== -1, "必須在 useEffect 中執行客戶端儲存同步");
    const effectBlock = cardSourceCode.substring(useEffectIdx, useEffectIdx + 400);
    assert.ok(effectBlock.includes("try {"), "useEffect 內必須包含 try 區塊");
    assert.ok(effectBlock.includes("localStorage.getItem"), "必須於 useEffect 讀取 localStorage");
    assert.ok(effectBlock.includes("catch"), "必須捕捉潛在例外以防無痕模式崩潰");
  });

  // =========================================================================
  // 3. Scoped Font-Size Scaling (Small, Medium, Large)
  // =========================================================================
  console.log("\n--- 3. 測試局部字級縮放 (Scoped Font-Size: 13.5px, 15.5px, 17.5px) ---");

  test("字級樣式規格: Small (13.5px/1.7), Medium (15.5px/1.85), Large (17.5px/2.0)", () => {
    assert.ok(cardSourceCode.includes('small: { fontSize: "13.5px", lineHeight: "1.7", label: "A-" }'));
    assert.ok(cardSourceCode.includes('medium: { fontSize: "15.5px", lineHeight: "1.85", label: "A" }'));
    assert.ok(cardSourceCode.includes('large: { fontSize: "17.5px", lineHeight: "2.0", label: "A+" }'));
  });

  test("獨立作用域 (Scoped Styling): 字級樣式嚴格限定於卡片內部內容容器，不汙染外層", () => {
    const htmlMedium = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "這是概念詳解說明文字",
        defaultFontSize: "medium",
      })
    );
    assert.ok(htmlMedium.includes("font-size:15.5px"), "中字級 SSR 包含 15.5px");
    assert.ok(htmlMedium.includes("line-height:1.85"), "中字級 SSR 包含 1.85 行高");

    const htmlSmall = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "這是概念詳解說明文字",
        defaultFontSize: "small",
      })
    );
    assert.ok(htmlSmall.includes("font-size:13.5px"), "小字級 SSR 包含 13.5px");
    assert.ok(htmlSmall.includes("line-height:1.7"), "小字級 SSR 包含 1.7 行高");

    const htmlLarge = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "這是概念詳解說明文字",
        defaultFontSize: "large",
      })
    );
    assert.ok(htmlLarge.includes("font-size:17.5px"), "大字級 SSR 包含 17.5px");
    assert.ok(htmlLarge.includes("line-height:2.0"), "大字級 SSR 包含 2.0 行高");
  });

  test("字級按鈕渲染: 完整呈現 A- / A / A+ 控制器", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "A. 解析A\nB. 解析B",
        showControls: true,
      })
    );
    assert.ok(html.includes("A-"), "需渲染 A- 按鈕");
    assert.ok(html.includes("A+"), "需渲染 A+ 按鈕");
    assert.ok(html.includes("字級調整"), "需有清楚的無障礙 title");
  });

  // =========================================================================
  // 4. LocalStorage Persistence Under Standard Key
  // =========================================================================
  console.log("\n--- 4. 測試 LocalStorage 持久化鍵名與寫入邏輯 ---");

  test("持久化鍵名規範: 嚴格使用 'quizmaster_explanation_font_size'", () => {
    assert.ok(
      cardSourceCode.includes('const STORAGE_KEY = "quizmaster_explanation_font_size"'),
      "STORAGE_KEY 常數必須為 quizmaster_explanation_font_size"
    );
  });

  test("狀態變更同步寫入: handleFontSizeChange 呼叫 localStorage.setItem", () => {
    assert.ok(
      cardSourceCode.includes("localStorage.setItem(STORAGE_KEY, newSize)"),
      "字級調整時必須寫入 localStorage"
    );
  });

  // =========================================================================
  // 5. View Mode Toggle ("完整剖析" vs "重點精簡")
  // =========================================================================
  console.log("\n--- 5. 測試視角模式切換 (完整剖析 vs 重點精簡) ---");

  test("視角切換器: 完整模式 (full) 渲染全部選項剖析卡片", () => {
    const explanation = "A. 第一項分析說明\nB. 第二項分析說明\nC. 第三項分析說明";
    const htmlFull = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation,
        correctAnswers: "B",
        defaultViewMode: "full",
      })
    );
    assert.ok(htmlFull.includes("完整"), "包含完整模式切換按鈕");
    assert.ok(htmlFull.includes("精簡"), "包含精簡模式切換按鈕");
    assert.ok(htmlFull.includes("第一項分析說明"), "完整模式包含選項A");
    assert.ok(htmlFull.includes("第二項分析說明"), "完整模式包含選項B");
    assert.ok(htmlFull.includes("第三項分析說明"), "完整模式包含選項C");
  });

  test("視角切換器: 重點精簡模式 (concise) 僅聚焦渲染正解選項卡片", () => {
    const explanation = "A. 第一項分析說明\nB. 第二項分析說明\nC. 第三項分析說明";
    const htmlConcise = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation,
        correctAnswers: "B",
        defaultViewMode: "concise",
      })
    );
    assert.ok(htmlConcise.includes("第二項分析說明"), "精簡模式必須包含正解選項B");
    assert.ok(!htmlConcise.includes("第一項分析說明"), "精簡模式不應渲染錯誤選項A");
    assert.ok(!htmlConcise.includes("第三項分析說明"), "精簡模式不應渲染錯誤選項C");
  });

  test("視角切換器: 當解析無正解匹配時，精簡模式優雅退回至全部選項", () => {
    const explanation = "A. 第一項分析說明\nB. 第二項分析說明";
    const htmlFallback = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation,
        correctAnswers: null, // 無正解
        defaultViewMode: "concise",
      })
    );
    assert.ok(htmlFallback.includes("第一項分析說明"), "退回呈現所有選項");
    assert.ok(htmlFallback.includes("第二項分析說明"), "退回呈現所有選項");
  });

  // =========================================================================
  // 6. Compact Mode & Responsive Padding
  // =========================================================================
  console.log("\n--- 6. 測試緊湊模式 (Compact Mode) ---");

  test("緊湊排版: compact=true 採用小內距 p-3 sm:p-4", () => {
    const htmlCompact = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "概念詳解文字",
        compact: true,
      })
    );
    assert.ok(htmlCompact.includes("p-3 sm:p-4"), "compact=true 應使用 p-3 sm:p-4");
  });

  test("標準排版: compact=false 採用標準內距 p-4 sm:p-5", () => {
    const htmlNormal = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "概念詳解文字",
        compact: false,
      })
    );
    assert.ok(htmlNormal.includes("p-4 sm:p-5"), "compact=false 應使用 p-4 sm:p-5");
  });

  // =========================================================================
  // 7. One-Click Copy Feedback & Clipboard Integration
  // =========================================================================
  console.log("\n--- 7. 測試一鍵複製解析功能 (One-Click Copy) ---");

  test("複製按鈕顯示控制: showCopyButton=true 渲染複製按鈕，false 隱藏", () => {
    const htmlWithCopy = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "待複製的解析內容",
        showCopyButton: true,
      })
    );
    assert.ok(htmlWithCopy.includes("複製解析"), "應渲染複製按鈕");

    const htmlWithoutCopy = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "待複製的解析內容",
        showCopyButton: false,
      })
    );
    assert.ok(!htmlWithoutCopy.includes("複製解析"), "不應渲染複製按鈕");
  });

  test("剪貼簿實作: 支援 navigator.clipboard 與相容性 document.execCommand 回退", () => {
    assert.ok(cardSourceCode.includes("navigator.clipboard?.writeText"), "包含現代 clipboard API 呼叫");
    assert.ok(cardSourceCode.includes("document.execCommand"), "包含舊式相容性 execCommand 降級回退");
    assert.ok(cardSourceCode.includes("setCopied(true)"), "複製成功設定反饋狀態");
    assert.ok(cardSourceCode.includes("setTimeout(() => setCopied(false), 2000)"), "反饋微動態於 2 秒後重置");
  });

  // =========================================================================
  // 8. User Answer Contextual Badges
  // =========================================================================
  console.log("\n--- 8. 測試個人作答情境徽章 (User Answer Badges) ---");

  test("作答徽章: 使用者選擇之選項顯示對應情境標籤", () => {
    const explanation = "A. 選項A詳解\nB. 選項B詳解";
    // 使用者選擇了 A，且 A 是正解
    const htmlCorrect = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation,
        correctAnswers: "A",
        userAnswer: "A",
      })
    );
    assert.ok(htmlCorrect.includes("您選擇的答案"), "正解選項應標記「您選擇的答案」");
    assert.ok(htmlCorrect.includes("正解選項"), "顯示「正解選項」標籤");

    // 使用者選擇了 B，而 B 是錯項
    const htmlWrong = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation,
        correctAnswers: "A",
        userAnswer: "B",
      })
    );
    assert.ok(htmlWrong.includes("您選擇的選項"), "錯誤選項應標記「您選擇的選項」");
    assert.ok(htmlWrong.includes("錯誤剖析"), "顯示「錯誤剖析」標籤");
  });

  // =========================================================================
  // 9. Full SSR Visual Styling & Atmosphere Verification
  // =========================================================================
  console.log("\n--- 9. 測試 SSR 主題視覺色彩與無障礙標準 ---");

  test("視覺氛圍: 卡片採用高對比深邃暗黑基底 (#0c101d) 與微光邊框 (border-indigo-500/20)", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: "A. 第一項\nB. 第二項",
        correctAnswers: "A",
      })
    );
    assert.ok(html.includes("bg-[#0c101d]"), "卡片容器使用深邃暗黑基底");
    assert.ok(html.includes("border-indigo-500/20"), "微光邊框樣式");
    assert.ok(html.includes("bg-emerald-950/20"), "正解卡片使用翠綠微光背景");
    assert.ok(html.includes("bg-rose-950/10"), "錯項卡片使用玫瑰微光背景");
  });

  test("空值防護: 空字串或 null 解析渲染優雅提示，不崩潰", () => {
    const htmlEmpty = ReactDOMServer.renderToString(
      React.createElement(ExplanationCard, {
        explanation: null,
      })
    );
    assert.ok(htmlEmpty.includes("此題目前暫無詳細解析說明。"), "空值應顯示優雅暫無解析提示");
  });

  console.log("\n==================================================");
  console.log(`🎉 ExplanationCard 測試全部完成：${passed}/${total} 項通過！`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runExplanationCardTests().catch((err) => {
  console.error("執行 ExplanationCard 測試過程發生未預期錯誤:", err);
  process.exit(1);
});
