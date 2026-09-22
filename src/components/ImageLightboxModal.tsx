"use client";

import React, { useEffect } from "react";
import { X, ExternalLink, ZoomIn } from "lucide-react";

interface ImageLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
  altText?: string;
}

export default function ImageLightboxModal({
  imageUrl,
  onClose,
  altText = "題目附圖放大檢視",
}: ImageLightboxModalProps) {
  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="附圖放大檢視"
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Controls */}
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors touch-manipulation"
            title="另開分頁檢視原始圖片"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>原圖</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors touch-manipulation"
            aria-label="關閉放大檢視"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Container */}
        <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/40 flex items-center justify-center max-w-full max-h-[85vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={altText}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}
