# QuizMaster 核心功能與資料流全面調查報告 (Core Features & Data Flow Analysis)

## 1. 執行摘要 (Executive Summary)

本調查針對 QuizMaster 個人題庫系統的 5 大核心功能、資料流 (Data Flow)、狀態管理 (State Management)、API 路由、演算法實作以及 UI 改版回歸風險進行深入代碼審計。
全站採用 **Next.js 14.2.15 (App Router)**、**React 18.3.1**、**Prisma 5.21.1 (SQLite: `prisma/dev.db`)**、**Tailwind CSS 3.4.14** 與 **docx 9.7.1** 建構。
所有 5 大核心功能皆已完整實作，各功能邏輯高度聚焦且具備清晰的邊界。為了配合後續導入 **Linear / Modern 暗黑設計系統** 與 **任天堂 Switch 遊戲風格字體**，本報告提供了精確的架構圖譜、狀態定義與防回歸驗證指南。

---

## 2. 功能一：單題手動錄入 (Manual Question Addition)

### 2.1 涉及檔案與核心位置
- **前端頁面**：`src/app/add/page.tsx`
- **後端路由**：`src/app/api/questions/route.ts` (POST 方法)
- **型別定義**：`src/types/question.ts` (`QuestionFormData`, `QuestionType`, `Difficulty`)
- **資料模型**：`prisma/schema.prisma` (`model Question`)

### 2.2 頁面狀態管理 (Client State)
在 `src/app/add/page.tsx:26-46` 中定義了以下狀態：
```typescript
const [stem, setStem] = useState("");
const [type, setType] = useState<QuestionType>("SINGLE");
const [optionA, setOptionA] = useState("");
const [optionB, setOptionB] = useState("");
const [optionC, setOptionC] = useState("");
const [optionD, setOptionD] = useState("");
const [correctAnswers, setCorrectAnswers] = useState<string[]>(["A"]);
const [explanation, setExplanation] = useState("");
const [errorMsg, setErrorMsg] = useState("");
const [successMsg, setSuccessMsg] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
const [showConfirmModal, setShowConfirmModal] = useState(false);
```

### 2.3 資料流與使用者互動邏輯
1. **題型切換 (`handleTypeChange`) (`src/app/add/page.tsx:83-89`)**：
   - 支援 `SINGLE` (單選題) 與 `MULTIPLE` (複選題)。
   - 當從複選題切換至單選題時，自動將正確答案收束為單一選項（保留目前選中的第一項或預設為 `"A"`），避免題型與答案數量矛盾。
2. **選項與正解選取 (`toggleAnswer`) (`src/app/add/page.tsx:92-105`)**：
   - 4 個固定選項 (A, B, C, D) 透過 `optionsList` 迴圈渲染。
   - 單選題模式：點擊選項前方的圓鈕/方鈕時，將 `correctAnswers` 直接設定為 `[optKey]`。
   - 複選題模式：支援多選，點擊時在 `correctAnswers` 陣列中新增或移除該選項，並自動進行字典排序 (`.sort()`)。
3. **前端表單驗證 (`handleSubmit`) (`src/app/add/page.tsx:108-136`)**：
   - 驗證題幹非空 (`!stem.trim()`)。
   - 驗證四個選項皆不可為空 (`!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()`)。
   - 驗證至少有一個正解 (`correctAnswers.length === 0`)。
   - 若 `hasExactMatch === true` (100% 重複)，直接報錯阻擋，禁止提交。
   - 若 `maxSimilarity >= 75` 且非強制送出 (`!force`)，阻斷流程並打開確認彈窗 (`setShowConfirmModal(true)`)。
4. **API 通訊與後端校驗 (`POST /api/questions`) (`src/app/api/questions/route.ts:77-182`)**：
   - 接收 JSON Payload：`{ stem, type, optionA, optionB, optionC, optionD, correctAnswers, explanation, forceCreate }`。
   - 後端二次校驗：
     - 若 `type === "SINGLE"` 且 `answersStr.includes(",")`，返回 400 錯誤。
     - 若 `!forceCreate`：比對所有已存在題目的 `normalizedStem`，若完全吻合則返回 HTTP 409 (`isDuplicate: true, exactMatch: true`)；若相似度 >= 85%，返回 HTTP 409 (`requiresConfirmation: true`)。
   - 通過檢查後呼叫 `prisma.question.create`，寫入資料庫並返回 201。
