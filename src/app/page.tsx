import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PlusCircle,
  Search,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookMarked,
  FileDown,
  Cpu,
  BarChart3,
} from "lucide-react";

export const revalidate = 0; // Dynamic server page

export default async function HomePage() {
  const [total, singleCount, multipleCount, recentQuestions] =
    await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { type: "SINGLE" } }),
      prisma.question.count({ where: { type: "MULTIPLE" } }),
      prisma.question.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

  const singlePercent = total > 0 ? Math.round((singleCount / total) * 100) : 0;
  const multiplePercent = total > 0 ? Math.round((multipleCount / total) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Linear Hero Section with Ambient Glowing Backdrop */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a0a0c] via-[#050506] to-[#020203] border border-white/[0.08] p-8 sm:p-12 text-foreground shadow-2xl shadow-black/80">
        {/* Ambient Blurred Glow Blobs */}
        <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-[#5E6AD2]/18 blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-20 w-80 h-80 rounded-full bg-[#8B5CF6]/12 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 top-1/2 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight font-game bg-clip-text text-transparent bg-gradient-to-r from-white via-[#EDEDEF] to-[#8A8F98]">
            收錄題目、杜絕重複，<br />打造高效個人複習題庫
          </h1>

          <p className="mt-4 text-foreground-muted text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
            專為個人學習與自測設計，支援標準 4 選項單選與複選題型。內建字串演算法即時偵測重複題目，在送出前預先攔截，讓每道題目都有條不紊。
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/add"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-white font-bold text-sm shadow-glow transition-all duration-200 ease-expo-out active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>開始錄入題目</span>
            </Link>

            <Link
              href="/questions"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-foreground font-semibold text-sm border border-white/[0.08] hover:border-white/[0.16] backdrop-blur-md transition-all duration-200 ease-expo-out active:scale-95 shadow-sm"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span>搜尋題庫 ({total})</span>
            </Link>

            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-sm border border-amber-500/30 hover:border-amber-500/50 backdrop-blur-md transition-all duration-200 ease-expo-out active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>隨機刷題練習</span>
            </Link>

            <Link
              href="/questions"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 font-semibold text-sm border border-blue-500/30 hover:border-blue-500/50 backdrop-blur-md transition-all duration-200 ease-expo-out active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            >
              <FileDown className="w-4 h-4 text-blue-400" />
              <span>匯出 Google 文件</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Asymmetric Bento Grid for Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Bento Item 1 (Wide 2-column card) */}
        <div className="md:col-span-2 bg-surface hover:bg-surface-hover border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-linear-card transition-all duration-200 ease-expo-out relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute right-0 top-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none group-hover:bg-accent/20 transition-all duration-300" />

          <div className="flex items-center justify-between relative z-10 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-accent/15 border border-accent/30 text-[#8B96F8] flex items-center justify-center shadow-[0_0_16px_rgba(94,106,210,0.3)]">
                <BookMarked className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-game font-bold text-foreground text-base">題庫總量儀表板</h3>
                <p className="text-xs text-foreground-muted">個人專屬題庫收錄規模</p>
              </div>
            </div>
            <span className="font-game text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.05] text-foreground-muted border border-white/[0.08]">
              即時統計
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end relative z-10">
            <div>
              <p className="text-xs font-medium text-foreground-muted mb-1">目前總收錄題目數</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-game text-foreground tracking-tight">
                  {total}
                </span>
                <span className="text-sm font-semibold text-foreground-muted">題</span>
              </div>
            </div>

            {/* Proportion Visualizer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-cyan-400">單選 {singleCount} 題 ({singlePercent}%)</span>
                <span className="text-purple-400">複選 {multipleCount} 題 ({multiplePercent}%)</span>
              </div>
              <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden flex border border-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${singlePercent}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${multiplePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bento Item 2: Quick Status & Practice Shortcut */}
        <div className="bg-surface hover:bg-surface-hover border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-linear-card transition-all duration-200 ease-expo-out flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.25)]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              系統良好
            </span>
          </div>

          <div>
            <h3 className="font-game font-bold text-foreground text-base mb-1">隨機自測就緒</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              所有題目皆已建立標準答案與索引，隨時可啟動隨機抽題測驗強化記憶。
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.06]">
            <Link
              href="/practice"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-foreground text-xs font-bold border border-white/[0.08] transition-all duration-200 ease-expo-out group-hover:border-white/[0.18]"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>立即進入練習模式</span>
              <ArrowRight className="w-3.5 h-3.5 text-foreground-muted group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="bg-surface hover:bg-surface-hover border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 shadow-linear-card transition-all duration-200 ease-expo-out space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-game font-bold text-foreground text-base">智慧即時防重複</h3>
          <p className="text-xs text-foreground-muted leading-relaxed">
            打字時系統以 350ms 防抖即時比對題幹。透過文字正規化、Levenshtein 編輯距離與 2-gram 演算法，預先攔截完全重複或高度相似題目。
          </p>
        </div>

        <div className="bg-surface hover:bg-surface-hover border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 shadow-linear-card transition-all duration-200 ease-expo-out space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-[#8B96F8] flex items-center justify-center shadow-[0_0_12px_rgba(94,106,210,0.2)]">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-game font-bold text-foreground text-base">標準 4 選項與單複選</h3>
          <p className="text-xs text-foreground-muted leading-relaxed">
            固定 A、B、C、D 四個選項，單選自動限制單一答案，複選支援任意勾選 1~4 個正確答案，並支援題目詳細解析與分類標籤。
          </p>
        </div>

        <div className="bg-surface hover:bg-surface-hover border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 shadow-linear-card transition-all duration-200 ease-expo-out space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <FileDown className="w-5 h-5" />
          </div>
          <h3 className="font-game font-bold text-foreground text-base">Google 文件試卷匯出</h3>
          <p className="text-xs text-foreground-muted leading-relaxed">
            支援「含解析解答卷」與「不含解析（有答案，隱藏解析）」兩種模式。一鍵下載 Google Docs 專用 .docx 或複製排版文字。
          </p>
        </div>
      </div>

      {/* Recent Questions Section */}
      <div className="bg-[#0a0a0c]/90 border border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-linear-card space-y-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-game text-foreground flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-accent" />
            最近新增的題目
          </h2>
          <Link
            href="/questions"
            className="text-xs font-semibold text-[#8B96F8] hover:text-accent-bright flex items-center gap-1 group transition-colors"
          >
            查看所有題目
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentQuestions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-2xl">
            <p className="text-sm text-foreground-muted">目前題庫尚無題目，立即新增第一道題目吧！</p>
            <Link
              href="/add"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs font-semibold shadow-glow transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              新增第一道題目
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentQuestions.map((q) => (
              <div
                key={q.id}
                className="py-4 px-2 -mx-2 rounded-2xl hover:bg-white/[0.02] flex items-start justify-between gap-4 transition-colors duration-200 ease-expo-out"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        q.type === "SINGLE"
                          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                          : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      }`}
                    >
                      {q.type === "SINGLE" ? "單選題" : "複選題"}
                    </span>
                    <span className="text-[11px] font-medium text-foreground-muted">
                      正解: <strong className="text-emerald-400 font-bold">{q.correctAnswers}</strong>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {q.stem}
                  </p>
                </div>
                <Link
                  href={`/questions?q=${encodeURIComponent(q.stem)}`}
                  className="text-xs text-[#8B96F8] hover:text-accent-bright font-semibold whitespace-nowrap pt-1 flex items-center gap-1 transition-colors"
                >
                  <span>檢視詳情</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}