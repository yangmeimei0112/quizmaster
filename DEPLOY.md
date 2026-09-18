# QuizMaster 雲端部署指南（Render）

本指南說明如何將 QuizMaster 部署到 [Render](https://render.com) 雲端平台，使用 Render 內建的 PostgreSQL 資料庫。

---

## 前置需求

- GitHub 帳號
- Render 帳號（可用 GitHub 登入）
- 本專案程式碼已推送至 GitHub repository

---

## 步驟一：建立 GitHub Repository 並推送程式碼

1. 前往 [GitHub](https://github.com) 建立一個新的 repository（例如：quizmaster）。
2. 在本地專案目錄執行以下指令：

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/你的帳號/quizmaster.git
   git branch -M main
   git push -u origin main
   ```

3. 確認 GitHub repository 已包含所有專案檔案（包含 ender.yaml）。

---

## 步驟二：前往 Render.com 建立帳號

1. 前往 [https://render.com](https://render.com)。
2. 點選右上角 **Get Started for Free**。
3. 選擇 **Continue with GitHub** 以使用 GitHub 帳號登入（推薦，方便之後連接 repo）。
4. 完成帳號驗證後進入 Render Dashboard。

---

## 步驟三：使用 Blueprint 自動部署

Render Blueprint 會自動讀取 ender.yaml，一次建立資料庫與 Web 服務。

1. 在 Render Dashboard 點選 **New → Blueprint**。
2. 選擇你的 GitHub 帳號，搜尋並選取 quizmaster repository。
3. 點選 **Connect**。
4. Render 會自動讀取 ender.yaml 並顯示即將建立的資源：
   - **Web Service**：quizmaster（Node.js）
   - **PostgreSQL Database**：quizmaster-db
5. 確認無誤後點選 **Apply**。

---

## 步驟四：等待自動部署完成

Render 會依序執行以下流程（約需 5～10 分鐘）：

1. 建立 PostgreSQL 資料庫 quizmaster-db
2. 執行 Build Command：
   `
   npm install
   npx prisma generate
   npx prisma migrate deploy   ← 套用資料庫 migration
   npm run build               ← 建置 Next.js
   `
3. 啟動 Web Service（
pm start）

你可以在 Render Dashboard 的 **Logs** 頁籤查看即時建置紀錄。

---

## 步驟五：取得公開網址

部署成功後，Render 會提供一個公開網址，格式為：

`
https://quizmaster.onrender.com
`

> 實際網址會依你的服務名稱而定，可在 Dashboard → quizmaster → Settings 中查看。

點擊網址即可開始使用雲端版 QuizMaster！

---

## 注意事項

### 免費方案冷啟動說明

- Render 免費方案的 Web Service 在 **15 分鐘無流量**後會自動休眠。
- 下次有人訪問時會自動喚醒，但首次載入可能需要 **30～60 秒**。
- 若需要避免冷啟動，可升級至付費方案（Starter，每月  起）。

### 資料持久性說明

- 資料儲存在 Render PostgreSQL 資料庫中，**不會因服務重啟而遺失**。
- Render 免費方案的 PostgreSQL 資料庫有效期為 **90 天**，90 天後需要手動續期或升級。
- 建議定期使用 Render Dashboard 的備份功能或匯出功能保存資料。

### 環境變數

DATABASE_URL 由 Render 自動注入，無需手動設定。若需要其他環境變數，可在 Render Dashboard → quizmaster → Environment 中新增。

### 本地開發

本地開發時，可在 .env 檔中設定（不要提交至 Git）：

`env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
`

或繼續使用本地 SQLite（需先將 schema.prisma 暫時切換回 sqlite）。

---

## 常見問題

**Q：部署失敗，Logs 顯示 migration 錯誤？**  
A：請確認 prisma/migrations/ 目錄已提交至 Git，且 migration SQL 語法為 PostgreSQL 格式。

**Q：如何查看資料庫內容？**  
A：可在 Render Dashboard → quizmaster-db → Connect 取得連線字串，使用 psql 或 TablePlus 等工具連接。

**Q：如何更新部署？**  
A：只要推送新的 commit 到 GitHub main 分支，Render 會自動重新部署。
