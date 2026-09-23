"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  PlusCircle,
  Search,
  GraduationCap,
  Menu,
  X,
  User as UserIcon,
  LogIn,
  LogOut,
  Swords,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, openAuthModal, logout } = useAuth();

  // Close mobile menu on pathname change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/", label: "題庫總覽", icon: BookOpen },
    { href: "/add", label: "新增題目", icon: PlusCircle },
    { href: "/questions", label: "題目查詢", icon: Search },
    { href: "/practice", label: "刷題練習", icon: GraduationCap },
    { href: "/battle", label: "⚔️ 多人對戰", icon: Swords },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#050506]/85 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & Switch badge */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5E6AD2] to-[#434db0] flex items-center justify-center text-white shadow-[0_0_20px_rgba(94,106,210,0.45)] border border-white/[0.15] group-hover:scale-105 transition-all duration-200 ease-expo-out">
            <GraduationCap className="w-5 h-5 text-indigo-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <span className="font-game font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
              QuizMaster
              <span className="font-game text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#5E6AD2]/15 text-[#9AA5FF] border border-[#5E6AD2]/30 shadow-[0_0_12px_rgba(94,106,210,0.25)] tracking-wide">
                個人題庫
              </span>
            </span>
          </div>
        </Link>

        {/* Right side area: Desktop Nav + Auth & Mobile Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-expo-out touch-tactile ${
                    isActive
                      ? "bg-white/[0.08] text-foreground border border-white/[0.10] shadow-sm shadow-[0_0_16px_rgba(94,106,210,0.2)] font-semibold"
                      : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#8B96F8]" : "text-foreground-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth Control */}
          <div className="hidden sm:flex items-center pl-2 border-l border-white/[0.08]">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                  <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent/40 text-[#9AA5FF] flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.slice(0, 1).toUpperCase() : user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold text-foreground max-w-[100px] truncate min-w-0">
                    {user.name || user.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="登出帳號"
                  aria-label="登出帳號"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 touch-tactile touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold font-game bg-accent hover:bg-accent-bright text-white shadow-glow transition-all duration-200 active:scale-95 touch-manipulation touch-tactile"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>登入 / 註冊</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="sm:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-white/[0.06] border border-white/[0.08] transition-colors duration-200 ease-expo-out focus:outline-none focus:ring-2 focus:ring-accent shrink-0 touch-tactile"
            aria-label={mobileMenuOpen ? "關閉選單" : "開啟選單"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Collapsible Navigation */}
      {mobileMenuOpen && (
        <nav className="sm:hidden border-t border-white/[0.06] bg-[#050506]/95 backdrop-blur-2xl px-4 py-3 space-y-1.5 shadow-2xl animate-fade-in-down">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-[44px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-expo-out touch-tactile ${
                  isActive
                    ? "bg-white/[0.08] text-foreground border border-white/[0.10] shadow-sm font-semibold"
                    : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#8B96F8]" : "text-foreground-muted"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Mobile Auth Button */}
          <div className="pt-2 border-t border-white/[0.06]">
            {user ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 text-[#9AA5FF] flex items-center justify-center font-bold text-sm">
                    {user.name ? user.name.slice(0, 1).toUpperCase() : user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">{user.name || user.username}</div>
                    <div className="text-[10px] text-foreground-muted">@{user.username}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 touch-tactile"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>登出</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal("login");
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold font-game bg-accent text-white shadow-glow"
              >
                <LogIn className="w-4 h-4" />
                <span>會員登入 / 註冊</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}