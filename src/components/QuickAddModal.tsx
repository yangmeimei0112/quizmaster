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
  ListPlus,
  Send,
} from "lucide-react";
import { QuestionType } from "@/types/question";
import { parseMultipleQuestions, ParsedQuestionResult } from "@/lib/questionParser";

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
  onBatchSaved?: (data: { createdCount: number; skippedCount: number }) => void;
}

interface EditableQuestionItem {
  stem: string;
  type: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string[];
  explanation: string;
  warnings: string[];
}

const SAMPLE_TEXT_SINGLE = `8. 專案工作說明書（Statement of Work, SOW）主要是由下列哪一方提供？
(A) 需求者、業主或委託人

(B) 專案贊助者（Project Sponsor）

(C) 主承包商（Contractor）

(D) 專案經理（Project Manager）
正確解答：A
解析：專案工作說明書（SOW）是由需求者、客戶或買方撰寫，用以說明要採購的產品、成果或服務規格。`;

const SAMPLE_TEXT_MULTI = `11. 發展專案團隊（Develop Project Team）的產出（Output）為下列哪一項？
(A) 團隊績效評估（Team Performance Assessment）

(B) 績效評鑑的投入（Input）與表揚獎勵系統

(C) 績效改善、績效評鑑的投入（Input）與績效報告（Performance Report）

(D) 工作成果、績效評鑑的投入（Input）與績效報告（Performance Report）

正確解答：A

12. 下列哪一項指的是工作結果的滿意度確認？
(A) 控制品質（Control Quality）

(B) 確認範疇（Validate Scope）

(C) 控制成本（Control Costs）

(D) 控制風險（Control Risks）

正確解答：B`;