5. **提交成功後處理**：
   - 清空表單 (`stem`, `optionA~D`, `explanation`)，保留題型與預設答案便於連續出題。
   - 顯示成功提示橫幅（3 秒後自動隱藏）。

---

## 3. 功能二：即時防重複偵測 (Real-Time Duplicate Detection)

### 3.1 涉及檔案與核心位置
- **演算法核心模組**：`src/lib/similarity.ts`
- **防重複檢查 API**：`src/app/api/questions/check-duplicate/route.ts`
- **前端比對觸發與警示呈現**：`src/app/add/page.tsx:48-80`, `303-375`, `494-536`

### 3.2 文字正規化邏輯 (`normalizeText`)
位於 `src/lib/similarity.ts:7-22`：
1. **全形轉半形**：利用 Unicode 碼偏移 (`replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))`) 將全形英數字轉換為標準半形。
2. **空格清洗**：將全形空格 `\u3000` 轉為半形空格。
3. **大小寫轉換**：全部轉小寫 (`.toLowerCase()`)。
4. **移除所有符號與空白**：使用 Unicode 屬性正則 `replace(/[\s\p{P}\p{S}]/gu, "")`，剔除所有標點符號、括號、底線、空格等雜訊。

### 3.3 相似度綜合演算法架構 (`calculateSimilarity`)
位於 `src/lib/similarity.ts:136-189`，結合五重比對維度：
1. **快速路徑 (Exact Check)**：若 `norm1 === norm2`，直接返回 `similarity = 100`, `isExact = true`, `level = "EXACT"`。
2. **Levenshtein 編輯距離 (`levenshtein`)**：動態規劃矩陣，計算將字串 A 轉為字串 B 的最小編輯操作數 (增/刪/改)，轉為百分比比率：`Math.max(0, Math.round((1 - dist / maxLen) * 100))`。
3. **2-gram (Bigram) Jaccard 相似度 (`bigramSimilarity`)**：將文字拆解為長度為 2 的相鄰字元集合，計算交集 / 聯集 (`intersection / union * 100`)，對調換字詞或局部修改極其敏銳。
4. **字元層級 Dice 係數 (`charDiceCoefficient`)**：統計字元頻率分佈並計算 `2 * common / (lenA + lenB) * 100`，特別適合中文單字重合度比對。
5. **最長公共子序列 (LCS) 與重疊覆蓋率 (`longestCommonSubsequence`)**：計算 LCS 長度，評估短句是否高度嵌在長句中 (`overlapScore = Math.round(lcsMinRatio * 0.9)`)。
6. **加權取大策略**：
   ```typescript
   const similarity = Math.max(levRatio, bigramRatio, diceRatio, lcsMaxRatio, overlapScore);
   ```
7. **危險等級分級**：
   - `>= 95%`: `"EXACT"`
   - `>= 75%`: `"HIGH"`
   - `>= 50%`: `"MEDIUM"`
   - `>= 30%`: `"LOW"`

### 3.4 前端即時 Debouncing 與 API 互動
- 於 `src/app/add/page.tsx:48-80`：
  - `useEffect` 監聽 `[stem]`。
  - 防呆閾值：若 `stem.trim().length < 2`，清空比對狀態並提早退出。
  - 防抖延遲：設定 **350ms** 計時器 (`setTimeout(..., 350)`)，每次鍵入新字元自動取消前次計時器 (`clearTimeout(timer)`)。
  - 呼叫 `POST /api/questions/check-duplicate`，傳入 `{ stem }`。
  - API 從資料庫拉出所有題目題幹（單人題庫規模，內存比對毫秒級完成），過濾出相似度 >= 60% 的候選題，按相似度降序排列，取前 5 筆回傳。

