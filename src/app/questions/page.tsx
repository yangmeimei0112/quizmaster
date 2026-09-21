"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  PlusCircle,
  Filter,
  CheckCircle2,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Trash2,
  Edit3,
  BookOpen,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  FileDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { Question, QuestionType } from "@/types/question";
import ExportModal from "@/components/ExportModal";

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // R4 智慧手風琴卡片展開狀態管理 (預設收合)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // 答案全域隱藏/顯示切換 (方便使用者自測)
  const [showAnswersGlobal, setShowAnswersGlobal] = useState(true);
  // 個別展開解析的題目 ID Set
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  // 編輯 Modal 狀態
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editStem, setEditStem] = useState("");
  const [editType, setEditType] = useState<QuestionType>("SINGLE");
  const [editOptA, setEditOptA] = useState("");
  const [editOptB, setEditOptB] = useState("");
  const [editOptC, setEditOptC] = useState("");
  const [editOptD, setEditOptD] = useState("");
  const [editAnswers, setEditAnswers] = useState<string[]>([]);
  const [editExplanation, setEditExplanation] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // 刪除確認
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 載入題目
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (selectedType !== "ALL") params.set("type", selectedType);

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("載入題目失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestions();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchQuestions]);

  // R4 智慧手風琴卡片展開/收合控制
  const isAllCardsExpanded = questions.length > 0 && expandedCardIds.size === questions.length;

  const toggleExpandAllCards = () => {
    if (isAllCardsExpanded) {
      setExpandedCardIds(new Set());
    } else {
      setExpandedCardIds(new Set(questions.map((q) => q.id)));
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 切換解析展開狀態
  const toggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 刪除題目
  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這道題目嗎？刪除後無法還原。")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      }
    } catch (err) {
      alert("刪除失敗");
    } finally {
      setDeletingId(null);
    }
  };

  // 開啟編輯 Modal
  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditStem(q.stem);
    setEditType(q.type);
    setEditOptA(q.optionA);
    setEditOptB(q.optionB);
    setEditOptC(q.optionC);
    setEditOptD(q.optionD);
    setEditAnswers(q.correctAnswers.split(",").filter(Boolean));
    setEditExplanation(q.explanation || "");
  };

  // 儲存編輯變更
  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    if (!editStem.trim()) return alert("題幹不可為空");
    if (!editOptA.trim() || !editOptB.trim() || !editOptC.trim() || !editOptD.trim()) {
      return alert("A、B、C、D 四個選項皆不可為空");
    }
    if (editAnswers.length === 0) return alert("請至少指定一個正確解答");

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem: editStem,
          type: editType,
          optionA: editOptA,
          optionB: editOptB,
          optionC: editOptC,
          optionD: editOptD,
          correctAnswers: editAnswers,
          explanation: editExplanation,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setQuestions((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setEditingQuestion(null);
      } else {
        alert("更新失敗");
      }
    } catch (err) {
      alert("更新異常");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleEditAnswer = (optKey: string) => {
    if (editType === "SINGLE") {
      setEditAnswers([optKey]);
    } else {
      setEditAnswers((prev) =>
        prev.includes(optKey) ? prev.filter((k) => k !== optKey) : [...prev, optKey].sort()
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 標題與動作按鈕群 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-game text-foreground flex items-center gap-2.5">
            <Search className="w-6 h-6 text-accent" />
            題庫查詢與管理
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            即時搜尋關鍵字、按題型篩選，並支援題目線上編輯、刪除與試卷匯出。
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center sm:flex-wrap gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* 按鈕 1: 展開/收合全部 */}
          <button
            type="button"
            onClick={toggleExpandAllCards}
            className="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl border border-white/[0.10] text-xs font-semibold text-foreground bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 ease-expo-out flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>{isAllCardsExpanded ? "收合全部" : "展開全部"}</span>
          </button>

          {/* 按鈕 2: 隱藏/顯示解答 */}
          <button
            type="button"
            onClick={() => setShowAnswersGlobal((v) => !v)}
            className="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl border border-white/[0.10] text-xs font-semibold text-foreground bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 ease-expo-out flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            {showAnswersGlobal ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                <span>隱藏解答</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>顯示解答</span>
              </>
            )}
          </button>

          {/* 按鈕 3: 匯出 Google 文件 */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold font-game border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-200 ease-expo-out active:scale-95 flex items-center justify-center gap-1.5"
          >
            <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
            <span>匯出文件</span>
          </button>

          {/* 按鈕 4: 新增題目 */}
          <Link
            href="/add"
            className="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs font-bold font-game shadow-glow transition-all duration-200 ease-expo-out active:scale-95 flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>新增題目</span>
          </Link>
        </div>
      </div>

      {/* 搜尋與過濾篩選器浮動面板 */}
      <div className="bg-[#0a0a0c]/80 border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-linear-card space-y-4 animate-fade-in-up">
        {/* 關鍵字搜尋輸入框 */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋題幹、選項文字、詳解關鍵字..."
            className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-sm text-foreground placeholder:text-white/30 transition-all duration-200 ease-expo-out shadow-inner"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white absolute right-1 top-1/2 -translate-y-1/2 touch-tactile"
              aria-label="清除搜尋關鍵字"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 篩選標籤區 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/[0.06] text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
            <span className="font-semibold text-foreground-muted shrink-0">題型篩選：</span>
            <div className="grid grid-cols-3 sm:flex gap-1.5 sm:gap-2 w-full sm:w-auto">
              {[
                { key: "ALL", label: "全部" },
                { key: "SINGLE", label: "單選題" },
                { key: "MULTIPLE", label: "複選題" },
              ].map((t) => {
                const isSelected = selectedType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedType(t.key)}
                    className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl font-medium font-game transition-all duration-200 ease-expo-out flex items-center justify-center touch-tactile ${
                      isSelected
                        ? "bg-white/[0.10] text-foreground border border-white/[0.15] shadow-sm font-semibold"
                        : "bg-white/[0.02] text-foreground-muted hover:text-foreground hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋結果筆數與載入狀態 */}
      <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
        <span>
          共找到 <strong className="text-foreground font-bold">{questions.length}</strong> 道題目
        </span>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-[#9AA5FF] font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            更新列表中...
          </span>
        )}
      </div>

      {/* 題目列表清單 */}
      {questions.length === 0 && !isLoading ? (
        <div className="bg-[#0a0a0c]/80 rounded-2xl border border-dashed border-white/[0.08] p-12 text-center space-y-3 backdrop-blur-md">
          <BookOpen className="w-10 h-10 text-white/30 mx-auto" />
          <h3 className="font-bold font-game text-foreground text-base">查無相符的題目</h3>
          <p className="text-xs text-foreground-muted">
            請嘗試調整搜尋關鍵字或重設篩選條件。
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedType("ALL");
            }}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-xs font-semibold text-foreground border border-white/[0.08] transition-all duration-200 ease-expo-out inline-flex items-center justify-center touch-manipulation active:scale-95"
          >
            重設所有篩選
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isExpanded = expandedCardIds.has(q.id);
            const correctSet = new Set(q.correctAnswers.split(","));
            const isExplanationOpen = expandedExplanations.has(q.id);

            const options = [
              { key: "A", text: q.optionA },
              { key: "B", text: q.optionB },
              { key: "C", text: q.optionC },
              { key: "D", text: q.optionD },
            ];

            return (
              <div
                key={q.id}
                className="bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 sm:p-6 transition-all duration-200 ease-expo-out shadow-linear-card"
              >
                {/* 題目卡片標頭 (點擊切換折疊手風琴) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCard(q.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleCard(q.id);
                    }
                  }}
                  className="cursor-pointer select-none space-y-2.5 focus:outline-none focus:ring-1 focus:ring-accent rounded-xl"
                  aria-expanded={isExpanded}
                >
                  {/* 題目頂部資訊列 */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-game font-bold text-foreground-muted shrink-0">#{idx + 1}</span>
                      <span
                        className={`font-game text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                          q.type === "SINGLE"
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {q.type === "SINGLE" ? "單選題" : "複選題"}
                      </span>
                    </div>

                    {/* 操作按鈕 (隔離點擊事件) + 旋轉指示箭頭 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(q);
                        }}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-foreground-muted hover:text-[#8B96F8] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200 ease-expo-out touch-manipulation active:scale-95"
                        title="編輯題目"
                        aria-label="編輯題目"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q.id);
                        }}
                        disabled={deletingId === q.id}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-foreground-muted hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/20 transition-all duration-200 ease-expo-out touch-manipulation active:scale-95"
                        title="刪除題目"
                        aria-label="刪除題目"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground-muted transition-transform duration-250 ease-expo-out"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* 題幹內容 (折疊時 line-clamp-2，展開時完整展示) */}
                  <h3 className={`text-sm sm:text-base font-bold font-game text-foreground leading-relaxed break-words ${
                    isExpanded ? "" : "line-clamp-2 sm:line-clamp-none"
                  }`}>
                    {q.stem}
                  </h3>
                </div>

                {/* 手風琴折疊內容 (CSS Grid 0fr -> 1fr 純 CSS 平滑微動態) */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-250 ease-expo-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100 mt-4"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-4 pt-1">
                      {/* 四個選項 A, B, C, D */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        {options.map((opt) => {
                          const isCorrect = correctSet.has(opt.key);
                          const shouldHighlight = showAnswersGlobal && isCorrect;

                          return (
                            <div
                              key={opt.key}
                              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all duration-200 ease-expo-out ${
                                shouldHighlight
                                  ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-100 ring-1 ring-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.15)] font-medium"
                                  : "border-white/[0.06] bg-white/[0.02] text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-game shrink-0 ${
                                    shouldHighlight
                                      ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                                      : "bg-white/[0.05] border border-white/[0.08] text-foreground-muted"
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <span className="leading-snug min-w-0 break-words">{opt.text}</span>
                              </div>

                              {shouldHighlight && (
                                <span className="font-game text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0">
                                  正解
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 答案與解析區塊 */}
                      <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground-muted">標準解答：</span>
                            <span className="font-bold text-emerald-400 font-game text-sm">
                              {showAnswersGlobal ? q.correctAnswers : "•••• (已隱藏)"}
                            </span>
                          </div>

                          {q.explanation && (
                            <button
                              type="button"
                              onClick={() => toggleExplanation(q.id)}
                              className="min-h-[44px] py-2 px-1 text-xs text-[#8B96F8] font-semibold hover:text-accent-bright flex items-center gap-1 transition-colors"
                            >
                              <span>{isExplanationOpen ? "收合解析" : "查看詳細解析"}</span>
                              {isExplanationOpen ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* 解析手風琴展開容器 */}
                        {isExplanationOpen && q.explanation && (
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-foreground-muted leading-relaxed transition-all duration-250 ease-out animate-in fade-in">
                            <p className="font-bold font-game text-foreground mb-1.5 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              解析與考點說明：
                            </p>
                            <p className="text-foreground-subtle leading-relaxed break-words">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 在線編輯題目彈窗 (Mobile Bottom Sheet & Desktop Frosted Glass Modal) */}
      {editingQuestion && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden sm:overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingQuestion(null); }}
        >
          <div 
            className="relative bg-[#0a0a0c]/95 border-t sm:border border-white/[0.10] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl backdrop-blur-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col animate-sheet-up sm:animate-scale-in text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 頂部拖曳提示飾條 (僅手機端顯示) */}
            <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0" aria-hidden="true">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* 固定頂部標題與關閉按鈕 */}
            <div className="flex items-center justify-between px-5 sm:px-7 pt-2 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
              <h2 className="text-base sm:text-lg font-bold font-game text-foreground flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-accent" />
                編輯題目
              </h2>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground-muted hover:text-foreground rounded-xl hover:bg-white/[0.05] transition-colors"
                aria-label="關閉編輯視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 平滑內部滾動區塊 */}
            <div className="overflow-y-auto overscroll-contain flex-1 px-5 sm:px-7 py-4 space-y-4 pr-3 sm:pr-6">
              {/* 題型選擇 */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold font-game text-foreground">題型：</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditType("SINGLE");
                      setEditAnswers((prev) => (prev.length > 0 ? [prev[0]] : ["A"]));
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-game transition-all flex items-center justify-center ${
                      editType === "SINGLE"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "bg-white/[0.04] text-foreground-muted border border-transparent"
                    }`}
                  >
                    單選題
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("MULTIPLE")}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-game transition-all flex items-center justify-center ${
                      editType === "MULTIPLE"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                        : "bg-white/[0.04] text-foreground-muted border border-transparent"
                    }`}
                  >
                    複選題
                  </button>
                </div>
              </div>

              {/* 題幹 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-game text-foreground">題幹內容：</label>
                <textarea
                  value={editStem}
                  onChange={(e) => setEditStem(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30"
                />
              </div>

              {/* 選項 A-D 與答案設定 (Apple HIG 44px 觸控熱區) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold font-game text-foreground">
                  四個選項 (點擊字母按鈕指定正解)：
                </label>
                {[
                  { key: "A", val: editOptA, set: setEditOptA },
                  { key: "B", val: editOptB, set: setEditOptB },
                  { key: "C", val: editOptC, set: setEditOptC },
                  { key: "D", val: editOptD, set: setEditOptD },
                ].map((item) => {
                  const isCorrect = editAnswers.includes(item.key);
                  return (
                    <div key={item.key} className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleEditAnswer(item.key)}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-base font-bold font-game flex items-center justify-center transition-all shrink-0 active:scale-95 touch-manipulation ${
                          isCorrect
                            ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            : "bg-white/[0.04] text-foreground-muted border border-white/[0.08] hover:border-white/[0.2]"
                        }`}
                        title={`設定選項 ${item.key} 為正解`}
                      >
                        {item.key}
                      </button>
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30 min-w-0"
                      />
                    </div>
                  );
                })}
              </div>

              {/* 解析 (選填) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-game text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>題目解析 / 詳解說明</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-foreground-muted border border-white/[0.08]">
                    選填 (Optional)
                  </span>
                </label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  rows={3}
                  placeholder="可輸入解題思路或考點說明（非必填，若不填寫可留空）..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30"
                />
              </div>
            </div>

            {/* 固定底部操作區塊 (Sticky Safe-Area Footer) */}
            <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-white/[0.08] px-5 sm:px-7 py-3.5 sm:py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl border border-white/[0.10] text-sm font-semibold text-foreground hover:bg-white/[0.05] transition-colors duration-200 ease-expo-out flex items-center justify-center"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold font-game shadow-glow transition-all duration-200 ease-expo-out active:scale-95 flex items-center justify-center gap-2 touch-manipulation"
              >
                {isUpdating ? "儲存中..." : "儲存修改"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出 Google 文件彈窗 */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        questions={questions}
        typeFilter={selectedType}
      />
    </div>
  );
}