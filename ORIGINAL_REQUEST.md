# Original User Request

## 2026-09-25T18:10:43Z

為題庫「快速新增」功能建置相似題目的人工查證回報機制。當系統比對出高度相似考題時，於題目卡片中提供「是，本題為重複題目」與「否，本題未與題庫重複」即時切換按鈕，供使用者查證並回報系統，讓未重複的題目順利登錄入庫；而 100% 完全相同之題目則無按鈕，嚴格維持系統鎖定排除。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 相似題即時查證回報按鈕與狀態切換 (Similar Question Verification UI & State)
- **卡片內嵌即時對比**：在 `QuickAddModal.tsx` 題目預覽卡片中，當比對出高度相似考題（相似度 70%~99%，且非 100% 完全相同）時，展示即將新增題幹與題庫/批次已存在相似題幹的左右對照區與相似度百分比。
- **「是/否」查證按鈕組**：
  1. `[ ⚠️ 是，本題為重複題目 ]`：點擊後標記此題為「確認重複」（按鈕呈現深紅高光選中），並在批次新增時自動排除該題，不寫入題庫。
  2. `[ ✓ 否，本題未與題庫重複 ]`：點擊後標記此題為「確認未重複」（按鈕呈現翡翠綠高光選中），解除相似重複警示，允許該題順利登錄題庫。
- **100% 完全相同題目嚴格鎖定**：若題目比對結果為 100% 完全相同（`isExactMatch: true`），依規格「若是題目100%相同則不用」，**絕不提供是/否查證按鈕**，系統強制維持深紅鎖定排除，徹底防止重複題目污染題庫。
- **動態重置與即時響應**：當使用者直接在編輯框中修改題幹內容時，自動重新觸發防重複檢驗，並依最新相似度動態重設或更新查證狀態。

### R2. 批次送出防呆阻擋與未重複題目順利入庫 (Batch Submission Guard & Ingestion)
- **未查證防呆攔截**：若批次解析題目中存在尚未點擊「是」或「否」的相似題目，當使用者點擊「批次新增至題庫」時，系統應即時阻擋並提示錯誤訊息（例如：`「第 X 題為相似題目，請查證選擇是重複或未重複後再送出」`），同時自動跳轉切換至該題目膠囊，確保每一題都經過嚴謹覆核。
- **精準批次入庫過濾**：
  - 批次新增的寫入清單（`itemsToSave`）應動態包含：
    1. 正常無重複、無相似的題目。
    2. 經使用者明確查證標記為「否，本題未與題庫重複」的相似題目。
  - 批次新增應嚴格自動排除：
    1. 100% 完全相同的題目。
    2. 經使用者查證標記為「是，本題為重複題目」的題目。
- **單題直接新增相容**：在單題快速新增模式下，若被判定為相似題，點選「否，未重複」後立即解鎖「直接新增」按鈕，允許順利入庫；若點選「是，重複題目」，則維持鎖定。

## Acceptance Criteria

### Verification Buttons & State Behavior
- [ ] 相似題（70%~99%）卡片內完整呈現「是，本題為重複題目」與「否，本題未與題庫重複」按鈕與題幹對比。
- [ ] 點擊「是」按鈕後，按鈕呈現紅色選中高光，該題標記為重複並在批次清單中排除。
- [ ] 點擊「否」按鈕後，按鈕呈現綠色選中高光，該題標記為放行，解除警示並可順利入庫。
- [ ] 100% 完全相同題目（`isExactMatch`）嚴格不顯示查證按鈕，強制排除不入庫。

### Submission Guard & Data Ingestion
- [ ] 若存在未查證的相似題，點擊「批次新增」時會中斷並提示引導使用者查證，自動切換至該題。
- [ ] 批次入庫時，被標記為「否，未重複」的題目能 100% 成功寫入資料庫題庫中。
- [ ] 批次入庫時，100% 相同題與標記為「是，重複」的題目 100% 被自動略過排除。

### Quality & Regression Guard
- [ ] 自動化測試套件（`npm test`）100% 通過，並增補相似題查證按鈕、防呆阻擋與入庫篩選之測試案例。
- [ ] `npm run build` 通過編譯打包，TypeScript 型別零報錯。

## 2026-09-26T08:15:11Z

