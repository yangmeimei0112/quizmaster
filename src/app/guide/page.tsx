import Link from "next/link";
import {
  Sparkles,
  PlusCircle,
  Search,
  GraduationCap,
  Award,
  Clock,
  Flame,
  FileDown,
  Printer,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Keyboard,
  ArrowRight,
  HelpCircle,
  FileText,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  Check,
} from "lucide-react";

export const metadata = {
  title: "引導小精靈 · QuizMaster 平台使用指南",
  description: "QuizMaster 專案管理題庫與全真檢定平台完整操作手冊、功能特色、試卷匯出與快捷鍵一覽。",
};

export default function GuidePage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* 頂部 Hero 橫幅 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a0a0c] via-[#050506] to-[#020203] border border-white/[0.08] p-6 sm:p-10 text-foreground shadow-2xl shadow-black/80">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#5E6AD2]/18 blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-20 w-72 h-72 rounded-full bg-[#8B5CF6]/12 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 top-1/2 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-game bg-accent/15 text-[#9AA5FF] border border-accent/30 shadow-[0_0_15px_rgba(94,106,210,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>QuizMaster 引導小精靈 · 全方位使用指南</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight font-game text-foreground">
            歡迎來到 QuizMaster 題庫與檢定中心
          </h1>

          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            QuizMaster 是專為考證檢定、高效率衝刺打造的題庫系統。本指南為您完整梳理平台六大核心模組：文字智慧解析、題庫管理搜尋、60分鐘 50 題沉浸式模擬考、個人錯題本排行榜、Google 文件與 PDF 試卷匯出，以及高效率鍵盤快捷鍵。
          </p>

          {/* 快速錨點導覽導流按鈕 */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <a
              href="#feature-add"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-foreground-muted hover:text-foreground transition-colors inline-flex items-center touch-tactile"
            >
              1. 快速新增題目
            </a>
            <a
              href="#feature-manage"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-foreground-muted hover:text-foreground transition-colors inline-flex items-center touch-tactile"
            >
              2. 題庫管理搜尋
            </a>
            <a
              href="#feature-mock"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-foreground-muted hover:text-foreground transition-colors inline-flex items-center touch-tactile"
            >
              3. 60分鐘模擬考
            </a>
            <a
              href="#feature-wrong"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-foreground-muted hover:text-foreground transition-colors inline-flex items-center touch-tactile"
            >
              4. 錯題排行榜
            </a>
            <a
              href="#feature-export"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-foreground-muted hover:text-foreground transition-colors inline-flex items-center touch-tactile"
            >
              5. 試卷與錯題報告匯出
            </a>
            <a
              href="#feature-shortcuts"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/30 text-[#C5CCFF] transition-colors font-bold inline-flex items-center touch-tactile"
            >
              6. 快捷鍵一覽
            </a>
          </div>
        </div>
      </div>

      {/* 模組 1：快速新增題目與四合一防重複偵測 */}
      <section id="feature-add" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-game text-foreground">
              1. 快速新增題目（文字解析與四合一防重比對）
            </h2>
            <p className="text-xs text-foreground-muted">
              告別繁瑣的手動欄位填寫，支援整篇題目文字批次剖析與防重複出題演算法。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 操作說明卡 */}
          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-linear-card">
            <h3 className="text-sm font-bold font-game text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              核心操作步驟
            </h3>
            <ol className="space-y-3 text-xs text-foreground-muted leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 text-[#9AA5FF] font-mono font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-foreground">貼入整段題目文字：</strong>
                  無論來自 Word、PDF、簡報或線上測驗，直接貼入上方「快速文字解析框」。
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 text-[#9AA5FF] font-mono font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-foreground">自動智慧剖析：</strong>
                  系統自動識別題幹、(A)(B)(C)(D) 選項、單選/複選標準答案與解析並填入對應表單。
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 text-[#9AA5FF] font-mono font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-foreground">四合一防重複比對偵測：</strong>
                  即時調用字元 Dice、Bigram、Levenshtein、LCS 加權比對。若與現存題目相似度達 75% 以上，將醒目標示警告防止重複出題。
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 text-[#9AA5FF] font-mono font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <strong className="text-foreground">極速入庫：</strong>
                  按下 <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-foreground font-mono text-[10px]">Ctrl + Enter</kbd> 即可一鍵送出存檔！
                </div>
              </li>
            </ol>
          </div>

          {/* 視覺化示意圖 */}
          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-linear-card flex flex-col justify-between">
            <div className="text-xs font-bold font-game text-foreground flex items-center justify-between">
              <span>智慧解析與防重流程圖解</span>
              <span className="text-[10px] text-emerald-400 font-normal">演算法即時偵測</span>
            </div>

            {/* SVG 圖解流程 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-bold">
                  任意題目文字
                </div>
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 font-bold">
                  正則智慧解析
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold">
                  四重相似比對
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-bold">
                  精準入庫完成
                </div>
              </div>

              {/* 模擬防重警示卡片 */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>防重複偵測：發現相似度 82% 之題目</span>
                </div>
                <p className="text-[10px] text-amber-300/80 leading-snug">
                  庫中已有：「下列何者屬於敏捷開發的核心宣言？」系統提醒您檢查是否重複。
                </p>
              </div>
            </div>

            <Link
              href="/add"
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-accent/20 hover:bg-accent/30 text-[#C5CCFF] text-xs font-bold font-game border border-accent/40 flex items-center justify-center gap-1.5 transition-all touch-manipulation touch-tactile active:scale-95"
            >
              <span>立即試試文字智慧新增</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 模組 2：題庫管理、搜尋與線上即時編輯 */}
      <section id="feature-manage" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-game text-foreground">
              2. 題庫管理、毫秒搜尋與線上即時編輯
            </h2>
            <p className="text-xs text-foreground-muted">
              快速檢索海量題庫，免跳轉直接行內修改題幹、選項、答案與解析。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-5 space-y-3 shadow-linear-card">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="font-bold font-game text-sm text-foreground">關鍵字即時搜尋</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              輸入關鍵字即時高亮匹配文字，支援題幹與選項內文雙重檢索，毫秒級快速定位考點。
            </p>
          </div>

          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-5 space-y-3 shadow-linear-card">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="font-bold font-game text-sm text-foreground">題型切換與解答隱藏</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              可依單選題、複選題分類快速篩選；提供「顯示解答 / 隱藏解答」一鍵開關，自測查閱兩相宜。
            </p>
          </div>

          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-5 space-y-3 shadow-linear-card">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold font-game text-sm text-foreground">行內即時編輯 (Inline Edit)</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              點擊題目卡片右上角「編輯」，即可直接在卡片內修改內容並儲存，無需跳出當前瀏覽進度。
            </p>
          </div>
        </div>
      </section>

      {/* 模組 3：60分鐘沉浸式 50 題模擬考試 */}
      <section id="feature-mock" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-game text-foreground">
              3. 60分鐘沉浸式 50 題全真模擬考試
            </h2>
            <p className="text-xs text-foreground-muted">
              單選複選混合隨機抽題，每題 2 分，滿分 100 分，70 分及格，還原正式認證檢定考場環境。
            </p>
          </div>
        </div>

        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-linear-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold font-game text-xs">
                <Clock className="w-4 h-4" />
                <span>60:00 真實時間戳倒數</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                採用系統時間戳計算，即使切換分頁、螢幕休眠或瀏覽器節流，計時器依舊精準無誤差。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold font-game text-xs">
                <Layers className="w-4 h-4" />
                <span>50 題答題卡切換矩陣</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                紫色代表已填答、灰色代表未答、白光代表當前題目。點擊任何題號即可隨心自由跳轉。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-game text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>提前交卷防呆檢查</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                交卷前自動統計未答題數並給予醒目警告，確認後立刻結算成績並產出 50 題對錯覆盤詳解。
              </p>
            </div>
          </div>

          {/* 模擬考界面示意圖視覺化 */}
          <div className="p-5 rounded-2xl bg-[#050506] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs">
              <div className="flex items-center gap-2 font-bold font-game">
                <Award className="w-4 h-4 text-accent" />
                <span>60分鐘全真模擬考作答展示</span>
              </div>
              <div className="font-mono text-rose-300 font-bold px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30">
                剩餘時間：54:12
              </div>
            </div>

            {/* 答題卡示意按鈕 */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-foreground-muted">答題卡狀態示意：</div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  let style = "bg-white/[0.04] text-foreground-muted border-white/[0.08]";
                  if (num === 5) style = "bg-accent text-white border-accent shadow-glow font-bold scale-105";
                  else if (num < 5) style = "bg-[#5E6AD2]/30 text-[#C5CCFF] border-[#5E6AD2]/50 font-semibold";
                  return (
                    <div
                      key={num}
                      className={`w-7 h-7 rounded-lg border text-xs font-mono flex items-center justify-center ${style}`}
                    >
                      {num}
                    </div>
                  );
                })}
                <span className="text-xs text-foreground-muted self-center ml-2">... 至 50 題</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 模組 4：個人專屬錯題排行榜 */}
      <section id="feature-wrong" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(244,63,94,0.25)]">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-game text-foreground">
              4. 個人專屬錯題排行榜與弱項精準重測
            </h2>
            <p className="text-xs text-foreground-muted">
              自動記錄測驗中答錯的題目，統計高頻失分陷阱，支援單題快速重測複習。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-linear-card">
            <h3 className="font-bold font-game text-sm text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              錯題本運作機制
            </h3>
            <ul className="space-y-2.5 text-xs text-foreground-muted leading-relaxed">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">全自動記錄：</strong>
                  無論即時隨機刷題或 50 題模擬考，只要答錯即自動計入錯題統計庫。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">頻次排序：</strong>
                  錯題排行榜依錯誤次數由高至低排列，讓您一眼看清最易混淆的弱點。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">單題即時重測：</strong>
                  點擊錯題旁的「單題重測」按鈕，立即單獨拉出做題，徹底攻克盲點。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">登入同步個人錯題本：</strong>
                  登入會員帳號後，錯題將永久同步至個人雲端帳號，複習更有保障。
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-linear-card">
            <div className="text-xs font-bold font-game text-foreground">
              錯題排行榜示意展示
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/25 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-foreground truncate">
                      在敏捷管理中，燃盡圖 (Burn-down Chart) 的橫軸代表？
                    </div>
                    <div className="text-[10px] text-foreground-muted">單選題 · 敏捷實務</div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    答錯 4 次
                  </span>
                  <span className="text-[11px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-lg border border-accent/30">
                    單題重測
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-white/[0.05] text-foreground-muted font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-foreground truncate">
                      關鍵路徑法 (CPM) 中，浮動時間 (Float) 為零的活動代表？
                    </div>
                    <div className="text-[10px] text-foreground-muted">單選題 · 時程管理</div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    答錯 3 次
                  </span>
                  <span className="text-[11px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-lg border border-accent/30">
                    單題重測
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 模組 5：Google 文件試卷與錯題報告匯出 */}
      <section id="feature-export" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(59,130,246,0.25)]">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-game text-foreground">
              5. Google 文件試卷與錯題報告匯出 (Word & PDF)
            </h2>
            <p className="text-xs text-foreground-muted">
              一鍵隨機抽取 50 題成卷，或在模擬考結算時印出專屬錯題分析報告。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 功能 A: 隨機抓 50 題模擬考卷 */}
          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-linear-card">
            <div className="flex items-center gap-2 font-bold font-game text-sm text-foreground">
              <Printer className="w-4 h-4 text-blue-400" />
              <span>隨機抓 50 題模擬試卷匯出</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              在題庫或刷題大廳點擊「匯出文件」，切換至「🎲 隨機抓 50 題考卷」，系統將自動混合單選與複選題組裝成滿分 100 分的標準試卷。
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>下載 Google 文件 (.docx)：</strong>完整 Microsoft JhengHei 標準排版。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>下載 / 列印 PDF 檔：</strong>標準 A4 試卷版型，附准考證填答欄與防跨頁截斷。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#8B96F8] shrink-0" />
                <span><strong>一鍵複製富文本：</strong>打開 docs.new 按 Ctrl+V 直接貼上完整試卷。</span>
              </div>
            </div>
          </div>

          {/* 功能 B: 結算印出錯題報告 */}
          <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-linear-card">
            <div className="flex items-center gap-2 font-bold font-game text-sm text-foreground">
              <FileText className="w-4 h-4 text-rose-400" />
              <span>50題模擬考結算「錯題檢討報告」</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              在 50 題模擬考結算頁面，點擊「印出錯題報告 (Google文件)」，可產出包含個人完整應試紀錄的專屬報告。
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>詳細成效數據：</strong>得分 (如 74/100)、及格判定、耗時與未答題數。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span><strong>紅綠對照清單：</strong>清晰列出考生填答 (紅) vs 標準正解 (綠)。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>出題解析考點：</strong>每題附觀念剖析，一鍵存成 docx 或貼入 Google Docs。</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>一鍵列印 / 下載 PDF：</strong>標準 A4 錯題排版附完整統計表，直接印出或另存為 PDF 檔。</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 模組 6：全站鍵盤快捷鍵一覽 */}
      <section id="feature-shortcuts" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-game text-foreground">
              6. 全站鍵盤快捷鍵速查表 (Keyboard Shortcuts)
            </h2>
            <p className="text-xs text-foreground-muted">
              專為高效率刷題設計的鍵盤操作，全程無需使用滑鼠。
            </p>
          </div>
        </div>

        <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.08] p-6 sm:p-8 space-y-4 shadow-linear-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold font-game text-foreground">快速選取選項</div>
                <div className="text-[11px] text-foreground-muted">單選或複選作答</div>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  A
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  B
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  C
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  D
                </kbd>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold font-game text-foreground">數字鍵對應選取</div>
                <div className="text-[11px] text-foreground-muted">1=A, 2=B, 3=C, 4=D</div>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  1
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  2
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  3
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  4
                </kbd>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold font-game text-foreground">切換上一題 / 下一題</div>
                <div className="text-[11px] text-foreground-muted">模擬考試中跳題</div>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  ←
                </kbd>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  →
                </kbd>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold font-game text-foreground">確認作答 / 下一題</div>
                <div className="text-[11px] text-foreground-muted">刷題即時模式快速推進</div>
              </div>
              <kbd className="px-3 py-1 rounded-lg bg-accent text-white font-mono font-bold text-xs shadow-glow">
                Enter
              </kbd>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold font-game text-foreground">快速新增題目入庫</div>
                <div className="text-[11px] text-foreground-muted">錄入題目快速存檔</div>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs shadow-sm">
                  Enter
                </kbd>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold font-game text-foreground">關閉彈窗 / 取消編輯</div>
                <div className="text-[11px] text-foreground-muted">任何視窗一鍵返回</div>
              </div>
              <kbd className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-foreground font-mono font-bold text-xs shadow-sm">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </section>

      {/* 底部行動呼籲卡 (CTAs) */}
      <div className="rounded-3xl bg-gradient-to-r from-[#5E6AD2]/20 via-[#8B5CF6]/15 to-cyan-500/10 border border-white/[0.10] p-6 sm:p-8 text-center space-y-4 shadow-2xl">
        <h3 className="text-xl sm:text-2xl font-bold font-game text-foreground">
          準備好開始練習了嗎？
        </h3>
        <p className="text-xs sm:text-sm text-foreground-muted max-w-lg mx-auto leading-relaxed">
          立即啟動 60 分鐘 50 題全真模擬考檢視學習成果，或匯出專屬 Google 文件試卷與錯題報告！
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/practice"
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs sm:text-sm font-bold font-game shadow-glow transition-all flex items-center gap-2 touch-manipulation touch-tactile active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>前往刷題測驗中心</span>
          </Link>
          <Link
            href="/questions"
            className="min-h-[46px] px-6 py-2.5 rounded-xl border border-white/[0.10] text-foreground text-xs sm:text-sm font-semibold hover:bg-white/[0.05] transition-colors flex items-center gap-2 touch-manipulation touch-tactile active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>查詢題庫與匯出文件</span>
          </Link>
          <Link
            href="/add"
            className="min-h-[46px] px-6 py-2.5 rounded-xl border border-white/[0.10] text-foreground text-xs sm:text-sm font-semibold hover:bg-white/[0.05] transition-colors flex items-center gap-2 touch-manipulation touch-tactile active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>快速新增考題</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