### 3.5 警示卡片與防呆 Modal 呈現
1. **100% 完全重複警示卡片 (`src/app/add/page.tsx:304-332`)**：
   - 條件：`hasExactMatch === true`。
   - 視覺：高警示紅色背景卡片 (`bg-rose-50 border-rose-300 text-rose-900`)，標示「⚠️ 題庫中已有完全相同 (100%) 的題目！」，展示重複題幹，並提供直達 `/questions?q=...` 的比對連結。
   - 阻擋行為：底部儲存按鈕被設為 `disabled` 且顯示 `cursor-not-allowed`。
2. **高相似度警示卡片 (`src/app/add/page.tsx:334-374`)**：
   - 條件：`!hasExactMatch && duplicateMatches.length > 0 && maxSimilarity >= 70`。
   - 視覺：琥珀金警告卡片 (`bg-amber-50 border-amber-300 text-amber-900`)，列出相似度數值標籤（如 `85% 相似`）與原題題幹，附帶比對按鈕。
3. **強制確認彈窗 (`src/app/add/page.tsx:495-536`)**：
   - 條件：當相似度高於 75% 且使用者試圖點擊儲存時觸發。
   - 互動：彈窗顯示最相似的原題內容，提供「取消並檢查」或「仍要新增此題 (`handleSubmit(true)`)」的確認機制。

---

## 4. 功能三：題庫查詢與管理 (Search & Management)

### 4.1 涉及檔案與核心位置
- **前端頁面**：`src/app/questions/page.tsx`
- **後端路由**：
  - `src/app/api/questions/route.ts` (GET 搜尋)
  - `src/app/api/questions/[id]/route.ts` (GET, PUT, DELETE)

### 4.2 狀態架構 (State Architecture)
- `questions`: 當前加載的題目列表 (`Question[]`)。
- `searchTerm`: 搜尋框文字（支援題幹、選項、解析、標籤）。
- `selectedType`: 題型過濾器 (`"ALL" | "SINGLE" | "MULTIPLE"`)。
- `showAnswersGlobal`: 全域解答顯隱切換開關 (布林值，預設為 `true`)。
- `expandedExplanations`: 已展開解析的題目 ID 集合 (`Set<string>`)。
- `editingQuestion`: 當前正在編輯的題目物件（控制編輯 Modal）。
- `editStem`, `editType`, `editOptA~D`, `editAnswers`, `editExplanation`: 編輯表單欄位。
- `deletingId`: 正在執行非同步刪除的題目 ID。

### 4.3 查詢與過濾資料流
1. **Debounced 檢索**：`useEffect` 設置 **250ms** 防抖，當 `searchTerm` 或 `selectedType` 變更時自動呼叫 `fetchQuestions`。
2. **後端多欄位 OR 模糊搜尋 (`src/app/api/questions/route.ts:27-37`)**：
   ```prisma
   where.OR = [
     { stem: { contains: q } },
     { optionA: { contains: q } },
     { optionB: { contains: q } },
     { optionC: { contains: q } },
     { optionD: { contains: q } },
     { explanation: { contains: q } },
     { tags: { contains: q } },
   ]
   ```
3. **題型過濾**：若 `type !== "ALL"`，加入 `where.type = type`。

### 4.4 列表管理操作
1. **全域解答顯隱切換**：
   - 點擊「隱藏所有解答」/「顯示所有解答」按鈕，切換 `showAnswersGlobal`。
   - 選項卡片依照該狀態決定是否為正解加上高亮綠框與「正解」標籤。下方解答列亦會動態切換為「•••• (已隱藏)」。
2. **手風琴解析展開/收合**：
   - 點擊「查看詳細解析」時，將該題 ID 加入 `expandedExplanations` Set，並以微動態展開帶有金色 Sparkles 圖示的解析卡片。
3. **線上編輯 (Inline / Modal Editing)**：
   - 點擊鉛筆圖示打開編輯 Modal (`editingQuestion`)。
   - 支援即時修改題幹、切換單選/複選題型、修改 A~D 選項文字、重新指定正確答案與修改解析。
   - 點擊「儲存修改」發送 `PUT /api/questions/[id]`，後端同步更新 `normalizedStem`，成功後本地 state 立即更新 (`setQuestions`)。
4. **單題刪除**：
   - 點擊垃圾桶圖示觸發原生 `confirm()` 確認。
   - 發送 `DELETE /api/questions/[id]`，成功後以 filter 移除本地陣列中的該項目。

