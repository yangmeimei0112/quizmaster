# Project: QuizMaster Linear/Modern Dark & Nintendo Switch Style Overhaul

## Architecture
- **Tech Stack**: Next.js 14.2.15 (App Router), React 18, Tailwind CSS 3.4.14, Prisma 5.21.1 (SQLite), docx 9.7.1, Lucide React 0.453.0.
- **Design System**: Linear/Modern dark aesthetic (#050506 base, #020203 deep, #0a0a0c elevated, surface rgba(255,255,255,0.05), surface-hover rgba(255,255,255,0.08), accent #5E6AD2, accent-bright #6872D9, accent-glow rgba(94,106,210,0.3), border-white/[0.06], border-white/[0.10] hover, multi-layered shadows and 1px top highlight).
- **Typography Cascade**: Nintendo Switch Game Font style (Zen Maru Gothic for Japanese/CJK round gothic character aesthetics + Plus Jakarta Sans for modern geometric Latin numbers/letters).
- **Global Atmospheric Background**: 4-tier fixed non-blocking background system in layout.tsx (Deep dark base, top radial glow, subtle grid matrix, floating animated blurred glowing blobs).
- **Micro-interactions**: 200-300ms cubic-bezier(0.16, 1, 0.3, 1) (expo-out) across all interactive elements (buttons, inputs, cards, accordions, modals).
- **Accessibility**: WCAG AAA contrast standard (>=15:1 primary text #EDEDEF vs #050506, >=6:1 secondary text #8A8F98 vs #050506).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Global Tokens & Switch Fonts | Tailwind tokens, globals.css variables, Zen Maru Gothic + Plus Jakarta Sans fonts cascade, 4-tier animated background | M1 | Survey 1 | VERIFIED_DONE |
| 2 | Navbar, Layout & Footer Overhaul | Dark frosted glass navbar, Switch-style glowing badge, mobile responsive drawer, dark footer | M2 | Survey 2 | VERIFIED_DONE |
| 3 | Dashboard Bento Grid Overhaul | Modern Linear hero section, gradient text, Asymmetric Bento Grid statistics, deep frosted glass cards | M2 | Survey 2 | VERIFIED_DONE |
| 4 | Single Question Entry Overhaul | Dark inputs, glowing Switch capsule switcher, ruby/amber duplicate warning cards (100% exact block, >=70% warning) | M2 | Survey 2 & 3 | VERIFIED_DONE |
| 5 | Question Bank Search & Manage Overhaul | Deep card stream, smooth accordion explanation expansion, dark inline edit modal, search & filter | M2 | Survey 2 & 3 | VERIFIED_DONE |
| 6 | Practice Mode Game Overhaul | Nintendo Switch gamified quiz cards, tactile option cards with neon glow, instant emerald/rose feedback, award card | M2 | Survey 2 & 3 | VERIFIED_DONE |
| 7 | Google Docs Export Modal Overhaul | Dark frosted glass modal, glowing mode selectors, preservation of docx download, rich text copy, Google Docs open | M2 | Survey 2 & 3 | VERIFIED_DONE |
| 8 | Micro-interactions & WCAG AAA Contrast | Standardize 200-300ms expo-out easing on all interactive elements, verify >=15:1 & >=6:1 contrast | M3 | Survey 1 & 2 | VERIFIED_DONE |
| 9 | Dual-Track E2E & Integrity Verification | Pass automated test suite (scripts/test_suite.js, scripts/test_export.js), npm run build check, zero regression | M4 | Survey 3 | VERIFIED_DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Tokens, Background & Fonts | tailwind.config.ts, globals.css, layout.tsx font loading & 4-layer background | none | DONE |
| 2 | M2: Full-Site Component & Page Overhaul | Navbar.tsx, layout.tsx, Footer, page.tsx, add/page.tsx, questions/page.tsx, practice/page.tsx, ExportModal.tsx | M1 | DONE |
| 3 | M3: Micro-interactions & WCAG AAA Hardening | Polish expo-out transitions across all components, verify AAA contrast ratios | M2 | DONE |
| 4 | M4: Build & Functional Verification | npm run build, npx tsc, test_suite.js, test_export.js, forensic integrity audit | M3 | DONE |

## Interface Contracts
### Design Tokens Contract
- Tailwind classes available: g-background-deep (#020203), g-background-base (#050506), g-background-elevated (#0a0a0c), g-surface (rgba(255,255,255,0.05)), hover:bg-surface-hover (rgba(255,255,255,0.08)).
- Accent classes: g-accent / 	ext-accent (#5E6AD2), g-accent-bright (#6872D9), shadow-accent-glow (rgba(94,106,210,0.3)).
- Typography classes: ont-sans (Plus Jakarta Sans + Zen Maru Gothic + sans-serif), ont-game (Zen Maru Gothic + Plus Jakarta Sans + sans-serif).
- Easing utility: ease-expo-out (cubic-bezier(0.16, 1, 0.3, 1)), duration-200, duration-250, duration-300.

## Code Layout
- 	ailwind.config.ts: Verified complete.
- src/app/globals.css: Verified complete.
- src/app/layout.tsx: Verified complete.
- src/components/Navbar.tsx: Verified complete.
- src/app/page.tsx: Verified complete.
- src/app/add/page.tsx: Verified complete.
- src/app/questions/page.tsx: Verified complete.
- src/app/practice/page.tsx: Verified complete.
- src/components/ExportModal.tsx: Verified complete.
- src/lib/similarity.ts: Unchanged (business logic intact).
- src/app/api/*: Unchanged (business logic intact).