錯題統計功能全面升級：在錯題排行榜各題目卡片中呈現「答對率統計」以及完整顯示選項文字且「%數於右側固定標示」的選項被選比例（正確答案綠底、錯誤答案紅底、最高%數選項之數字加粗），並將「查看更多錯題」由彈出視窗改造為於第 10 題下方原地向下平滑展開（附帶即時搜尋與底部收合按鈕）。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 原地向下展開（取代跳窗彈窗）
- **第 10 題下方平滑展開**：點擊「查看排行榜以外的更多錯題」時，直接於排行榜第 10 題下方平滑展開後續錯題列表（第 11 題至最後一題），絕不跳出彈窗。
- **整合即時搜尋與題型過濾**：展開區域頂部提供即時關鍵字搜尋框與題型快速切換標籤（全部 / 單選 / 複選），方便在長列表中快速定位題目。
- **底部收合控制**：展開列表最底部提供「收合回前 10 題」按鈕，點擊後平順收合並平滑滾動回第 10 題錨點。
- **徹底移除舊版彈窗**：刪除舊版「看更多錯題」之 Modal 彈窗程式碼與相關狀態，維持畫面簡潔流暢。

### R2. 答對率統計與各選項選擇百分比（依使用者指定之顏色與粗體規範）
- **版面視覺與色彩規範（嚴格落實使用者指示）**：
  - 各題目卡片頂部標示：`作答總數 N 次 · 答對率 XX.X%`（或依個人/全站切換顯示）。
  - 四個選項（A/B/C/D）**完整保留題目選項之所有文字內容**，不可截斷或省略。
  - **右側 % 數標籤色彩與粗體規格**：
    1. **正確答案**：右側 % 數徽章使用**綠色底**（如翡翠綠微光或綠色底色標籤），並標註「✓ 正解」。
    2. **錯誤答案**：右側 % 數徽章使用**紅色底**（如深紅微光或玫瑰紅底色標籤）。
    3. **最高 % 數選項**：在所有選項中被選比例最高（最多人選）的選項，**其 % 數數字必須使用粗體（font-bold / font-black）**加強突顯！
- **雙模式數據覆蓋**：
  - 「個人專屬錯題本」：展示使用者本人的答對率、答題次數，以及個人曾選擇過的選項標記。
  - 「全站高頻排行」：展示全站所有玩家的總作答次數、平均答對率，以及全站各選項被選的百分比分佈。
- **全站作答全流程即時記錄**：
  - 串接即時自測刷題（`practice`）、50 題全真模擬考試（`MockExamView`）、多人對戰（`BattlePlayView`）等所有答題流程。
  - 每次作答（無論答對或答錯），皆即時向後端提交作答選項，動態累加總作答次數、各選項被選次數與答對/答錯次數。

### R3. 資料模型擴充與向後相容
- 更新 Prisma Schema 與資料庫，支援題目作答統計（總作答數、答對數、A/B/C/D 各項選擇計數），並同步更新本地 SQLite 與 Render PostgreSQL 遷移配置。
- 對於尚未有作答紀錄之新題或歷史題目提供優雅容錯展示（如「尚未有作答數據」），確保現有題目與功能零損壞。

## Acceptance Criteria

### UI & Layout Guardrails
- [ ] 題目卡片中的 A/B/C/D 選項完整顯示原始選項文字，每列選項的最右側皆清楚標示該選項被選的百分比 % 與次數。
- [ ] 正確答案之右側 % 數標籤為綠色底，錯誤答案之右側 % 數標籤為紅色底。
- [ ] 被選百分比最高的選項，其 % 數數字嚴格採用粗體（bold）突顯展示。
- [ ] 題目卡片清晰呈現答對率（例如 `答對率: 46.2%`）與總作答次數。
- [ ] 點選「查看更多錯題」時，清單直接於第 10 題下方展開，完全不出現彈出式視窗。
- [ ] 展開區域具備即時搜尋框與題型篩選器，輸入關鍵字可即時過濾展開之錯題。
- [ ] 展開清單底部提供「收合回前 10 題」按鈕，點擊能成功收回。

### Data Sync & Backend
- [ ] 在自測刷題、50 題模擬考、多人對戰進行答題後，答對與答錯皆能正確更新作答統計與選項被選分佈。
- [ ] 個人錯題本與全站高頻排行可正常切換並呈現對應之數據。
- [ ] 既有全部測試套件（`npm test`）100% 通過，且增補新功能的自動化測試。
- [ ] `npm run build` 全站路由編譯打包 Exit code 0。

## 2026-09-26T18:24:21Z

This is a single self-contained fix; keep it small and focused.