---

## 5. 功能四：個人自測刷題體驗 (Practice Mode / Random Quiz)

### 5.1 涉及檔案與核心位置
- **前端頁面**：`src/app/practice/page.tsx`
- **依賴 API**：`GET /api/questions`

### 5.2 狀態機與生命週期 (Quiz State Machine)
自測刷題具備三階段生命週期狀態：
1. **準備階段 (`!quizStarted`)**：
   - 選擇題型範圍：全部題型 / 僅單選題 / 僅複選題。
   - 即時計算符合條件的題目總數。
   - 點擊「開始隨機抽題測驗」啟動測驗。
2. **作答階段 (`quizStarted && !quizCompleted`)**：
   - 核心狀態：
     - `currentIndex`: 當前題目索引。
     - `selectedAnswers`: 使用者目前勾選的選項鍵值陣列 (`string[]`)。
     - `isAnswerSubmitted`: 本題是否已送出判定對錯 (布林值)。
     - `score`: 累計答對題數。
3. **結算階段 (`quizCompleted`)**：
   - 顯示頒獎獎盃卡片 (`Award` 圖示)。
   - 顯示總得分、總題數、答對率百分比計算 (`Math.round((score / filteredQuestions.length) * 100)%`)。
   - 提供「再來一次」與「返回題庫清單」按鈕。

### 5.3 核心互動與判分機制
1. **隨機抽題邏輯 (`handleStartQuiz`) (`src/app/practice/page.tsx:60-71`)**：
   - 陣列洗牌演算法：`[...filteredQuestions].sort(() => Math.random() - 0.5)`。
   - 重置題目指標與得分狀態。
2. **選項選取邏輯 (`handleSelectOption`) (`src/app/practice/page.tsx:76-86`)**：
   - 送出後鎖定：若 `isAnswerSubmitted === true`，忽略所有點擊。
   - 單選題：單一覆蓋 `setSelectedAnswers([key])`。
   - 複選題：切換存在性並排序。
3. **即時判分 (`handleSubmitAnswer`) (`src/app/practice/page.tsx:89-103`)**：
   - 比對字串正規化：
     ```typescript
     const userAnsStr = [...selectedAnswers].sort().join(",");
     const correctAnsStr = currentQ.correctAnswers.split(",").sort().join(",");
     const isCorrect = userAnsStr === correctAnsStr;
     if (isCorrect) setScore((s) => s + 1);
     setIsAnswerSubmitted(true);
     ```
4. **動態視覺回饋 (Visual Feedback)**：
   - **未送出時**：選中的選項卡片呈現靛藍光暈 (`border-indigo-600 bg-indigo-50/40`)。
   - **已送出時**：
     - 正確答案卡片呈現翡翠綠光暈與 `✓ 標準答案` 徽章。
     - 使用者選錯的選項卡片呈現玫瑰紅與 `✗ 您的回答` 徽章。
     - 頂部展示判定橫幅（完全答對為綠色，答錯為紅色並標示正確解答）。
     - 若題目含有解析，自動展開題目詳解區塊。
5. **切換下一題 (`handleNextQuestion`)**：
   - 若 `currentIndex + 1 < filteredQuestions.length` 遞增索引並重置選取狀態。
   - 若為最後一題，則轉入 `quizCompleted = true` 結算畫面。

---

## 6. 功能五：Google 文件匯出 (Export to Google Docs)

### 6.1 涉及檔案與核心位置
- **前端彈窗組件**：`src/components/ExportModal.tsx`
- **後端 docx 產生 API**：`src/app/api/export/docx/route.ts`
- **驗證腳本**：`scripts/test_export.js`

### 6.2 彈窗設定與核心選項
在 `src/components/ExportModal.tsx:31-37` 定義：
- `title`: 文件大標題（預設：「個人題庫測驗試卷」）。
- `subtitle`: 副標題說明（預設：「QuizMaster 題庫系統匯出」）。
- `includeExplanation`: 是否包含解析（布林值，預設為 `true`）。
- `includeAnswers`: 是否包含標準答案（布林值，預設為 `true`）。
- **關鍵功能配置**：
  1. **選項一（包含解析與答案）**：`includeExplanation = true, includeAnswers = true`。
  2. **選項二（不含解析，但要有答案）**：`includeExplanation = false, includeAnswers = true`。此外提供 checkbox 允許用戶選擇是否連答案也隱藏。

