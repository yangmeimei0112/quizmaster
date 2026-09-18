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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAnswersGlobal((v) => !v)}
            className="px-4 py-2.5 rounded-xl border border-white/[0.10] text-xs font-semibold text-foreground bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 ease-expo-out flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            {showAnswersGlobal ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-foreground-muted" />
                <span>隱藏所有解答</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-accent" />
                <span>顯示所有解答</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold font-game border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-200 ease-expo-out active:scale-95"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>匯出 Google 文件</span>
          </button>

          <Link
            href="/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs font-bold font-game shadow-glow transition-all duration-200 ease-expo-out active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>新增題目</span>
          </Link>
        </div>
      </div>

      {/* 搜尋與過濾篩選器浮動面板 */}
      <div className="bg-[#0a0a0c]/80 border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-linear-card space-y-4">
        {/* 關鍵字搜尋輸入框 */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋題幹、選項文字、詳解關鍵字..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-white/30 transition-all duration-200 ease-expo-out shadow-inner"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
              aria-label="清除搜尋關鍵字"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 篩選標籤區 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-xs">
          {/* 題型切換膠囊按鈕 */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground-muted">題型篩選：</span>
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
                  className={`px-3.5 py-1.5 rounded-xl font-medium font-game transition-all duration-200 ease-expo-out ${
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
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-xs font-semibold text-foreground border border-white/[0.08] transition-colors"
          >
            重設所有篩選
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
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
                className="bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-200 ease-expo-out space-y-4 shadow-linear-card"
              >
                {/* 題目頂部資訊列 */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-game font-bold text-foreground-muted">#{idx + 1}</span>
                    <span
                      className={`font-game text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        q.type === "SINGLE"
                          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                          : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      }`}
                    >
                      {q.type === "SINGLE" ? "單選題" : "複選題"}
                    </span>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(q)}
                      className="p-2 rounded-xl text-foreground-muted hover:text-[#8B96F8] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-colors duration-200 ease-expo-out"
                      title="編輯題目"
                      aria-label="編輯題目"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      disabled={deletingId === q.id}
                      className="p-2 rounded-xl text-foreground-muted hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/20 transition-colors duration-200 ease-expo-out"
                      title="刪除題目"
                      aria-label="刪除題目"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 題幹內容 */}
                <h3 className="text-base font-bold font-game text-foreground leading-relaxed">
                  {q.stem}
                </h3>

                {/* 四個選項 A, B, C, D */}
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
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
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-game ${
                              shouldHighlight
                                ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                                : "bg-white/[0.05] border border-white/[0.08] text-foreground-muted"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                        </div>

                        {shouldHighlight && (
                          <span className="font-game text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md flex-shrink-0">
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
                        className="text-xs text-[#8B96F8] font-semibold hover:text-accent-bright flex items-center gap-1 transition-colors"
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

                  {/* 解析手風琴展開容器 (Smooth Accordion Container) */}
                  {isExplanationOpen && q.explanation && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-foreground-muted leading-relaxed transition-all duration-250 ease-out animate-in fade-in">
                      <p className="font-bold font-game text-foreground mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        解析與考點說明：
                      </p>
                      <p className="text-foreground-subtle leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 在線編輯題目彈窗 (Dark Frosted Glass Modal) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0c]/95 max-w-2xl w-full rounded-2xl p-6 sm:p-7 shadow-2xl border border-white/[0.10] space-y-5 backdrop-blur-2xl animate-in zoom-in-95 duration-200 ease-expo-out my-8">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h2 className="text-lg font-bold font-game text-foreground flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-accent" />
                編輯題目
              </h2>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="text-foreground-muted hover:text-foreground p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                aria-label="關閉編輯視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-game transition-all ${
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-game transition-all ${
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
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30"
                />
              </div>

              {/* 選項 A-D 與答案設定 */}
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
                        className={`w-8 h-8 rounded-xl text-xs font-bold font-game flex items-center justify-center transition-all ${
                          isCorrect
                            ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            : "bg-white/[0.04] text-foreground-muted border border-white/[0.08] hover:border-white/[0.2]"
                        }`}
                      >
                        {item.key}
                      </button>
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-5 py-2.5 rounded-xl border border-white/[0.10] text-xs font-semibold text-foreground hover:bg-white/[0.05] transition-colors duration-200 ease-expo-out"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs font-bold font-game shadow-glow transition-all duration-200 ease-expo-out active:scale-95"
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