清空全站個人錯題本與題庫所有作答統計數值，並將對戰模式的 4 碼房間代碼生成與輸入全面改為 1000~9999 純數字格式（無英文字母）。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 全站錯題記錄與統計數據徹底清空歸零 (Complete Mistake & Stats Reset)
- **清空個人錯題本**：清空資料庫中所有使用者的個人錯題資料（清空 `WrongQuestionRecord` 資料表）。
- **全站題庫統計數據全數歸零**：
  - 更新題庫所有題目，將 `wrongCount = 0`、`totalAttempts = 0`、`correctCount = 0`、`countA = 0`、`countB = 0`、`countC = 0`、`countD = 0`。
- **提供專用重置腳本**：建立 `scripts/reset_mistake_records.js`（支援直接執行重置資料庫，或可在後端維護調用），執行完成後驗證題庫筆數無損且統計已徹底重設。
- **重新開始記錄驗證**：進入自測刷題（`/practice`）、模擬考（`MockExamView`）或多人對戰（`BattlePlayView`）作答後，全新產生的作答數據能從 1 開始重新正確累積。

### R2. 對戰模式 4 碼房間代碼全面純數字化 (1000~9999 Numeric Room Code)
- **後端房間代碼生成重構**：
  - 檔案：`src/lib/battleStore.ts` 中的 `generateRoomCode()`
  - 將原本英數字符（`CODE_CHARS`）全面改為 **4 碼純數字（1000 ~ 9999）**，不以 0 開頭，不包含任何英文字母。
  - 確保代碼在運行中的房間池中具備唯一性。
- **前端輸入框與驗證純數字化**：
  - 檔案：`src/app/battle/page.tsx`、`src/app/battle/[code]/page.tsx` 等。
  - 輸入框加入 `inputMode="numeric"` 與 `pattern="[0-9]*"`，在手機與平板上自動彈出數字鍵盤。
  - 輸入時自動過濾非數字字元（`replace(/\D/g, "").slice(0, 4)`）。
  - 更新 Placeholder 為純數字範例（如「例如：8520」）。
  - 加入房間之 API 請求與驗證全面相容 4 碼純數字格式。

## Acceptance Criteria

### Data Reset Verification
- [ ] 執行重置腳本後，`WrongQuestionRecord` 表筆數為 0。
- [ ] 資料庫中所有 `Question` 記錄之 `wrongCount`、`totalAttempts`、`correctCount`、`countA`、`countB`、`countC`、`countD` 均嚴格為 0。
- [ ] 前端個人錯題本與全站錯題排行榜皆呈現無錯題/尚未有作答數據的初始乾淨狀態。
- [ ] 作答一題錯題後，該題與個人的統計數據能正常從 1 開始重新累加。

### Battle Room Code Verification
- [ ] 呼叫 `generateRoomCode()` 產生的代碼為純數字且介於 1000 至 9999 之間，不包含任何英文字元。
- [ ] 隨機生成 1,000 組房間代碼，100% 符合 `/^[1-9][0-9]{3}$/` 正規表達式。
- [ ] 前端對戰大廳輸入框在輸入英文字母時會自動被過濾，只接受 4 碼數字。
- [ ] 透過 4 碼純數字代碼能順利創建、加入房間並開打對戰。

### Quality & Regression Guard
- [ ] 現有自動化測試套件（`npm test`）100% 通過（同步調整受代碼英文字母格式影響之舊測試案例）。
- [ ] `npm run build` 通過編譯打包，Exit Code 0。
- [ ] 完成後執行 `git add -A; git commit -m "..."; git push origin main`。



## 2026-10-24T16:13:22Z

針對已正式部署於 Vercel 與 Supabase 的線上生產環境網站（https://meiquizmaster.vercel.app/），使用瀏覽器工具與自動化診斷腳本進行全方位實機端對端驗證，檢驗首頁載入、題庫分頁切換、點擊反應速度、自測刷題、多人對戰與文件匯出功能，確保生產環境穩定流暢、零錯誤且延遲顯著降低。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 全站首頁與題庫清單分頁實機驗證 (Homepage & Questions Pagination Verification)
- 透過瀏覽器實機訪問 `https://meiquizmaster.vercel.app/` 首頁與 `/questions` 題庫頁面。
- 驗證題庫 418 道題目完整呈現，且全新設計的分頁控制器（每頁預設 25 題）運作正常。
- 測試點擊「下一頁」、「最後一頁」、「第 2 頁」以及切換「每頁 50 題」之流暢度。
- 測試點擊題目卡片手風琴展開、點擊「顯示解答/隱藏解答」與搜尋框關鍵字即時篩選，確認操作反應時間瞬時無卡頓（< 100ms），無主線程卡死（Jank），且瀏覽器 Console 零錯誤。