### 6.3 三大匯出路徑與技術細節

#### 路徑一：下載 Google 文件專用 `.docx` (`handleDownloadDocx`)
- 前端發送 `POST /api/export/docx`，傳送配置與 `questionIds`。
- 後端使用 `docx` npm 套件 (`src/app/api/export/docx/route.ts`):
  1. 產生居中大標題 (`Microsoft JhengHei`, 18pt, bold)。
  2. 產生副標題與匯出模式說明列 (10pt, slate-500)。
  3. 產生考生作答資訊列（班級、姓名、座號、得分）。
  4. 產生實線分隔線 (`BorderStyle.SINGLE`)。
  5. 題目渲染：
     - 題幹設定 `keepNext: true`，防止題目與選項發生分頁斷開 (Page orphan)。
     - 選項 A~D 縮排 450 dxa，設定 `keepLines: true` 防止選項跨頁截斷。
     - 若 `includeAnswers || includeExplanation`，輸出翠綠色 `【標準答案】：...`。
     - 若 `includeExplanation`，輸出深灰色 `【題目解析】：...`。
  6. 透過 `Packer.toBuffer(doc)` 打包成 Word 二進制 Buffer，以 `application/vnd.openxmlformats-officedocument.wordprocessingml.document` MIME 類型流式回傳。
  7. 前端接收 Blob，透過虛擬 `<a>` 標籤觸發瀏覽器原生物件下載。

#### 路徑二：一鍵複製 Google Docs 格式到剪貼簿 (`handleCopyRichText`)
- 利用 `generateGoogleDocsHtml()` 產生內嵌標準 CSS 樣式的 Rich Text HTML。
- 使用現代非同步剪貼簿 API (`navigator.clipboard.write`)：
  ```typescript
  const blobHtml = new Blob([htmlContent], { type: "text/html" });
  const blobText = new Blob([textContent], { type: "text/plain" });
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": blobHtml,
      "text/plain": blobText,
    }),
  ]);
  ```
- 若使用者的瀏覽器不支援 `ClipboardItem`，自動降級為純文字 `clipboard.writeText`。
- 複製成功後跳出提示：「已複製 Google 文件專屬排版！打開 Google 文件按下 Ctrl + V 即可直接貼上完整排版試卷！」。

#### 路徑三：快速直達 Google 文件開新文件
- 在彈窗底部提供快捷超連結，直接開啟新分頁至 `https://docs.google.com/document/create`，實現「複製排版 -> 一鍵開文件 -> Ctrl+V 貼上」的無縫工作流。

---

## 7. 全域狀態、本地儲存、API 路由與輔助工具總整理

| 類型 | 名稱 / 路徑 | 作用說明 |
| :--- | :--- | :--- |
| **資料庫 (Database)** | `prisma/dev.db` (SQLite) | 本地檔案資料庫，儲存所有題目資料，包含 `normalizedStem` 索引。 |
| **ORM Client** | `src/lib/prisma.ts` | PrismaClient 全域單例 (Singleton)，開發環境掛載於 `globalThis` 防止連線耗盡。 |
| **狀態管理 (State)** | React 內建 Hooks (`useState`, `useCallback`, `useTransition`) | 輕量且高反應性，各頁面自主管理狀態，無需 Redux/Zustand 額外相依。 |
| **本地快取 (Local Storage)** | 無 (Stateless Client) | 目前全站狀態完全依賴 SQLite 資料庫與 URL 查詢參數，無使用 `localStorage`。 |
| **文字與演算法工具** | `src/lib/similarity.ts` | 提供 `normalizeText` 與五重維度字串相似度評估 (`calculateSimilarity`)。 |
| **API: 題目列表與新增** | `/api/questions` | `GET`: 關鍵字搜尋與統計; `POST`: 新增題目與防重複攔截。 |
| **API: 單題 CRUD** | `/api/questions/[id]` | `GET`: 查詢單題; `PUT`: 更新修改與重新正規化; `DELETE`: 刪除題目。 |
| **API: 即時防重複比對** | `/api/questions/check-duplicate` | `POST`: 接收題幹，即時回傳前 5 筆高度相似題目與最大相似度。 |
| **API: Docx 匯出** | `/api/export/docx` | `POST`: 動態組裝 Word 文檔並回傳二進制二進位流。 |
| **型別定義** | `src/types/question.ts` | 定義 `Question`, `QuestionFormData`, `SimilarMatch`, `Difficulty`, `QuestionType`。 |
| **自動化測試腳本** | `scripts/test_suite.js` | 驗證資料庫查詢、完全重複偵測、高相似度偵測、無關題目相似度與題型過濾。 |
| **匯出驗證腳本** | `scripts/test_export.js` | 驗證「無解析但有答案」之 docx 文件生成與位元組有效性。 |
| **示範資料植入** | `scripts/seed.js` | 植入初始題目（含單選、複選、解析與標籤）。 |

