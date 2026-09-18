# 全站視覺風格與 UI 組件深度調查報告 (UI Survey & Transformation Map)

> **調查代理人**：`teamwork_preview_explorer_survey_2`  
> **調查目標**：全面檢視 QuizMaster 既有 UI 組件、排版樣式與頁面架構，建立完整的 Linear / Modern 暗黑深邃設計系統與任天堂 Switch 遊戲風格字體之換裝藍圖。  
> **基準工作目錄**：`c:/Users/yaco9/Documents/antigravity/lively-galileo`  

---

## 一、 調查總覽 (Executive Summary)

QuizMaster 是一套專注於個人題庫收錄、智慧相似度比對防重複、關鍵字查詢與個人自測刷題的 Next.js 14 (App Router) 應用程式。

目前整站採用預設的 **淺色 Slate 風格**（`bg-slate-50`, `border-slate-200`, `bg-white` 白底卡片、Indigo-600 純色按鈕），整體呈現早期原型階段的普通後台外觀，缺乏品牌氛圍感、深度視覺層次與現代桌面端微動態手感。

本報告針對全站 7 大核心檔案完成詳細程式碼掃描，精確標註目前 classname、DOM 結構、狀態切換邏輯與改造對策：
1. `src/app/layout.tsx` (全域外框、背景與 Footer)
2. `src/components/Navbar.tsx` (頂部導航列與行動選單)
3. `src/app/page.tsx` (首頁儀表板、Hero 與 Bento Grid 統計卡片)
4. `src/app/add/page.tsx` (單題錄入、膠囊題型切換、選項列表、即時防重複微光警示卡、防呆彈窗)
5. `src/app/questions/page.tsx` (題庫卡片列表、搜尋篩選、手風琴詳解展開、在線編輯深色彈窗)
6. `src/app/practice/page.tsx` (隨機抽題自測、任天堂遊戲風格答題卡、霓虹高光反饋、結算頒獎卡片)
7. `src/components/ExportModal.tsx` (Google 文件匯出深色毛玻璃彈窗、.docx 下載、富文本剪貼簿複製)

---

## 二、 全域架構與導航外框調查 (Layout, Navbar & Footer)

### 1. `src/app/layout.tsx`
- **現況分析**：
  - 第 2 行導入 `Inter` 但未套用於 `<body>`。
  - 第 18 行：`body` 寫死為 `className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col font-sans"`。
  - 第 20 行：`<main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">`。
  - 第 23-25 行：直接內嵌簡易頁尾 `<footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">`。
  - 完全缺乏深邃暗黑基底、環境流動光斑 (Ambient Animated Blobs) 與頂部徑向漸層。
- **改造方案 (Linear / Modern + Switch 規格)**：
  - **字體配置**：載入 Google Fonts `Plus Jakarta Sans` 與 `Zen Maru Gothic`，透過 CSS 變數 `--font-plus-jakarta` 與 `--font-zen-maru` 注入全站，設定英數幾何飽滿、漢字柔和丸角。
  - **四層式大氣背景**：
    1. 底層：`bg-[#050506]` (Deep Space 暗黑底色)。
    2. 頂部光暈：`radial-gradient(ellipse 80% 50% at 50% -20%, rgba(94,106,210,0.18), transparent 70%)`。
    3. 幾何微暗網格：`radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)`，尺寸 `24px 24px`。
    4. 環境光斑 (Animated Blobs)：於背景固定置入 2~3 個低透明度、多層次模糊的高斯光球 (`bg-[#5E6AD2]/10 blur-3xl`, `bg-purple-600/10 blur-3xl`)，賦予微弱緩慢漂浮動畫。
  - **頁尾改造**：改為獨立深色毛玻璃頁尾，具備 `border-t border-white/[0.06] bg-[#050506]/80 text-[#8A8F98]`，加入微光 Switch 風格小徽章。

