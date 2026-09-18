"use client";

import { useState } from "react";
import {
  FileDown,
  Copy,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Download,
} from "lucide-react";
import { Question } from "@/types/question";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  typeFilter?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  questions,
  typeFilter = "ALL",
}: ExportModalProps) {
  const [title, setTitle] = useState("個人題庫測驗試卷");
  const [subtitle, setSubtitle] = useState("QuizMaster 題庫系統匯出");

  // 核心功能：是否包含解析
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [includeAnswers, setIncludeAnswers] = useState(true);

  // 狀態提示
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  // 產生 Rich Text HTML (專門針對貼入 Google Docs 的標準列印白底黑字排版結構)
  const generateGoogleDocsHtml = () => {
    let html = `
      <div style="font-family: 'Noto Sans TC', 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #0f172a; margin-bottom: 4px; font-size: 18pt;">${title}</h1>
        <p style="text-align: center; color: #64748b; font-size: 10pt; margin-top: 0; margin-bottom: 12px;">
          ${subtitle} · 總題數：${questions.length} 題 · 模式：${
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

    questions.forEach((q, idx) => {
      const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";

      html += `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <p style="font-size: 11pt; font-weight: bold; margin: 0 0 6px 0; color: #0f172a;">
            ${idx + 1}. <span style="color: ${q.type === "SINGLE" ? "#2563eb" : "#7c3aed"}; font-weight: bold;">【${typeLabel}】</span>
            ${q.stem}
          </p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b;"><strong>(A)</strong> ${q.optionA}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b;"><strong>(B)</strong> ${q.optionB}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b;"><strong>(C)</strong> ${q.optionC}</p>
          <p style="margin: 2px 0 2px 24px; font-size: 10pt; color: #1e293b;"><strong>(D)</strong> ${q.optionD}</p>
      `;

      if (includeExplanation || includeAnswers) {
        html += `
          <p style="margin: 6px 0 2px 24px; font-size: 10pt; color: #047857;">
            <strong>【標準答案】：</strong> <span style="font-weight: bold; color: #059669;">${q.correctAnswers}</span>
          </p>
        `;
      }

      if (includeExplanation) {
        html += `
          <div style="margin: 4px 0 0 24px; font-size: 9.5pt; color: #334155; background-color: #f8fafc; padding: 6px 10px; border-left: 3px solid #cbd5e1;">
            <strong>【題目解析】：</strong> ${
              q.explanation
                ? q.explanation
                : "<span style='color: #94a3b8; font-style: italic;'>（出題者未填寫解析）</span>"
            }
          </div>
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
          questionIds: questions.map((q) => q.id),
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
      const textContent = `${title}\n${subtitle}\n\n` + questions.map((q, idx) =>
        `${idx + 1}. [${q.type === "SINGLE" ? "單選" : "複選"}] ${q.stem}\n(A) ${q.optionA}\n(B) ${q.optionB}\n(C) ${q.optionC}\n(D) ${q.optionD}\n` +
        (includeExplanation || includeAnswers ? `【正確答案】: ${q.correctAnswers}\n` : "") +
        (includeExplanation ? `【題目解析】: ${q.explanation || "無"}\n` : "")
      ).join("\n");

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0c]/95 max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/[0.10] space-y-5 text-foreground backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 ease-expo-out">
        {/* 頂部標題與關閉按鈕 */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shadow-[0_0_16px_rgba(59,130,246,0.25)]">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-game text-foreground">
                匯出全部題目成 Google 文件
              </h2>
              <p className="text-xs text-foreground-muted">
                目前匯出範圍：<strong className="text-[#8B96F8] font-bold font-game">{questions.length}</strong> 道題目
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors"
            aria-label="關閉匯出視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* 試卷基本資訊設定 */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold font-game text-foreground">文件大標題：</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium transition-all placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold font-game text-foreground">副標題說明：</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-white/30"
              />
            </div>
          </div>

          {/* 核心需求設定：是否含有解析 */}
          <div className="space-y-2.5 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <label className="font-bold font-game text-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>匯出內容與解析設定 (核心選項)</span>
            </label>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {/* 選項 1: 包含解析 (解答卷) */}
              <button
                type="button"
                onClick={() => {
                  setIncludeExplanation(true);
                  setIncludeAnswers(true);
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 ease-expo-out ${
                  includeExplanation
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-[0_0_18px_rgba(94,106,210,0.2)] font-medium"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                    includeExplanation
                      ? "border-accent bg-accent text-white"
                      : "border-white/30 bg-transparent"
                  }`}
                >
                  {includeExplanation && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    包含解析與答案
                  </div>
                  <div className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                    附標準解答與出題解析，適合教師解答卷或自學複習冊。
                  </div>
                </div>
              </button>

              {/* 選項 2: 不含解析 (要有答案但是隱藏解析) */}
              <button
                type="button"
                onClick={() => {
                  setIncludeExplanation(false);
                  setIncludeAnswers(true);
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 ease-expo-out ${
                  !includeExplanation
                    ? "border-accent/70 bg-accent/15 text-foreground ring-1 ring-accent/40 shadow-[0_0_18px_rgba(94,106,210,0.2)] font-medium"
                    : "border-white/[0.06] bg-white/[0.02] text-foreground-muted hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                    !includeExplanation
                      ? "border-accent bg-accent text-white"
                      : "border-white/30 bg-transparent"
                  }`}
                >
                  {!includeExplanation && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold font-game text-xs text-foreground">
                    不含解析（有答案，隱藏解析）
                  </div>
                  <div className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                    每題輸出標準答案，但隱藏詳細解析說明。
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
                  包含每題標準答案（勾選保留正解，取消則連答案一同隱藏）
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 成功複製提示 */}
        {copySuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in duration-200 ease-expo-out">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              已複製 Google 文件專屬排版！打開 Google 文件按下 <strong>Ctrl + V</strong> 即可直接貼上完整排版試卷！
            </span>
          </div>
        )}

        {/* 匯出動作按鈕區 */}
        <div className="space-y-3 pt-3 border-t border-white/[0.06]">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* 途徑 1: 下載 .docx 檔案 */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="px-5 py-3 rounded-xl bg-accent hover:bg-accent-bright text-white font-bold font-game text-xs shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 ease-expo-out"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "產生文件中..." : "下載 Google 文件 (.docx)"}</span>
            </button>

            {/* 途徑 2: 一鍵複製格式文字 */}
            <button
              type="button"
              onClick={handleCopyRichText}
              className="px-5 py-3 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-foreground font-bold font-game text-xs flex items-center justify-center gap-2 transition-all duration-200 ease-expo-out active:scale-95 shadow-sm"
            >
              <Copy className="w-4 h-4 text-slate-400" />
              <span>複製為 Google 文件排版</span>
            </button>
          </div>

          {/* 途徑 3: 快速前往 Google 文件建立空白文件 */}
          <div className="text-center pt-1">
            <a
              href="https://docs.google.com/document/create"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#8B96F8] hover:text-accent-bright font-semibold hover:underline transition-colors"
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