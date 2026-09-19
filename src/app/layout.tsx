import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "QuizMaster - 個人題庫管理與防重複系統",
  description: "支援 4 選項單選與複選題錄入、智慧相似度比對防重複輸入、高效關鍵字查詢與個人自測刷題平台。",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Huninn&family=Noto+Sans+TC:wght@400;500;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-base text-foreground antialiased min-h-screen flex flex-col font-sans relative selection:bg-accent/30 selection:text-white">
        {/* Four-Layer Background System */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          {/* Layer 1: Top radial spotlight */}
          <div className="absolute inset-x-0 top-0 h-[600px] bg-top-radial" />
          {/* Layer 2: Subtle dark grid texture */}
          <div className="absolute inset-0 bg-grid-pattern opacity-70" />
          {/* Layer 3: Multiple slow animated floating blurred blobs */}
          <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-[#5E6AD2]/15 blur-[130px] animate-float-slow motion-reduce:animate-none" />
          <div className="absolute top-48 -right-24 w-[450px] h-[450px] rounded-full bg-[#6872D9]/12 blur-[140px] animate-float-delayed motion-reduce:animate-none" />
          <div className="absolute -bottom-24 -left-20 w-[550px] h-[550px] rounded-full bg-[#8B5CF6]/10 blur-[160px] animate-float-slow motion-reduce:animate-none" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-white/[0.06] bg-[#050506]/80 backdrop-blur-md py-6 text-center text-xs text-[#8A8F98]">
            QuizMaster 個人題庫系統 · 智慧題目比對與儲存
          </footer>
        </div>
      </body>
    </html>
  );
}