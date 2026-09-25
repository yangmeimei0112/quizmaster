# Original User Request

## 2026-09-18T17:45:34Z

全站一次性完整重構 QuizMaster 網站視覺風格與排版，導入 Linear / Modern 暗黑深邃設計系統（Deep Space #050506 背景、環境流動光斑、微光玻璃擬態、多層次投影與 200-300ms expo-out 精密微動態），並搭配任天堂 Switch 經典遊戲風格字體（Zen Maru Gothic 丸黑體 + Plus Jakarta Sans，兼具日系遊戲微圓角親和力與現代極致好讀感）。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 全域 Design Tokens 與任天堂 Switch 遊戲字體族群
- 整合 Google Fonts `Zen Maru Gothic`（支援完整漢字與日系微圓角丸體）與 `Plus Jakarta Sans`（飽滿幾何現代英數字），配置於 Next.js `next/font/google` 或 HTML 全域樣式。
- 於 `tailwind.config.ts` 與 `src/app/globals.css` 定義標準 Linear / Modern Tokens：
  - 色彩系統：`background-deep: #020203`, `background-base: #050506`, `background-elevated: #0a0a0c`, `surface: rgba(255,255,255,0.05)`, `surface-hover: rgba(255,255,255,0.08)`, `foreground: #EDEDEF`, `foreground-muted: #8A8F98`, `foreground-subtle: rgba(255,255,255,0.60)`。
  - 強調色與光暈：`accent: #5E6AD2`, `accent-bright: #6872D9`, `accent-glow: rgba(94,106,210,0.3)`。
  - 邊框與投影：極細微光邊框 `border-white/[0.06]`、Hover `border-white/[0.10]`、多層次立體陰影與頂部 1px 內光高光。
  - 背景系統：四層式漸層背景（頂部徑向漸層、微暗網格紋理、多個慢速流動的環境光斑 Animated Blobs）。

### R2. 全站介面一次性全面換裝 (Full-Site Complete Overhaul)
- **導航列與全站外框 (`Navbar.tsx`, `layout.tsx`, Footer)**：深色毛玻璃、活潑的 Switch 風格遊戲徽章、柔光標籤按鈕。
- **首頁儀表板 (`/page.tsx`)**：現代 Linear 風格 Hero 區塊、漸層文字 (`bg-clip-text text-transparent`)、Asymmetric Bento Grid 數據統計卡片、微光立體入口。
- **單題手動錄入頁面 (`/add/page.tsx`)**：深邃表單輸入框、單選/複選發光膠囊切換、即時防重複警示卡片（以琥珀金/深紅立體微光警示呈现）、解析選填欄位微光深色適配。
- **題庫查詢與管理頁面 (`/questions/page.tsx`)**：深色卡片式列表、展開/收合平滑微動態、在線編輯深色彈窗、無障礙對比色彩。
- **個人自測刷題體驗 (`/practice/page.tsx`)**：融合任天堂遊戲風格的互動答題卡、選項選取狀態霓虹高光、即時對錯立體揭曉（翠綠/玫瑰紅柔光）、結算頒獎卡片。
- **Google 文件匯出彈窗 (`ExportModal.tsx`)**：精緻暗黑毛玻璃彈窗，保留下載 .docx、富文本複製與一鍵開啟 Google Docs 等所有現有功能。

### R3. 微動態與無障礙標準 (Micro-interactions & Accessibility)
- 所有 Hover 與點擊反饋維持 200-300ms 與 `cubic-bezier(0.16, 1, 0.3, 1)`（expo-out），無延遲、無誇張回彈，營造頂級桌面軟體手感。
- 主文字與背景維持 15:1 超高對比度，輔助說明文字不低於 6:1，完全符合 WCAG AAA 閱讀標準。

## Acceptance Criteria