### R2. 刷題自測與模擬考流程實機驗證 (Practice Quiz & Mock Exam Workflow)
- 訪問 `https://meiquizmaster.vercel.app/practice` 自測練習大廳。
- 測試「即時刷題」模式：隨機抽題、點擊選取選項、提交答案、查看四段式解析展開。
- 測試「60分鐘模擬考」模式：檢驗考卷生成、計時器倒數、逐題作答、批次交卷與成績統計儀表板。

### R3. 多人對戰房間 Serverless 持久化實機驗證 (Real-time Battle Room Verification)
- 訪問 `https://meiquizmaster.vercel.app/battle` 多人對戰大廳。
- 創建對戰房間，驗證成功生成 4 碼純數字房間代碼（1000~9999）。
- 檢驗房間設定面板（題數、時間限制、題型範圍）更新功能。
- 驗證 Serverless 環境下的輪詢穩定度（`/api/battle/[code]` 回應 HTTP 200，無 404 斷線，記憶體快取與 Supabase 資料庫同步正常）。

### R4. 試卷匯出與題庫附圖可攜性驗證 (Export & Image Verification)
- 測試 `/questions` 頁面「匯出 Google 文件」彈窗，確認可複製 Rich Text 排版並能正常下載 .docx 檔案。
- 檢驗含有題目附圖之卡片在線上環境是否正常加載顯示，確認無破圖或 404 情況。

## Acceptance Criteria

### Performance & Page Rendering Verification
- [ ] 訪問首頁 `https://meiquizmaster.vercel.app/`，頁面秒開載入完成（HTTP 200），儀表板統計數據正確顯示（題庫基準 418 題）。
- [ ] 訪問 `/questions` 題庫頁，分頁導航列清晰渲染（顯示「第 1 至 25 題，共 418 題」），點擊「下一頁」與切換「每頁 50 題」能流暢翻頁並自動平滑滾動回頂部。
- [ ] 點擊「顯示解答/隱藏解答」與卡片手風琴展開，畫面即時響應（操作無感知延遲，Console 零報錯）。

### Feature & Serverless Reliability Verification
- [ ] 訪問 `/practice`，隨機練習抽題與交卷流程正常，解析能正常以四段式結構展開。
- [ ] 訪問 `/battle`，成功建立對戰房間並取得合法 4 碼純數字代碼，房間等待室輪詢順暢。
- [ ] 訪問 `/questions`，Google 文件試卷匯出功能運作正常，附圖題目能清晰渲染圖片。
- [ ] 產出完整的端對端實測報告（包含各項功能的 HTTP 延遲數據、操作響應時間與檢驗結果清單）。


## 2026-10-24T17:55:51Z

為多人對戰模式新增四款專屬精美動物角色（金門水獺、台灣山羌、山羊、綿羊），並重構對戰生命週期機制：房主於等待大廳退出時自動解散房間並通知其他玩家，且實施單一設備防多開限制（同一裝置再次進入時自動移除上一位舊選手，以最新進房者為準，若舊選手為房主則依序順延給既有選手）。

Working directory: c:/Users/yaco9/Documents/antigravity/lively-galileo
Integrity mode: development

## Requirements

### R1. 四款全新台灣/金門在地特色動物頭像向量設計與選角整合 (New Animal Avatars)
- 在 `src/lib/avatars.ts` 新增四款專屬動物頭像常數（總數由 12 款擴充為 16 款）：
  1. 金門水獺 (`otter` / `kinmen_otter`，如「水岸水獺」、「金門水獺寶」，藍綠/湖水水藍色系、俏皮圓耳、小巧粉鼻與靈動鬍鬚)
  2. 台灣山羌 (`muntjac`，如「山林山羌」、「台灣小山羌」，溫暖琥珀棕色系、圓滾大眼、小巧山羌角與額前額紋)
  3. 山羊 (`goat`，如「石峰山羊」、「攀岩小山羊」，石青/灰綠色調、微彎螺旋山羊角、靈巧尖耳與俏皮羊角造型)
  4. 綿羊 (`sheep`，如「雲朵綿羊」、「棉花糖小羊」，柔和米白/雲朵淡粉色調、蓬鬆捲捲雲朵毛、垂垂軟耳與害羞小腮紅)
