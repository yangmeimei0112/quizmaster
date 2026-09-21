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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { QuestionType, QuestionDuplicateStatus, SimilarMatch } from "@/types/question";
import { parseMultipleQuestions, ParsedQuestionResult } from "@/lib/questionParser";
import { normalizeText, calculateSimilarity } from "@/lib/similarity";

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

const SAMPLE_TEXT_TAGGED_EXPLANATION = `【題號】TNO : F3040113
【題目】發展專案團隊（Develop Project Team）的產出（Output）為下列哪一項？
【正確解答】A，團隊績效評估（Team Performance Assessment）。

【各選項詳細解析】
A. 團隊績效評估（Team Performance Assessment，正確）：發展專案團隊的核心產出即為「團隊績效評估」。在實施培訓、團隊建立活動與激勵機制後，專案經理需藉由評估團隊的整體效能、技術能力提升、離職率降低及凝聚力增強等指標，來衡量團隊發展措施的成效。
B. 績效評鑑的投入（Input）與表揚獎勵系統：表揚與獎勵系統屬於發展團隊過程中所使用的「工具與技術（Tools & Techniques）」，並非產出文件；此選項混雜投入（Input）等非正式專有名詞，純屬干擾項。
C. 績效改善、績效評鑑的投入（Input）與績效報告（Performance Report）：績效報告屬於專案監控流程群組（如報告績效或監控專案工作）的產出，並非發展專案團隊的產出。
D. 工作成果、績效評鑑的投入（Input）與績效報告（Performance Report，常見誤選）：工作成果（Deliverables / Work Performance Data）是「指導與管理專案執行」的產出，績效報告則屬於監控流程群組，皆非發展團隊之產出。

【觀念說明】
在專案管理（PMBOK 人力資源管理 / 資源管理）中，「發展專案團隊（Develop Project Team）」屬於執行流程群組：
* 流程核心目標：提升團隊成員的個人技能、增進團隊成員間的互動互信、改善整體團隊氛圍，進而強化專案整體的執行績效。
* 工具與技術（Tools & Techniques）：培訓、集中辦公、團隊建立活動、認可與獎勵等。
* 產出（Outputs）：團隊績效評估（Team Performance Assessments）、事業環境因素更新。

【考試記憶重點】
* 發展團隊核心產出唯一指名：「團隊績效評估（Team Performance Assessment）」。
* 破題速記：題目問「發展專案團隊」的產出 ＝ 發展好不好要「評估」＝ 秒選「團隊績效評估」。`;

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

  // 當貼入文本變更時，防抖 120ms + useTransition 即時多題切分與解析
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedList([]);
      setActiveIndex(0);
      setFormError("");
      setBatchNotice("");
      setDuplicateStatuses([]);
      setIsCheckingDuplicates(false);
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

  // 題幹清單比對鍵值 (用於監聽題幹變更，觸發即時防重複檢測)
  const stemsKey = useMemo(() => {
    return parsedList.map((q) => q.stem.trim()).join("|||");
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
          body: JSON.stringify({ stems }),
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

          const normCurrent = normalizeText(currentStem);

          for (let j = 0; j < i; j++) {
            const prevStem = parsedList[j].stem.trim();
            if (!prevStem) continue;

            if (normCurrent && normCurrent === normalizeText(prevStem)) {
              batchExactMatch = true;
              batchMaxSim = 100;
              batchMatchedStem = parsedList[j].stem;
              batchMatchedIndex = j + 1;
              break;
            }

            const sim = calculateSimilarity(currentStem, prevStem);
            if (sim.similarity > batchMaxSim) {
              batchMaxSim = sim.similarity;
              batchMatchedStem = parsedList[j].stem;
              batchMatchedIndex = j + 1;
            }
            if (sim.isExact || sim.similarity === 100) {
              batchExactMatch = true;
              break;
            }
          }

          const isBatchHighSim = batchMaxSim >= 70;

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

        setDuplicateStatuses(computedStatuses);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Duplicate check error:", err);
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
    return parsedList
      .map((_, idx) => idx)
      .filter((idx) => duplicateStatuses[idx]?.isExactMatch);
  }, [parsedList, duplicateStatuses]);

  const exactDuplicateCount = exactDuplicateIndices.length;

  const highSimilarityCount = useMemo(() => {
    return parsedList.filter(
      (_, idx) => duplicateStatuses[idx]?.isHighSimilarity && !duplicateStatuses[idx]?.isExactMatch
    ).length;
  }, [parsedList, duplicateStatuses]);

  const nonDuplicateItems = useMemo(() => {
    return parsedList.filter((_, idx) => !duplicateStatuses[idx]?.isExactMatch);
  }, [parsedList, duplicateStatuses]);

  const remainingCount = nonDuplicateItems.length;
  const allAreDuplicates = parsedList.length > 0 && remainingCount === 0;

  // 當前題目重複判定狀態
  const currentDup = duplicateStatuses[activeIndex] || null;
  const isSingleExactDuplicate = parsedList.length === 1 && Boolean(duplicateStatuses[0]?.isExactMatch);

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

  // 貼入含標籤之各選項詳細解析範例
  const handlePasteSampleTagged = useCallback(() => {
    setRawText(SAMPLE_TEXT_TAGGED_EXPLANATION);
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
  }, [currentItem, isCurrentFormValid, currentDup, onApply, onClose]);

  // 單題直接新增
  const handleConfirmAndDirectSave = useCallback(async () => {
    if (isDirectSubmitting) return;

    // 單題若完全重複，嚴格阻擋直接新增
    if (currentDup?.isExactMatch) {
      setFormError("⚠️ 題庫中已有完全相同 (100%) 的題目，禁止直接新增！請先修改題幹至不重複方能解鎖。");
      return;
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
        setDuplicateStatuses([]);
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || "儲存題目失敗");
    } finally {
      setIsDirectSubmitting(false);
    }
  }, [currentItem, onDirectSave, handleConfirmAndApply, onClose, isDirectSubmitting, currentDup]);

  // 批次新增全部已解析題目 (多題同時新增核心功能)
  const handleBatchSaveAll = useCallback(async () => {
    if (isBatchSubmitting) return;
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
  }, [parsedList, onClose, onBatchSaved, isBatchSubmitting]);

  // 批次排除重複題，新增剩餘有效題目 (多題重複自動排除功能)
  const handleBatchSaveNonDuplicates = useCallback(async () => {
    if (isBatchSubmitting) return;
    if (nonDuplicateItems.length === 0) {
      setFormError("⚠️ 全部題目皆已重複，無可新增之題目！請先修改題幹內容。");
      return;
    }

    // 前置驗證各非重複題目完整性
    for (let i = 0; i < nonDuplicateItems.length; i++) {
      const q = nonDuplicateItems[i];
      if (!q.stem.trim()) {
        setFormError(`非重複題目中第 ${i + 1} 題題幹不可為空，請核對後再送出`);
        return;
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        setFormError(`非重複題目中第 ${i + 1} 題的選項皆不可為空`);
        return;
      }
      if (q.correctAnswers.length === 0) {
        setFormError(`非重複題目中第 ${i + 1} 題請至少指定一個正確解答`);
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
          questions: nonDuplicateItems.map((item) => ({
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
  }, [nonDuplicateItems, isBatchSubmitting, exactDuplicateCount, remainingCount, onClose, onBatchSaved]);

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
                  onClick={handlePasteSampleTagged}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-all duration-180 flex items-center gap-1.5 touch-tactile shadow-sm"
                  title="帶入含【各選項詳細解析】與【觀念說明】之詳解範例"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>詳解版範例</span>
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
                      <span>✨ 成功偵測到 {parsedList.length} 道題目（點擊或按 ← / → 切換）：</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-purple-300/80 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                        <kbd>←</kbd> / <kbd>→</kbd> 切換
                      </span>
                      <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        正在檢查第 {activeIndex + 1} 題
                      </span>
                    </div>
                  </div>

                  {/* 題目切換膠囊列 */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
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

                      let buttonClasses = "";
                      if (dup?.isExactMatch) {
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
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-game text-xs font-bold transition-all duration-180 flex items-center gap-2 shrink-0 touch-tactile ${buttonClasses}`}
                        >
                          <span>第 {idx + 1} 題</span>
                          {/* 狀態標籤依據重複度展示 */}
                          {dup?.isExactMatch ? (
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
                {/* 題庫防重複比對與相似度提示橫幅 */}
                {currentDup?.isChecking ? (
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
                  <div className="p-3.5 sm:p-4 rounded-xl bg-amber-950/50 border border-amber-500/80 text-amber-100 text-xs space-y-2 animate-fade-in shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {currentDup.duplicateSource === "BATCH"
                          ? `⚠️ 與同批次第 ${currentDup.matchedBatchIndex} 題高度相似 (${currentDup.similarity}%)`
                          : `⚠️ 發現高度相似題目 (${currentDup.similarity}%)`}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-200 font-mono text-[11px] break-words">
                      <span className="text-amber-400 font-bold mr-1">
                        {currentDup.duplicateSource === "BATCH" ? "同批次相似題幹：" : "題庫相似題幹："}
                      </span>
                      {currentDup.matchedStem}
                    </div>
                    <p className="text-[11px] text-amber-200/85 leading-relaxed">
                      請確認是否為不同考點或不同題型。若兩題意義相同，建議修改題幹避免重複錄入。
                    </p>
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
                        : "bg-white/[0.04] text-white/30 border-white/[0.06] cursor-not-allowed"
                      : "bg-white/[0.06] hover:bg-white/[0.10] text-foreground border-white/[0.12]"
                  }`}
                  title={
                    currentDup?.isExactMatch
                      ? "當前題目已存在完全相同題目，禁止帶入表單。請修改題幹以解除限制。"
                      : "帶入目前檢視中的題目至新增表單"
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {currentDup?.isExactMatch
                      ? `第 ${activeIndex + 1} 題已重複 (禁止帶入)`
                      : `帶入第 ${activeIndex + 1} 題至表單`}
                  </span>
                </button>

                {allAreDuplicates ? (
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
                    disabled={isBatchSubmitting}
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
                    disabled={isBatchSubmitting}
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
                        : "bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed"
                      : "bg-accent hover:bg-accent-bright text-white shadow-glow"
                  }`}
                  title={
                    isSingleExactDuplicate
                      ? "題庫中已存在完全相同 (100%) 的題目，嚴格阻擋帶入表單。請在上方編輯框修改題幹以解鎖。"
                      : !onDirectSave
                      ? "帶入表單 (Ctrl+Enter)"
                      : undefined
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isSingleExactDuplicate ? "已重複 (禁止帶入)" : "檢查無誤，帶入表單"}</span>
                  {!onDirectSave && !isSingleExactDuplicate && (
                    <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
                      Ctrl+Enter
                    </kbd>
                  )}
                </button>

                {onDirectSave && (
                  <button
                    type="button"
                    onClick={handleConfirmAndDirectSave}
                    disabled={!currentItem || !isCurrentFormValid || isDirectSubmitting || isSingleExactDuplicate || isCheckingDuplicates}
                    className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold font-game transition-all duration-180 flex items-center justify-center gap-2 touch-tactile ${
                      !currentItem || !isCurrentFormValid || isDirectSubmitting || isSingleExactDuplicate || isCheckingDuplicates
                        ? isSingleExactDuplicate
                          ? "bg-rose-950/30 text-rose-400/50 border border-rose-500/30 cursor-not-allowed"
                          : "bg-white/[0.03] text-white/25 border border-white/[0.06] cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.3)]"
                    }`}
                    title={
                      isSingleExactDuplicate
                        ? "題庫中已存在完全相同 (100%) 的題目，嚴格阻擋直接新增。請在上方編輯框修改題幹以解鎖。"
                        : "直接新增題目 (Ctrl+Enter)"
                    }
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      {isDirectSubmitting
                        ? "儲存中..."
                        : isSingleExactDuplicate
                        ? "已重複 (禁止新增)"
                        : "檢查無誤，直接新增"}
                    </span>
                    {!isSingleExactDuplicate && (
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
    </div>
  );
}