---

## 8. UI 改版回歸風險矩陣與驗證藍圖 (Regression Risks & Verification Blueprint)

在執行 Linear / Modern 暗黑深邃設計系統與任天堂 Switch 遊戲字體重構時，應特別關注下列潛在回歸風險與驗證步驟：

### 8.1 功能回歸風險點

| 模組 | 潛在風險點 | 防範與驗證要點 |
| :--- | :--- | :--- |
| **單題錄入 (`/add`)** | 題型切換時單選/複選正確答案陣列狀態遺失或格式錯誤。 | 檢查切換單選時是否正確降維至單一解答，且正解高亮樣式是否正常切換。 |
| **即時防重複 (`/add`)** | 改版表單與輸入框時，遺漏 350ms Debounce 或清空計時器的 cleanup 函數。 | 輸入文字時確認右上方「防重複比對中...」轉圈動畫，以及比對結果卡片正常呈現。 |
| **警示卡片與 Modal (`/add`)** | 暗黑模式下紅色/琥珀色卡片與按鈕的色彩對比度不足，或確認彈窗的 z-index 被背景遮蔽。 | 確保彈窗 `z-50`、毛玻璃 `backdrop-blur` 正確覆蓋，文字達 WCAG AAA 對比度。 |
| **題庫搜尋 (`/questions`)** | 搜尋框 250ms 防抖遺失，或點擊清除按鈕 (X) 無法重置清單。 | 測試鍵入關鍵字、清除關鍵字、切換單複選標籤，確認列表即時刷新。 |
| **全域解答顯隱 (`/questions`)** | 替換按鈕樣式時，遺漏 `showAnswersGlobal` 控制邏輯，導致自測時答案始終外露。 | 點擊「隱藏所有解答」，驗證所有題目選項綠框與解答文字皆轉為遮罩狀態。 |
| **線上編輯 Modal (`/questions`)** | 編輯彈窗改版為深色玻璃態時，選項正解切換按鈕未正確更新 `editAnswers`。 | 點擊編輯題目，修改選項內容並重新指定正解，儲存後驗證資料庫與畫面皆更新。 |
| **刷題練習 (`/practice`)** | 隨機打亂演算法被意外更動，或送出後選項狀態未正確區分「標準答案」與「使用者作答」。 | 進行完整刷題流程：選取選項 -> 送出答案 -> 檢視翠綠/玫瑰紅柔光標籤 -> 查看結算獎盃。 |
| **Google 文件匯出 (`ExportModal`)** | 複製 HTML 時破壞了內嵌樣式結構，導致貼入 Google Docs 後排版崩塌或文字走樣。 | 確保 `generateGoogleDocsHtml()` 中的 inline style 保持不變，並驗證 .docx 下載功能。 |

### 8.2 驗證藍圖與測試指令
1. **靜態型別檢查**：
   - 確保改版後的所有 TSX 檔案完全符合型別要求：`npx tsc --noEmit`。
2. **建置檢查**：
   - 驗證 Next.js 頁面與 API 路由建置無報錯：`npm run build`。
3. **功能演算法整合測試**：
   - 執行獨立功能測試腳本：`node scripts/test_suite.js`。
4. **Google 文件匯出專案測試**：
   - 執行匯出專用驗證腳本：`node scripts/test_export.js`。