### 2. `src/components/Navbar.tsx`
- **現況分析**：
  - 第 18 行：`<header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">`。
  - 第 21-29 行：Logo 區塊採用常規 `bg-indigo-600`，搭配淺藍標籤 `bg-indigo-50 text-indigo-700`。
  - 第 33-52 行：桌機導覽列，活躍狀態為純色 `bg-indigo-600 text-white`，非活躍為 `text-slate-600 hover:bg-slate-100`。
  - **缺陷**：無手機漢堡選單 (Mobile Drawer / Hamburger)，在小螢幕上導覽項目會擠壓破版。
- **改造方案**：
  - **深色毛玻璃容器**：`sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#050506]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)]`。
  - **任天堂 Switch 風格 Brand 徽章**：
    - 圖標容器：高質感微圓角光盒 `bg-gradient-to-br from-[#5E6AD2] to-[#434db0] shadow-[0_0_20px_rgba(94,106,210,0.4)]`。
    - 品牌副標：Switch 遊戲對話框風格膠囊徽章 `border border-[#5E6AD2]/30 bg-[#5E6AD2]/10 text-indigo-300 font-bold px-2 py-0.5 rounded-full text-[11px]`。
  - **柔光導航標籤**：
    - 活躍項目：`bg-white/[0.08] text-[#EDEDEF] border border-white/[0.12] shadow-[0_0_15px_rgba(94,106,210,0.25)]`。
    - 未活躍項目：`text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04]`。
    - 微動態：全域支援 `transition-all duration-200 cubic-bezier(0.16,1,0.3,1)`。
  - **響應式行動漢堡選單**：
    - 新增行動端漢堡按鈕 (`Menu` / `X` 圖標切換)。
    - 展開時呈現深色微光玻璃下拉抽屜 (Mobile Dropdown/Drawer)，流暢支援手機直立操作。

---

## 三、 首頁儀表板調查 (`src/app/page.tsx`)

- **現況分析**：
  - 第 33-81 行：Hero Header 採用標準淺紫漸層 `bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700`，按鈕為普通實心白底 `bg-white text-indigo-700`。
  - 第 84-114 行：統計卡片為 3 個完全等寬的白底卡片 (`grid grid-cols-1 sm:grid-cols-3 gap-4`, `bg-white p-5 rounded-2xl border-slate-200/80`)。
  - 第 117-147 行：3 個特色白底方塊 (`bg-white p-6 rounded-2xl border-slate-200/80`)。
  - 第 150-209 行：最近題目列表，為白底邊框與淺灰分隔線。
- **改造方案 (Linear Hero + Asymmetric Bento Grid)**：
  - **Linear 風格 Hero**：
    - 標題導入漸層金屬微光文字：`bg-gradient-to-b from-white via-[#EDEDEF] to-[#8A8F98] bg-clip-text text-transparent`。
    - 頂部發光 Pill 標籤：任天堂 Switch 經典提示小標 `border border-white/[0.1] bg-white/[0.04] text-indigo-300` 內嵌脈衝微光小圓點。
    - 操作按鈕群：
      - 主要入口 (開始錄入)：`bg-[#5E6AD2] hover:bg-[#6872D9] text-white shadow-[0_0_25px_rgba(94,106,210,0.4)]`。
      - 次要入口 (搜尋、匯出、刷題)：深色毛玻璃按鈕 `bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#EDEDEF]`。
  - **非對稱 Bento Grid 數據儀表板**：
    - 將死板的 3 等分卡片重構為現代非對稱 Bento Grid：
      - **主 Bento 卡片 (大跨幅 2 欄)**：總題數統計、視覺化進度計量條、隨機抽題與題庫健康度。
      - **次 Bento 卡片 (單選/複選佔比)**：直觀展示單選 vs 複選佔比，搭配霓虹微光標籤 (`#38bdf8` 藍霓虹 vs `#c084fc` 紫霓虹)。
      - **功能 Bento 卡片**：即時防重複演算法狀態、4 選項標準架構、Google Docs 試卷一鍵輸出。
    - 卡片外觀標準：`bg-[#0a0a0c]/80 backdrop-blur-md border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`。
  - **最近題目區塊**：
    - 深邃玻璃盒 `bg-[#0a0a0c]/90 border border-white/[0.06]`，題目列 hover 時呈現 `hover:bg-white/[0.03]` 柔和漸層。

