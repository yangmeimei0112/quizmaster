"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Image as ImageIcon,
  Upload,
  Link2,
  Trash2,
  RefreshCw,
  Maximize2,
  AlertCircle,
  Clipboard,
  Check,
} from "lucide-react";
import ImageLightboxModal from "./ImageLightboxModal";

interface ImageAttachmentFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}

export default function ImageAttachmentField({
  value,
  onChange,
  disabled = false,
  compact = false,
  label = "題目附圖 (選填)",
}: ImageAttachmentFieldProps) {
  const [activeTab, setActiveTab] = useState<"UPLOAD" | "URL">("UPLOAD");
  const [urlInput, setUrlInput] = useState(value || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [pasteNotice, setPasteNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  // Sync internal url input if external value changes
  useEffect(() => {
    setUrlInput(value || "");
  }, [value]);

  // Upload file helper
  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploadError("");
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "圖片上傳失敗");
        }

        onChange(data.url);
        setUrlInput(data.url);
      } catch (err: any) {
        setUploadError(err.message || "圖片上傳異常");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onChange]
  );

  // Upload Base64 Data URL helper (e.g. from clipboard)
  const handleUploadDataUrl = useCallback(
    async (dataUrl: string) => {
      setUploadError("");
      setIsUploading(true);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "截圖貼上上傳失敗");
        }

        onChange(data.url);
        setUrlInput(data.url);
        setPasteNotice("截圖已成功上傳！");
        setTimeout(() => setPasteNotice(""), 3000);
      } catch (err: any) {
        setUploadError(err.message || "截圖上傳異常");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        handleUploadFile(file);
      } else {
        setUploadError("僅支援圖片檔案（JPG、PNG、WebP、GIF、SVG）");
      }
    }
  };

  // Paste handler (works when container is focused or on paste event)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled || isUploading) return;

      // 檢查剪貼簿檔案項目
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleUploadFile(file);
              return;
            }
          }
        }
      }

      // 檢查剪貼簿純文字是否為圖片 URL
      const pastedText = e.clipboardData?.getData("text")?.trim();
      if (
        pastedText &&
        (pastedText.startsWith("http://") ||
          pastedText.startsWith("https://") ||
          pastedText.startsWith("/uploads/")) &&
        /\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i.test(pastedText)
      ) {
        e.preventDefault();
        onChange(pastedText);
        setUrlInput(pastedText);
        setPasteNotice("已帶入圖片網址！");
        setTimeout(() => setPasteNotice(""), 3000);
      }
    },
    [disabled, isUploading, handleUploadFile, onChange]
  );

  // Apply URL
  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    onChange(trimmed);
  };

  // Remove attachment
  const handleRemove = () => {
    onChange("");
    setUrlInput("");
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-3 ${compact ? "text-xs" : ""}`}>
      {/* Header Label and Mode Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-bold font-game text-foreground flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <span>{label}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-foreground-muted border border-white/[0.08]">
            選填
          </span>
        </label>

        {/* Tab switch between Upload/Paste and URL */}
        <div className="flex items-center gap-1 bg-[#020203] p-1 rounded-xl border border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("UPLOAD")}
            className={`px-3 py-1 rounded-lg font-bold font-game transition-all ${
              activeTab === "UPLOAD"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            上傳/貼上
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("URL")}
            className={`px-3 py-1 rounded-lg font-bold font-game transition-all ${
              activeTab === "URL"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            圖片網址
          </button>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Paste Success Notice */}
      {pasteNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {/* If an image is currently attached, show preview with remove button */}
      {value ? (
        <div className="bg-[#0e0e12] border border-white/[0.12] rounded-2xl p-3.5 space-y-3 shadow-inner">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              已附圖
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-foreground text-xs flex items-center gap-1 transition-colors"
                title="放大檢視"
              >
                <Maximize2 className="w-3 h-3 text-cyan-400" />
                <span>放大檢視</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 transition-colors"
                title="移除這張附圖"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>移除附圖</span>
              </button>
            </div>
          </div>

          {/* Thumbnail Container */}
          <div
            className="relative group rounded-xl overflow-hidden border border-white/[0.08] bg-black/40 flex items-center justify-center p-2 cursor-pointer max-h-60 sm:max-h-72"
            onClick={() => setIsLightboxOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="題目附圖預覽"
              className="max-h-56 sm:max-h-64 max-w-full object-contain rounded-lg transition-transform group-hover:scale-[1.01]"
              onError={() => {
                setUploadError("圖片載入失敗，請確認網址或檔案是否正確有效");
              }}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="bg-black/75 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                點擊放大圖片
              </span>
            </div>
          </div>

          <div className="text-[11px] text-foreground-muted font-mono truncate px-1" title={value}>
            網址：{value}
          </div>
        </div>
      ) : (
        /* No image attached yet: Show Input or Upload Area */
        <div>
          {activeTab === "UPLOAD" ? (
            /* Drag & Drop / File Selector / Paste Zone */
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
              className={`relative border-2 border-dashed rounded-2xl p-5 sm:p-7 text-center transition-all duration-200 outline-none cursor-pointer select-none ${
                isDragging
                  ? "border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  : isUploading
                  ? "border-accent/40 bg-accent/5 opacity-70"
                  : "border-white/[0.12] bg-white/[0.02] hover:border-white/[0.25] hover:bg-white/[0.04] focus:border-accent"
              }`}
              onClick={() => {
                if (!isUploading && !disabled && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={handleFileInputChange}
                disabled={disabled || isUploading}
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform ${
                    isDragging
                      ? "bg-cyan-500/20 text-cyan-300 scale-110"
                      : "bg-white/[0.05] text-foreground-muted border border-white/[0.08]"
                  }`}
                >
                  {isUploading ? (
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-bold font-game text-foreground">
                    {isUploading ? (
                      <span className="text-cyan-400">圖片上傳處理中，請稍候...</span>
                    ) : isDragging ? (
                      <span className="text-cyan-300">放開以立即上傳附圖</span>
                    ) : (
                      <span>
                        點擊選取檔案、拖曳圖片至此，或直接按{" "}
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px] border border-white/20">
                          Ctrl+V
                        </kbd>{" "}
                        貼上截圖
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    支援 JPG、PNG、WebP、GIF、SVG 格式，容量最大 10MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* External Image URL Input */
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyUrl();
                      }
                    }}
                    placeholder="請貼入外部圖片網址 (https://... 或 /uploads/...)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent outline-none text-base sm:text-xs text-foreground placeholder:text-white/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold font-game shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  確認帶入
                </button>
              </div>
              <p className="text-[11px] text-foreground-muted">
                可貼入任何公有雲圖片網址或本機伺服器圖片路徑。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      <ImageLightboxModal
        imageUrl={isLightboxOpen ? value : null}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
