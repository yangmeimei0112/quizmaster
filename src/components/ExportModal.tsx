"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileDown,
  Copy,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Download,
  Printer,
  RotateCcw,
  Dice5,
  FileText,
} from "lucide-react";
import { Question } from "@/types/question";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  typeFilter?: string;
  initialMode?: "CURRENT" | "RANDOM_50";
}

export default function ExportModal({
  isOpen,
  onClose,
  questions,
  typeFilter = "ALL",
  initialMode = "CURRENT",
}: ExportModalProps) {
  // 匯出模式：CURRENT (目前清單題目) | RANDOM_50 (隨機抓 50 題模擬考卷)
  const [exportMode, setExportMode] = useState<"CURRENT" | "RANDOM_50">(initialMode);
  const [random50Questions, setRandom50Questions] = useState<Question[]>([]);
  const [allQuestionsPool, setAllQuestionsPool] = useState<Question[]>(questions);
  const [isDrawing, setIsDrawing] = useState(false);

  const [title, setTitle] = useState("個人題庫測驗試卷");
  const [subtitle, setSubtitle] = useState("QuizMaster 題庫系統匯出");

  // 核心功能：是否包含解析
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [includeAnswers, setIncludeAnswers] = useState(true);

  // 狀態提示
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pdfTip, setPdfTip] = useState(false);

  // 隨機抽取 50 題模擬試卷（單選與複選混合抽取）
  const drawRandom50 = useCallback(async () => {
    setIsDrawing(true);
    try {
      let pool = allQuestionsPool;
      if (!pool || pool.length < 50) {
        const res = await fetch("/api/questions");
        if (res.ok) {
          const data = await res.json();
          if (data.questions && data.questions.length > 0) {
            pool = data.questions;
            setAllQuestionsPool(pool);
          }
        }
      }

      const singles = pool.filter((q) => q.type === "SINGLE");
      const multiples = pool.filter((q) => q.type === "MULTIPLE");

      let selected: Question[] = [];
      if (singles.length > 0 && multiples.length > 0) {
        const shuffledSingle = [...singles].sort(() => Math.random() - 0.5);
        const shuffledMulti = [...multiples].sort(() => Math.random() - 0.5);

        const minSingle = Math.min(shuffledSingle.length, 25);
        const minMulti = Math.min(shuffledMulti.length, 50 - minSingle);

        const partSingle = shuffledSingle.slice(0, minSingle);
        const partMulti = shuffledMulti.slice(0, minMulti);

        const remainingPool = [
          ...shuffledSingle.slice(minSingle),
          ...shuffledMulti.slice(minMulti),
        ].sort(() => Math.random() - 0.5);

        const needed = Math.min(50, pool.length) - (partSingle.length + partMulti.length);
        selected = [...partSingle, ...partMulti, ...remainingPool.slice(0, needed)];
      } else {
        selected = [...pool].sort(() => Math.random() - 0.5).slice(0, 50);
      }

      selected.sort(() => Math.random() - 0.5);
      setRandom50Questions(selected);
      setTitle("60分鐘全真模擬考試檢定試卷");
      setSubtitle("QuizMaster 隨機 50 題模擬考試 · 滿分 100 分 · 限時 60 分鐘");
    } catch (err) {
      console.error("抽題失敗:", err);
    } finally {
      setIsDrawing(false);
    }
  }, [allQuestionsPool]);

  // 同步外部 questions 題目池
  useEffect(() => {
    if (questions && questions.length > 0) {
      setAllQuestionsPool(questions);
    }
  }, [questions]);

  // 初始化或重新開啟時同步 initialMode 與觸發抽題
  useEffect(() => {
    if (isOpen) {
      setExportMode(initialMode);
      if (initialMode === "RANDOM_50") {
        setTitle("60分鐘全真模擬考試檢定試卷");
        setSubtitle("QuizMaster 隨機 50 題模擬考試 · 滿分 100 分 · 限時 60 分鐘");
        if (random50Questions.length === 0) {
          drawRandom50();
        }
      } else {
        setTitle("個人題庫測驗試卷");
        setSubtitle("QuizMaster 題庫系統匯出");
      }
    }
  }, [isOpen, initialMode, drawRandom50, random50Questions.length]);

  // 切換模式處理
  const handleModeChange = (mode: "CURRENT" | "RANDOM_50") => {
    setExportMode(mode);
    if (mode === "RANDOM_50") {
      if (random50Questions.length === 0) {
        drawRandom50();
      } else {
        setTitle("60分鐘全真模擬考試檢定試卷");
        setSubtitle("QuizMaster 隨機 50 題模擬考試 · 滿分 100 分 · 限時 60 分鐘");
      }
    } else {
      setTitle("個人題庫測驗試卷");
      setSubtitle("QuizMaster 題庫系統匯出");
    }
  };

  // 當前欲匯出的題目清單
  const activeQuestions = useMemo(() => {
    if (exportMode === "RANDOM_50") {
      return random50Questions.length > 0 ? random50Questions : questions;
    }
    return questions;
  }, [exportMode, random50Questions, questions]);

  // 統計單複選題數
  const singleCount = useMemo(
    () => activeQuestions.filter((q) => q.type === "SINGLE").length,
    [activeQuestions]
  );
  const multipleCount = useMemo(
    () => activeQuestions.filter((q) => q.type === "MULTIPLE").length,
    [activeQuestions]
  );

  // 監聽 ESC 鍵關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 轉義特殊 HTML 字元
  const escapeHtml = (str: string) => {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // 格式化文本保留空格與換行
  const formatHtmlText = (str: string) => {
    let escaped = escapeHtml(str);
    escaped = escaped.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
    escaped = escaped.replace(/  /g, "&nbsp; ");
    escaped = escaped.replace(/\r\n|\r|\n/g, "<br/>");
    return escaped;
  };

  // 產生 Rich Text HTML (針對 Google Docs 排版)
  const generateGoogleDocsHtml = () => {
    let html = `
      <div style="font-family: 'Noto Sans TC', 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #0f172a; margin-bottom: 4px; font-size: 18pt;">${escapeHtml(title)}</h1>
        <p style="text-align: center; color: #64748b; font-size: 10pt; margin-top: 0; margin-bottom: 12px;">
          ${escapeHtml(subtitle)} · 總題數：${activeQuestions.length} 題 · 模式：${
            includeExplanation
              ? "含答案與詳細解析"
              : includeAnswers
              ? "含答案（隱藏解析）"
              : "純題目（不含答案與解析）"
          }
        </p>
        <p style="text-align: right; color: #334155; font-size: 10pt; margin-bottom: 16px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px;">
          班級／群組：__________ &nbsp;&nbsp;&nbsp;&nbsp; 姓名：____________ &nbsp;&nbsp;&nbsp;&nbsp; 座號：______ &nbsp;&nbsp;&nbsp;&nbsp; 得分：______
        </p>
    `;

    activeQuestions.forEach((q, idx) => {
      const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";

      html += `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <p style="font-size: 11pt; font-weight: bold; margin: 0 0 6px 0; color: #0f172a; white-space: pre-wrap; word-break: break-word;">${idx + 1}. <span style="color: ${q.type === "SINGLE" ? "#2563eb" : "#7c3aed"}; font-weight: bold;">【${typeLabel}】</span> ${formatHtmlText(q.stem)}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b; white-space: pre-wrap; word-break: break-word;"><strong>(A)</strong> ${formatHtmlText(q.optionA)}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b; white-space: pre-wrap; word-break: break-word;"><strong>(B)</strong> ${formatHtmlText(q.optionB)}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b; white-space: pre-wrap; word-break: break-word;"><strong>(C)</strong> ${formatHtmlText(q.optionC)}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b; white-space: pre-wrap; word-break: break-word;"><strong>(D)</strong> ${formatHtmlText(q.optionD)}</p>
      `;

      if (includeExplanation || includeAnswers) {
        html += `
          <p style="margin: 6px 0 2px 24px; font-size: 10pt; color: #047857;">
            <strong>【標準答案】：</strong> <span style="font-weight: bold; color: #059669;">${escapeHtml(q.correctAnswers)}</span>
          </p>
        `;
      }

      if (includeExplanation) {
        const explanationContent = (q.explanation && q.explanation.trim())
          ? formatHtmlText(q.explanation)
          : "<span style='color: #94a3b8; font-style: italic;'>（出題者未填寫解析）</span>";

        html += `
          <div style="margin: 4px 0 0 24px; font-size: 9.5pt; color: #334155; background-color: #f8fafc; padding: 6px 10px; border-left: 3px solid #cbd5e1; white-space: pre-wrap; word-break: break-word;"><strong>【題目解析】：</strong>${explanationContent}</div>
        `;
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  };

  // 1. 下載 Google 文件相容 .docx
  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          includeExplanation,
          includeAnswers,
          questionIds: activeQuestions.map((q) => q.id),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "匯出失敗");
        setIsExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("下載 Google 文件發生錯誤: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. 一鍵複製 Google Docs 格式到剪貼簿 (Rich Text)
  const handleCopyRichText = async () => {
    try {
      const htmlContent = generateGoogleDocsHtml();
      const textContent = `${title}\n${subtitle}\n\n` + activeQuestions.map((q, idx) => {
        const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";
        const explanationText = (q.explanation && q.explanation.trim())
          ? q.explanation
          : "（出題者未填寫解析）";

        return (
          `${idx + 1}. 【${typeLabel}】 ${q.stem}\n` +
          `(A) ${q.optionA}\n(B) ${q.optionB}\n(C) ${q.optionC}\n(D) ${q.optionD}\n` +
          (includeExplanation || includeAnswers ? `【標準答案】：${q.correctAnswers}\n` : "") +
          (includeExplanation ? `【題目解析】：${explanationText}\n` : "")
        );
      }).join("\n");

      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob([textContent], { type: "text/plain" });

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(textContent);
      }

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3500);
    } catch (err) {
      console.error("複製失敗:", err);
      alert("複製失敗，請直接點選下載 .docx 檔案");
    }
  };

  // 3. 下載 / 列印 PDF 檔 (透過標準 A4 試卷 Print View 與另存 PDF)
  const handleDownloadPdf = () => {
    setPdfTip(true);
    setTimeout(() => setPdfTip(false), 5000);

    const printHtml = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 12px;
            line-height: 1.5;
            font-size: 10pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
          .exam-header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
          }
          .exam-title {
            font-size: 18pt;
            font-weight: 800;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
          }
          .exam-subtitle {
            font-size: 9.5pt;
            color: #475569;
            margin: 0 0 8px 0;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 9.5pt;
          }
          .info-table td {
            padding: 4px 6px;
            border: 1px solid #94a3b8;
          }
          .question-block {
            margin-bottom: 14px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .stem {
            font-size: 10.5pt;
            font-weight: bold;
            margin: 0 0 5px 0;
            color: #0f172a;
          }
          .type-tag {
            display: inline-block;
            font-size: 9pt;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            margin-right: 4px;
          }
          .single-tag { color: #1d4ed8; border-color: #93c5fd; background-color: #eff6ff; }
          .multi-tag { color: #6d28d9; border-color: #c4b5fd; background-color: #f5f3ff; }
          .option-row {
            margin: 2px 0 2px 20px;
            color: #1e293b;
            font-size: 9.5pt;
          }
          .option-bubble {
            display: inline-block;
            width: 13px;
            height: 13px;
            border: 1.2px solid #64748b;
            border-radius: 50%;
            margin-right: 4px;
            vertical-align: middle;
          }
          .option-box {
            display: inline-block;
            width: 13px;
            height: 13px;
            border: 1.2px solid #64748b;
            border-radius: 2px;
            margin-right: 4px;
            vertical-align: middle;
          }
          .answer-row {
            margin-top: 6px;
            margin-left: 20px;
            font-size: 9.5pt;
            color: #047857;
            font-weight: bold;
          }
          .explanation-box {
            margin-top: 4px;
            margin-left: 20px;
            padding: 6px 10px;
            background-color: #f8fafc;
            border-left: 3px solid #94a3b8;
            font-size: 9pt;
            color: #334155;
          }
          .exam-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 8.5pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
          .btn-print {
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <strong>💡 列印提示：</strong>在即將彈出的列印視窗中，請將「目的地」選擇為 <strong>「另存為 PDF (Save as PDF)」</strong> 即可下載為高品質 PDF 試卷。
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ 點此列印 / 另存為 PDF</button>
        </div>

        <div class="exam-header">
          <h1 class="exam-title">${escapeHtml(title)}</h1>
          <div class="exam-subtitle">${escapeHtml(subtitle)}</div>
          <table class="info-table">
            <tr>
              <td style="width: 25%;"><strong>測驗科目：</strong>專案管理概論</td>
              <td style="width: 25%;"><strong>總題數：</strong>${activeQuestions.length} 題</td>
              <td style="width: 25%;"><strong>試卷型態：</strong>${exportMode === "RANDOM_50" ? "50 題全真模擬考試 (滿分 100 分)" : "精選題庫測驗卷"}</td>
              <td style="width: 25%;"><strong>及格標準：</strong>${exportMode === "RANDOM_50" ? "70 分合格" : "70% 正確率"}</td>
            </tr>
            <tr>
              <td><strong>班級／群組：</strong></td>
              <td><strong>姓名：</strong></td>
              <td><strong>准考證號：</strong></td>
              <td><strong>實得分數：</strong></td>
            </tr>
          </table>
        </div>

        <div>
          ${activeQuestions.map((q, idx) => {
            const isSingle = q.type === "SINGLE";
            const typeLabel = isSingle ? "單選題" : "複選題";
            const bubbleClass = isSingle ? "option-bubble" : "option-box";

            let qHtml = `
              <div class="question-block">
                <div class="stem">
                  ${idx + 1}. <span class="type-tag ${isSingle ? "single-tag" : "multi-tag"}">【${typeLabel}】</span>
                  ${formatHtmlText(q.stem)}
                </div>
                <div class="option-row"><span class="${bubbleClass}"></span><strong>(A)</strong> ${formatHtmlText(q.optionA)}</div>
                <div class="option-row"><span class="${bubbleClass}"></span><strong>(B)</strong> ${formatHtmlText(q.optionB)}</div>
                <div class="option-row"><span class="${bubbleClass}"></span><strong>(C)</strong> ${formatHtmlText(q.optionC)}</div>
                <div class="option-row"><span class="${bubbleClass}"></span><strong>(D)</strong> ${formatHtmlText(q.optionD)}</div>
            `;

            if (includeExplanation || includeAnswers) {
              qHtml += `
                <div class="answer-row">【標準解答】：${escapeHtml(q.correctAnswers)}</div>
              `;
            }

            if (includeExplanation) {
              const exp = (q.explanation && q.explanation.trim())
                ? formatHtmlText(q.explanation)
                : "<em>（出題者未填寫解析）</em>";
              qHtml += `
                <div class="explanation-box"><strong>【題目解析】：</strong>${exp}</div>
              `;
            }

            qHtml += `</div>`;
            return qHtml;
          }).join("")}
        </div>

        <div class="exam-footer">
          QuizMaster 專案管理題庫系統 · ${escapeHtml(title)} · 共 ${activeQuestions.length} 題
        </div>

        <script>
          // 頁面載入後自動彈出列印對話框
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      // 若被快顯封鎖，使用 hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 500);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 60000);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden sm:overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-[#0a0a0c]/95 border-t sm:border border-white/[0.10] w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl backdrop-blur-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col animate-sheet-up sm:animate-scale-in text-foreground transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Mobile Drag Handle Indicator */}
        <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* 2. Fixed Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-2 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shadow-[0_0_16px_rgba(59,130,246,0.25)] shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-game text-foreground">
                匯出試卷 (Google文件 / PDF)
              </h2>
              <p className="text-xs text-foreground-muted">
                匯出範圍：<strong className="text-[#8B96F8] font-bold font-game">{activeQuestions.length}</strong> 道題目
                （單選 {singleCount} 題 · 複選 {multipleCount} 題）
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground-muted hover:text-foreground rounded-xl hover:bg-white/[0.05] transition-colors"
            aria-label="關閉匯出視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3. Smooth Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain scroll-touch flex-1 p-4 sm:p-6 space-y-4 text-xs">
          {/* 核心需求：匯出模式切換（目前清單 vs 隨機抓50題全真試卷） */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="font-bold font-game text-foreground flex items-center gap-1.5 text-xs">
                <Dice5 className="w-4 h-4 text-accent" />
                <span>匯出試卷模式：</span>
              </label>
              {exportMode === "RANDOM_50" && (
                <button
                  type="button"
                  onClick={drawRandom50}
                  disabled={isDrawing}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-accent/20 hover:bg-accent/30 text-[#9AA5FF] border border-accent/30 flex items-center gap-1 transition-all"
                >
                  <RotateCcw className={`w-3 h-3 ${isDrawing ? "animate-spin" : ""}`} />
                  <span>{isDrawing ? "抽題中..." : "重新換題"}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* 模式 A: 目前題目 */}
              <button
                type="button"
                onClick={() => handleModeChange("CURRENT")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  exportMode === "CURRENT"
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    exportMode === "CURRENT"
                      ? "border-accent bg-accent text-white"
                      : "border-white/30"
                  }`}
                >
                  {exportMode === "CURRENT" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    目前清單題目 ({questions.length} 題)
                  </div>
                  <div className="text-[11px] text-foreground-muted leading-tight mt-0.5">
                    匯出目前列表頁面所篩選的全部題目。
                  </div>
                </div>
              </button>

              {/* 模式 B: 隨機抓 50 題模擬考卷 */}
              <button
                type="button"
                onClick={() => handleModeChange("RANDOM_50")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  exportMode === "RANDOM_50"
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    exportMode === "RANDOM_50"
                      ? "border-accent bg-accent text-white"
                      : "border-white/30"
                  }`}
                >
                  {exportMode === "RANDOM_50" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground flex items-center gap-1">
                    <span>🎲 隨機抓 50 題考卷</span>
                  </div>
                  <div className="text-[11px] text-foreground-muted leading-tight mt-0.5">
                    系統隨機混合單選與複選題抽出 50 題。
                  </div>
                </div>
              </button>
            </div>

            {exportMode === "RANDOM_50" && (
              <div className="mt-2 p-2.5 rounded-xl bg-accent/10 border border-accent/25 text-[11px] text-[#C5CCFF] flex items-center justify-between">
                <span>
                  ✓ 已隨機抽選 <strong>{activeQuestions.length}</strong> 道題目（單選 {singleCount} 題 · 複選 {multipleCount} 題）
                </span>
                <span className="text-[10px] text-[#9AA5FF] font-mono">滿分100分</span>
              </div>
            )}
          </div>

          {/* 試卷基本資訊設定 */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold font-game text-foreground">文件大標題：</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold font-game text-foreground">副標題說明：</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </div>

          {/* 核心需求設定：是否含有解析與答案 */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <label className="font-bold font-game text-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>答案與解析設定</span>
            </label>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {/* 選項 1: 包含解析 (解答卷) */}
              <button
                type="button"
                onClick={() => {
                  setIncludeExplanation(true);
                  setIncludeAnswers(true);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  includeExplanation
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-sm font-medium"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    includeExplanation
                      ? "border-accent bg-accent text-white"
                      : "border-white/30"
                  }`}
                >
                  {includeExplanation && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    包含解析與答案 (複習解答卷)
                  </div>
                  <div className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                    附完整標準答案與考點出題解析。
                  </div>
                </div>
              </button>

              {/* 選項 2: 不含解析 (純題目或僅答案) */}
              <button
                type="button"
                onClick={() => {
                  setIncludeExplanation(false);
                  setIncludeAnswers(true);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  !includeExplanation
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-sm font-medium"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    !includeExplanation
                      ? "border-accent bg-accent text-white"
                      : "border-white/30"
                  }`}
                >
                  {!includeExplanation && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    不含解析 (有答案，隱藏解析)
                  </div>
                  <div className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                    每題輸出標準答案，隱藏詳細解析文字。
                  </div>
                </div>
              </button>
            </div>

            {/* 若不含解析，提供進階微調：是否標註答案 */}
            {!includeExplanation && (
              <div className="pt-2.5 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-foreground-muted">
                <input
                  type="checkbox"
                  id="includeAnswersToggle"
                  checked={includeAnswers}
                  onChange={(e) => setIncludeAnswers(e.target.checked)}
                  className="rounded bg-white/[0.05] border-white/20 text-accent focus:ring-accent accent-[#5E6AD2]"
                />
                <label htmlFor="includeAnswersToggle" className="cursor-pointer text-foreground-muted hover:text-foreground">
                  包含每題標準答案（勾選保留正解，取消則連答案一同隱藏成全盲測驗卷）
                </label>
              </div>
            )}
          </div>

          {/* 成功複製提示 */}
          {copySuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-fade-in-up">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                已複製 Google 文件專屬排版！打開 Google 文件按下 <strong>Ctrl + V</strong> 即可直接貼上完整試卷！
              </span>
            </div>
          )}

          {/* PDF 提示 */}
          {pdfTip && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-fade-in-up">
              <Printer className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                已開啟標準 A4 試卷列印頁！在目的地選擇 <strong>「另存為 PDF (Save as PDF)」</strong> 即可直接下載成 PDF 檔案！
              </span>
            </div>
          )}
        </div>

        {/* 4. Fixed Sticky Action Footer */}
        <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-white/[0.08] p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
            {/* 途徑 1: 下載 .docx 檔案 */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white font-bold font-game text-xs shadow-glow flex items-center justify-center gap-1.5 transition-all duration-200 touch-manipulation active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "產生中..." : "下載 Google 文件 (.docx)"}</span>
            </button>

            {/* 途徑 2: 下載 / 列印 PDF 檔案 */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-game text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-1.5 transition-all duration-200 touch-manipulation active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>下載 / 列印 PDF 檔</span>
            </button>

            {/* 途徑 3: 一鍵複製格式文字 */}
            <button
              type="button"
              onClick={handleCopyRichText}
              className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-foreground font-bold font-game text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${
                copySuccess
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40"
                  : "border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              {copySuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 animate-scale-in" />
                  <span>已複製！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>複製 Google 文件排版</span>
                </>
              )}
            </button>
          </div>

          {/* 途徑 4: 快速前往 Google 文件建立空白文件 */}
          <div className="text-center pt-0.5">
            <a
              href="https://docs.google.com/document/create"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] py-2.5 px-3 inline-flex items-center justify-center gap-1.5 text-xs text-[#8B96F8] hover:text-accent-bright font-semibold hover:underline transition-colors duration-180 touch-tactile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>直接前往 Google 文件開新文件 (Google Docs)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}