### Visual & Atmospheric Fidelity
- [ ] 完整呈現 Linear / Modern 氛圍（深邃暗黑基底、環境流動光斑、極細光感邊框、滑鼠聚焦微光效果）。
- [ ] 標題與內文呈現任天堂 Switch 遊戲對話框特有的圓潤現代遊戲字型質感（Zen Maru Gothic + Plus Jakarta Sans）。
- [ ] 全站 5 大功能（新增題目、即時防重複偵測、題庫關鍵字搜尋、隨機抽題自測、Google Docs 試卷匯出）100% 保持正常運作。
- [ ] 響應式佈局在手機（單欄漢堡選單/垂直卡片）、平板與電腦螢幕均能流暢操作。
- [ ] `npm run build` 通過編譯與型別檢查，無任何報錯。

## 2026-09-19T18:40:56Z

全面針對電腦桌面與行動裝置（包含 iOS Safari 與 Android Chrome）進行排版結構、觸控熱區、字級閱讀性與安全邊界的全面響應式調校，打造極致舒適、無障礙的跨裝置做題與題庫管理體驗。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. iOS Safari & Android 觸控人體工學與安全區域 (Touch Ergonomics & Safe Areas)
- **防止 iOS Safari 自動放大**：全站所有輸入框（題幹、選項、解析、搜尋關鍵字、彈窗設定）在手機螢幕尺寸下嚴格配置 `text-base sm:text-sm`（大於等於 16px），徹底消除 iPhone 上點擊輸入框時畫面被強制縮放的困擾。
- **44px~48px 觸控熱區**：所有選項點擊列、按鈕、題型切換膠囊、展開收合圖示、導航漢堡選單均符合 Apple HIG（44x44px）與 Android Material（48x48px）規範。
- **iOS 底部安全區域適配**：全站使用 `min-h-[100dvh]` 動態視高，主版面與彈窗加入 `pb-[env(safe-area-inset-bottom)]`，防止 iPhone 底部 Home Indicator 橫條遮擋按鈕。

### R2. 關鍵動作全寬好按與手機按鈕優化 (Thumb-Friendly CTAs)
- **做題與刷題頁面 (`/practice`)**：「確認送出答案」、「下一題」、「結束測驗」按鈕在手機端自動擴展為 `w-full sm:w-auto` 全寬大按鈕，方便單手大拇指快速點擊。
- **新增題目頁面 (`/add`)**：「儲存題目」在手機端滿版延伸，四個選項字母按鈕與輸入列擁有充足行距，點擊指定正解毫不費力。

### R3. 手機端底部抽屜彈窗 (Mobile Bottom Sheet Modals)
- **線上編輯彈窗 (`/questions`)** 與 **Google 文件匯出彈窗 (`ExportModal.tsx`)** 在手機尺寸（`<640px`）自動轉換為優雅的底部抽屜（Bottom Sheet），最大高度 `max-h-[90dvh]`，頂部帶有拖曳提示飾條，內部滾動平順，儲存與下載按鈕固定於底部，寬螢幕維持置中懸浮毛玻璃卡片。

### R4. 題庫清單智慧折疊手風琴卡片 (Smart Accordion Cards)
- **題庫查詢與管理 (`/questions`)**：手機端卡片預設以精簡標籤展示題幹與題型，點擊卡片即可平滑展開 A/B/C/D 選項與解析；保留頂部一鍵「展開/隱藏所有解答」功能；關鍵字搜尋與篩選按鈕在手機端整齊排列、不擠壓破版。

## Acceptance Criteria

### Ergonomics & Mobile Quality Guardrails
- [ ] 在 iPhone (iOS Safari) 與 Android (Chrome) 上點擊任何 input 或 textarea，螢幕均維持 100% 比例，不發生任何自動放大（Zero Auto-Zoom）。
- [ ] 螢幕寬度 360px、375px、390px、414px、430px 及平板、桌機寬度均無任何橫向水平捲軸產生。
- [ ] 觸控目標尺寸均達到 44px 以上，防誤觸且易於點擊。
- [ ] 編輯與匯出彈窗在手機上皆以底部抽屜流暢展開，內部滾動自如。
- [ ] `npm run build` 通過型別與建置檢查，編譯零錯誤。

