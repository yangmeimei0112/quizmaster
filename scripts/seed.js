const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeText(text) {
  if (!text) return "";
  let result = text
    .replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ")
    .toLowerCase();
  return result.replace(/[\s\p{P}\p{S}]/gu, "");
}

const sampleQuestions = [
  {
    stem: "下列何者屬於 JavaScript 的原始資料型別 (Primitive Types)？",
    type: "MULTIPLE",
    optionA: "Number",
    optionB: "String",
    optionC: "Object",
    optionD: "Boolean",
    correctAnswers: "A,B,D",
    explanation:
      "在 JavaScript 中，原始型別包含 string, number, bigint, boolean, undefined, symbol 與 null。Object 屬於參照型別 (Reference Type)。",
    category: "資訊程式",
    difficulty: "MEDIUM",
    tags: "JavaScript, 前端基礎",
  },
  {
    stem: "在 Python 中，下列哪一個方法可以用來在列表 (list) 的末端添加單一元素？",
    type: "SINGLE",
    optionA: "append()",
    optionB: "extend()",
    optionC: "insert()",
    optionD: "add()",
    correctAnswers: "A",
    explanation:
      "append() 用於在列表末尾添加單一元素；extend() 用於將可迭代對象的所有元素逐一添加；add() 則是 set 集合的方法。",
    category: "資訊程式",
    difficulty: "EASY",
    tags: "Python, 基礎語法",
  },
  {
    stem: "關於 HTTP 狀態碼 (Status Code) 的說明，下列哪些選項是正確的？",
    type: "MULTIPLE",
    optionA: "200 代表請求成功 (OK)",
    optionB: "404 代表客戶端找不到請求的資源 (Not Found)",
    optionC: "500 代表伺服器內部發生錯誤 (Internal Server Error)",
    optionD: "301 代表伺服器暫時性轉址 (Found / Temporary Redirect)",
    correctAnswers: "A,B,C",
    explanation:
      "301 代表永久重新導向 (Moved Permanently)，302 或 307 才是暫時性轉址 (Found / Temporary Redirect)。",
    category: "資訊程式",
    difficulty: "MEDIUM",
    tags: "網路協議, HTTP",
  },
  {
    stem: "若一元二次方程式 x^2 - 5x + 6 = 0，則該方程式的兩根之和為多少？",
    type: "SINGLE",
    optionA: "5",
    optionB: "-5",
    optionC: "6",
    optionD: "-6",
    correctAnswers: "A",
    explanation:
      "根據韋達定理，若方程式為 ax^2 + bx + c = 0，則兩根之和為 -b/a = -(-5)/1 = 5。",
    category: "數學",
    difficulty: "EASY",
    tags: "代數, 韋達定理",
  },
];

async function main() {
  console.log("開始植入示範題目...");
  for (const q of sampleQuestions) {
    const norm = normalizeText(q.stem);
    const existing = await prisma.question.findFirst({
      where: { normalizedStem: norm },
    });
    if (!existing) {
      await prisma.question.create({
        data: {
          ...q,
          normalizedStem: norm,
        },
      });
      console.log(`已建立題目: ${q.stem}`);
    } else {
      console.log(`題目已存在，略過: ${q.stem}`);
    }
  }
  console.log("示範題目植入完成！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });