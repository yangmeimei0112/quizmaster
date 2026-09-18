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
