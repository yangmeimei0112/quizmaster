"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Copy,
  ExternalLink,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Printer,
} from "lucide-react";
import { Question } from "@/types/question";

export interface ExamWrongReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  userAnswers: Record<string, string[]>;
  scoreResults: {
    totalScore: number;
    isPassed: boolean;
    correctCount: number;
    wrongCount: number;
    unanswered: number;
  };
  elapsedSeconds: number;
  completedAt?: string;
}

export default function ExamWrongReportModal({
  isOpen,
  onClose,
  questions,
  userAnswers,
  scoreResults,
  elapsedSeconds,
  completedAt,
}: ExamWrongReportModalProps) {
  const [title, setTitle] = useState("60分鐘模擬考試 · 錯題檢討與深度覆盤報告");
  const [subtitle, setSubtitle] = useState("QuizMaster 專案管理題庫檢定 · Google 文件詳細分析");
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [exportScope, setExportScope] = useState<"WRONG_ONLY" | "ALL">("WRONG_ONLY");

  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pdfTip, setPdfTip] = useState(false);

  // 格式化耗時
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins} 分 ${s} 秒`;
  };

  const finalCompletedAt = useMemo(() => {
    if (completedAt) return completedAt;
    const now = new Date();
    return now.toLocaleString("zh-TW", { hour12: false });
  }, [completedAt]);

  // ESC 鍵關閉監聽
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 整理所有題目作答對錯明細
  const processedQuestions = useMemo(() => {
    return questions.map((q, idx) => {
      const userAnsList = (userAnswers[q.id] || []).sort();
      const userAnsStr = userAnsList.join(",");
      const correctAnsStr = q.correctAnswers.split(",").sort().join(",");
      const isCorrect = userAnsStr === correctAnsStr;
      const isUnanswered = userAnsList.length === 0;

      return {
        originalIndex: idx + 1,
        question: q,
        userAnswer: userAnsStr || "未填答",
        correctAnswers: q.correctAnswers,
        isCorrect,
        isUnanswered,
      };
    });
  }, [questions, userAnswers]);

  // 依匯出範圍篩選題目
  const targetItems = useMemo(() => {
    if (exportScope === "WRONG_ONLY") {
      return processedQuestions.filter((item) => !item.isCorrect);
    }
    return processedQuestions;
  }, [processedQuestions, exportScope]);

  if (!isOpen) return null;

  // 產生標準 Google Docs 富文本 HTML
  const generateGoogleDocsHtml = () => {
    const escapeHtml = (str: string) => {
      return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const formatHtmlText = (str: string) => {
      let escaped = escapeHtml(str);
      escaped = escaped.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
      escaped = escaped.replace(/  /g, "&nbsp; ");
      escaped = escaped.replace(/\r\n|\r|\n/g, "<br/>");
      return escaped;
    };

    const { totalScore, isPassed, correctCount, wrongCount, unanswered } = scoreResults;

    let html = `
      <div style="font-family: 'Noto Sans TC', 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #0f172a; margin-bottom: 4px; font-size: 20pt; font-weight: bold;">
          ${escapeHtml(title)}
        </h1>
        <p style="text-align: center; color: #64748b; font-size: 10pt; margin-top: 0; margin-bottom: 16px;">
          ${escapeHtml(subtitle)} · 完成時間：${escapeHtml(finalCompletedAt)}
        </p>

        <!-- 結算成績摘要表 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt;">
          <tr style="background-color: #f1f5f9;">
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; width: 25%;">測驗總分</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; font-size: 12pt; color: ${
              isPassed ? "#047857" : "#dc2626"
            }; width: 25%;">
              ${totalScore} / 100 分
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; width: 25%;">及格狀態</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; color: ${
              isPassed ? "#047857" : "#dc2626"
            }; width: 25%;">
              ${isPassed ? "合格通過 (PASS)" : "未達合格標準 (FAIL)"}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; background-color: #f8fafc;">答對題數</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #047857;">答對 ${correctCount} 題 (+${
              correctCount * 2
            }分)</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; background-color: #f8fafc;">答錯 / 未答</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #dc2626;">答錯 ${wrongCount} 題 · 未答 ${unanswered} 題</td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold;">考試耗時</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">${formatTime(
              elapsedSeconds
            )} (限時 60:00)</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold;">匯出範圍</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">
              ${exportScope === "WRONG_ONLY" ? `僅錯題 (共 ${targetItems.length} 題)` : `全部題目 (共 ${targetItems.length} 題)`}
            </td>
          </tr>
        </table>

        <div style="border-bottom: 1.5px solid #cbd5e1; margin-bottom: 20px;"></div>
    `;

    if (targetItems.length === 0) {
      html += `
        <div style="text-align: center; padding: 30px; background-color: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; margin: 20px 0;">
          <h2 style="color: #047857; margin-bottom: 8px;">🎉 恭喜！本次測驗全數答對！</h2>
          <p style="color: #065f46; font-size: 11pt;">您在 50 題模擬考中取得 100 分滿分，沒有任何答錯的題目需檢討。</p>
        </div>
      `;
    } else {
      html += `
        <h3 style="color: #0f172a; font-size: 13pt; margin-bottom: 14px; border-left: 4px solid #5e6ad2; padding-left: 10px;">
          ${exportScope === "WRONG_ONLY" ? "【錯題深度檢討清單與觀念考點】" : "【完整試卷作答檢核清單】"}
        </h3>
      `;

      targetItems.forEach((item) => {
        const q = item.question;
        const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";
        const statusText = item.isCorrect ? "(正確 ✓)" : item.isUnanswered ? "(未填答 ✗)" : "(答錯 ✗)";

        html += `
          <div style="margin-bottom: 20px; padding: 12px 14px; border: 1px solid ${
            item.isCorrect ? "#a7f3d0" : "#fecaca"
          }; background-color: ${
            item.isCorrect ? "#f0fdf4" : "#fef2f2"
          }; border-radius: 6px; page-break-inside: avoid;">
            <p style="font-size: 11pt; font-weight: bold; margin: 0 0 6px 0; color: #0f172a;">
              <span style="color: ${item.isCorrect ? "#047857" : "#dc2626"}; font-weight: bold;">第 ${
                item.originalIndex
              } 題.</span>
              <span style="color: ${
                q.type === "SINGLE" ? "#2563eb" : "#7c3aed"
              }; font-size: 10pt;">【${typeLabel}】</span>
              ${formatHtmlText(q.stem)}
            </p>

            <p style="margin: 2px 0 2px 20px; font-size: 9.5pt; color: #334155;"><strong>(A)</strong> ${formatHtmlText(q.optionA)}</p>
            <p style="margin: 2px 0 2px 20px; font-size: 9.5pt; color: #334155;"><strong>(B)</strong> ${formatHtmlText(q.optionB)}</p>
            <p style="margin: 2px 0 2px 20px; font-size: 9.5pt; color: #334155;"><strong>(C)</strong> ${formatHtmlText(q.optionC)}</p>
            <p style="margin: 2px 0 2px 20px; font-size: 9.5pt; color: #334155;"><strong>(D)</strong> ${formatHtmlText(q.optionD)}</p>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 10pt;">
              <span style="color: ${
                item.isCorrect ? "#047857" : "#dc2626"
              }; font-weight: bold; margin-right: 20px;">
                【考生填答】：${escapeHtml(item.userAnswer)} ${statusText}
              </span>
              <span style="color: #047857; font-weight: bold;">
                【標準正解】：${escapeHtml(item.correctAnswers)}
              </span>
            </div>
        `;

        if (includeExplanation) {
          const expText =
            q.explanation && q.explanation.trim()
              ? formatHtmlText(q.explanation)
              : "<span style='color: #94a3b8; font-style: italic;'>（出題者未填寫解析）</span>";

          html += `
            <div style="margin-top: 8px; font-size: 9.5pt; color: #334155; background-color: #ffffff; padding: 8px 12px; border-left: 3px solid #cbd5e1; border-radius: 4px;">
              <strong style="color: #475569;">【題目解析與觀念】：</strong>${expText}
            </div>
          `;
        }

        html += `</div>`;
      });
    }

    html += `
        <p style="text-align: center; color: #94a3b8; font-size: 9pt; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          QuizMaster 專案管理題庫系統 · 建議針對上述錯題弱項進行專項強化，祝您下次取得滿分！
        </p>
      </div>
    `;

    return html;
  };

  // 下載 Google 文件相容 .docx 檔案
  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      const itemsPayload = targetItems.map((item) => ({
        originalIndex: item.originalIndex,
        stem: item.question.stem,
        type: item.question.type,
        optionA: item.question.optionA,
        optionB: item.question.optionB,
        optionC: item.question.optionC,
        optionD: item.question.optionD,
        userAnswer: item.userAnswer,
        correctAnswers: item.question.correctAnswers,
        explanation: item.question.explanation,
        isCorrect: item.isCorrect,
      }));

      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "EXAM_WRONG_REPORT",
          title,
          subtitle,
          includeExplanation,
          stats: {
            totalScore: scoreResults.totalScore,
            isPassed: scoreResults.isPassed,
            correctCount: scoreResults.correctCount,
            wrongCount: scoreResults.wrongCount,
            unanswered: scoreResults.unanswered,
            elapsedSeconds,
            completedAt: finalCompletedAt,
          },
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "匯出錯題報告失敗");
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
      alert("下載錯題報告發生錯誤: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 下載 / 列印 PDF 錯題報告
  const handleDownloadPdf = () => {
    setPdfTip(true);
    setTimeout(() => setPdfTip(false), 5000);

    const escapeHtml = (str: string) => {
      return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const formatHtmlText = (str: string) => {
      let escaped = escapeHtml(str);
      escaped = escaped.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
      escaped = escaped.replace(/  /g, "&nbsp; ");
      escaped = escaped.replace(/\r\n|\r|\n/g, "<br/>");
      return escaped;
    };

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
          * { box-sizing: border-box; }
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
          .report-header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
          }
          .report-title {
            font-size: 18pt;
            font-weight: 800;
            margin: 0 0 4px 0;
          }
          .report-subtitle {
            font-size: 9.5pt;
            color: #475569;
            margin: 0 0 8px 0;
          }
          .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 9.5pt;
          }
          .stats-table td {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
          }
          .label-cell {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
            width: 25%;
          }
          .value-cell {
            width: 25%;
          }
          .question-block {
            margin-bottom: 16px;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .question-block.wrong {
            border-color: #fca5a5;
            background-color: #fffbfb;
          }
          .question-block.correct {
            border-color: #86efac;
            background-color: #f0fdf4;
          }
          .stem {
            font-size: 10.5pt;
            font-weight: bold;
            margin: 0 0 6px 0;
            color: #0f172a;
          }
          .type-tag {
            display: inline-block;
            font-size: 8.5pt;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            margin-right: 4px;
          }
          .option-row {
            margin: 2px 0 2px 18px;
            color: #1e293b;
            font-size: 9.5pt;
          }
          .answer-compare {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9.5pt;
          }
          .explanation-box {
            margin-top: 6px;
            padding: 6px 10px;
            background-color: #f8fafc;
            border-left: 3px solid #94a3b8;
            font-size: 9pt;
            color: #334155;
          }
          .report-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 8.5pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
          .btn-print {
            background-color: #0891b2;
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
            <strong>💡 列印提示：</strong>在列印視窗中將目的地選擇為 <strong>「另存為 PDF (Save as PDF)」</strong> 即可將錯題報告存為高品質 PDF 檔案。
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ 點此列印 / 另存為 PDF</button>
        </div>

        <div class="report-header">
          <h1 class="report-title">${escapeHtml(title)}</h1>
          <div class="report-subtitle">${escapeHtml(subtitle)} · 完成時間：${escapeHtml(finalCompletedAt)}</div>
          <table class="stats-table">
            <tr>
              <td class="label-cell">測驗得分</td>
              <td class="value-cell" style="font-weight: bold; color: ${scoreResults.isPassed ? "#047857" : "#dc2626"};">
                ${scoreResults.totalScore} / 100 分
              </td>
              <td class="label-cell">合格狀態 (70分及格)</td>
              <td class="value-cell" style="font-weight: bold; color: ${scoreResults.isPassed ? "#047857" : "#dc2626"};">
                ${scoreResults.isPassed ? "合格通過 (PASS)" : "未達標準 (FAIL)"}
              </td>
            </tr>
            <tr>
              <td class="label-cell">答對題數</td>
              <td class="value-cell" style="color: #047857;">${scoreResults.correctCount} 題 (+${scoreResults.correctCount * 2} 分)</td>
              <td class="label-cell">答錯 / 未答</td>
              <td class="value-cell" style="color: #dc2626;">答錯 ${scoreResults.wrongCount} 題 · 未答 ${scoreResults.unanswered} 題</td>
            </tr>
            <tr>
              <td class="label-cell">作答耗時</td>
              <td class="value-cell">${formatTime(elapsedSeconds)} (限時 60:00)</td>
              <td class="label-cell">報告範圍</td>
              <td class="value-cell">${exportScope === "WRONG_ONLY" ? `僅錯題 (共 ${targetItems.length} 題)` : `全部題目 (共 ${targetItems.length} 題)`}</td>
            </tr>
          </table>
        </div>

        <div>
          ${targetItems.map((item) => {
            const q = item.question;
            const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";
            const isCorrect = item.isCorrect;
            const userStatus = isCorrect ? "(正確 ✓)" : item.isUnanswered ? "(未填答 ✗)" : "(答錯 ✗)";
            const statusColor = isCorrect ? "#047857" : "#dc2626";

            let itemHtml = `
              <div class="question-block ${isCorrect ? "correct" : "wrong"}">
                <div class="stem">
                  <span style="color: ${statusColor};">第 ${item.originalIndex} 題.</span>
                  <span class="type-tag">【${typeLabel}】</span>
                  ${formatHtmlText(q.stem)}
                </div>
                <div class="option-row"><strong>(A)</strong> ${formatHtmlText(q.optionA)}</div>
                <div class="option-row"><strong>(B)</strong> ${formatHtmlText(q.optionB)}</div>
                <div class="option-row"><strong>(C)</strong> ${formatHtmlText(q.optionC)}</div>
                <div class="option-row"><strong>(D)</strong> ${formatHtmlText(q.optionD)}</div>
                <div class="answer-compare">
                  <span style="color: ${statusColor}; font-weight: bold; margin-right: 16px;">
                    【考生填答】：${escapeHtml(item.userAnswer)} ${userStatus}
                  </span>
                  <span style="color: #047857; font-weight: bold;">
                    【標準正解】：${escapeHtml(item.correctAnswers)}
                  </span>
                </div>
            `;

            if (includeExplanation) {
              const exp = (q.explanation && q.explanation.trim())
                ? formatHtmlText(q.explanation)
                : "<em>（出題者未填寫解析）</em>";
              itemHtml += `
                <div class="explanation-box"><strong>【題目解析與觀念】：</strong>${exp}</div>
              `;
            }

            itemHtml += `</div>`;
            return itemHtml;
          }).join("")}
        </div>

        <div class="report-footer">
          QuizMaster 專案管理題庫系統 · 建議針對以上弱點題目精準複習，祝您下次取得滿分！
        </div>

        <script>
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

  // 一鍵複製 Google Docs 富文本排版
  const handleCopyRichText = async () => {
    try {
      const htmlContent = generateGoogleDocsHtml();

      const textContent =
        `${title}\n${subtitle}\n完成時間：${finalCompletedAt}\n\n` +
        `【測驗結果】\n` +
        `得分：${scoreResults.totalScore} / 100 分 (${scoreResults.isPassed ? "合格通過" : "未達標準"})\n` +
        `答對：${scoreResults.correctCount} 題 | 答錯：${scoreResults.wrongCount} 題 | 未答：${scoreResults.unanswered} 題\n` +
        `耗時：${formatTime(elapsedSeconds)}\n\n` +
        `----------------------------------------\n\n` +
        targetItems
          .map((item) => {
            const q = item.question;
            const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";
            const exp = q.explanation && q.explanation.trim() ? q.explanation : "（無解析）";
            const statusText = item.isCorrect ? "(正確 ✓)" : item.isUnanswered ? "(未填答 ✗)" : "(答錯 ✗)";
            return (
              `第 ${item.originalIndex} 題. 【${typeLabel}】 ${q.stem}\n` +
              `(A) ${q.optionA}\n(B) ${q.optionB}\n(C) ${q.optionC}\n(D) ${q.optionD}\n` +
              `【考生填答】：${item.userAnswer} ${statusText}\n` +
              `【標準答案】：${item.correctAnswers}\n` +
              (includeExplanation ? `【題目解析】：${exp}\n` : "")
            );
          })
          .join("\n");

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
      alert("複製失敗，請直接點選「下載 Google 文件 (.docx)」");
    }
  };

  const { totalScore, isPassed, correctCount, wrongCount, unanswered } = scoreResults;

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
        className="relative bg-[#0a0a0c]/95 border-t sm:border border-white/[0.10] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl backdrop-blur-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col animate-sheet-up sm:animate-scale-in text-foreground transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 手機頂部拖曳指示棒 */}
        <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-2 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shadow-[0_0_16px_rgba(244,63,94,0.25)] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-game text-foreground flex items-center gap-2">
                <span>印出錯題報告 (Google文件)</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-[#9AA5FF] border border-accent/30">
                  全真檢定
                </span>
              </h2>
              <p className="text-xs text-foreground-muted">
                包含詳細得分、及格狀態、耗時與每題錯題對照及考點解析
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground-muted hover:text-foreground rounded-xl hover:bg-white/[0.05] transition-colors"
            aria-label="關閉錯題報告視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain scroll-touch flex-1 p-4 sm:p-6 space-y-4 text-xs">
          {/* 本次測驗數據統計摘要卡 */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold font-game text-foreground flex items-center gap-1.5">
                <Award className="w-4 h-4 text-accent" />
                <span>本次考試作答成果摘要</span>
              </span>
              <span
                className={`font-bold font-game px-2.5 py-0.5 rounded-full text-[11px] border ${
                  isPassed
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                }`}
              >
                {isPassed ? "合格通過 (PASS)" : "未達標準 (FAIL)"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-foreground-muted">總得分</div>
                <div
                  className={`text-xl font-bold font-game ${
                    isPassed ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {totalScore}
                  <span className="text-[10px] text-foreground-muted ml-0.5">/100</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-foreground-muted">答對題數</div>
                <div className="text-xl font-bold font-game text-emerald-400">
                  {correctCount}
                  <span className="text-[10px] text-foreground-muted ml-0.5">題</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-foreground-muted">答錯題數</div>
                <div className="text-xl font-bold font-game text-rose-400">
                  {wrongCount}
                  <span className="text-[10px] text-foreground-muted ml-0.5">題</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[10px] text-foreground-muted">未填答數</div>
                <div className="text-xl font-bold font-game text-amber-400">
                  {unanswered}
                  <span className="text-[10px] text-foreground-muted ml-0.5">題</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] col-span-2 sm:col-span-1">
                <div className="text-[10px] text-foreground-muted">考試耗時</div>
                <div className="text-xl font-bold font-game text-cyan-300">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>
            </div>
          </div>

          {/* 報告基本資訊設定 */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold font-game text-foreground">報告主標題：</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold font-game text-foreground">副標題備註：</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-base sm:text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </div>

          {/* 匯出範圍與解析開關 */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <label className="font-bold font-game text-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>匯出內容與題數設定</span>
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* 範圍選項 1: 僅錯題 */}
              <button
                type="button"
                onClick={() => setExportScope("WRONG_ONLY")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  exportScope === "WRONG_ONLY"
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    exportScope === "WRONG_ONLY"
                      ? "border-accent bg-accent text-white"
                      : "border-white/30"
                  }`}
                >
                  {exportScope === "WRONG_ONLY" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    僅匯出錯題 ({processedQuestions.filter((i) => !i.isCorrect).length} 題)
                  </div>
                  <div className="text-[11px] text-foreground-muted leading-tight mt-0.5">
                    針對做錯 ({wrongCount} 題) 與未答 ({unanswered} 題) 的題目精準匯出。
                  </div>
                </div>
              </button>

              {/* 範圍選項 2: 全部 50 題 */}
              <button
                type="button"
                onClick={() => setExportScope("ALL")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  exportScope === "ALL"
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    exportScope === "ALL"
                      ? "border-accent bg-accent text-white"
                      : "border-white/30"
                  }`}
                >
                  {exportScope === "ALL" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    匯出完整 50 題試卷全貌
                  </div>
                  <div className="text-[11px] text-foreground-muted leading-tight mt-0.5">
                    包含答對與答錯的全部題目對照與解析。
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="includeReportExplanation"
                checked={includeExplanation}
                onChange={(e) => setIncludeExplanation(e.target.checked)}
                className="rounded bg-white/[0.05] border-white/20 text-accent focus:ring-accent accent-[#5E6AD2]"
              />
              <label
                htmlFor="includeReportExplanation"
                className="cursor-pointer text-foreground-muted hover:text-foreground font-medium"
              >
                包含題目詳細解析與觀念考點（建議勾選，複習更深入）
              </label>
            </div>
          </div>

          {/* 錯題預覽清單摘要 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-game text-foreground">
              <span>待匯出清單預覽 ({targetItems.length} 題)</span>
              {targetItems.length === 0 && (
                <span className="text-emerald-400 font-normal">無答錯題目</span>
              )}
            </div>

            {targetItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-center text-xs">
                🎉 太厲害了！本次 50 題模擬考全部答對，沒有任何錯題！您可切換為「匯出完整 50 題」保留作答成就。
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-white/[0.06] rounded-xl p-2.5 bg-white/[0.01]">
                {targetItems.slice(0, 10).map((item) => (
                  <div
                    key={item.question.id}
                    className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                          item.isCorrect
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {item.originalIndex}
                      </span>
                      <span className="truncate text-foreground-muted font-medium">
                        {item.question.stem}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-[10px]">
                      <span className={item.isCorrect ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                        回答:{item.userAnswer}
                      </span>
                      <span className="text-emerald-400 font-mono">正解:{item.correctAnswers}</span>
                    </div>
                  </div>
                ))}
                {targetItems.length > 10 && (
                  <div className="text-center text-[10px] text-foreground-muted py-1">
                    ... 還有 {targetItems.length - 10} 道題目將一併匯出至報告
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 成功複製提示 */}
          {copySuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-fade-in-up">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                已複製錯題報告排版！打開 Google 文件按下 <strong>Ctrl + V</strong> 即可直接貼上完整覆盤報告！
              </span>
            </div>
          )}

          {/* PDF 列印提示 */}
          {pdfTip && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-fade-in-up">
              <Printer className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                已開啟標準 A4 錯題報告列印頁！在目的地選擇 <strong>「另存為 PDF (Save as PDF)」</strong> 即可直接下載成 PDF 檔案！
              </span>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-white/[0.08] p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
            {/* 途徑 1: 下載 .docx */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white font-bold font-game text-xs shadow-glow flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "產生中..." : "下載 Google 文件 (.docx)"}</span>
            </button>

            {/* 途徑 2: 下載 / 列印 PDF 報告 */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-game text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>下載 / 列印 PDF 檔</span>
            </button>

            {/* 途徑 3: 一鍵複製富文本 */}
            <button
              type="button"
              onClick={handleCopyRichText}
              className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-foreground font-bold font-game text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
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

          {/* 前往 Google Docs */}
          <div className="text-center pt-0.5">
            <a
              href="https://docs.google.com/document/create"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] py-2.5 px-3 inline-flex items-center justify-center gap-1.5 text-xs text-[#8B96F8] hover:text-accent-bright font-semibold hover:underline transition-colors touch-tactile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>直接前往 Google 文件開新空白文件 (Google Docs)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
