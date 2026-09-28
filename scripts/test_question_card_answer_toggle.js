import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("====================================================");
console.log(" 🧪 題目卡片右上角解答顯示/隱藏按鈕深度自動化驗證套件");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ [通過] ${message}`);
  } else {
    failed++;
    console.error(`  ✗ [失敗] ${message}`);
  }
}

const pagePath = path.resolve(__dirname, "../src/app/questions/page.tsx");
const pageCode = fs.readFileSync(pagePath, "utf8");

// Part 1: 無 Emoji 與圖示統一性
console.log("[Part 1] 全站規範檢驗：無 Emoji、圖示統一使用 lucide-react...");
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const containsEmoji = emojiRegex.test(pageCode);
assert(!containsEmoji, "src/app/questions/page.tsx 零 Emoji 違規");

const importsEye = /import\s*\{[^}]*\bEye\b[^}]*\}\s*from\s*["']lucide-react["']/.test(pageCode);
const importsEyeOff = /import\s*\{[^}]*\bEyeOff\b[^}]*\}\s*from\s*["']lucide-react["']/.test(pageCode);
assert(importsEye && importsEyeOff, "從 lucide-react 正確匯入 Eye 與 EyeOff 圖示元件");

// Part 2: QuestionCardItemProps 與 QuestionCardItem 介面簽章
console.log("\n[Part 2] 卡片元件介面簽章與屬性傳遞檢驗...");
assert(
  pageCode.includes("isAnswerShown: boolean;") && pageCode.includes("onToggleAnswer: (id: string) => void;"),
  "QuestionCardItemProps 包含 isAnswerShown 與 onToggleAnswer 宣告"
);
assert(
  pageCode.includes("isAnswerShown={customAnswerVisibility[q.id] ?? showAnswersGlobal}"),
  "題目列表透過 customAnswerVisibility 優先覆寫 showAnswersGlobal 傳遞 isAnswerShown"
);
assert(
  pageCode.includes("onToggleAnswer={toggleQuestionAnswer}"),
  "題目列表綁定 onToggleAnswer 回呼函式"
);

// Part 3: 卡片右上角按鈕 UI 與無障礙/事件防護
console.log("\n[Part 3] 卡片右上角按鈕 UI、無障礙規範與事件隔離...");
const actionClusterMatch = pageCode.match(
  /\{\/\*\s*操作按鈕\s*\(隔離點擊事件\)\s*\+\s*旋轉指示箭頭\s*\*\/\}[\s\S]*?<div className="flex items-center gap-1 shrink-0">([\s\S]*?)<ChevronDown/
);
assert(actionClusterMatch !== null, "卡片右上角操作按鈕群存在");

const clusterContent = actionClusterMatch ? actionClusterMatch[1] : "";

assert(
  clusterContent.includes("onToggleAnswer(q.id);"),
  "解答切換按鈕綁定 onToggleAnswer(q.id)"
);
assert(
  clusterContent.includes("e.stopPropagation();") && clusterContent.includes("onToggleAnswer(q.id);"),
  "解答切換按鈕具備 e.stopPropagation() 事件隔離，防止冒泡觸發手風琴折疊"
);
assert(
  clusterContent.includes('title={isAnswerShown ? "隱藏解答" : "顯示解答"}'),
  "解答切換按鈕 title 包含正確的隱藏解答/顯示解答動態提示"
);
assert(
  clusterContent.includes('aria-label={isAnswerShown ? "隱藏解答" : "顯示解答"}'),
  "解答切換按鈕具備 aria-label 無障礙標籤"
);
assert(
  clusterContent.includes("<EyeOff className=\"w-4 h-4\" />") && clusterContent.includes("<Eye className=\"w-4 h-4\" />"),
  "解答切換按鈕在 isAnswerShown 時呈現 EyeOff，隱藏時呈現 Eye"
);
assert(
  clusterContent.includes("min-w-[44px]") && clusterContent.includes("min-h-[44px]"),
  "解答切換按鈕符合 >= 44px 行動端熱區無障礙規範"
);

// Part 4: 解答顯示/隱藏連動邏輯
console.log("\n[Part 4] 解答顯示/隱藏與選項反白/標準解答連動檢驗...");
assert(
  pageCode.includes("const shouldHighlight = isAnswerShown && isCorrect;"),
  "選項反白狀態受控於 isAnswerShown && isCorrect"
);
assert(
  pageCode.includes('{isAnswerShown ? q.correctAnswers : "•••• (已隱藏)"}'),
  '標準解答欄位在 isAnswerShown 為 false 時安全遮蔽為 "•••• (已隱藏)"'
);

// Part 5: 狀態管理與智慧展開/重設機制
console.log("\n[Part 5] 狀態管理 (個別覆寫、智慧展開、全域切換重設)...");
assert(
  pageCode.includes("const [customAnswerVisibility, setCustomAnswerVisibility] = useState<Record<string, boolean>>({});"),
  "QuestionsPage 宣告 customAnswerVisibility 字典管理個別題目的顯示狀態"
);
assert(
  pageCode.includes("setCustomAnswerVisibility({});"),
  "全域隱藏/顯示按鈕切換時，自動清除個別覆寫狀態回歸全域同步"
);
assert(
  pageCode.includes("setExpandedCardIds((expanded) => {") && pageCode.includes("nextExpanded.add(id);"),
  "切換為顯示解答且該卡片收合時，自動展開該卡片讓使用者能立即檢視正解"
);
assert(
  pageCode.includes("delete next[id];"),
  "題目刪除 (handleDelete) 時同步清空該題目之 customAnswerVisibility 釋放記憶體"
);

// Part 6: 骨架屏載入卡片
console.log("\n[Part 6] 骨架屏卡片版面比例檢驗...");
const skeletonActionMatch = pageCode.match(
  /function QuestionCardSkeleton[\s\S]*?<div className="flex items-center gap-1">([\s\S]*?)<\/div>/
);
const skeletonButtonsCount = skeletonActionMatch ? (skeletonActionMatch[1].match(/animate-pulse/g) || []).length : 0;
assert(
  skeletonButtonsCount === 4,
  `QuestionCardSkeleton 操作按鈕群骨架包含 4 個佔位元素 (實際: ${skeletonButtonsCount})`
);

console.log("\n====================================================");
console.log(`總測試項目: ${passed + failed} | 通過: ${passed} | 失敗: ${failed}`);
console.log("====================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
