const path = require("path");

async function testAnswerUtils() {
  console.log("==================================================");
  console.log("🧪 執行 answerUtils 工具函式單元與邊界測試");
  console.log("==================================================");

  const utilsPath = path.resolve(__dirname, "../src/lib/answerUtils.ts");
  const { normalizeAnswers, compareAnswers, formatAnswerDisplay } = await import(
    "file://" + utilsPath.replace(/\\/g, "/")
  );

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ 失敗: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. normalizeAnswers
  assert(
    JSON.stringify(normalizeAnswers("A, B, C")) === JSON.stringify(["A", "B", "C"]),
    "正規化含空格字串 'A, B, C' 為 ['A', 'B', 'C']"
  );
  assert(
    JSON.stringify(normalizeAnswers(["b", "A", "b"])) === JSON.stringify(["A", "B"]),
    "正規化陣列小寫與重複項 ['b', 'A', 'b'] 為 ['A', 'B']"
  );
  assert(
    JSON.stringify(normalizeAnswers("  c,   a , b  ")) === JSON.stringify(["A", "B", "C"]),
    "不規則空白與未排序字串正確清理與排序"
  );
  assert(
    JSON.stringify(normalizeAnswers(null)) === JSON.stringify([]) &&
      JSON.stringify(normalizeAnswers(undefined)) === JSON.stringify([]),
    "空值 null 與 undefined 容錯回傳空陣列"
  );

  // 2. compareAnswers
  assert(
    compareAnswers(["A", "B"], "A, B") === true,
    "陣列 ['A', 'B'] 與字串 'A, B' 比對相符"
  );
  assert(
    compareAnswers(["B", "A"], "A,B") === true,
    "反向順序作答 ['B', 'A'] 與標準答案 'A,B' 比對相符"
  );
  assert(
    compareAnswers("a,b", "A, B") === true,
    "小寫字串 'a,b' 與標準答案 'A, B' 比對相符"
  );
  assert(
    compareAnswers(["A"], "A, B") === false,
    "漏選複選題 (少選一項) 正確判定為 false"
  );
  assert(
    compareAnswers(["A", "B", "C"], "A, B") === false,
    "多選複選題 (多選一項) 正確判定為 false"
  );
  assert(
    compareAnswers([], "A") === false,
    "未作答 (空陣列) 正確判定為 false"
  );

  // 3. formatAnswerDisplay
  assert(
    formatAnswerDisplay(["B", "a"]) === "A, B",
    "格式化展示為 'A, B'"
  );
  assert(
    formatAnswerDisplay("c,a,b", " & ") === "A & B & C",
    "支援自訂分隔符 'A & B & C'"
  );

  console.log(`\n==================================================`);
  console.log(`🎉 answerUtils 測試通過 (${passed}/${total})`);
  console.log(`==================================================\n`);
}

testAnswerUtils().catch((err) => {
  console.error(err);
  process.exit(1);
});
