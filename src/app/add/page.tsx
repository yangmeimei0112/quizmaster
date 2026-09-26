"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowLeft,
  Eye,
  Check,
  XCircle,
  RefreshCw,
  ClipboardPaste,
} from "lucide-react";
import { SimilarMatch, QuestionType } from "@/types/question";
import QuickAddModal from "@/components/QuickAddModal";
import ImageAttachmentField from "@/components/ImageAttachmentField";
import { invalidateQuestionsCache } from "@/lib/questionsCache";

export default function AddQuestionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 表單狀態
  const [stem, setStem] = useState("");
  const [type, setType] = useState<QuestionType>("SINGLE");
  const [imageUrl, setImageUrl] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(["A"]);
  const [explanation, setExplanation] = useState("");

  // 防重複比對狀態
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<SimilarMatch[]>([]);
  const [hasExactMatch, setHasExactMatch] = useState(false);
  const [maxSimilarity, setMaxSimilarity] = useState(0);

  // 提交與彈窗防呆狀態
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // 當題幹輸入時，Debounced 即時防重複比對 (350ms) + AbortController 防止過期競態
  useEffect(() => {
    if (!stem.trim() || stem.trim().length < 2) {
      setDuplicateMatches([]);
      setHasExactMatch(false);
      setMaxSimilarity(0);
      setIsCheckingDuplicate(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await fetch("/api/questions/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stem,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswers,
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          startTransition(() => {
            setDuplicateMatches(data.matches || []);
            setHasExactMatch(data.hasExactMatch || false);
            setMaxSimilarity(data.maxSimilarity || 0);
          });
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("即時比對失敗:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingDuplicate(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [stem, optionA, optionB, optionC, optionD, correctAnswers]);

  // 切換題型時的答案處理
  const handleTypeChange = useCallback((newType: QuestionType) => {
    setType(newType);
    if (newType === "SINGLE") {
      // 若轉為單選，只保留第一個選中的答案，若無則預設為 A
      setCorrectAnswers((prev) => (prev.length > 0 ? [prev[0]] : ["A"]));
    }
  }, []);

  // 切換選項正確性
  const toggleAnswer = useCallback((optKey: string) => {
    setType((currentType) => {
      if (currentType === "SINGLE") {
        setCorrectAnswers([optKey]);
      } else {
        setCorrectAnswers((prev) => {
          if (prev.includes(optKey)) {
            return prev.filter((k) => k !== optKey);
          } else {
            return [...prev, optKey].sort();
          }
        });
      }
      return currentType;
    });
  }, []);

  // 智慧快速新增：帶入主表單檢查
  const handleQuickApply = useCallback((data: {
    stem: string;
    type: QuestionType;
    imageUrl?: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
  }) => {
    setStem(data.stem);
    setType(data.type);
    setImageUrl(data.imageUrl || "");
    setOptionA(data.optionA);
    setOptionB(data.optionB);
    setOptionC(data.optionC);
    setOptionD(data.optionD);
    setCorrectAnswers(data.correctAnswers);
    setExplanation(data.explanation || "");
    setErrorMsg("");
    setSuccessMsg("✨ 已成功帶入智慧解析題目！請核對題目內容與即時防重複提示，確認無誤後點擊「儲存題目至題庫」。");
    setTimeout(() => setSuccessMsg(""), 5000);
  }, []);

  // 智慧快速新增：直接送出儲存
  const handleDirectSave = useCallback(async (data: {
    stem: string;
    type: QuestionType;
    imageUrl?: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
    forceCreate?: boolean;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem: data.stem,
          type: data.type,
          imageUrl: data.imageUrl || undefined,
          optionA: data.optionA,
          optionB: data.optionB,
          optionC: data.optionC,
          optionD: data.optionD,
          correctAnswers: data.correctAnswers,
          explanation: data.explanation,
          forceCreate: data.forceCreate ?? false,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (resData.requiresConfirmation) {
          // 若有相似題目需確認，先將資料帶入表單並開啟防呆確認視窗
          handleQuickApply(data);
          setShowConfirmModal(true);
          return true;
        }
        if (resData.isDuplicate || resData.exactMatch) {
          // 若題庫中已存在完全相同題目，自動回填表單以便使用者檢視重複題目資訊
          handleQuickApply(data);
          setErrorMsg(resData.error || "題庫中已存在完全相同的題目，禁止重複錄入！請查看下方重複警示。");
          return true;
        }
        throw new Error(resData.error || "儲存題目失敗");
      }

      setSuccessMsg("🎉 題目快速新增成功！");
      setTimeout(() => setSuccessMsg(""), 3500);

      // 清空表單
      setStem("");
      setImageUrl("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswers(["A"]);
      setExplanation("");
      setDuplicateMatches([]);
      setHasExactMatch(false);
      setMaxSimilarity(0);

      return true;
    } catch (err: any) {
      throw err;
    }
  }, [handleQuickApply]);

  // 智慧快速新增：批次新增多題完成通知
  const handleBatchSaved = useCallback((data: { createdCount: number; skippedCount: number }) => {
    let msg = `🎉 成功批次新增 ${data.createdCount} 道題目！`;
    if (data.skippedCount > 0) {
      msg += `（已自動略過 ${data.skippedCount} 題重複題目）`;
    }
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 6000);
  }, []);

  // 表單驗證與送出
  const handleSubmit = useCallback(async (force: boolean = false) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!stem.trim()) {
      setErrorMsg("請填寫題幹內容");
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMsg("A、B、C、D 四個選項皆不可為空白");
      return;
    }
    if (correctAnswers.length === 0) {
      setErrorMsg("請至少指定一個正確解答");
      return;
    }

    // 100% 完全重複直接強制阻擋
    if (hasExactMatch && !force) {
      setErrorMsg("題庫中已存在完全相同 (100%) 的題目，禁止重複錄入！請查看下方重複警示。");
      return;
    }

    // 若相似度很高 (>= 80%) 且尚未確認過，彈窗要求確認
    if (maxSimilarity >= 80 && !force) {
      setShowConfirmModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem,
          type,
          imageUrl: imageUrl || undefined,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswers,
          explanation,
          forceCreate: force,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfirmation) {
          setShowConfirmModal(true);
        } else {
          setErrorMsg(data.error || "儲存題目失敗");
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("🎉 題目新增成功！");
      setShowConfirmModal(false);
      invalidateQuestionsCache();

      // 重置表單但保留分類與題型方便連續錄入
      setStem("");
      setImageUrl("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswers(type === "SINGLE" ? ["A"] : ["A"]);
      setExplanation("");
      setDuplicateMatches([]);
      setHasExactMatch(false);
      setMaxSimilarity(0);

      // 3 秒後自動隱藏成功提示
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg("伺服器連線異常: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    stem,
    imageUrl,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswers,
    hasExactMatch,
    maxSimilarity,
    type,
    explanation,
  ]);

  const optionsList = useMemo(
    () => [
      { key: "A", value: optionA, setter: setOptionA, label: "選項 A" },
      { key: "B", value: optionB, setter: setOptionB, label: "選項 B" },
      { key: "C", value: optionC, setter: setOptionC, label: "選項 C" },
      { key: "D", value: optionD, setter: setOptionD, label: "選項 D" },
    ],
    [optionA, optionB, optionC, optionD]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/questions"
            className="min-h-[44px] inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground mb-1 transition-colors duration-200 ease-expo-out touch-manipulation group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>返回題庫清單</span>
          </Link>
          <h1 className="text-2xl font-bold font-game text-foreground flex items-center gap-2.5">
            <PlusCircle className="w-6 h-6 text-accent" />
            單題手動錄入
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            支援 4 選項單選與複選題，打字時系統將以演算法即時偵測重複題目。
          </p>
        </div>

        {/* Action Controls Group: 快速新增 + 題型切換 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* 智慧快速新增按鈕 */}
          <button
            type="button"
            onClick={() => setShowQuickAddModal(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500/20 via-accent/20 to-purple-500/20 hover:from-purple-500/30 hover:via-accent/30 hover:to-purple-500/30 text-white font-game font-bold text-xs sm:text-sm border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.25)] flex items-center justify-center gap-2 transition-all duration-200 ease-expo-out touch-manipulation touch-tactile group"
            title="貼上完整題目文字進行智慧解析"
          >
            <Sparkles className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
            <span>快速新增</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40">
              貼上解析
            </span>
          </button>

          {/* Nintendo Switch Glowing Capsule Switcher */}
          <div className="bg-[#020203] p-1.5 rounded-2xl grid grid-cols-2 sm:flex items-center gap-1.5 border border-white/[0.08] shadow-inner w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleTypeChange("SINGLE")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-game transition-all duration-200 ease-expo-out flex items-center justify-center gap-1.5 ${
                type === "SINGLE"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "text-foreground-muted hover:text-foreground border border-transparent"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>單選題</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("MULTIPLE")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-game transition-all duration-200 ease-expo-out flex items-center justify-center gap-1.5 ${
                type === "MULTIPLE"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  : "text-foreground-muted hover:text-foreground border border-transparent"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>複選題</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-sm font-medium flex items-center justify-between shadow-[0_0_24px_rgba(16,185,129,0.15)] animate-fade-in-down">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <Link
            href="/questions"
            className="min-h-[44px] inline-flex items-center px-2 text-xs text-emerald-300 underline font-semibold hover:text-white transition-colors touch-manipulation"
          >
            前往題庫查看
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm font-medium flex items-center gap-2.5 shadow-[0_0_24px_rgba(244,63,94,0.15)] animate-fade-in-down">
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-[#0a0a0c]/90 rounded-3xl border border-white/[0.06] shadow-linear-card p-4 sm:p-8 space-y-6 backdrop-blur-md animate-fade-in-up">
        {/* 智慧快速新增引導橫幅 */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-accent/15 to-white/[0.02] border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_0_18px_rgba(168,85,247,0.1)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <ClipboardPaste className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold font-game text-foreground flex items-center gap-1.5">
                <span>手邊有完整題目文字？使用智慧快速新增</span>
                <span className="text-[10px] text-purple-300 bg-purple-500/25 border border-purple-400/30 px-2 py-0.2 rounded-full font-medium">
                  推薦
                </span>
              </div>
              <p className="text-foreground-muted text-[11px] truncate min-w-0 mt-0.5">
                一鍵貼上整道題目，演算法自動分離題號、題幹、四個選項、答案與解析，核對後帶入表單。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowQuickAddModal(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold font-game shrink-0 flex items-center justify-center gap-1.5 transition-all duration-200 ease-expo-out touch-manipulation touch-tactile shadow-sm self-stretch sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>開啟快速新增</span>
          </button>
        </div>

        {/* 1. 題幹輸入 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-game text-foreground flex items-center gap-1.5">
              <span>題幹內容</span>
              <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              {isCheckingDuplicate && (
                <span className="text-[11px] text-[#9AA5FF] flex items-center gap-1.5 bg-accent/15 px-2.5 py-0.5 rounded-full font-medium border border-accent/30 shadow-sm animate-pulse-subtle">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  防重複比對中...
                </span>
              )}
              <span className="text-xs text-foreground-muted">
                {stem.length} 字
              </span>
            </div>
          </div>

          <textarea
            value={stem}
            onChange={(e) => setStem(e.target.value)}
            rows={3}
            placeholder="請輸入題目完整描述..."
            className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-sm text-foreground transition-all duration-200 ease-expo-out placeholder:text-white/30 shadow-inner"
          />

          {/* 即時防重複比對警告區塊 */}
          {hasExactMatch && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs space-y-3 shadow-[0_0_24px_rgba(244,63,94,0.15)] animate-fade-in-down">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-300 font-game">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                <span>⚠️ 題庫中已有完全相同 (100%) 的題目！</span>
              </div>
              <p className="text-rose-200/90 leading-relaxed">
                系統已偵測到完全吻合的題幹，系統已禁止送出以防止重複收錄：
              </p>
              {duplicateMatches.slice(0, 1).map((m) => (
                <div
                  key={m.id}
                  className="bg-black/50 p-3 rounded-xl border border-rose-500/20 flex items-center justify-between gap-3 min-w-0"
                >
                  <span className="text-foreground font-medium truncate min-w-0">
                    「{m.stem}」
                  </span>
                  <Link
                    href={`/questions?q=${encodeURIComponent(m.stem)}`}
                    target="_blank"
                    className="min-h-[44px] px-2.5 text-rose-300 font-bold hover:text-white inline-flex items-center gap-1 whitespace-nowrap text-[11px] transition-colors shrink-0 touch-manipulation touch-tactile"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    查看該題
                  </Link>
                </div>
              ))}
            </div>
          )}

          {!hasExactMatch && duplicateMatches.length > 0 && maxSimilarity >= 80 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-3 shadow-[0_0_24px_rgba(245,158,11,0.15)] animate-fade-in-down">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-300 font-game">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                  <span>
                    系統偵測到可能重複的相似題目 (最高相似度 {maxSimilarity}%)
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 font-bold text-amber-300 border border-amber-500/30">
                  共找到 {duplicateMatches.length} 筆相似
                </span>
              </div>

              <div className="space-y-2">
                {duplicateMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-black/50 p-2.5 rounded-xl border border-amber-500/20 flex items-center justify-between gap-3 min-w-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        {m.similarity}% 相似
                      </span>
                      <span className="text-foreground text-xs truncate min-w-0">
                        {m.stem}
                      </span>
                    </div>
                    <Link
                      href={`/questions?q=${encodeURIComponent(m.stem)}`}
                      target="_blank"
                      className="min-h-[44px] px-2.5 text-amber-300 font-semibold hover:text-white inline-flex items-center gap-1 whitespace-nowrap text-[11px] transition-colors shrink-0 touch-manipulation touch-tactile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      比對
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 題目附圖 (選填) */}
        <div className="pt-1">
          <ImageAttachmentField
            value={imageUrl}
            onChange={setImageUrl}
            disabled={isSubmitting}
            label="題目附圖（選填）"
          />
        </div>

        {/* 2. 四個選項輸入 (A, B, C, D) */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-game text-foreground flex items-center gap-1.5">
              <span>四個選項 (A、B、C、D)</span>
              <span className="text-rose-400">*</span>
            </label>
            <span className="text-xs text-foreground-muted">
              {type === "SINGLE" ? "請點擊按鈕指定 1 個正確解答" : "請點擊按鈕勾選 1~4 個正確解答"}
            </span>
          </div>

          <div className="grid gap-3.5">
            {optionsList.map((opt) => {
              const isCorrect = correctAnswers.includes(opt.key);
              return (
                <div
                  key={opt.key}
                  className={`flex items-center gap-3 sm:gap-3.5 p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 ease-expo-out ${
                    isCorrect
                      ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-100 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] text-foreground"
                  }`}
                >
                  {/* 正確解答勾選切換按鈕 (Apple HIG 44px compliant) */}
                  <button
                    type="button"
                    onClick={() => toggleAnswer(opt.key)}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center font-bold text-base font-game transition-all duration-200 ease-expo-out flex-shrink-0 touch-manipulation touch-tactile ${
                      isCorrect
                        ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        : "bg-white/[0.05] border border-white/[0.10] text-foreground-muted hover:border-accent hover:text-white"
                    }`}
                    title={`點擊將選項 ${opt.key} 設為正確解答`}
                  >
                    {isCorrect ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      opt.key
                    )}
                  </button>

                  {/* 選項文字輸入框 (iOS Safari 16px zero auto-zoom) */}
                  <input
                    type="text"
                    value={opt.value}
                    onChange={(e) => opt.setter(e.target.value)}
                    placeholder={`請輸入選項 ${opt.key} 的內容...`}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-base sm:text-sm text-foreground placeholder:text-white/30 py-2"
                  />

                  {/* 標籤顯示 */}
                  {isCorrect && (
                    <span className="font-game text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg shrink-0 shadow-sm animate-fade-in">
                      正解 {opt.key}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 題目解析 (選填) */}
        <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-game text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>題目解析 / 詳解說明</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.05] text-foreground-muted border border-white/[0.08]">
                選填 (Optional)
              </span>
            </label>
            <span className="text-[11px] text-foreground-muted">
              匯出 Google 文件時可自由勾選是否要包含此解析
            </span>
          </div>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            placeholder="請輸入解題思路、相關公式、觀念或考點說明（非必填，若不填寫可直接留空）..."
            className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-sm text-foreground placeholder:text-white/30 shadow-inner transition-all duration-200 ease-expo-out"
          />
        </div>

        {/* 4. 送出按鈕與狀態摘要 (Thumb-Friendly CTA) */}
        <div className="pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-foreground-muted flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <span className="font-semibold text-foreground">目前題型：</span>
            <span className="font-medium text-foreground">{type === "SINGLE" ? "單選題" : "複選題"}</span>
            <span className="text-white/20">|</span>
            <span className="font-semibold text-foreground">正解：</span>
            <span className="font-bold text-emerald-400 font-game">
              {correctAnswers.join(", ") || "未指定"}
            </span>
          </div>

          <div className="w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || hasExactMatch}
              className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 sm:py-3 rounded-xl text-sm font-bold font-game shadow-md transition-all duration-200 ease-expo-out flex items-center justify-center gap-2 touch-manipulation touch-tactile ${
                hasExactMatch
                  ? "bg-rose-950/40 text-rose-400/50 border border-rose-800/30 cursor-not-allowed shadow-none"
                  : "bg-accent hover:bg-accent-bright text-white shadow-glow"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? "儲存中..." : "儲存題目至題庫"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 高度相似題目防呆確認視窗 (Mobile Bottom Sheet & Desktop Modal) */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden sm:overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div 
            className="bg-[#0a0a0c]/95 max-w-lg w-full max-h-[90dvh] rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl border-t sm:border border-white/[0.10] space-y-5 backdrop-blur-2xl animate-sheet-up sm:animate-scale-in pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain scroll-touch transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle Indicator */}
            <div className="pt-1 pb-1 sm:hidden flex justify-center shrink-0" aria-hidden="true">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-game text-foreground">
                  發現高度相似題目 (相似度 {maxSimilarity}%)
                </h3>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                  題庫中已存在與您輸入極為相似的題目，請確認是否為不同變形題或確定需要重複錄入：
                </p>
              </div>
            </div>

            {duplicateMatches.length > 0 && (
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] text-xs space-y-1.5">
                <span className="font-semibold text-amber-300">已存在之相似題目：</span>
                <p className="text-foreground font-medium break-words">「{duplicateMatches[0].stem}」</p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-white/[0.10] text-foreground text-xs font-semibold hover:bg-white/[0.05] transition-colors duration-200 ease-expo-out flex items-center justify-center touch-manipulation touch-tactile"
              >
                取消並檢查
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold font-game shadow-[0_0_20px_rgba(217,119,6,0.35)] transition-all duration-200 ease-expo-out active:scale-95 flex items-center justify-center touch-manipulation touch-tactile"
              >
                仍要新增此題
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 智慧快速新增彈窗 (包含即時解析與結構化檢查預覽) */}
      <QuickAddModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onApply={handleQuickApply}
        onDirectSave={handleDirectSave}
        onBatchSaved={handleBatchSaved}
      />
    </div>
  );
}