## 2026-09-23T13:21:16Z

全站題目詳解（Explanation）呈現全面升級為「方案 C 旗艦全功能版」：在 100% 保持題庫資料庫原始文字記錄不變的前提下，打造高對比深邃微光閱讀容器、自適應選項剖析卡片、輕量 Markdown 重點渲染、A-/A+ 專屬字級縮放記憶與一鍵複製功能，徹底解決文字擁擠導致頭痛的閱讀痛點。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 單一真理來源元件：`src/components/ExplanationCard.tsx`
- 封裝高擴充、現代深色質感的 `ExplanationCard` 元件，套用於全站所有呈現解析之場景：
  1. 題庫管理列表 (`src/app/questions/page.tsx`)
  2. 刷題自測即時作答反饋 (`src/app/practice/page.tsx`)
  3. 多人對戰作答揭曉與結算 (`src/components/battle/BattlePlayView.tsx`)
  4. 錯題排行榜與深入回顧 (`src/components/practice/WrongQuestionsRanking.tsx`)
- **資料庫零改動與內容忠實性**：絕對不更改資料庫既有欄位與字串內容，元件完全基於原有 `q.explanation` 進行動態自適應排版。

### R2. 方案 C 視覺與智慧自適應排版邏輯
- **高對比深色呼吸感卡片**：採用高對比深藍暗黑微光卡片（`bg-[#0c101d]`、微光漸層邊框 `border-indigo-500/20`），文字採用高對比柔白與純白，行高設定為 1.85，告別 12px 緊密灰黑壓迫感。
- **智慧自適應雙模式**：
  - 當解析文字中偵測到選項標籤（如 `A.`、`B.`、`C.`、`D.` 或 `(A)`、`A選項` 等）時，自動將各選項剖析提取為獨立的微光卡片；正解標記為翡翠綠微光（`✓ 正解選項`），錯項標記為玫瑰紅/深灰（`✗ 錯誤剖析`）。
  - 當解析為一整段連續文字或概念說明時，保留原汁原味語意，以「黃金行距 + 舒適字級 + 自動段落留白 + 💡 核心考點」自然舒適排版。
- **輕量 Markdown 與重點語法支援**：
  - 自動將 `**重點文字**` 渲染為加粗高光文字。
  - 自動將 `代碼/術語` 渲染為等寬微徽章。
  - 其餘文字內容 100% 忠實呈現，不丟失任何字元。

### R3. 個人化閱讀控制器 (Personalized Reader Controls)
- 右上角提供 **A- / A / A+** 即時字級縮放控制器：
  - 小字級（13.5px / 行高 1.7）
  - 中字級（預設 15.5px / 行高 1.85）
  - 大字級（17.5px / 行高 2.0）
- **獨立作用域與持久化**：
  - 字級縮放僅作用於解析卡片內部，絕不影響網站導航列、題幹、選項等其他元素。
  - 使用者調整字級後，自動記錄於瀏覽器 `localStorage`（鍵名：`quizmaster_explanation_font_size`），全站所有題目與頁面自動同步套用該偏好。
- **實用工具整合**：
  - 提供「完整剖析」與「重點精簡」視角切換。
  - 提供「📋 複製解析」按鈕，一鍵將原始解析文字複製至剪貼簿並帶有輕量成功反饋。

## Acceptance Criteria

### Readability, Functionality & Compatibility
- [ ] 原有題庫的所有既有題目點開解析，均自動套用新版方案 C 呈現，文字不再擠在一起。
- [ ] 解析內容 100% 忠實於資料庫原始文字，一字不差且支援 `**粗體**` 與 `代碼` 高亮。
- [ ] 含有 A/B/C/D 的解析自動切換為結構化獨立選項卡；一般概念解析則呈現舒適段落與考點膠囊。
- [ ] A- / A / A+ 字級縮放即時生效且僅限於解析內部，並在 localStorage 記憶設定。
- [ ] 題庫列表、刷題自測、多人對戰與錯題排行四大場景全部同步適配。
- [ ] 撰寫單元/端到端測試驗證解析渲染與格式提取無誤，執行 `npm test` 自動化測試與 `npm run build` 全站 21 條路由零錯誤通過。