export default function QuickAddModal({
  isOpen,
  onClose,
  onApply,
  onDirectSave,
  onBatchSaved,
}: QuickAddModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedList, setParsedList] = useState<EditableQuestionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isParsingPending, startParsingTransition] = useTransition();

  const [isDirectSubmitting, setIsDirectSubmitting] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [clipboardNotice, setClipboardNotice] = useState("");
  const [batchNotice, setBatchNotice] = useState("");

  // 監聽 ESC 鍵關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 當貼入文本變更時，防抖 120ms + useTransition 即時多題切分與解析
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedList([]);
      setActiveIndex(0);
      setFormError("");
      setBatchNotice("");
      return;
    }

    const timer = setTimeout(() => {
      startParsingTransition(() => {
        const results = parseMultipleQuestions(rawText);
        const mapped: EditableQuestionItem[] = results.map((res) => ({
          stem: res.stem,
          type: res.type,
          optionA: res.optionA,
          optionB: res.optionB,
          optionC: res.optionC,
          optionD: res.optionD,
          correctAnswers: res.correctAnswers,
          explanation: res.explanation,
          warnings: res.warnings,
        }));
        setParsedList(mapped);
        setActiveIndex(0);
        setFormError("");
        setBatchNotice("");
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [rawText]);

  // 當前編輯中的題目
  const currentItem = parsedList[activeIndex] || null;

  // 更新當前正在檢視題目的欄位
  const updateCurrentItem = useCallback(
    (updater: (prev: EditableQuestionItem) => EditableQuestionItem) => {
      setParsedList((prevList) => {
        if (!prevList[activeIndex]) return prevList;
        const nextList = [...prevList];
        nextList[activeIndex] = updater(nextList[activeIndex]);
        return nextList;
      });
    },
    [activeIndex]
  );

  // 切換當前題目題型
  const handleTypeChange = useCallback(
    (newType: QuestionType) => {
      updateCurrentItem((prev) => ({
        ...prev,
        type: newType,
        correctAnswers:
          newType === "SINGLE"
            ? prev.correctAnswers.length > 0
              ? [prev.correctAnswers[0]]
              : ["A"]
            : prev.correctAnswers,
      }));
    },
    [updateCurrentItem]
  );

  // 切換答案勾選
  const toggleAnswer = useCallback(
    (key: string) => {
      updateCurrentItem((prev) => {
        let newAnswers: string[];
        if (prev.type === "SINGLE") {
          newAnswers = [key];
        } else {
          newAnswers = prev.correctAnswers.includes(key)
            ? prev.correctAnswers.filter((k) => k !== key)
            : [...prev.correctAnswers, key].sort();
        }
        return {
          ...prev,
          correctAnswers: newAnswers,
        };
      });
    },
    [updateCurrentItem]
  );

  // 貼入單題範例
  const handlePasteSampleSingle = useCallback(() => {
    setRawText(SAMPLE_TEXT_SINGLE);
  }, []);

  // 貼入多題範例 (第 11 題 + 第 12 題)
  const handlePasteSampleMulti = useCallback(() => {
    setRawText(SAMPLE_TEXT_MULTI);
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

  // 檢查無誤，帶入主表單（帶入當前選中之題目）
  const handleConfirmAndApply = useCallback(() => {
    if (!currentItem) return;

    if (!currentItem.stem.trim()) {
      setFormError("題幹內容不可為空");
      return;
    }
    if (
      !currentItem.optionA.trim() ||
      !currentItem.optionB.trim() ||
      !currentItem.optionC.trim() ||
      !currentItem.optionD.trim()
    ) {
      setFormError("A、B、C、D 四個選項皆不可為空");
      return;
    }
    if (currentItem.correctAnswers.length === 0) {
      setFormError("請至少指定一個正確解答");
      return;
    }

    setFormError("");
    onApply({
      stem: currentItem.stem,
      type: currentItem.type,
      optionA: currentItem.optionA,
      optionB: currentItem.optionB,
      optionC: currentItem.optionC,
      optionD: currentItem.optionD,
      correctAnswers: currentItem.correctAnswers,
      explanation: currentItem.explanation,
    });
    setRawText("");
    setParsedList([]);
    onClose();
  }, [currentItem, onApply, onClose]);

  // 單題直接新增
  const handleConfirmAndDirectSave = useCallback(async () => {
    if (!currentItem || !onDirectSave) {
      handleConfirmAndApply();
      return;
    }

    if (!currentItem.stem.trim()) {
      setFormError("題幹內容不可為空");
      return;
    }
    if (
      !currentItem.optionA.trim() ||
      !currentItem.optionB.trim() ||
      !currentItem.optionC.trim() ||
      !currentItem.optionD.trim()
    ) {
      setFormError("A、B、C、D 四個選項皆不可為空");
      return;
    }
    if (currentItem.correctAnswers.length === 0) {
      setFormError("請至少指定一個正確解答");
      return;
    }

    setIsDirectSubmitting(true);
    setFormError("");

    try {
      const success = await onDirectSave({
        stem: currentItem.stem,
        type: currentItem.type,
        optionA: currentItem.optionA,
        optionB: currentItem.optionB,
        optionC: currentItem.optionC,
        optionD: currentItem.optionD,
        correctAnswers: currentItem.correctAnswers,
        explanation: currentItem.explanation,
      });

      if (success) {
        setRawText("");
        setParsedList([]);
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || "儲存題目失敗");
    } finally {
      setIsDirectSubmitting(false);
    }
  }, [currentItem, onDirectSave, handleConfirmAndApply, onClose]);

  // 批次新增全部已解析題目 (多題同時新增核心功能)
  const handleBatchSaveAll = useCallback(async () => {
    if (parsedList.length === 0) return;

    // 前置驗證各題完整性
    for (let i = 0; i < parsedList.length; i++) {
      const q = parsedList[i];
      if (!q.stem.trim()) {
        setActiveIndex(i);
        setFormError(`第 ${i + 1} 題題幹不可為空，請核對後再送出`);
        return;
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        setActiveIndex(i);
        setFormError(`第 ${i + 1} 題的 A、B、C、D 四個選項皆不可為空`);
        return;
      }
      if (q.correctAnswers.length === 0) {
        setActiveIndex(i);
        setFormError(`第 ${i + 1} 題請至少指定一個正確解答`);
        return;
      }
    }

    setIsBatchSubmitting(true);
    setFormError("");
    setBatchNotice("正在批次新增題目至題庫中...");

    try {
      const res = await fetch("/api/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: parsedList.map((item) => ({
            stem: item.stem,
            type: item.type,
            optionA: item.optionA,
            optionB: item.optionB,
            optionC: item.optionC,
            optionD: item.optionD,
            correctAnswers: item.correctAnswers,
            explanation: item.explanation,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "批次新增題目失敗");
      }

      let notice = `🎉 成功新增 ${data.createdCount} 道題目！`;
      if (data.skippedCount > 0) {
        notice += `（已自動略過 ${data.skippedCount} 題重複題目）`;
      }
      setBatchNotice(notice);

      setTimeout(() => {
        setRawText("");
        setParsedList([]);
        onClose();
        if (onBatchSaved) {
          onBatchSaved({
            createdCount: data.createdCount,
            skippedCount: data.skippedCount,
          });
        }
      }, 1400);
    } catch (err: any) {
      setFormError(err.message || "批次新增題目發生伺服器異常");
      setBatchNotice("");
    } finally {
      setIsBatchSubmitting(false);
    }
  }, [parsedList, onClose, onBatchSaved]);

  const optionsList = useMemo(() => {
    if (!currentItem) return [];
    return [
      {
        key: "A",
        value: currentItem.optionA,
        setter: (val: string) => updateCurrentItem((q) => ({ ...q, optionA: val })),
        label: "選項 A",
      },
      {
        key: "B",
        value: currentItem.optionB,
        setter: (val: string) => updateCurrentItem((q) => ({ ...q, optionB: val })),
        label: "選項 B",
      },
      {
        key: "C",
        value: currentItem.optionC,
        setter: (val: string) => updateCurrentItem((q) => ({ ...q, optionC: val })),
        label: "選項 C",
      },
      {
        key: "D",
        value: currentItem.optionD,
        setter: (val: string) => updateCurrentItem((q) => ({ ...q, optionD: val })),
        label: "選項 D",
      },
    ];
  }, [currentItem, updateCurrentItem]);

  const isCurrentFormValid =
    currentItem &&
    currentItem.stem.trim().length > 0 &&
    currentItem.optionA.trim().length > 0 &&
    currentItem.optionB.trim().length > 0 &&
    currentItem.optionC.trim().length > 0 &&
    currentItem.optionD.trim().length > 0 &&
    currentItem.correctAnswers.length > 0;

  if (!isOpen) return null;

  const isMultiMode = parsedList.length > 1;

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
                  {isMultiMode ? `多題辨識 (${parsedList.length} 題)` : "單題/多題解析"}
                </span>
              </h2>
              <p className="text-xs text-foreground-muted">
                貼上題目原始文本（支援多題同時新增），演算法自動分離題幹、選項與正解。
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
                <span>請在此貼上題目原始文字（支援多題同時貼入）：</span>
              </label>

              {/* 快捷操作按鈕組 */}
              <div className="flex items-center flex-wrap gap-2">
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
                  onClick={handlePasteSampleMulti}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-all duration-180 flex items-center gap-1.5 touch-tactile shadow-sm"
                  title="帶入多題範例（第 11 題 + 第 12 題）"
                >
                  <ListPlus className="w-3.5 h-3.5 text-purple-400" />
                  <span>多題範例 (11 & 12)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteSampleSingle}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-foreground-muted hover:text-foreground border border-white/[0.08] text-[11px] font-medium transition-all duration-180 flex items-center gap-1.5 touch-tactile"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>單題範例</span>
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

            {/* 大文本輸入框 */}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={4}
              placeholder={`支援單題或多題一次貼入，例如：\n11. 發展專案團隊的產出為下列哪一項？\n(A) 團隊績效評估\n(B) 績效評鑑投入\n(C) 績效改善\n(D) 工作成果\n正確解答：A\n\n12. 下列哪一項指的是工作結果滿意度確認？\n(A) 控制品質\n(B) 確認範疇\n(C) 控制成本\n(D) 控制風險\n正確解答：B`}
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-xs text-foreground placeholder:text-white/25 leading-relaxed shadow-inner transition-all"
            />
          </div>

          {/* 區塊 2: 結構化解析檢查與微調 (核心功能：給我檢查後再新增) */}
          {parsedList.length > 0 && currentItem && (
            <div className="space-y-4 pt-3 border-t border-white/[0.06] animate-fade-in-up">
              {/* 多題導航分頁膠囊 (當偵測到 >= 2 道題目時顯示) */}
              {isMultiMode && (
                <div className="space-y-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-accent/10 to-transparent border border-purple-500/25">
                  <div className="flex items-center justify-between">
                    <span className="font-game font-bold text-foreground text-xs flex items-center gap-1.5">
                      <ListPlus className="w-4 h-4 text-purple-400" />
                      <span>✨ 成功偵測到 {parsedList.length} 道題目（點擊切換檢查各題）：</span>
                    </span>
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                      正在檢查第 {activeIndex + 1} 題
                    </span>
                  </div>

                  {/* 題目切換膠囊列 */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                    {parsedList.map((item, idx) => {
                      const isActive = idx === activeIndex;
                      const isItemValid =
                        item.stem.trim().length > 0 &&
                        item.optionA.trim().length > 0 &&
                        item.optionB.trim().length > 0 &&
                        item.optionC.trim().length > 0 &&
                        item.optionD.trim().length > 0 &&
                        item.correctAnswers.length > 0;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-game text-xs font-bold transition-all duration-180 flex items-center gap-2 shrink-0 touch-tactile ${
                            isActive
                              ? "bg-accent text-white shadow-glow border border-accent-bright"
                              : "bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08] hover:bg-white/[0.08]"
                          }`}
                        >
                          <span>第 {idx + 1} 題</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                            }`}
                          >
                            正解 {item.correctAnswers.join("") || "?"}
                          </span>
                          {isItemValid && (
                            <Check
                              className={`w-3 h-3 ${
                                isActive ? "text-emerald-300" : "text-emerald-400"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 狀態標題與偵測指標 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <span className="font-bold font-game text-foreground text-xs sm:text-sm">
                    {isMultiMode ? `第 ${activeIndex + 1} 題檢查與微調` : "結構化解析預覽與檢查"}
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
                      currentItem.type === "SINGLE"
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
                      currentItem.type === "MULTIPLE"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    複選題
                  </button>
                </div>
              </div>

              {/* 警告提示 */}
              {currentItem.warnings && currentItem.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] space-y-1 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>解析提示：</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                    {currentItem.warnings.map((w, i) => (
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
                      {currentItem.stem.length} 字
                    </span>
                  </div>
                  <textarea
                    value={currentItem.stem}
                    onChange={(e) =>
                      updateCurrentItem((q) => ({ ...q, stem: e.target.value }))
                    }
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
                      const isCorrect = currentItem.correctAnswers.includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border transition-all duration-180 ${
                            isCorrect
                              ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-100 ring-1 ring-emerald-500/30"
                              : "border-white/[0.06] bg-white/[0.02] text-foreground hover:border-white/[0.12]"
                          }`}
                        >
                          {/* 正解切換按鈕 */}
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
                    value={currentItem.explanation}
                    onChange={(e) =>
                      updateCurrentItem((q) => ({ ...q, explanation: e.target.value }))
                    }
                    rows={2}
                    placeholder="解題思路或相關觀念說明（若無解析可留空）..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-xs text-foreground placeholder:text-white/20 transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 批次成功訊息 */}
          {batchNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{batchNotice}</span>
            </div>
          )}

          {/* 錯誤訊息 */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Modal Sticky Action Footer (支援多題批次全部新增與帶入表單) */}
        <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-white/[0.08] p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-white/[0.10] text-foreground-muted hover:text-foreground text-xs font-semibold hover:bg-white/[0.05] transition-colors flex items-center justify-center"
          >
            取消關閉
          </button>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* 多題模式專屬：一鍵批次新增全部題目 (Recommended Action) */}
            {isMultiMode ? (
              <>
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  disabled={!isCurrentFormValid}
                  className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile border ${
                    !isCurrentFormValid
                      ? "bg-white/[0.04] text-white/30 border-white/[0.06] cursor-not-allowed"
                      : "bg-white/[0.06] hover:bg-white/[0.10] text-foreground border-white/[0.12]"
                  }`}
                  title="帶入目前檢視中的題目至新增表單"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>帶入第 {activeIndex + 1} 題至表單</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchSaveAll}
                  disabled={isBatchSubmitting}
                  className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile shadow-md ${
                    isBatchSubmitting
                      ? "bg-emerald-800 text-white/50 cursor-wait"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                  }`}
                >
                  <ListPlus className="w-4 h-4" />
                  <span>
                    {isBatchSubmitting
                      ? "批次儲存中..."
                      : `檢查無誤，全部新增 (${parsedList.length} 題)`}
                  </span>
                </button>
              </>
            ) : (
              /* 單題模式專屬流程 */
              <>
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  disabled={!currentItem || !isCurrentFormValid}
                  className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile shadow-md ${
                    !currentItem || !isCurrentFormValid
                      ? "bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed"
                      : "bg-accent hover:bg-accent-bright text-white shadow-glow"
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>檢查無誤，帶入表單</span>
                </button>

                {onDirectSave && (
                  <button
                    type="button"
                    onClick={handleConfirmAndDirectSave}
                    disabled={!currentItem || !isCurrentFormValid || isDirectSubmitting}
                    className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile ${
                      !currentItem || !isCurrentFormValid || isDirectSubmitting
                        ? "bg-white/[0.03] text-white/25 border border-white/[0.06] cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.3)]"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isDirectSubmitting ? "儲存中..." : "檢查無誤，直接新增"}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
