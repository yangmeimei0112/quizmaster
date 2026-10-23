# QuizMaster 資料庫搬遷與雲端部署完整指南（Supabase + Vercel）

本指南說明如何將 QuizMaster 題庫刷題與多人對戰系統從本地 SQLite (`prisma/dev.db`) **100% 零遺失**搬遷至 **Supabase (PostgreSQL)**，並將前端與 API 部署至 **Vercel**。

---

## 一、已完成的安全防護與 Serverless 架構升級

1. **雙重全量本地資料庫備份 (`backups/`)**：
   - `backups/latest_backup.json`：結構化全量 JSON 備份（包含 `Question` 418 題、`User`、`WrongQuestionRecord`、`UserQuestionProgress` 所有記錄與 SHA-256 校驗碼）。
   - `backups/dev_backup.db`：原始 SQLite 二進位資料庫完整快照。
   - **歷史附圖可攜化**：備份與遷移工具會自動將指向 `/uploads/...` 的本地圖片轉換為標準 Base64 Data URL，確保上雲後不破圖。
2. **雙環境智慧 Prisma Provider 切換 (`scripts/sync-db-provider.js`)**：
   - 當 `DATABASE_URL` 為 `file:./dev.db` 時，自動將 `prisma/schema.prisma` 切換為 `sqlite`。
   - 當 `DATABASE_URL` 為 `postgresql://...` 或 `postgres://...` 時，自動切換為 `postgresql`；若同時設定 `DIRECT_URL`，自動啟用 `directUrl = env("DIRECT_URL")`。
3. **Vercel Serverless 全功能持久化**：
   - **多人對戰房間 (`BattleRoomRecord`)**：所有對戰房間狀態除了記憶體快取外，皆即時持久化至資料庫，解決 Vercel Serverless 跨節點實例切換與冷啟動掉房問題。
   - **無狀態圖片上傳 (`/api/upload`)**：上傳圖片或剪貼簿貼圖直接驗證並轉為標準 Base64 Data URL 儲存於資料庫，完全不依賴 Vercel 唯讀檔案系統 (`EROFS`)。

---

## 二、步驟一：在本地執行雙重安全備份

在進行任何遷移前，可隨時執行以下指令產生最新備份：

```bash
npm run db:backup
```

執行後會自動更新：
- `backups/latest_backup.json`
- `backups/dev_backup.db`

---

## 三、步驟二：建立 Supabase PostgreSQL 資料庫並取得連線字串

1. 前往 [Supabase](https://supabase.com/) 登入並點選 **New Project** 建立新專案（記下您設定的 Database Password）。
2. 專案建立完成後，點選上方導覽列或左側設定的 **Connect**（或 **Project Settings -> Database**）。
3. 切換至 **ORM -> Prisma** 頁籤，複製以下兩組連線字串（將 `[YOUR-PASSWORD]` 替換為您的資料庫密碼）：
   - **`DATABASE_URL`**（Transaction Pooler，連接埠 `6543`，結尾帶有 `?pgbouncer=true`）：
     ```env
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
     ```
   - **`DIRECT_URL`**（Session Pooler 或 Direct Connection，連接埠 `5432`）：
     ```env
     DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
     ```

---

## 四、步驟三：一鍵將本地資料無損遷移至 Supabase

1. 在本地專案根目錄的 `.env` 檔案中，填入剛才取得的 Supabase 連線字串：
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```
2. 執行一鍵遷移指令（自動切換 Prisma 為 PostgreSQL、推送資料表結構至 Supabase，並將 `backups/latest_backup.json` 所有題庫與資料冪等寫入）：
   ```bash
   npm run db:migrate-supabase
   ```
3. 終端機將顯示 `[Migrate/Restore] Verification passed!` 以及核對無誤的各資料表筆數。此腳本採用冪等 `upsert` 設計，重複執行不會產生重複資料。

> **提示**：若要在本地恢復使用 SQLite 開發，只需將 `.env` 的 `DATABASE_URL` 改回 `"file:./dev.db"`（並註解掉 `DIRECT_URL`），執行 `npm run dev` 或 `npm test` 時會自動切換回 `sqlite`。

---

## 五、步驟四：部署至 Vercel

1. 確保最新程式碼已推送至 GitHub `main` 分支。
2. 前往 [Vercel Dashboard](https://vercel.com/dashboard)，點選 **Add New... -> Project**，匯入您的 GitHub Repository。
3. 在 **Environment Variables** 區塊新增以下環境變數：
   - `DATABASE_URL`：填入您的 Supabase Transaction Pooler (6543) 連線字串。
   - `DIRECT_URL`：填入您的 Supabase Direct / Session (5432) 連線字串。
4. 點選 **Deploy**。Vercel 會自動依據 `vercel.json` 與 `package.json` 執行：
   - `node scripts/sync-db-provider.js`（自動切換為 `postgresql`）
   - `prisma generate`
   - `next build`
5. 部署完成後即可透過 Vercel 提供的網址使用完整功能的 QuizMaster！