## 2026-09-24T04:34:37Z

為多人對戰模式新增結算答題詳解覆盤功能（支援完成作答等待區與最終榮耀頒獎台雙入口、個人對錯標記、篩選器與旗艦級 ExplanationCard 深入解析），並徹底根除街機抽題動畫因輪詢時序差導致重複播放兩次的系統問題。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 多人對戰作答歷程追蹤與個人化雙入口詳解覆盤 (Battle Review & Dual Entrypoints)
- **答題歷程保存**：在對戰作答過程中，精確記錄當前玩家每道題目的作答選項（`userAnswers: string[]`）與即時對錯狀態，確保作答完畢後歷程不遺失。
- **雙入口覆盤介面**：
  1. **等待結算區入口**：當玩家率先作答完畢，在等待其他參賽者交卷的畫面中，即可展開「📝 本局考題覆盤與解析」模組，善用等待時間閱讀解析。
  2. **最終頒獎台入口**：在最終頒獎台（`BattlePodiumView`）戰績總表下方，提供清晰的考題覆盤面板，讓所有玩家在賽後隨時回顧。
- **智慧狀態篩選**：覆盤面板上方提供「全部題目」、「❌ 僅看錯題」與「✓ 僅看答對」的即時快速篩選標籤，並標示總題數與錯題數徽章。
- **旗艦解析卡片整合**：全數接入專案統一的 `ExplanationCard` 元件，展示深藍微光卡片、正解翡翠綠/錯題玫瑰紅高光標記、個人作答與正確答案對比、A- / A / A+ 獨立字級縮放與視角切換功能。

### R2. 徹底根治抽題街機動畫重複播放兩次問題 (Root Cause Fix & Idempotency Barrier)
- **精準對齊伺服器端狀態轉場時長**：分析發現前端抽題滾輪與倒數動畫全長約 5.1 秒，而伺服器端 `getRoom()` 原硬編碼 7.5 秒才轉為 `PLAYING`。修正伺服器端自動轉場閾值（縮短至 5.0 秒），杜絕客戶端先轉入 `PLAYING` 後被 6.3 秒輪詢暫態拉回 `DRAWING` 的根本原因。
- **客戶端單向防重放屏障 (Replay Barrier)**：在 `battle/[code]/page.tsx` 客戶端狀態機中，以目前場次識別（如 `drawingStartTime`）記錄已完成的抽題動畫。即使在極端網路延遲下接收到伺服器暫態 `DRAWING`，亦絕不重複掛載與觸發 `QuestionDrawAnimation`。
- **平滑轉場體驗**：抽題動畫「3、2、1、GO!」倒數完成後，全員流暢無縫進入第一題作答，杜絕畫面閃爍或卡頓。

## Acceptance Criteria

### Battle Review & Explanation Functionality
- [ ] 玩家答完所有題目後，在等待畫面即可立即展開查看所有作答題目的對錯與解析。
- [ ] 最終頒獎台結算頁面具備題目覆盤面板，完整呈現每題玩家選擇答案與標準答案。
- [ ] 篩選標籤（全部 / 僅看錯題 / 僅看答對）能精準過濾題目列表。
- [ ] 題目詳解統一使用 `ExplanationCard`，支援自適應選項拆解與局部字級縮放。

### Animation Timing & Defect Fix
- [ ] 房主點擊「開始對戰」後，抽題街機動畫嚴格只播放 1 次，100% 絕不重複播放第二次。
- [ ] 動畫結束後即刻平順切換至第一題作答頁面，輪詢資料不造成頁面倒退或重新載入動畫。

### Quality & Regression Guard
- [ ] 現有自動化測試（`npm test`）100% 通過，並增補對戰作答歷程與抽題轉場防重放的測試案例。
- [ ] `npm run build` 通過編譯打包，TypeScript 型別零報錯。

