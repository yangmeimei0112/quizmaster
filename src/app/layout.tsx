import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/lib/AuthContext";
import AuthModal from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "QuizMaster - 專案管理概論 個人複習題庫",
  description: "專為專案管理概論打造的個人複習題庫，支援 4 選項單選與複選題、智慧即時防重複比對、關鍵字查詢與個人模擬刷題自測平台。",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-base text-foreground antialiased min-h-[100dvh] flex flex-col font-sans relative selection:bg-accent/30 selection:text-white">
        <AuthProvider>
          {/* Four-Layer Background System */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
            {/* Layer 1: Top radial spotlight */}
            <div className="absolute inset-x-0 top-0 h-[600px] bg-top-radial" />
            {/* Layer 2: Subtle dark grid texture */}
            <div className="absolute inset-0 bg-grid-pattern opacity-70" />
            {/* Layer 3: Multiple slow animated floating blurred blobs with GPU compositing */}
            <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-[#5E6AD2]/15 blur-[130px] animate-float-slow motion-reduce:animate-none transform-gpu will-change-transform" />
            <div className="absolute top-48 -right-24 w-[450px] h-[450px] rounded-full bg-[#6872D9]/12 blur-[140px] animate-float-delayed motion-reduce:animate-none transform-gpu will-change-transform" />
            <div className="absolute -bottom-24 -left-20 w-[550px] h-[550px] rounded-full bg-[#8B5CF6]/10 blur-[160px] animate-float-slow motion-reduce:animate-none transform-gpu will-change-transform" />
          </div>

          {/* Foreground Content */}
          <div className="relative z-10 flex flex-col min-h-[100dvh]">
            <Navbar />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
              {children}
            </main>
            <footer className="border-t border-white/[0.06] bg-[#050506]/80 backdrop-blur-md pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-center text-xs text-[#8A8F98]">
              QuizMaster 個人題庫系統
            </footer>
          </div>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}