---

## 四、 單題手動錄入調查 (`src/app/add/page.tsx`)

- **現況分析**：
  - 第 221-246 行：題型切換器為淺灰內凹槽 `bg-slate-200/80 p-1 rounded-xl`，按鈕為白底。
  - 第 274 行：主表單為白底方盒 `bg-white rounded-2xl border-slate-200/90`。
  - 第 295-301 行：題幹輸入框為淺灰邊框 `border-slate-300 focus:ring-indigo-500`。
  - 第 304-374 行：防重複比對警示：
    - 100% 完全重複：`bg-rose-50 border-rose-300 text-rose-900`。
    - >= 70% 高度相似：`bg-amber-50 border-amber-300 text-amber-900`。
  - 第 390-437 行：四個選項輸入框與正確答案切換按鈕：
    - 選中時為 `border-emerald-500 bg-emerald-50/40`。
    - 未選中為 `border-slate-200 bg-slate-50/50`。
  - 第 441-461 行：解析選填欄位，為淺灰折疊底色。
  - 第 495-535 行：高度相似防呆確認彈窗 `showConfirmModal`，為白底對話盒。
- **改造方案**：
  - **發光膠囊題型切換 (Switch Capsule Switcher)**：
    - 容器：深色微凹槽 `bg-[#020203] border border-white/[0.08] p-1.5 rounded-2xl shadow-inner`。
    - 單選切換鈕 (選中)：`bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/40 shadow-[0_0_15px_rgba(56,189,248,0.3)]`。
    - 複選切換鈕 (選中)：`bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]`。
  - **深邃表單輸入組件**：
    - 題幹與選項文字框：`bg-[#050506] border border-white/[0.08] focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/30 text-[#EDEDEF] placeholder:text-[#8A8F98]/40 rounded-xl transition-all duration-200`。
  - **立體微光防重複警示卡片 (核心亮點)**：
    - 100% 完全相同攔截卡：`bg-rose-950/30 border border-rose-500/40 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.15)] rounded-2xl p-5`，內部比對項目使用 `bg-white/[0.03] border border-white/[0.08]`。
    - >=70% 相似警示卡：`bg-amber-950/30 border border-amber-500/40 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.15)] rounded-2xl p-5`。
  - **4 選項互動列**：
    - 選中狀態：翠綠霓虹發光 `border-emerald-500/50 bg-emerald-500/[0.08] ring-1 ring-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.15)] text-[#EDEDEF]`。
    - 未選中狀態：`border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]`。
    - A/B/C/D 正確答案指示鈕：微圓角手把按鈕質感，選中時亮起翠綠色並具備立體內光。
  - **確認彈窗 (Confirm Modal)**：
    - 升級為深邃暗黑毛玻璃懸浮彈窗 `bg-[#0a0a0c]/95 border border-white/[0.1] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)]`。

---

## 五、 題庫查詢與管理調查 (`src/app/questions/page.tsx`)

- **現況分析**：
  - 第 176-206 行：頂部動作列包含「隱藏所有解答」、「匯出 Google 文件」、「新增題目」按鈕。
  - 第 210-255 行：搜尋與題型過濾卡片，為白底邊框容器。
  - 第 289-423 行：題目列表卡片：
    - 卡片容器：`bg-white rounded-2xl border-slate-200/90 shadow-sm p-5 sm:p-6 hover:border-slate-300`。
    - 選項顯示：2 欄網格，正確選項標記為淺綠 `bg-emerald-50/50`。
    - 解析手風琴展開：點擊「查看詳細解析」展開折疊方塊 `p-3.5 rounded-xl bg-slate-50 border border-slate-200`。
  - 第 427-561 行：線上即時編輯 Modal (`editingQuestion`)，目前為白底捲軸彈窗。
  - 第 564-569 行：引用 `<ExportModal>`。
