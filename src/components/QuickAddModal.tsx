"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import {
  Sparkles,
  ClipboardPaste,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  RotateCcw,
  Layers,
  ArrowRight,
  PlusCircle,
  HelpCircle,
} from "lucide-react";
import { QuestionType } from "@/types/question";
import { parseQuestionText, ParsedQuestionResult } from "@/lib/questionParser";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    stem: string;
    type: QuestionType;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
  }) => void;
  onDirectSave?: (data: {
    stem: string;
    type: QuestionType;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
  }) => Promise<boolean>;
}

const SAMPLE_TEXT = `8. 專案工作說明書（Statement of Work, SOW）主要是由下列哪一方提供？
(A) 需求者、業主或委託人

(B) 專案贊助者（Project Sponsor）

(C) 主承包商（Contractor）

(D) 專案經理（Project Manager）
答案：A
解析：專案工作說明書（SOW）是由需求者、客戶或買方撰寫，用以說明要採購的產品、成果或服務規格。`;

export default function QuickAddModal({
  isOpen,
  onClose,
  onApply,
  onDirectSave,
}: QuickAddModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestionResult | null>(null);
  const [isParsingPending, startParsingTransition] = useTransition();

  // 可在預覽中微調的編輯狀態
  const [editedStem, setEditedStem] = useState("");
  const [editedType, setEditedType] = useState<QuestionType>("SINGLE");
  const [editedA, setEditedA] = useState("");
  const [editedB, setEditedB] = useState("");
  const [editedC, setEditedC] = useState("");
  const [editedD, setEditedD] = useState("");
  const [editedAnswers, setEditedAnswers] = useState<string[]>(["A"]);
  const [editedExplanation, setEditedExplanation] = useState("");

  const [isDirectSubmitting, setIsDirectSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [clipboardNotice, setClipboardNotice] = useState("");

  // 監聽 ESC 鍵關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 當貼入文本變更時，防抖 120ms + useTransition 即時解析，確保主執行緒零卡頓
  useEffect(() => {
    if (!rawText.trim()) {
      setParsed(null);
      setEditedStem("");
      setEditedA("");
      setEditedB("");
      setEditedC("");
      setEditedD("");
      setEditedAnswers(["A"]);
      setEditedExplanation("");
      setFormError("");
      return;
    }

    const timer = setTimeout(() => {
      startParsingTransition(() => {
        const res = parseQuestionText(rawText);
        setParsed(res);
        setEditedStem(res.stem);
        setEditedType(res.type);
        setEditedA(res.optionA);
        setEditedB(res.optionB);
        setEditedC(res.optionC);
        setEditedD(res.optionD);
        setEditedAnswers(res.correctAnswers);
        setEditedExplanation(res.explanation);
        setFormError("");
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [rawText]);

  if (!isOpen) return null;

  // 切換答案勾選
  const toggleAnswer = useCallback((key: string) => {
    setEditedAnswers((prev) => {
      if (editedType === "SINGLE") {
        return [key];
      }
      return prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key].sort();
    });
  }, [editedType]);

  // 切換單選/複選題型
  const handleTypeChange = useCallback((newType: QuestionType) => {
    setEditedType(newType);
    if (newType === "SINGLE") {
      setEditedAnswers((prev) => (prev.length > 0 ? [prev[0]] : ["A"]));
    }
  }, []);

  // 貼入範例格式
  const handlePasteSample = useCallback(() => {
    setRawText(SAMPLE_TEXT);
  }, []);

  // 讀取剪貼簿
  const handleReadClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawText(text);
          setClipboardNotice("已從剪貼簿讀取內容！");
          setTimeout(() => setClipboardNotice(""), 2500);
        } else {
          setClipboardNotice("剪貼簿為空");
          setTimeout(() => setClipboardNotice(""), 2000);
        }
      } else {
        alert("瀏覽器不支援直接讀取剪貼簿，請使用 Ctrl+V / Cmd+V 貼上");
      }
    } catch (err) {
      console.warn("Clipboard access denied:", err);
      alert("無法讀取剪貼簿，請手動在文字框內按 Ctrl+V 貼上");
    }
  }, []);

  // 檢查無誤，帶入主表單（核心推薦流程：先帶入表單檢查確認後再儲存）
  const handleConfirmAndApply = useCallback(() => {
    if (!editedStem.trim()) {
      setFormError("題幹內容不可為空");
      return;
    }
    if (!editedA.trim() || !editedB.trim() || !editedC.trim() || !editedD.trim()) {
      setFormError("A、B、C、D 四個選項皆不可為空");
      return;
    }
    if (editedAnswers.length === 0) {
      setFormError("請至少指定一個正確解答");
      return;
    }

    setFormError("");
    onApply({
      stem: editedStem,
      type: editedType,
      optionA: editedA,
      optionB: editedB,
      optionC: editedC,
      optionD: editedD,
      correctAnswers: editedAnswers,
      explanation: editedExplanation,
    });
    // 清空彈窗內容，便於下次錄入下一題
    setRawText("");
    onClose();
  }, [
    editedStem,
    editedType,
    editedA,
    editedB,
    editedC,
    editedD,
    editedAnswers,
    editedExplanation,
    onApply,
    onClose,
  ]);

  // 檢查無誤，直接送出儲存
  const handleConfirmAndDirectSave = useCallback(async () => {
    if (!onDirectSave) {
      handleConfirmAndApply();
      return;
    }

    if (!editedStem.trim()) {
      setFormError("題幹內容不可為空");
      return;
    }
    if (!editedA.trim() || !editedB.trim() || !editedC.trim() || !editedD.trim()) {
      setFormError("A、B、C、D 四個選項皆不可為空");
      return;
    }
    if (editedAnswers.length === 0) {
      setFormError("請至少指定一個正確解答");
      return;
    }

    setIsDirectSubmitting(true);
    setFormError("");

    try {
      const success = await onDirectSave({
        stem: editedStem,
        type: editedType,
        optionA: editedA,
        optionB: editedB,
        optionC: editedC,
        optionD: editedD,
        correctAnswers: editedAnswers,
        explanation: editedExplanation,
      });

      if (success) {
        setRawText("");
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || "儲存題目失敗");
    } finally {
      setIsDirectSubmitting(false);
    }
  }, [
    onDirectSave,
    handleConfirmAndApply,
    editedStem,
    editedType,
    editedA,
    editedB,
    editedC,
    editedD,
    editedAnswers,
    editedExplanation,
    onClose,
  ]);

  const optionsList = useMemo(
    () => [
      { key: "A", value: editedA, setter: setEditedA, label: "選項 A" },
      { key: "B", value: editedB, setter: setEditedB, label: "選項 B" },
      { key: "C", value: editedC, setter: setEditedC, label: "選項 C" },
      { key: "D", value: editedD, setter: setEditedD, label: "選項 D" },
    ],
    [editedA, editedB, editedC, editedD]
  );

  const isFormValid =
    editedStem.trim().length > 0 &&
    editedA.trim().length > 0 &&
    editedB.trim().length > 0 &&
    editedC.trim().length > 0 &&
    editedD.trim().length > 0 &&
    editedAnswers.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden sm:overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-modal-title"
    >
      <div
        className="relative bg-[#0a0a0c]/95 border-t sm:border border-white/[0.10] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-sheet-up sm:animate-scale-in text-foreground transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Mobile Drag Handle Indicator */}
        <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* 2. Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-2 sm:pt-5 pb-3.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center shadow-[0_0_18px_rgba(168,85,247,0.25)] shrink-0">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2
                id="quick-add-modal-title"
                className="text-base sm:text-lg font-bold font-game text-foreground flex items-center gap-2"
              >
                <span>智慧快速新增</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-[#9AA5FF] border border-accent/30 font-sans font-medium">
                  智慧解析
                </span>
              </h2>
              <p className="text-xs text-foreground-muted">
                貼上題目原始文本，演算法自動分離題幹、選項、答案與解析，確認後帶入表單。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground-muted hover:text-foreground rounded-xl hover:bg-white/[0.05] transition-colors"
            aria-label="關閉視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3. Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-6 space-y-5 text-xs">
          {/* 區塊 1: 文本貼入區 */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-bold font-game text-foreground flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-accent" />
                <span>請在此貼上題目原始文字：</span>
              </label>

              {/* 快捷操作按鈕組 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-foreground-muted hover:text-foreground border border-white/[0.08] text-[11px] font-medium transition-all duration-180 flex items-center gap-1.5 touch-tactile"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>貼上剪貼簿</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-all duration-180 flex items-center gap-1.5 touch-tactile shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>帶入範例格式</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText("")}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-foreground-muted hover:text-rose-400 hover:bg-rose-500/10 text-[11px] font-medium transition-all"
                    title="清空文字"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 剪貼簿提示 */}
            {clipboardNotice && (
              <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-lg animate-fade-in flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{clipboardNotice}</span>
              </div>
            )}

            {/* 大文本輸入框 (iOS Safari 16px zero auto-zoom) */}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              placeholder={`請貼上完整題目，例如：\n8. 專案工作說明書（SOW）主要由下列哪一方提供？\n(A) 需求者、業主或委託人\n(B) 專案贊助者\n(C) 主承包商\n(D) 專案經理\n答案：A\n解析：SOW 由需求者或買方提供...`}
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-xs text-foreground placeholder:text-white/25 leading-relaxed shadow-inner transition-all"
            />
          </div>

          {/* 區塊 2: 結構化解析檢查與微調 (核心功能：給我檢查後再新增) */}
          {parsed && (
            <div className="space-y-4 pt-3 border-t border-white/[0.06] animate-fade-in-up">
              {/* 狀態標題與偵測指標 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <span className="font-bold font-game text-foreground text-xs sm:text-sm">
                    結構化解析預覽與檢查
                  </span>
                  <span className="text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-md font-semibold">
                    已自動解析
                  </span>
                </div>

                {/* 題型快速切換 */}
                <div className="flex items-center gap-1.5 bg-[#020203] p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("SINGLE")}
                    className={`min-h-[32px] px-3 py-1 rounded-lg font-game text-[11px] font-bold transition-all ${
                      editedType === "SINGLE"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    單選題
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("MULTIPLE")}
                    className={`min-h-[32px] px-3 py-1 rounded-lg font-game text-[11px] font-bold transition-all ${
                      editedType === "MULTIPLE"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    複選題
                  </button>
                </div>
              </div>

              {/* 警告提示 (例如未偵測到答案時的友好提示) */}
              {parsed.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] space-y-1 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>解析提示：</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                    {parsed.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 檢查表單預覽卡片 */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-5 space-y-4">
                {/* 1. 題幹預覽與編輯 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold font-game text-foreground flex items-center gap-1.5">
                      <span>題幹內容（已自動去除非必要題號）</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-foreground-muted">
                      {editedStem.length} 字
                    </span>
                  </div>
                  <textarea
                    value={editedStem}
                    onChange={(e) => setEditedStem(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-xs text-foreground placeholder:text-white/20 transition-all leading-relaxed"
                  />
                </div>

                {/* 2. 四個選項預覽與正解指定 */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold font-game text-foreground flex items-center gap-1.5">
                      <span>四個選項 (A、B、C、D)</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-foreground-muted">
                      點擊左側字母按鈕可直接指定或切換正確解答
                    </span>
                  </div>

                  <div className="grid gap-2.5">
                    {optionsList.map((opt) => {
                      const isCorrect = editedAnswers.includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border transition-all duration-180 ${
                            isCorrect
                              ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-100 ring-1 ring-emerald-500/30"
                              : "border-white/[0.06] bg-white/[0.02] text-foreground hover:border-white/[0.12]"
                          }`}
                        >
                          {/* 正解切換按鈕 (Apple HIG 44px compliant) */}
                          <button
                            type="button"
                            onClick={() => toggleAnswer(opt.key)}
                            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center font-bold text-sm font-game transition-all duration-180 flex-shrink-0 touch-tactile ${
                              isCorrect
                                ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                                : "bg-white/[0.05] border border-white/[0.10] text-foreground-muted hover:border-accent hover:text-white"
                            }`}
                            title={`點擊將選項 ${opt.key} 設為正確解答`}
                          >
                            {isCorrect ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              opt.key
                            )}
                          </button>

                          {/* 選項文字編輯框 */}
                          <input
                            type="text"
                            value={opt.value}
                            onChange={(e) => opt.setter(e.target.value)}
                            placeholder={`選項 ${opt.key} 內容...`}
                            className="flex-1 min-w-0 bg-transparent border-none outline-none text-base sm:text-xs text-foreground placeholder:text-white/20 py-1"
                          />

                          {/* 正解標記 */}
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded shrink-0">
                              正解
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 題目解析預覽 */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <label className="font-bold font-game text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>題目解析 / 詳解說明</span>
                      <span className="text-[10px] text-foreground-muted px-2 py-0.2 rounded-full bg-white/[0.04]">
                        選填
                      </span>
                    </label>
                  </div>
                  <textarea
                    value={editedExplanation}
                    onChange={(e) => setEditedExplanation(e.target.value)}
                    rows={2}
                    placeholder="解題思路或相關觀念說明（若無解析可留空）..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-xs text-foreground placeholder:text-white/20 transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
              {(formError.includes("重複") || formError.includes("相似") || formError.includes("存在")) && (
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 font-game text-[11px] font-bold self-start sm:self-auto shrink-0 transition-all"
                >
                  帶入表單查看重複題目
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Modal Sticky Action Footer (雙檢查防護：帶入表單檢查 或 直接儲存) */}
        <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-white/[0.08] p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-white/[0.10] text-foreground-muted hover:text-foreground text-xs font-semibold hover:bg-white/[0.05] transition-colors flex items-center justify-center"
          >
            取消關閉
          </button>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* 途徑 1: 帶入主表單進行最後檢查 (核心推薦流程) */}
            <button
              type="button"
              onClick={handleConfirmAndApply}
              disabled={!parsed || !isFormValid}
              className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile shadow-md ${
                !parsed || !isFormValid
                  ? "bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed"
                  : "bg-accent hover:bg-accent-bright text-white shadow-glow"
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>檢查無誤，帶入表單</span>
            </button>

            {/* 途徑 2: 若有 onDirectSave，支援直接一鍵儲存 */}
            {onDirectSave && (
              <button
                type="button"
                onClick={handleConfirmAndDirectSave}
                disabled={!parsed || !isFormValid || isDirectSubmitting}
                className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile ${
                  !parsed || !isFormValid || isDirectSubmitting
                    ? "bg-white/[0.03] text-white/25 border border-white/[0.06] cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.3)]"
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isDirectSubmitting ? "儲存中..." : "檢查無誤，直接新增"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
