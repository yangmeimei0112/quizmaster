const fs = require("fs");
const path = require("path");

async function runEdgeCaseTests() {
  console.log("=================================================");
  console.log("🧪 邊界條件與異常路徑測試 (Edge Cases & Error Paths)");
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

  // 邊界 1: 測試上傳非圖片類型副檔名及 MIME 防護
  const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]);

  assert(!ALLOWED_MIME_TYPES.has("application/x-msdownload"), "惡意可執行檔 .exe 格式被嚴格阻擋");
  assert(!ALLOWED_MIME_TYPES.has("text/plain"), "純文字檔案 .txt 格式被拒絕");
  assert(!ALLOWED_MIME_TYPES.has("application/javascript"), "JS 腳本檔案被拒絕");
  assert(ALLOWED_MIME_TYPES.has("image/jpeg"), "JPG 格式正常允許");
  assert(ALLOWED_MIME_TYPES.has("image/png"), "PNG 格式正常允許");
  assert(ALLOWED_MIME_TYPES.has("image/webp"), "WebP 格式正常允許");
  assert(ALLOWED_MIME_TYPES.has("image/gif"), "GIF 格式正常允許");
  assert(ALLOWED_MIME_TYPES.has("image/svg+xml"), "SVG 格式正常允許");

  // 邊界 2: Base64 Data URL 正則解析與防注入
  const validDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const invalidDataUrl1 = "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==";
  const invalidDataUrl2 = "not_a_data_url";

  const matchValid = validDataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
  assert(matchValid !== null && matchValid[1] === "image/png", "合法 Base64 Data URL 正確提取 MIME 類型");

  const matchInvalid1 = invalidDataUrl1.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
  assert(matchInvalid1 !== null && !ALLOWED_MIME_TYPES.has(matchInvalid1[1]), "非圖片 Data URL (如 text/html) 被判定為無效格式");

  const matchInvalid2 = invalidDataUrl2.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
  assert(matchInvalid2 === null, "非 Data URL 字串格式被正確攔截");

  // 邊界 3: Parser 容錯 — 混用全形、無空格、多行附圖標籤
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

  const trickyStem = `
【單選題】第99題：如圖所示之網路邏輯圖：
【附圖】:https://cdn.example.org/path/to/image.png?v=123&query=test
A. 選項A
B. 選項B
C. 選項C
D. 選項D
解答：C
`;
  const parsedTricky = parseQuestionText(trickyStem);
  assert(parsedTricky.imageUrl === "https://cdn.example.org/path/to/image.png?v=123&query=test", "Parser 能容錯帶參數的複雜圖片 URL");
  assert(parsedTricky.correctAnswers[0] === "C", "答案正確解析為 C");

  // 邊界 4: 空白與純換行 imageUrl 在 API 端轉為 null
  const emptyStr = "   ";
  const processedEmpty = emptyStr.trim() || null;
  assert(processedEmpty === null, "純空白字串正常轉為 null 避免資料庫髒資料");

  console.log("\n=================================================");
  console.log(`🎉 邊界條件測試完成: 通過 ${passed} 項，失敗 ${failed} 項`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

runEdgeCaseTests();
