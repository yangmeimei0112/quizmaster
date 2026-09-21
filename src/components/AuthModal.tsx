"use client";

import React, { useState, useEffect } from "react";
import { X, LogIn, UserPlus, Lock, User, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal, setUser } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode with context when opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isAuthModalOpen, authModalMode]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg("請輸入帳號");
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg("帳號長度需至少為 3 個字元");
      return;
    }

    if (!password) {
      setErrorMsg("請輸入密碼");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("密碼長度需至少為 6 個字元");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setErrorMsg("兩次輸入的密碼不相符，請重新確認");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload: any = {
        username: cleanUsername,
        password,
      };
      if (mode === "register" && name.trim()) {
        payload.name = name.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "操作失敗，請稍後再試");
        return;
      }

      setUser(data.user);
      setSuccessMsg(mode === "login" ? "登入成功！" : "帳號註冊成功並已自動登入！");

      setTimeout(() => {
        closeAuthModal();
        setUsername("");
        setName("");
        setPassword("");
        setConfirmPassword("");
        setSuccessMsg("");
      }, 700);
    } catch (err: any) {
      setErrorMsg("連線伺服器時發生錯誤: " + (err?.message || "請檢查網路"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full sm:max-w-md bg-[#0c0c10]/95 border-t sm:border border-white/[0.12] rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-sheet-up sm:animate-scale-in text-foreground overflow-y-auto overscroll-contain scroll-touch max-h-[90dvh] sm:max-h-[85vh] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] transform-gpu will-change-transform">
        {/* Mobile Drag Handle Indicator */}
        <div className="pt-1 pb-1 sm:hidden flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#5E6AD2] to-transparent opacity-80" />
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#5E6AD2]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.08] transition-colors touch-manipulation"
          aria-label="關閉彈窗"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold font-game transition-all duration-200 touch-manipulation ${
                mode === "login"
                  ? "bg-accent text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>會員登入</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg("");
              }}
              className={`min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold font-game transition-all duration-200 touch-manipulation ${
                mode === "register"
                  ? "bg-accent text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>註冊帳號</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold font-game text-foreground">
              {mode === "login" ? "歡迎回到 QuizMaster" : "建立您的 QuizMaster 帳號"}
            </h2>
            <p className="text-xs text-foreground-muted mt-1">
              {mode === "login"
                ? "登入以解鎖個人專屬錯題本與雲端測驗數據同步"
                : "註冊後可自動累計歷次練習錯題，精準追蹤複習盲點"}
            </p>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent" />
              <span>帳號名稱 (Username)</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例如：john_doe"
              autoFocus
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-foreground text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>顯示名稱 / 暱稱 (選填)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小明"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-foreground text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-accent" />
              <span>密碼 (Password)</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-foreground text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>再次確認密碼</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入相同密碼"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-foreground text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] mt-2 py-3 px-4 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold font-game shadow-glow transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>立即登入</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>完成註冊並登入</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center text-xs text-foreground-muted">
          {mode === "login" ? (
            <p className="flex items-center justify-center flex-wrap gap-1">
              <span>還沒有帳號嗎？</span>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg("");
                }}
                className="text-[#9AA5FF] hover:underline font-semibold min-h-[44px] inline-flex items-center px-2 touch-manipulation"
              >
                立即註冊
              </button>
            </p>
          ) : (
            <p className="flex items-center justify-center flex-wrap gap-1">
              <span>已經有帳號？</span>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className="text-[#9AA5FF] hover:underline font-semibold min-h-[44px] inline-flex items-center px-2 touch-manipulation"
              >
                點此登入
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
