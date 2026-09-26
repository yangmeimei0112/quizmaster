"use client";

import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react";
import {
  Sparkles,
  ClipboardPaste,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Layers,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  ListPlus,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { QuestionType, QuestionDuplicateStatus, SimilarMatch } from "@/types/question";
import { parseMultipleQuestions, ParsedQuestionResult } from "@/lib/questionParser";
import { normalizeText, calculateSimilarity, compareQuestionOptions } from "@/lib/similarity";
import ImageAttachmentField from "@/components/ImageAttachmentField";
import { invalidateQuestionsCache } from "@/lib/questionsCache";
import { normalizeExplanationToFourSections } from "@/lib/explanationParser";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    stem: string;
    type: QuestionType;
    imageUrl?: string;
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
    imageUrl?: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
    forceCreate?: boolean;
  }) => Promise<boolean>;
  onBatchSaved?: (data: { createdCount: number; skippedCount: number }) => void;
}

interface EditableQuestionItem {
  stem: string;
  type: QuestionType;
  imageUrl?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string[];
  explanation: string;
  warnings: string[];
}

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

  const [duplicateStatuses, setDuplicateStatuses] = useState<QuestionDuplicateStatus[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [verifiedStatuses, setVerifiedStatuses] = useState<Record<number, 'IS_DUPLICATE' | 'NOT_DUPLICATE' | null>>({});
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const lastCheckedKeyRef = useRef<string>("");

  // 題目切換膠囊橫向容器與當前選中膠囊之 ref (用於方向鍵切換時自動平滑滾動跟隨)
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeCapsuleRef = useRef<HTMLButtonElement | null>(null);

  // 當 activeIndex 改變（例如透過鍵盤 ← / → 或點擊切換題目），自動將亮紫色選中的題目膠囊平滑滾動至可視範圍置中
  useEffect(() => {
    if (!isOpen || parsedList.length <= 1) return;

    const rafId = requestAnimationFrame(() => {
      const container = tabsContainerRef.current;
      const target = activeCapsuleRef.current;
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // 計算 target 在目前容器 scroll 座標系中的相對位置
      const relativeTargetLeft = targetRect.left - containerRect.left + container.scrollLeft;

      // 欲將該膠囊置中於容器可視寬度的 targetScrollLeft
      const targetScrollLeft =
        relativeTargetLeft - containerRect.width / 2 + targetRect.width / 2;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      const safeScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));

      container.scrollTo({
        left: safeScrollLeft,
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeIndex, isOpen, parsedList.length]);

  // 當貼入文本變更時，防抖 120ms + useTransition 即時多題切分與解析
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedList([]);
      setActiveIndex(0);
      setFormError("");
      setBatchNotice("");
      setDuplicateStatuses([]);
      setIsCheckingDuplicates(false);
      setVerifiedStatuses({});
      setShowComparisonModal(false);
      lastCheckedKeyRef.current = "";
      return;
    }

    const timer = setTimeout(() => {
      startParsingTransition(() => {
        const results = parseMultipleQuestions(rawText);
        const mapped: EditableQuestionItem[] = results.map((res) => ({
          stem: res.stem,
          type: res.type,
          imageUrl: res.imageUrl || "",
          optionA: res.optionA,
          optionB: res.optionB,
          optionC: res.optionC,
          optionD: res.optionD,
          correctAnswers: res.correctAnswers,
          explanation: res.explanation
            ? normalizeExplanationToFourSections(
                res.explanation,
                { A: res.optionA, B: res.optionB, C: res.optionC, D: res.optionD },
                res.correctAnswers
              )
            : "",
          warnings: res.warnings,
        }));
        setParsedList(mapped);
        setActiveIndex(0);
        setFormError("");
        setBatchNotice("");
        setDuplicateStatuses([]);
        setVerifiedStatuses({});
        setShowComparisonModal(false);
        lastCheckedKeyRef.current = "";
        setIsCheckingDuplicates(mapped.length > 0);
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [rawText]);

  // 題幹清單比對鍵值 (用於監聽題幹變更，觸發即時防重複檢測)
  const stemsKey = useMemo(() => {
    return JSON.stringify(parsedList.map((q) => q.stem.trim()));
  }, [parsedList]);

  // 當解析出的題目或題幹變更時，進行 Debounced (200ms) 題庫與同批次防重複比對
  useEffect(() => {
    if (parsedList.length === 0) {
      setDuplicateStatuses([]);
      setIsCheckingDuplicates(false);
      return;
    }

    const stems = parsedList.map((q) => q.stem.trim());
    setIsCheckingDuplicates(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/questions/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: parsedList.map((q) => ({
              stem: q.stem,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctAnswers: q.correctAnswers,
            })),
            stems,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("比對題庫失敗");
        }

        const data = await res.json();
        const dbResults: Array<{
          stem: string;
          hasExactMatch: boolean;
          hasHighSimilarity: boolean;
          maxSimilarity: number;
          matches: SimilarMatch[];
        }> = data.results || [];

        // 同時進行同批次內部互相重複比對 (Intra-batch duplicate check)
        const computedStatuses: QuestionDuplicateStatus[] = [];

        for (let i = 0; i < parsedList.length; i++) {
          const currentStem = parsedList[i].stem.trim();
          const dbRes = dbResults[i];

          // 比對同批次在目前題目之前的題目 (j < i)
          let batchExactMatch = false;
          let batchMaxSim = 0;
          let batchMatchedStem = "";
          let batchMatchedIndex = -1;
          let batchMatchedOptionsSim: number | undefined = undefined;
          let batchMatchedOptionsConsistent = false;

          const normCurrent = normalizeText(currentStem);

          for (let j = 0; j < i; j++) {
            const prevStem = parsedList[j].stem.trim();
            if (!prevStem) continue;

            const isStemExact = Boolean(normCurrent && normCurrent === normalizeText(prevStem));
            const sim = isStemExact ? { similarity: 100, isExact: true } : calculateSimilarity(currentStem, prevStem);

            // 閾值規則：相似度嚴格以 80% 為界線，相似度 < 80% 直接判定為非重複
            if (sim.similarity < 80) continue;

            // 選項一致性檢測 (Option Similarity Check)
            const optRes = compareQuestionOptions(parsedList[i], parsedList[j]);
            if (optRes.hasOptions && !optRes.isConsistent) {
              // 若題幹相似，但選項內容不一致，視為不同題目
              continue;
            }

            if (sim.similarity > batchMaxSim) {
              batchMaxSim = sim.similarity;
              batchMatchedStem = parsedList[j].stem;
              batchMatchedIndex = j + 1;
              batchMatchedOptionsSim = optRes.similarity;
              batchMatchedOptionsConsistent = optRes.isConsistent;
            }

            const isOptionsExact = !optRes.hasOptions || optRes.similarity === 100;
            if (isStemExact && isOptionsExact) {
              batchExactMatch = true;
              break;
            }
          }

          const isBatchHighSim = batchMaxSim >= 80;

          // 判定最終重複狀態
          if (dbRes?.hasExactMatch) {
            computedStatuses.push({
              isChecking: false,
              status: "EXACT",
              similarity: 100,
              isExactMatch: true,
              isHighSimilarity: true,
              duplicateSource: "DATABASE",
              matchedStem: dbRes.matches?.[0]?.stem || currentStem,
              matchedQuestion: dbRes.matches?.[0],
              optionsSimilarity: dbRes.matches?.[0]?.optionsSimilarity,
              optionsMatch: dbRes.matches?.[0]?.optionsMatch,
            });
          } else if (batchExactMatch) {
            computedStatuses.push({
              isChecking: false,
              status: "EXACT",
              similarity: 100,
              isExactMatch: true,
              isHighSimilarity: true,
              duplicateSource: "BATCH",
              matchedStem: batchMatchedStem,
              matchedBatchIndex: batchMatchedIndex,
              optionsSimilarity: batchMatchedOptionsSim,
              optionsMatch: batchMatchedOptionsConsistent,
            });
          } else if (dbRes?.hasHighSimilarity || isBatchHighSim) {
            const dbSim = dbRes?.maxSimilarity || 0;
            if (dbSim >= batchMaxSim) {
              computedStatuses.push({
                isChecking: false,
                status: "SIMILAR",
                similarity: dbSim,
                isExactMatch: false,
                isHighSimilarity: true,
                duplicateSource: "DATABASE",
                matchedStem: dbRes?.matches?.[0]?.stem || "",
                matchedQuestion: dbRes?.matches?.[0],
                optionsSimilarity: dbRes?.matches?.[0]?.optionsSimilarity,
                optionsMatch: dbRes?.matches?.[0]?.optionsMatch,
              });
            } else {
              computedStatuses.push({
                isChecking: false,
                status: "SIMILAR",
                similarity: batchMaxSim,
                isExactMatch: false,
                isHighSimilarity: true,
                duplicateSource: "BATCH",
                matchedStem: batchMatchedStem,
                matchedBatchIndex: batchMatchedIndex,
                optionsSimilarity: batchMatchedOptionsSim,
                optionsMatch: batchMatchedOptionsConsistent,
              });
            }
          } else {
            computedStatuses.push({
              isChecking: false,
              status: "NORMAL",
              similarity: Math.max(dbRes?.maxSimilarity || 0, batchMaxSim),
              isExactMatch: false,
              isHighSimilarity: false,
              duplicateSource: null,
              matchedStem: "",
            });
          }
        }

        if (controller.signal.aborted) return;
        setDuplicateStatuses(computedStatuses);

        // 偵測完畢主動彈出「高相似對照視窗」：只要有任何超過 80% 相似度的題目，立即彈出
        const hasHighSimItems = computedStatuses.some((s) => s.isHighSimilarity);
        if (hasHighSimItems && lastCheckedKeyRef.current !== stemsKey) {
          lastCheckedKeyRef.current = stemsKey;
          setShowComparisonModal(true);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Duplicate check error:", err);
          setFormError("⚠️ 題庫防重複比對伺服器回應異常，請檢查網路連線或稍後再試");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingDuplicates(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [stemsKey, parsedList.length]);

  // 當前編輯中的題目
  const currentItem = parsedList[activeIndex] || null;

  // 重複題與非重複題統計
  const exactDuplicateIndices = useMemo(() => {
    if (isCheckingDuplicates) return [];
    return parsedList
      .map((_, idx) => idx)
      .filter((idx) => {
        if (verifiedStatuses[idx] === 'NOT_DUPLICATE') return false;
        if (verifiedStatuses[idx] === 'IS_DUPLICATE') return true;
        return Boolean(duplicateStatuses[idx]?.isExactMatch);
      });
  }, [parsedList, duplicateStatuses, verifiedStatuses, isCheckingDuplicates]);

  const exactDuplicateCount = exactDuplicateIndices.length;

  const highSimilarityCount = useMemo(() => {
    if (isCheckingDuplicates) return 0;
    return parsedList.filter(
      (_, idx) => duplicateStatuses[idx]?.isHighSimilarity && !duplicateStatuses[idx]?.isExactMatch
    ).length;
  }, [parsedList, duplicateStatuses, isCheckingDuplicates]);

  const nonDuplicateItems = useMemo(() => {
    if (isCheckingDuplicates) return [];
    return parsedList.filter((_, idx) => {
      // 只要經確認不是重複題（NOT_DUPLICATE），在送出時務必完整保留！
      if (verifiedStatuses[idx] === 'NOT_DUPLICATE') return true;
      // Exclude 100% exact duplicates unconditionally
      if (duplicateStatuses[idx]?.isExactMatch) return false;
      // Exclude items user confirmed as duplicate
      if (verifiedStatuses[idx] === 'IS_DUPLICATE') return false;
      // Include items user confirmed as non-duplicate (high similarity but user-verified OK)
      // Include normal items
      return true;
    });
  }, [parsedList, duplicateStatuses, verifiedStatuses, isCheckingDuplicates]);

  const remainingCount = nonDuplicateItems.length;
  const allAreDuplicates = parsedList.length > 0 && !isCheckingDuplicates && remainingCount === 0;

  // 所有高相似度題目集合 (用於專屬對照彈窗)
  const highSimilarityItems = useMemo(() => {
    if (isCheckingDuplicates) return [];
    return parsedList
      .map((item, idx) => ({ item, idx, dup: duplicateStatuses[idx] }))
      .filter(({ dup }) => Boolean(dup && dup.isHighSimilarity));
  }, [parsedList, duplicateStatuses, isCheckingDuplicates]);

  const verifiedHighSimCount = useMemo(() => {
    return highSimilarityItems.filter(
      ({ idx }) => verifiedStatuses[idx] !== null && verifiedStatuses[idx] !== undefined
    ).length;
  }, [highSimilarityItems, verifiedStatuses]);

  // 當前題目重複判定狀態
  const currentDup = duplicateStatuses[activeIndex] || null;
  const isCurrentDupChecking = isCheckingDuplicates || !currentDup || currentDup.isChecking;
  const isSingleExactDuplicate =
    parsedList.length === 1 &&
    !isCurrentDupChecking &&
    Boolean(duplicateStatuses[0]?.isExactMatch) &&
    verifiedStatuses[0] !== 'NOT_DUPLICATE';

  // 單題高相似度（80-99%，非100%）
  const isExactMatch = Boolean(duplicateStatuses[0]?.isExactMatch);
  const isSingleHighSimilarity =
    parsedList.length === 1 &&
    !isCurrentDupChecking &&
    Boolean(duplicateStatuses[0]?.isHighSimilarity) &&
    !isExactMatch;

  // 單題高相似度阻擋：未查證 (null) 或確認為重複 ('IS_DUPLICATE') 時鎖定按鈕
  const isSingleHighSimBlocked =
    isSingleHighSimilarity &&
    verifiedStatuses[0] !== "NOT_DUPLICATE";

  const isCurrentFormValid = Boolean(
    currentItem &&
      currentItem.stem.trim().length > 0 &&
      currentItem.optionA.trim().length > 0 &&
      currentItem.optionB.trim().length > 0 &&
      currentItem.optionC.trim().length > 0 &&
      currentItem.optionD.trim().length > 0 &&
      currentItem.correctAnswers.length > 0
  );

  // 更新當前正在檢視題目的欄位
  const updateCurrentItem = useCallback(
    (updater: (prev: EditableQuestionItem) => EditableQuestionItem) => {
      setParsedList((prevList) => {
        if (!prevList[activeIndex]) return prevList;
        const prev = prevList[activeIndex];
        const nextItem = updater(prev);
        // 若題幹有改動，重置此題的查證狀態為 null
        if (nextItem.stem !== prev.stem) {
          setVerifiedStatuses((vs) => ({ ...vs, [activeIndex]: null }));
        }
        const nextList = [...prevList];
        nextList[activeIndex] = nextItem;
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

    if (isCheckingDuplicates) {
      setFormError("正在比對題庫防重複，請稍候...");
      return;
    }

    // 單題或多題當前題目若完全重複，阻擋帶入
    if (currentDup?.isExactMatch) {
      setFormError("⚠️ 題庫中已有完全相同 (100%) 的題目，禁止帶入表單！請先修改題幹內容。");
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
    if (!isCurrentFormValid) {
      setFormError("請先補齊題幹、四個選項與正確解答後再帶入表單");
      return;
    }
    setFormError("");
    onApply({
      stem: currentItem.stem,
      type: currentItem.type,
      imageUrl: currentItem.imageUrl || undefined,
      optionA: currentItem.optionA,
      optionB: currentItem.optionB,
      optionC: currentItem.optionC,
      optionD: currentItem.optionD,
      correctAnswers: currentItem.correctAnswers,
      explanation: currentItem.explanation,
    });
    setRawText("");
    setParsedList([]);
    setDuplicateStatuses([]);
    onClose();
  }, [currentItem, isCurrentFormValid, currentDup, isCheckingDuplicates, onApply, onClose]);

  // 依 4 區塊標準格式重構解析
  const handleFormatExplanation = useCallback(() => {
    if (!currentItem || !currentItem.explanation) return;
    const formatted = normalizeExplanationToFourSections(
      currentItem.explanation,
      {
        A: currentItem.optionA,
        B: currentItem.optionB,
        C: currentItem.optionC,
        D: currentItem.optionD,
      },
      currentItem.correctAnswers
    );
    updateCurrentItem((q) => ({ ...q, explanation: formatted }));
  }, [currentItem, updateCurrentItem]);

  // 單題直接新增
  const handleConfirmAndDirectSave = useCallback(async () => {
    if (isDirectSubmitting) return;

    if (isCheckingDuplicates) {
      setFormError("正在比對題庫防重複，請稍候...");
      return;
    }

    // 單題若完全重複，嚴格阻擋直接新增（若經查證確認非重複則允許新增）
    if (currentDup?.isExactMatch && verifiedStatuses[0] !== 'NOT_DUPLICATE') {
      setFormError("⚠️ 題庫中已有完全相同 (100%) 的題目，禁止直接新增！請先修改題幹至不重複方能解鎖。");
      return;
    }

    // 單題高相似度（80-99%）：未查證或確認為重複時阻擋
    if (isSingleHighSimilarity) {
      if (verifiedStatuses[0] === null || verifiedStatuses[0] === undefined) {
        setFormError("請先查證是否為重複題目後再送出");
        return;
      }
      if (verifiedStatuses[0] === 'IS_DUPLICATE') {
        setFormError("⚠️ 您已確認此題為重複題目，禁止新增！請修改題幹或取消重複標記。");
        return;
      }
    }

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
      const isVerifiedNotDup = verifiedStatuses[0] === 'NOT_DUPLICATE';
      const success = await onDirectSave({
        stem: currentItem.stem,
        type: currentItem.type,
        imageUrl: currentItem.imageUrl || undefined,
        optionA: currentItem.optionA,
        optionB: currentItem.optionB,
        optionC: currentItem.optionC,
        optionD: currentItem.optionD,
        correctAnswers: currentItem.correctAnswers,
        explanation: currentItem.explanation,
        forceCreate: isVerifiedNotDup,
      });

      if (success) {
        setRawText("");
        setParsedList([]);
        setDuplicateStatuses([]);
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || "儲存題目失敗");
    } finally {
      setIsDirectSubmitting(false);
    }
  }, [currentItem, onDirectSave, handleConfirmAndApply, onClose, isDirectSubmitting, isCheckingDuplicates, currentDup, isSingleHighSimilarity, verifiedStatuses]);

  // 批次新增全部已解析題目 (多題同時新增核心功能)
  const handleBatchSaveAll = useCallback(async () => {
    if (isBatchSubmitting) return;
    if (parsedList.length === 0) return;

    if (isCheckingDuplicates) {
      setFormError("正在比對題庫防重複，請稍候...");
      return;
    }

    // 批次提交守衛：掃描所有高相似度（非100%）且未查證之題目
    const firstUnverifiedHighSimIdxAll = parsedList.findIndex(
      (_, idx) =>
        duplicateStatuses[idx]?.isHighSimilarity &&
        !duplicateStatuses[idx]?.isExactMatch &&
        (verifiedStatuses[idx] === null || verifiedStatuses[idx] === undefined)
    );
    if (firstUnverifiedHighSimIdxAll !== -1) {
      setActiveIndex(firstUnverifiedHighSimIdxAll);
      setFormError(`第 ${firstUnverifiedHighSimIdxAll + 1} 題為相似題目，請查證選擇是重複或未重複後再送出`);
      return;
    }

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
          questions: parsedList.map((item, idx) => ({
            stem: item.stem,
            type: item.type,
            imageUrl: item.imageUrl || null,
            optionA: item.optionA,
            optionB: item.optionB,
            optionC: item.optionC,
            optionD: item.optionD,
            correctAnswers: item.correctAnswers,
            explanation: item.explanation,
            verifiedNotDuplicate: verifiedStatuses[idx] === 'NOT_DUPLICATE',
            forceCreate: verifiedStatuses[idx] === 'NOT_DUPLICATE',
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "批次新增題目失敗");
      }

      invalidateQuestionsCache();

      let notice = `🎉 成功新增 ${data.createdCount} 道題目！`;
      if (data.skippedCount > 0) {
        notice += `（已自動略過 ${data.skippedCount} 題重複題目）`;
      }
      setBatchNotice(notice);

      setTimeout(() => {
        setRawText("");
        setParsedList([]);
        setDuplicateStatuses([]);
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
  }, [parsedList, duplicateStatuses, verifiedStatuses, onClose, onBatchSaved, isBatchSubmitting, isCheckingDuplicates]);

  // 批次排除重複題，新增剩餘有效題目 (多題重複自動排除功能)
  const handleBatchSaveNonDuplicates = useCallback(async () => {
    if (isBatchSubmitting) return;

    if (isCheckingDuplicates) {
      setFormError("正在比對題庫防重複，請稍候...");
      return;
    }

    if (nonDuplicateItems.length === 0) {
      setFormError("⚠️ 全部題目皆已重複，無可新增之題目！請先修改題幹內容。");
      return;
    }

    // 批次提交守衛：掃描所有高相似度（非100%）且未查證之題目
    const firstUnverifiedHighSimIdx = parsedList.findIndex(
      (_, idx) =>
        duplicateStatuses[idx]?.isHighSimilarity &&
        !duplicateStatuses[idx]?.isExactMatch &&
        (verifiedStatuses[idx] === null || verifiedStatuses[idx] === undefined)
    );
    if (firstUnverifiedHighSimIdx !== -1) {
      setActiveIndex(firstUnverifiedHighSimIdx);
      setFormError(`第 ${firstUnverifiedHighSimIdx + 1} 題為相似題目，請查證選擇是重複或未重複後再送出`);
      return;
    }

    // 前置驗證各非重複題目完整性，若有缺漏自動切換至該題
    for (let i = 0; i < parsedList.length; i++) {
      if (duplicateStatuses[i]?.isExactMatch) continue;
      if (verifiedStatuses[i] === 'IS_DUPLICATE') continue;
      const q = parsedList[i];
      if (!q.stem.trim()) {
        setActiveIndex(i);
        setFormError(`第 ${i + 1} 題題幹不可為空，請核對後再送出`);
        return;
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        setActiveIndex(i);
        setFormError(`第 ${i + 1} 題的選項皆不可為空`);
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
    setBatchNotice(`正在排除 ${exactDuplicateCount} 題重複題目，批次新增剩餘 ${remainingCount} 題至題庫中...`);

    try {
      const res = await fetch("/api/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: nonDuplicateItems.map((item) => {
            const origIdx = parsedList.indexOf(item);
            const isVerifiedNotDup = origIdx !== -1 && verifiedStatuses[origIdx] === 'NOT_DUPLICATE';
            return {
              stem: item.stem,
              type: item.type,
              imageUrl: item.imageUrl || null,
              optionA: item.optionA,
              optionB: item.optionB,
              optionC: item.optionC,
              optionD: item.optionD,
              correctAnswers: item.correctAnswers,
              explanation: item.explanation,
              verifiedNotDuplicate: isVerifiedNotDup,
              forceCreate: isVerifiedNotDup,
            };
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "批次新增題目失敗");
      }

      invalidateQuestionsCache();

      const totalExcluded = exactDuplicateCount + (data.skippedCount || 0);
      let notice = `🎉 成功新增 ${data.createdCount} 道題目！`;
      if (totalExcluded > 0) {
        notice += `（已自動排除 ${totalExcluded} 題重複題目）`;
      }
      setBatchNotice(notice);

      setTimeout(() => {
        setRawText("");
        setParsedList([]);
        setDuplicateStatuses([]);
        onClose();
        if (onBatchSaved) {
          onBatchSaved({
            createdCount: data.createdCount,
            skippedCount: totalExcluded,
          });
        }
      }, 1400);
    } catch (err: any) {
      setFormError(err.message || "批次新增題目發生伺服器異常");
      setBatchNotice("");
    } finally {
      setIsBatchSubmitting(false);
    }
  }, [nonDuplicateItems, parsedList, duplicateStatuses, verifiedStatuses, isBatchSubmitting, isCheckingDuplicates, exactDuplicateCount, remainingCount, onClose, onBatchSaved]);

  // 監聽快捷鍵：ESC 關閉、左右鍵切換題目 (ArrowLeft / ArrowRight)、Ctrl+Enter / Cmd+Enter 快速送出
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略輸入法組字中 (包含微軟新注音/拼音候選字窗開闔，避免 Esc 關閉彈窗丟失輸入)
      if (e.isComposing || e.keyCode === 229) return;

      // 1. ESC 關閉視窗 (送出中禁止關閉避免狀態脫節)
      if (e.key === "Escape") {
        if (isBatchSubmitting || isDirectSubmitting) return;
        e.preventDefault();
        onClose();
        return;
      }

      // 2. Ctrl+Enter 或 Cmd+Enter: 送出儲存
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (isBatchSubmitting || isDirectSubmitting) return;
        if (isCheckingDuplicates) {
          setFormError("正在比對題庫防重複，請稍候...");
          return;
        }
        e.preventDefault();
        if (parsedList.length > 1) {
          if (allAreDuplicates) {
            setFormError("⚠️ 本批次全部題目皆為已重複題目，無法新增！請修改題幹至不重複方能送出。");
            return;
          }
          if (exactDuplicateCount > 0) {
            handleBatchSaveNonDuplicates();
          } else {
            handleBatchSaveAll();
          }
        } else if (parsedList.length === 1) {
          if (duplicateStatuses[0]?.isExactMatch) {
            setFormError("⚠️ 題庫中已有完全相同 (100%) 的題目，已嚴格阻擋新增！請在編輯框修改題幹至不重複方能解鎖。");
            return;
          }
          if (onDirectSave) {
            handleConfirmAndDirectSave();
          } else {
            handleConfirmAndApply();
          }
        }
        return;
      }

      // 3. 左右鍵切換題目 (ArrowLeft / ArrowRight)
      if (parsedList.length > 1) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            (target as HTMLElement).isContentEditable);

        // 排除 Shift 鍵文字選取與 Ctrl/Cmd 系統快捷鍵干擾
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey && (!isTyping || e.altKey)) {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : parsedList.length - 1));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setActiveIndex((prev) => (prev < parsedList.length - 1 ? prev + 1 : 0));
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    onClose,
    parsedList.length,
    isBatchSubmitting,
    isDirectSubmitting,
    isCheckingDuplicates,
    allAreDuplicates,
    exactDuplicateCount,
    duplicateStatuses,
    handleBatchSaveAll,
    handleBatchSaveNonDuplicates,
    handleConfirmAndDirectSave,
    handleConfirmAndApply,
    onDirectSave,
  ]);

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
        className="relative bg-[#0a0a0c]/95 border-t sm:border border-white/[0.10] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col animate-sheet-up sm:animate-scale-in text-foreground transform-gpu will-change-transform"
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
        <div className="overflow-y-auto overscroll-contain scroll-touch flex-1 p-4 sm:p-6 space-y-5 text-xs">
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
                  className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-foreground-muted hover:text-foreground border border-white/[0.08] text-xs sm:text-[11px] font-medium transition-all duration-180 flex items-center gap-1.5 touch-manipulation touch-tactile"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>貼上剪貼簿</span>
                </button>

                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText("")}
                    className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] px-2.5 py-1.5 rounded-lg text-foreground-muted hover:text-rose-400 hover:bg-rose-500/10 text-xs sm:text-[11px] font-medium transition-all flex items-center justify-center touch-manipulation touch-tactile"
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
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-sm text-foreground placeholder:text-white/25 leading-relaxed shadow-inner transition-all"
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
                      <span>✨ 成功偵測到 {parsedList.length} 道題目（點擊或按 ← / → 切換）：</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCheckingDuplicates ? (
                        <span className="text-[10px] text-blue-300 bg-blue-950/60 border border-blue-500/50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                          比對中...
                        </span>
                      ) : (
                        <>
                          {exactDuplicateCount > 0 && (
                            <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 animate-fade-in">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              {exactDuplicateCount} 題重複
                            </span>
                          )}
                          {highSimilarityCount > 0 && (
                            <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 animate-fade-in">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              {highSimilarityCount} 題相似
                            </span>
                          )}
                        </>
                      )}
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-purple-300/80 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                        <kbd>←</kbd> / <kbd>→</kbd> 切換
                      </span>
                      <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        正在檢查第 {activeIndex + 1} 題
                      </span>
                    </div>
                  </div>

                  {/* 題目切換膠囊列 */}
                  <div
                    ref={tabsContainerRef}
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 scroll-smooth"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : parsedList.length - 1))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center shrink-0 transition-colors touch-tactile"
                      title="上一題 (← 鍵)"
                      aria-label="上一題"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {parsedList.map((item, idx) => {
                      const isActive = idx === activeIndex;
                      const isItemValid =
                        item.stem.trim().length > 0 &&
                        item.optionA.trim().length > 0 &&
                        item.optionB.trim().length > 0 &&
                        item.optionC.trim().length > 0 &&
                        item.optionD.trim().length > 0 &&
                        item.correctAnswers.length > 0;

                      const dup = duplicateStatuses[idx];
                      const isItemChecking = isCheckingDuplicates || !dup || dup.isChecking;

                      let buttonClasses = "";
                      if (isItemChecking) {
                        buttonClasses = isActive
                          ? "bg-accent text-white shadow-glow border border-accent-bright font-bold"
                          : "bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08]";
                      } else if (dup?.isExactMatch) {
                        buttonClasses = isActive
                          ? "bg-rose-600 text-white shadow-[0_0_18px_rgba(244,63,94,0.6)] border-2 border-rose-300 ring-2 ring-rose-500/50 font-bold"
                          : "bg-rose-950/40 text-rose-300 border border-rose-500/50 hover:bg-rose-900/40 hover:border-rose-400";
                      } else if (dup?.isHighSimilarity) {
                        buttonClasses = isActive
                          ? "bg-amber-600 text-white shadow-[0_0_18px_rgba(245,158,11,0.6)] border-2 border-amber-300 ring-2 ring-amber-500/50 font-bold"
                          : "bg-amber-950/40 text-amber-300 border border-amber-500/50 hover:bg-amber-900/40 hover:border-amber-400";
                      } else {
                        buttonClasses = isActive
                          ? "bg-accent text-white shadow-glow border border-accent-bright font-bold"
                          : "bg-white/[0.04] text-foreground-muted hover:text-foreground border border-emerald-500/25 hover:border-emerald-500/50";
                      }

                      return (
                        <button
                          key={idx}
                          ref={isActive ? activeCapsuleRef : null}
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-game text-xs font-bold transition-all duration-180 flex items-center gap-2 shrink-0 touch-tactile ${buttonClasses}`}
                        >
                          <span>第 {idx + 1} 題</span>
                          {/* 狀態標籤依據重複度展示 */}
                          {isItemChecking ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium flex items-center gap-0.5 ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              比對中...
                            </span>
                          ) : dup?.isExactMatch ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-0.5 ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-rose-500/30 text-rose-200 border border-rose-500/50"
                              }`}
                            >
                              (⚠️已重複)
                            </span>
                          ) : dup?.isHighSimilarity ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-0.5 ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-amber-500/30 text-amber-200 border border-amber-500/50"
                              }`}
                            >
                              ({dup.similarity}%相似)
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium flex items-center gap-0.5 ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              正常
                            </span>
                          )}

                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isActive
                                ? "bg-black/30 text-white/90"
                                : "bg-white/[0.04] text-foreground-muted"
                            }`}
                          >
                            正解 {item.correctAnswers.join("") || "?"}
                          </span>
                          {isItemValid && !dup?.isExactMatch && (
                            <Check
                              className={`w-3 h-3 ${
                                isActive ? "text-emerald-200" : "text-emerald-400"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => (prev < parsedList.length - 1 ? prev + 1 : 0))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.04] text-foreground-muted hover:text-foreground border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center shrink-0 transition-colors touch-tactile"
                      title="下一題 (→ 鍵)"
                      aria-label="下一題"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
                    className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-lg font-game text-xs sm:text-[11px] font-bold transition-all touch-manipulation touch-tactile flex items-center justify-center ${
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
                    className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-lg font-game text-xs sm:text-[11px] font-bold transition-all touch-manipulation touch-tactile flex items-center justify-center ${
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
                {/* 題庫防重複比對與相似度提示橫幅 */}
                {isCurrentDupChecking ? (
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>正在比對題庫防重複與相似度...</span>
                  </div>
                ) : currentDup?.isExactMatch ? (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-rose-950/60 border-2 border-rose-500 text-rose-100 text-xs space-y-2 animate-fade-in shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                    <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        {currentDup.duplicateSource === "BATCH"
                          ? `⚠️ 與同批次第 ${currentDup.matchedBatchIndex} 題完全相同 (100%)`
                          : "⚠️ 題庫中已有完全相同 (100%) 的題目"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-rose-500/30 text-rose-200 font-mono text-[11px] break-words">
                      <span className="text-rose-400 font-bold mr-1">
                        {currentDup.duplicateSource === "BATCH" ? "同批次相同題幹：" : "題庫已存在題幹："}
                      </span>
                      {currentDup.matchedStem}
                    </div>
                    <p className="text-[11px] text-rose-200/85 leading-relaxed">
                      {isMultiMode
                        ? "多題批次新增時，點擊下方「自動排除重複題」將自動為您略過此題；若欲保留本題，請直接在下方修改題幹至不重複。"
                        : "單題模式下已嚴格鎖定「直接新增」與「帶入表單」按鈕，必須在下方編輯框修改題幹至不重複方能解鎖。"}
                    </p>
                  </div>
                ) : currentDup?.isHighSimilarity ? (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-amber-950/50 border border-amber-500/80 text-amber-100 text-xs space-y-3 animate-fade-in shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <div className="flex flex-wrap items-center gap-2 font-bold text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {currentDup.duplicateSource === "BATCH"
                          ? `⚠️ 與同批次第 ${currentDup.matchedBatchIndex} 題高度相似 (${currentDup.similarity}%)`
                          : `⚠️ 發現高度相似題目 (${currentDup.similarity}%)`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-600/60 text-amber-100 text-[10px] font-bold border border-amber-500/50 shrink-0">
                        {currentDup.similarity}% 相似
                      </span>
                      {currentDup.optionsSimilarity !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            currentDup.optionsMatch
                              ? "bg-emerald-600/60 text-emerald-100 border-emerald-500/50"
                              : "bg-cyan-600/60 text-cyan-100 border-cyan-500/50"
                          }`}
                        >
                          {currentDup.optionsMatch
                            ? `選項高度一致 (${currentDup.optionsSimilarity}%)`
                            : `選項內容不同 (${currentDup.optionsSimilarity}%)`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowComparisonModal(true)}
                        className="ml-auto px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold border border-amber-500/40 transition-colors flex items-center gap-1 touch-tactile"
                      >
                        <span>🔍 開啟高相似對照視窗</span>
                      </button>
                    </div>

                    {/* 左右對比面板 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-black/30 border border-amber-500/20 space-y-1">
                        <div className="text-[10px] font-bold text-amber-400 mb-1">您輸入的題幹</div>
                        <div className="text-amber-100 font-mono text-[11px] break-words leading-relaxed">
                          {currentItem?.stem || "（空白）"}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/30 border border-amber-500/20 space-y-1">
                        <div className="text-[10px] font-bold text-amber-400 mb-1">
                          {currentDup.duplicateSource === "BATCH" ? "同批次相似題幹" : "題庫相似題幹"}
                        </div>
                        <div className="text-amber-200 font-mono text-[11px] break-words leading-relaxed">
                          {currentDup.matchedStem || "（無）"}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-200/85 leading-relaxed">
                      請確認是否為不同考點或不同題型。若兩題意義相同，建議修改題幹避免重複錄入。
                    </p>

                    {/* 查證確認按鈕 */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-amber-500/20">
                      <div className="text-[11px] text-amber-200/70 self-center shrink-0">請查證此題：</div>
                      <div className="flex gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setVerifiedStatuses((prev) => ({
                              ...prev,
                              [activeIndex]: prev[activeIndex] === "IS_DUPLICATE" ? null : "IS_DUPLICATE",
                            }))
                          }
                          className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-180 flex items-center justify-center gap-1.5 border ${
                            verifiedStatuses[activeIndex] === "IS_DUPLICATE"
                              ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                              : "bg-rose-950/30 text-rose-300 border-rose-500/40 hover:bg-rose-900/40"
                          }`}
                          title="確認此題為重複題目（將被排除）"
                        >
                          <span>⚠️ 是，本題為重複題目</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVerifiedStatuses((prev) => ({
                              ...prev,
                              [activeIndex]: prev[activeIndex] === "NOT_DUPLICATE" ? null : "NOT_DUPLICATE",
                            }))
                          }
                          className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-180 flex items-center justify-center gap-1.5 border ${
                            verifiedStatuses[activeIndex] === "NOT_DUPLICATE"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                              : "bg-emerald-950/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40"
                          }`}
                          title="確認此題非重複，允許新增"
                        >
                          <span>✓ 否，本題未與題庫重複</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : currentItem.stem.trim().length >= 2 ? (
                  <div className="px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>題庫比對正常：未發現完全重複或高度相似題目</span>
                  </div>
                ) : null}
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
                    onChange={(e) => {
                      updateCurrentItem((q) => ({ ...q, stem: e.target.value }));
                      setVerifiedStatuses((prev) => ({ ...prev, [activeIndex]: null }));
                    }}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-sm text-foreground placeholder:text-white/20 transition-all leading-relaxed"
                  />
                </div>

                {/* 題目附圖 (選填) */}
                <ImageAttachmentField
                  value={currentItem.imageUrl || ""}
                  onChange={(url) =>
                    updateCurrentItem((q) => ({ ...q, imageUrl: url }))
                  }
                  compact={true}
                  label="題目附圖 (選填)"
                />

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
                            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center font-bold text-sm font-game transition-all duration-180 flex-shrink-0 touch-manipulation touch-tactile ${
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
                            className="flex-1 min-w-0 bg-transparent border-none outline-none text-base sm:text-sm text-foreground placeholder:text-white/20 py-1"
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="font-bold font-game text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>題目解析 / 詳解說明 (標準 4 區塊)</span>
                      <span className="text-[10px] text-foreground-muted px-2 py-0.2 rounded-full bg-white/[0.04]">
                        選填
                      </span>
                    </label>
                    {currentItem.explanation && (
                      <button
                        type="button"
                        onClick={handleFormatExplanation}
                        className="text-[11px] font-game text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1 touch-tactile"
                        title="依【考點導讀】【各選項詳細解析】【觀念說明】【考試記憶重點】自動排版"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>一鍵整理成 4 區塊格式</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={currentItem.explanation}
                    onChange={(e) =>
                      updateCurrentItem((q) => ({ ...q, explanation: e.target.value }))
                    }
                    rows={4}
                    placeholder="【考點導讀】&#10;核心考點導讀引言...&#10;&#10;【各選項詳細解析】&#10;A. A選項深度剖析...&#10;B. B選項深度剖析...&#10;&#10;【觀念說明】&#10;深度觀念背景說明...&#10;&#10;【考試記憶重點】&#10;速記口訣與提分重點..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-sm text-foreground placeholder:text-white/20 transition-all leading-relaxed font-mono"
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

          {/* 全數重複警示 */}
          {allAreDuplicates && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-fade-in shadow-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>⚠️ 本批次全部 {parsedList.length} 題皆為已重複題目，無法新增！請在上方編輯框修改題幹以解除阻擋。</span>
            </div>
          )}

          {/* 部分重複提示 */}
          {exactDuplicateCount > 0 && remainingCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  本批次偵測到 <strong>{exactDuplicateCount}</strong> 題重複題目。點擊下方按鈕可一鍵自動排除重複題，僅新增剩餘 <strong>{remainingCount}</strong> 題。
                </span>
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
                  disabled={!isCurrentFormValid || currentDup?.isExactMatch || isCheckingDuplicates}
                  className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile border ${
                    !isCurrentFormValid || currentDup?.isExactMatch || isCheckingDuplicates
                      ? currentDup?.isExactMatch
                        ? "bg-rose-950/30 text-rose-400/50 border-rose-500/30 cursor-not-allowed"
                        : isCheckingDuplicates
                        ? "bg-blue-950/30 text-blue-300/50 border-blue-500/30 cursor-wait"
                        : "bg-white/[0.04] text-white/30 border-white/[0.06] cursor-not-allowed"
                      : "bg-white/[0.06] hover:bg-white/[0.10] text-foreground border-white/[0.12]"
                  }`}
                  title={
                    isCheckingDuplicates
                      ? "正在比對題庫防重複與相似度..."
                      : currentDup?.isExactMatch
                      ? "當前題目已存在完全相同題目，禁止帶入表單。請修改題幹以解除限制。"
                      : "帶入目前檢視中的題目至新增表單"
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {isCheckingDuplicates
                      ? "比對中..."
                      : currentDup?.isExactMatch
                      ? `第 ${activeIndex + 1} 題已重複 (禁止帶入)`
                      : `帶入第 ${activeIndex + 1} 題至表單`}
                  </span>
                </button>

                {isCheckingDuplicates ? (
                  <button
                    type="button"
                    disabled={true}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile bg-blue-950/40 text-blue-300/60 border border-blue-500/30 cursor-wait shadow-none"
                    title="正在比對題庫防重複與相似度..."
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>比對題庫防重複中...</span>
                  </button>
                ) : allAreDuplicates ? (
                  <button
                    type="button"
                    disabled={true}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile bg-rose-950/40 text-rose-400/50 border border-rose-500/30 cursor-not-allowed shadow-none"
                    title="全部題目皆已在題庫中重複存在，無法新增"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400/60" />
                    <span>全部題目皆已重複，無法新增</span>
                  </button>
                ) : exactDuplicateCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleBatchSaveNonDuplicates}
                    disabled={isBatchSubmitting || isCheckingDuplicates}
                    className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile shadow-md ${
                      isBatchSubmitting
                        ? "bg-amber-800 text-white/50 cursor-wait"
                        : "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                    }`}
                    title={`自動排除 ${exactDuplicateCount} 題重複題目，新增剩餘 ${remainingCount} 題 (Ctrl+Enter)`}
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>
                      {isBatchSubmitting
                        ? "批次儲存中..."
                        : `自動排除重複題，新增剩餘 ${remainingCount} 題`}
                    </span>
                    <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                      Ctrl+Enter
                    </kbd>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBatchSaveAll}
                    disabled={isBatchSubmitting || isCheckingDuplicates}
                    className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile shadow-md ${
                      isBatchSubmitting
                        ? "bg-emerald-800 text-white/50 cursor-wait"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                    }`}
                    title="批次新增全部題目 (Ctrl+Enter)"
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>
                      {isBatchSubmitting
                        ? "批次儲存中..."
                        : `檢查無誤，全部新增 (${parsedList.length} 題)`}
                    </span>
                    <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                      Ctrl+Enter
                    </kbd>
                  </button>
                )}
              </>
            ) : (
              /* 單題模式專屬流程 */
              <>
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  disabled={!currentItem || !isCurrentFormValid || isSingleExactDuplicate || isCheckingDuplicates}
                  className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile shadow-md ${
                    !currentItem || !isCurrentFormValid || isSingleExactDuplicate || isCheckingDuplicates
                      ? isSingleExactDuplicate
                        ? "bg-rose-950/30 text-rose-400/50 border border-rose-500/30 cursor-not-allowed"
                        : isCheckingDuplicates
                        ? "bg-blue-950/30 text-blue-300/50 border border-blue-500/30 cursor-wait"
                        : "bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed"
                      : "bg-accent hover:bg-accent-bright text-white shadow-glow"
                  }`}
                  title={
                    isCheckingDuplicates
                      ? "正在比對題庫防重複與相似度..."
                      : isSingleExactDuplicate
                      ? "題庫中已存在完全相同 (100%) 的題目，嚴格阻擋帶入表單。請在上方編輯框修改題幹以解鎖。"
                      : !onDirectSave
                      ? "帶入表單 (Ctrl+Enter)"
                      : undefined
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {isCheckingDuplicates
                      ? "比對中..."
                      : isSingleExactDuplicate
                      ? "已重複 (禁止帶入)"
                      : "檢查無誤，帶入表單"}
                  </span>
                  {!onDirectSave && !isSingleExactDuplicate && !isCheckingDuplicates && (
                    <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                      Ctrl+Enter
                    </kbd>
                  )}
                </button>

                {onDirectSave && (
                  <button
                    type="button"
                    onClick={handleConfirmAndDirectSave}
                    disabled={!currentItem || !isCurrentFormValid || isDirectSubmitting || isSingleExactDuplicate || isCheckingDuplicates || (isSingleHighSimilarity && (verifiedStatuses[0] === null || verifiedStatuses[0] === undefined)) || (isSingleHighSimilarity && verifiedStatuses[0] === 'IS_DUPLICATE')}
                    className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile ${
                      !currentItem ||
                      !isCurrentFormValid ||
                      isDirectSubmitting ||
                      isSingleExactDuplicate ||
                      isCheckingDuplicates ||
                      (isSingleHighSimilarity && (verifiedStatuses[0] === null || verifiedStatuses[0] === undefined)) ||
                      (isSingleHighSimilarity && verifiedStatuses[0] === 'IS_DUPLICATE')
                        ? isSingleExactDuplicate
                          ? "bg-rose-950/30 text-rose-400/50 border border-rose-500/30 cursor-not-allowed"
                          : isSingleHighSimilarity && verifiedStatuses[0] === 'IS_DUPLICATE'
                          ? "bg-rose-950/30 text-rose-400/50 border border-rose-500/30 cursor-not-allowed"
                          : isSingleHighSimilarity && (verifiedStatuses[0] === null || verifiedStatuses[0] === undefined)
                          ? "bg-amber-950/30 text-amber-300/60 border border-amber-500/30 cursor-not-allowed"
                          : isCheckingDuplicates
                          ? "bg-blue-950/30 text-blue-300/50 border border-blue-500/30 cursor-wait"
                          : "bg-white/[0.03] text-white/25 border border-white/[0.06] cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.3)]"
                    }`}
                    title={
                      isCheckingDuplicates
                        ? "正在比對題庫防重複與相似度..."
                        : isSingleExactDuplicate
                        ? "題庫中已存在完全相同 (100%) 的題目，嚴格阻擋直接新增。請在上方編輯框修改題幹以解鎖。"
                        : isSingleHighSimilarity && verifiedStatuses[0] === 'IS_DUPLICATE'
                        ? "您已確認此題為重複題目，禁止新增。"
                        : isSingleHighSimilarity && (verifiedStatuses[0] === null || verifiedStatuses[0] === undefined)
                        ? "請先在上方查證此題是否為重複題目後再送出。"
                        : "直接新增題目 (Ctrl+Enter)"
                    }
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      {isDirectSubmitting
                        ? "儲存中..."
                        : isCheckingDuplicates
                        ? "比對中..."
                        : isSingleExactDuplicate
                        ? "已重複 (禁止新增)"
                        : isSingleHighSimilarity && verifiedStatuses[0] === 'IS_DUPLICATE'
                        ? "已確認重複 (禁止新增)"
                        : isSingleHighSimilarity && (verifiedStatuses[0] === null || verifiedStatuses[0] === undefined)
                        ? "請先查證後再送出"
                        : "檢查無誤，直接新增"}
                    </span>
                    {!isSingleExactDuplicate && !isCheckingDuplicates && !(isSingleHighSimilarity && verifiedStatuses[0] !== 'NOT_DUPLICATE') && (
                      <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                        Ctrl+Enter
                      </kbd>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. 專屬高相似題目集中對照彈窗 (Comparison Modal) */}
      {showComparisonModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-fade-in"
          onClick={() => setShowComparisonModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="comparison-modal-title"
        >
          <div
            className="relative bg-[#0c0d14] border border-amber-500/50 w-full sm:max-w-4xl rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.25)] max-h-[90vh] flex flex-col text-foreground overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.35)] shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3
                    id="comparison-modal-title"
                    className="text-base sm:text-lg font-bold font-game text-foreground flex items-center gap-2"
                  >
                    <span>高相似題目對照與判斷</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                      {highSimilarityItems.length} 題相似 (≥ 80%)
                    </span>
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    偵測到以下題目與題庫（或同批次）相似度達 80% 以上。請逐題對照並點選按鈕判斷是否為重複題（判定為未重複者，送出時保證完整保留並寫入題庫）。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-foreground-muted hover:text-foreground rounded-xl hover:bg-white/[0.08] transition-colors"
                aria-label="關閉對照視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of All High-Similarity Items */}
            <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 flex-1 text-xs">
              {highSimilarityItems.length === 0 ? (
                <div className="py-12 text-center text-foreground-muted">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-emerald-300">目前無超過 80% 相似度之題目！</p>
                </div>
              ) : (
                highSimilarityItems.map(({ item, idx, dup }) => {
                  const isVerifiedDup = verifiedStatuses[idx] === "IS_DUPLICATE";
                  const isVerifiedNotDup = verifiedStatuses[idx] === "NOT_DUPLICATE";

                  // 取得對比目標題目的題幹、選項與正解
                  const isBatchSource = dup.duplicateSource === "BATCH" && typeof dup.matchedBatchIndex === "number";
                  const matchedBatchItem = isBatchSource ? parsedList[dup.matchedBatchIndex! - 1] : null;

                  const targetStem = isBatchSource
                    ? matchedBatchItem?.stem || dup.matchedStem
                    : dup.matchedQuestion?.stem || dup.matchedStem;
                  const targetOptA = isBatchSource
                    ? matchedBatchItem?.optionA || ""
                    : dup.matchedQuestion?.optionA || "";
                  const targetOptB = isBatchSource
                    ? matchedBatchItem?.optionB || ""
                    : dup.matchedQuestion?.optionB || "";
                  const targetOptC = isBatchSource
                    ? matchedBatchItem?.optionC || ""
                    : dup.matchedQuestion?.optionC || "";
                  const targetOptD = isBatchSource
                    ? matchedBatchItem?.optionD || ""
                    : dup.matchedQuestion?.optionD || "";
                  const targetAnswers = isBatchSource
                    ? matchedBatchItem?.correctAnswers.join(",") || ""
                    : dup.matchedQuestion?.correctAnswers || "";

                  const optionsSim = dup.optionsSimilarity ?? dup.matchedQuestion?.optionsSimilarity;

                  return (
                    <div
                      key={idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        isVerifiedNotDup
                          ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                          : isVerifiedDup
                          ? "bg-rose-950/20 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                          : "bg-white/[0.02] border-amber-500/40 hover:border-amber-500/60"
                      }`}
                    >
                      {/* Item Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <span className="font-game font-bold text-sm text-foreground">
                            第 {idx + 1} 題
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                            題幹 {dup.similarity}% 相似
                          </span>
                          {optionsSim !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                dup.optionsMatch
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                              }`}
                            >
                              {dup.optionsMatch ? `選項高度一致 (${optionsSim}%)` : `選項內容不同 (${optionsSim}%)`}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-foreground-muted">
                          比對來源：
                          <span className="font-semibold text-amber-200 ml-1">
                            {isBatchSource
                              ? `同批次第 ${dup.matchedBatchIndex} 題`
                              : "題庫現存題目"}
                          </span>
                        </div>
                      </div>

                      {/* 左右對照卡片 (使用者輸入 vs 題庫/批次相似題目) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 左：使用者輸入的題目 */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-2.5">
                          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <span>【您輸入的題目】</span>
                            </span>
                            <span className="text-[10px] text-foreground-muted">
                              正解: {item.correctAnswers.join(", ") || "無"}
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-foreground-muted mb-0.5">題幹內容：</div>
                            <p className="text-foreground text-xs leading-relaxed font-mono break-words bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                              {item.stem || "（空白）"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-foreground-muted">選項 (A, B, C, D)：</div>
                            <div className="grid gap-1 font-mono text-[11px]">
                              {[
                                { key: "A", val: item.optionA },
                                { key: "B", val: item.optionB },
                                { key: "C", val: item.optionC },
                                { key: "D", val: item.optionD },
                              ].map((opt) => (
                                <div
                                  key={opt.key}
                                  className={`px-2 py-1 rounded flex items-start gap-1.5 ${
                                    item.correctAnswers.includes(opt.key)
                                      ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                                      : "bg-white/[0.02] text-foreground-muted"
                                  }`}
                                >
                                  <span className="shrink-0 font-bold">{opt.key}.</span>
                                  <span className="break-words">{opt.val || "（空）"}</span>
                                  {item.correctAnswers.includes(opt.key) && (
                                    <span className="ml-auto text-[9px] bg-emerald-500/30 px-1 rounded text-emerald-200 shrink-0">正解</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 右：題庫/同批次相似題目 */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-2.5">
                          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5">
                              <span>【{isBatchSource ? `同批次第 ${dup.matchedBatchIndex} 題` : "題庫中相似題目"}】</span>
                            </span>
                            <span className="text-[10px] text-foreground-muted">
                              正解: {targetAnswers || "—"}
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-foreground-muted mb-0.5">題幹內容：</div>
                            <p className="text-foreground text-xs leading-relaxed font-mono break-words bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                              {targetStem || "（無題幹資料）"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-foreground-muted">選項 (A, B, C, D)：</div>
                            <div className="grid gap-1 font-mono text-[11px]">
                              {[
                                { key: "A", val: targetOptA },
                                { key: "B", val: targetOptB },
                                { key: "C", val: targetOptC },
                                { key: "D", val: targetOptD },
                              ].map((opt) => (
                                <div
                                  key={opt.key}
                                  className={`px-2 py-1 rounded flex items-start gap-1.5 ${
                                    targetAnswers.includes(opt.key)
                                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                                      : "bg-white/[0.02] text-foreground-muted"
                                  }`}
                                >
                                  <span className="shrink-0 font-bold">{opt.key}.</span>
                                  <span className="break-words">{opt.val || "（空）"}</span>
                                  {targetAnswers.includes(opt.key) && (
                                    <span className="ml-auto text-[9px] bg-amber-500/30 px-1 rounded text-amber-200 shrink-0">正解</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 判斷按鈕組與狀態反饋 */}
                      <div className="pt-3 mt-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs">
                          {isVerifiedNotDup ? (
                            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>✓ 已確認不是重複題（送出時將 100% 完整保留並寫入題庫）</span>
                            </span>
                          ) : isVerifiedDup ? (
                            <span className="text-rose-300 font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                              <span>⚠️ 已確認為重複題目（送出時將自動排除）</span>
                            </span>
                          ) : (
                            <span className="text-amber-300/80 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>尚未判定，請點選右側按鈕進行查證：</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setVerifiedStatuses((prev) => ({
                                ...prev,
                                [idx]: prev[idx] === "IS_DUPLICATE" ? null : "IS_DUPLICATE",
                              }))
                            }
                            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold font-game transition-all flex items-center gap-1.5 border touch-tactile ${
                              isVerifiedDup
                                ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)] ring-2 ring-rose-400/40"
                                : "bg-rose-950/30 text-rose-300 border-rose-500/40 hover:bg-rose-900/40"
                            }`}
                          >
                            <span>⚠️ 是，本題為重複題目</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVerifiedStatuses((prev) => ({
                                ...prev,
                                [idx]: prev[idx] === "NOT_DUPLICATE" ? null : "NOT_DUPLICATE",
                              }))
                            }
                            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold font-game transition-all flex items-center gap-1.5 border touch-tactile ${
                              isVerifiedNotDup
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/40"
                                : "bg-emerald-950/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40"
                            }`}
                          >
                            <span>✓ 否，本題未與題庫重複</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-t border-white/[0.08] bg-[#0a0a0c]/95 shrink-0">
              <div className="text-xs text-foreground-muted">
                已完成判定：
                <strong className="text-amber-300 font-mono text-sm ml-1">
                  {verifiedHighSimCount}
                </strong>{" "}
                / {highSimilarityItems.length} 題
              </div>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-xs font-bold font-game shadow-glow transition-all flex items-center gap-2 touch-tactile"
              >
                <Check className="w-4 h-4" />
                <span>確認完成，關閉對照視窗</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