- **改造方案**：
  - **深色卡片清單**：
    - 題目卡片升級為 `bg-[#0a0a0c]/80 backdrop-blur-md border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.25)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`。
    - 標題字體：Zen Maru Gothic 丸黑體，字級飽滿且具親和力，正文字色 `#EDEDEF`。
  - **平滑手風琴動態 (Smooth Accordion)**：
    - 題目解析展開時使用 `transition-all duration-250 ease-out` 配合微光外框與微暗底色 `bg-white/[0.03] border border-white/[0.06] rounded-xl p-4`。
  - **在線編輯深色彈窗 (Dark Glassmorphic Edit Modal)**：
    - 遮罩：`bg-black/75 backdrop-blur-md`。
    - 彈窗主體：`bg-[#0a0a0c]/95 border border-white/[0.1] rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.8)]`。
    - 表單欄位一律換裝為深色高對比度輸入框。

---

## 六、 個人自測刷題體驗調查 (`src/app/practice/page.tsx`)

- **現況分析**：
  - 具備 3 個完整階段狀態：
    1. 尚未開始階段 (`!quizStarted`)：選擇範圍卡片、題目統計、開始按鈕。
    2. 測驗進行中 (`quizStarted && !quizCompleted`)：題目卡片、4 個選項按鈕、送出答案、答案揭曉 (答對/答錯反饋)、解析與下一題。
    3. 結算畫面 (`quizCompleted`)：獎章圖標、總得分數、答對率、重新測驗按鈕。
  - 目前全部使用 `bg-white` 白底卡片、`bg-indigo-600` 按鈕與淺綠/淺紅文字提示，完全缺乏遊戲化 (Gamification) 與任天堂遊戲反饋的沉浸感。
- **改造方案 (Nintendo Switch 遊戲對戰刷題風格)**：
  - **互動答題卡 (Interactive Switch Quiz Card)**：
    - 頂部計分列：Switch 遊戲狀態列風格，目前題號膠囊 `bg-white/[0.06] text-indigo-300 border border-white/[0.1]`，答對題數綠色微光計數器。
    - 題幹標題：大字體 Zen Maru Gothic，閱讀無壓力。
  - **霓虹高光選項按鈕 (Neon Option Cards)**：
    - 未選中：`bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.06] text-[#EDEDEF]`。
    - 使用者選中未送出：線性主強調色霓虹高光 `border-[#5E6AD2] bg-[#5E6AD2]/15 shadow-[0_0_20px_rgba(94,106,210,0.3)] ring-1 ring-[#5E6AD2] text-white`。
    - 答案揭曉 - 答對：翠綠微光揭曉 `border-emerald-500/60 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40 text-emerald-200`，標註 `✓ 標準答案` 霓虹徽章。
    - 答案揭曉 - 答錯：玫瑰紅柔光揭曉 `border-rose-500/60 bg-rose-500/15 shadow-[0_0_24px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/40 text-rose-200`，標註 `✗ 您的回答`。
  - **對錯立體揭曉橫幅**：
    - 答對：深綠微光橫幅 `bg-emerald-950/40 border border-emerald-500/30 text-emerald-200`，歡慶答對。
    - 答錯：深紅微光橫幅 `bg-rose-950/40 border border-rose-500/30 text-rose-200`，清晰展示正確解答。
  - **結算頒獎卡片 (Victory Summary)**：
    - 頒獎金杯徽章：金色霓虹高光光環 `bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.3)]`。
    - 分數視覺化：巨幅 Plus Jakarta Sans 特大粗體數字，搭配漸層文字 `bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent`。

---

## 七、 Google 文件匯出彈窗調查 (`src/components/ExportModal.tsx`)

- **現況分析**：
  - 核心功能完整：
    1. 產生 Google 文件專用 Rich Text HTML。
    2. 下載 `.docx` 檔案 (`/api/export/docx`)。
    3. 一鍵複製 HTML + PlainText 至剪貼簿。
    4. 一鍵開啟新空白 Google 文件 (`https://docs.google.com/document/create`)。
    5. 解析開關模式切換（含答案詳細解析 vs 不含解析/僅答案 vs 純題目）。
  - 目前外觀為白底對話盒 `bg-white max-w-xl` 與藍色實心按鈕。