- 在 `src/components/battle/AnimalAvatar.tsx` 實作對應之原創純 SVG 向量圖形渲染（維持日系 Chibi/Kawaii 精緻風格，具備高光、漸層、腮紅與陰影幾何），在所有頭像尺寸（`xs` 至 `2xl`）下均清晰銳利。
- 確保在選角器 `AnimalAvatarPicker.tsx`、對戰等待室 `RoomLobbyView.tsx`、作答即時榜 `CompetitorLiveBoard.tsx` 與頒獎台 `BattlePodiumView.tsx` 中完美適配。

### R2. 房主退出之差異化解散與防斷線機制 (Host Leave Lifecycle: Lobby vs Playing)
- 後端 `src/lib/battleStore.ts`（`leaveRoom` / `leaveRoomAsync`）升級：
  - **等待大廳（`stage === "LOBBY"`）**：當房主退出時，直接將該房間判定為解散，自記憶體快取與資料庫徹底刪除（`deleteRoomFromDb(code)`）。
  - **對戰進行中（`stage === "PLAYING" | "DRAWING" | "FINISHED"`）**：若房主中途退出，房間**不解散**，僅將房主標記為已結束/棄賽（`isFinished: true`），其餘選手可繼續正常作答並完成該局對戰結算。
- 前端 `src/app/battle/[code]/page.tsx`：
  - 輪詢或 API 回應若偵測到房間已在等待大廳解散（HTTP 404 或 `ROOM_DISSOLVED`），跳出友善對話框提示「房主已離開，房間已解散」，確認後自動平滑導航返回對戰首頁 `/battle`。

### R3. 單一機器防多開進入限制 (Single Device Constraint per Room)
- 前端在進入或建立房間時，由 `localStorage` 讀取或生成全域唯一裝置識別碼 `deviceId`（如 `quizmaster_device_id`），並隨 `/api/battle/create` 與 `/api/battle/join` API 請求傳送。
- 後端 `BattlePlayer` 擴充 `deviceId?: string` 屬性持久化。
- 當同一個房間內再次接收到相同 `deviceId` 且非相同 `playerId` 之加入請求時（同一機器另開分頁、換名字進入）：
  - 自動將「上一個進房間的舊選手」自 `room.players` 陣列中移除，僅保留最新進房之選手記錄。
  - **房主身分順延邏輯**：若被移除的舊選手原本為房主，房主身分依序順延給房間內現有的第一位其他選手；若房間無其他選手，新選手即為房主。
  - 舊分頁或被剔除之連線在下一次輪詢或操作時，偵測到自身已不在房間選手清單中，提示「此裝置已在另一視窗進入，原連線已中斷」並退回大廳。

## Acceptance Criteria

### Avatar Integration Verification
- [ ] `ANIMAL_AVATARS` 總數為 16 款，包含金門水獺（`otter`）、台灣山羌（`muntjac`）、山羊（`goat`）、綿羊（`sheep`），且皆具備合法的顏色配置與文字描述。
- [ ] `AnimalAvatar` 元件對上述 4 款新角色能正確渲染出專屬 SVG 幾何圖形，無拋錯、無破版。

### Room Dissolution Verification
- [ ] 房主在 `LOBBY` 階段呼叫離開房間 API 後，房間記錄完全自資料庫與記憶體抹除，其他玩家查詢該房間時收到解散或 404 狀態，前端能友善彈窗並跳回 `/battle`。
- [ ] 房主在 `PLAYING` 階段呼叫離開房間 API 後，房間狀態不被銷毀，其餘選手能正常完成最後一題並看到排行榜結算。

### Single Device Constraint Verification
- [ ] 相同 `deviceId` 第二次呼叫 `joinRoom` 進入同房間時，房間中上一位相同 `deviceId` 之玩家被自動剔除，最終選手名單僅保留最新一位選手。
- [ ] 若被踢除的舊選手原本為房主，房間房主資格正確順延給既有的其他選手，避免房間失去房主。
- [ ] 舊連線分頁偵測到被踢出後，主動提示並跳離房間。

### Build & Test Regression Guard
- [ ] 全站自動化測試（`npm test`）100% 通過（包含新增之 4 款角色、房主解散與單一設備測試）。
- [ ] Next.js 14 生產建置（`npm run build`）Exit Code 0 零錯誤通過。
