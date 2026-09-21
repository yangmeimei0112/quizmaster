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