- **改造方案**：
  - 升級為精緻暗黑毛玻璃懸浮彈窗 `bg-[#0a0a0c]/95 border border-white/[0.1] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]`。
  - 模式選擇卡片改為深色發光卡，選中時帶有 `#5E6AD2` 藍紫微光邊框與內陰影。
  - 複製成功提示升級為翠綠霓虹卡片 `bg-emerald-950/40 border border-emerald-500/30 text-emerald-200`。
  - 100% 保持既有匯出邏輯、DOCX 下載與剪貼簿功能，不改動任何資料產生函式。

---

## 八、 全站 Design Tokens 與 Tailwind 映射表

| Token 名稱 | 數值 / CSS 規格 | Tailwind 擴充命名 | 套用範例 |
|---|---|---|---|
| Deep Space 底色 | `#020203` | `bg-background-deep` / `bg-[#020203]` | 凹槽、深層背景 |
| 暗黑基底 | `#050506` | `bg-background-base` / `bg-[#050506]` | `body`、頁面全域背景 |
| 抬升深色表面 | `#0a0a0c` | `bg-background-elevated` / `bg-[#0a0a0c]` | Bento 卡片、彈窗、選單 |
| 玻璃擬態表面 | `rgba(255, 255, 255, 0.04)` | `bg-surface` / `bg-white/[0.04]` | 選項卡片、按鈕底色 |
| 表面 Hover | `rgba(255, 255, 255, 0.08)` | `bg-surface-hover` / `bg-white/[0.08]` | 滑鼠懸停反饋 |
| 主文字 (前景色) | `#EDEDEF` | `text-foreground` / `text-[#EDEDEF]` | 標題、題幹、高對比文字 (15:1+) |
| 次要說明文字 | `#8A8F98` | `text-foreground-muted` / `text-[#8A8F98]` | 副標題、輔助文字 (6:1+) |
| 微弱提示文字 | `rgba(255, 255, 255, 0.60)` | `text-foreground-subtle` / `text-white/60` | 佔位符、元資訊 |
| 主強調色 | `#5E6AD2` | `bg-accent` / `bg-[#5E6AD2]` | 主要按鈕、活躍指示條 |
| 強調亮色 | `#6872D9` | `bg-accent-bright` / `hover:bg-[#6872D9]` | 主要按鈕懸停 |
| 強調光暈 | `rgba(94, 106, 210, 0.30)` | `shadow-accent-glow` | 按鈕與標籤外發光 |
| 極細微光邊框 | `rgba(255, 255, 255, 0.06)` | `border-white/[0.06]` | 卡片標準邊界 |
| 頂部 1px 內光高光 | `inset 0 1px 0 0 rgba(255,255,255,0.08)` | `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]` | 桌面軟體級頂部反光 |

---

## 九、 改造執行依賴與風險注意事項 (Caveats & Engineering Notes)

1. **字體載入注意事項**：
   - `Plus Jakarta Sans` 可透過 `next/font/google` 無縫載入。
   - `Zen Maru Gothic` 支援日系丸文字與漢字。在 Next.js `next/font/google` 中，若僅指定 `subsets: ['latin']`，部分中文可能需搭配系統丸體/黑體 fallback（或於 `globals.css` 中載入 Google Fonts 完整語系 `@import` / `<link>`），需確保繁體中文如「題幹」、「詳解」、「隨機抽題」皆能呈現滑順微圓角質感。
2. **微動態規格一致性**：
   - 移除所有延遲感與過度回彈，全面採用 `transition-all duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]`。
3. **功能保全承諾**：
   - 題目新增、即時防重複（350ms debounce API）、題庫搜尋篩選、隨機抽題測驗評分、DOCX / 富文本 Google Docs 匯出 5 大功能，在 UI 重塑過程中完全保留所有 state 與 props，僅更換外層 layout、class 與視覺包裝。
