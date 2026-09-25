# Project: QuizMaster Linear/Modern Dark & Nintendo Switch Style Overhaul

## Architecture
- **Tech Stack**: Next.js 14.2.15 (App Router), React 18, Tailwind CSS 3.4.14, Prisma 5.21.1 (SQLite), docx 9.7.1, Lucide React 0.453.0.
- **Design System**: Linear/Modern dark aesthetic (#050506 base, #020203 deep, #0a0a0c elevated, surface rgba(255,255,255,0.05), surface-hover rgba(255,255,255,0.08), accent #5E6AD2, accent-bright #6872D9, accent-glow rgba(94,106,210,0.3), border-white/[0.06], border-white/[0.10] hover, multi-layered shadows and 1px top highlight).
- **Typography Cascade**: Nintendo Switch Game Font style (Zen Maru Gothic for Japanese/CJK round gothic character aesthetics + Plus Jakarta Sans for modern geometric Latin numbers/letters).
- **Global Atmospheric Background**: 4-tier fixed non-blocking background system in layout.tsx (Deep dark base, top radial glow, subtle grid matrix, floating animated blurred glowing blobs).
- **Micro-interactions**: 200-300ms cubic-bezier(0.16, 1, 0.3, 1) (expo-out) across all interactive elements (buttons, inputs, cards, accordions, modals).
- **Accessibility**: WCAG AAA contrast standard (>=15:1 primary text #EDEDEF vs #050506, >=6:1 secondary text #8A8F98 vs #050506).
- **Explanation System (Option C Flagship)**:
  - Canonical Component: `src/components/ExplanationCard.tsx`
  - Deterministic Parser: `src/lib/explanationParser.ts`
  - High-contrast deep dark theme (`bg-[#0c101d]`, `border-indigo-500/20`), line-heights 1.7, 1.85, 2.0.
  - Adaptive layout: Option Card Extraction (emerald `✓ 正解選項` vs rose/slate `✗ 錯誤剖析`) vs Concept Mode (`💡 核心考點`).
  - Scoped A- / A / A+ reader controls with SSR-safe `localStorage` persistence, view toggle (Full vs Concise), and 1-click copy with feedback.
  - Zero database mutation invariant: 100% preservation of raw database strings.

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
| 8 | Micro-interactions & WCAG AAA Hardening | Polish expo-out transitions across all components, verify AAA contrast ratios | M3 | Survey 1 & 2 | VERIFIED_DONE |
| 9 | Dual-Track E2E & Integrity Verification | Pass automated test suite (scripts/test_suite.js, scripts/test_export.js), npm run build check, zero regression | M4 | Survey 3 | VERIFIED_DONE |
| 10 | Option C Canonical ExplanationCard Component | High-contrast deep dark card (`#0c101d`, `border-indigo-500/20`), line-heights 1.7/1.85/2.0, zero-loss markdown | M5 | Survey OptC | VERIFIED_DONE |
| 11 | Adaptive Parsing Engine | Dual mode: Option cards (emerald `✓ 正解選項` vs rose `✗ 錯誤剖析`) vs Monolithic concept (`💡 核心考點`) | M5 | Survey OptC | VERIFIED_DONE |
| 12 | Personalized Reader Controls | Scoped A-/A/A+ scaling, SSR-safe localStorage persistence, view toggle (full/concise), 1-click copy with toast feedback | M5 | Survey OptC | VERIFIED_DONE |
| 13 | 4-Scenario Site Integration | Adapt `/questions`, `/practice`, `BattlePlayView`, `WrongQuestionsRanking` (+ `MockExamView`) | M6 | Survey OptC | VERIFIED_DONE |
| 14 | Database Immutability & Content Fidelity | Zero schema/database mutation, 100% faithful representation of raw strings | M6 | Survey OptC | VERIFIED_DONE |
| 15 | Test Suite & 21-Route Build Verification | Unit tests for parser/component, integration AST audit, npm test & npm run build zero errors | M7 | Survey OptC | VERIFIED_DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Tokens, Background & Fonts | tailwind.config.ts, globals.css, layout.tsx font loading & 4-layer background | none | DONE |
| 2 | M2: Full-Site Component & Page Overhaul | Navbar.tsx, layout.tsx, Footer, page.tsx, add/page.tsx, questions/page.tsx, practice/page.tsx, ExportModal.tsx | M1 | DONE |
| 3 | M3: Micro-interactions & WCAG AAA Hardening | Polish expo-out transitions across all components, verify AAA contrast ratios | M2 | DONE |
| 4 | M4: Build & Functional Verification | npm run build, npx tsc, test_suite.js, test_export.js, forensic integrity audit | M3 | DONE |
| 5 | M5: Core ExplanationCard & Parser Engine | `src/lib/explanationParser.ts` & `src/components/ExplanationCard.tsx` (Option C flagship) | M1-M4 | DONE |
| 6 | M6: 4-Scenario Site-Wide Integration | `questions/page.tsx`, `practice/page.tsx`, `BattlePlayView.tsx`, `WrongQuestionsRanking.tsx`, `MockExamView.tsx` | M5 | DONE |
| 7 | M7: Test Suite & 21-Route Build Verification | `test_explanation_parser.js`, `test_explanation_card.js`, `audit_explanation_integration.js`, `npm test`, `npm run build` | M6 | DONE |

## Interface Contracts
### `src/lib/explanationParser.ts` Contract
```typescript
export interface ParsedOptionCard {
  key: string; // e.g. "A", "B", "C", "D"
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ParsedExplanationResult {
  mode: "options" | "concept";
  intro?: string;
  options?: ParsedOptionCard[];
  takeaway?: string;
  conceptText?: string;
  rawText: string;
}

export function parseExplanation(
  explanation: string | null | undefined,
  correctAnswers?: string | string[] | null,
  options?: Record<string, string> | Array<{ key: string; text: string }> | null
): ParsedExplanationResult;

export function renderMarkdownTokens(text: string): React.ReactNode[];
```

### `src/components/ExplanationCard.tsx` Contract
```typescript
export interface ExplanationCardProps {
  explanation?: string | null;
  correctAnswers?: string | string[] | null;
  userAnswer?: string | string[] | null;
  options?: Record<string, string> | Array<{ key: string; text: string }>;
  questionType?: "SINGLE" | "MULTIPLE" | string;
  compact?: boolean;
  defaultFontSize?: "small" | "medium" | "large";
  defaultViewMode?: "full" | "concise";
  showControls?: boolean;
  showCopyButton?: boolean;
  className?: string;
  title?: string;
}
```

## Code Layout
- `src/lib/explanationParser.ts`: Pure parser engine & markdown tokenizer (Verified).
- `src/components/ExplanationCard.tsx`: Canonical Option C component (Verified).
- `src/app/questions/page.tsx`: Question bank list integration (Verified).
- `src/app/practice/page.tsx`: Practice mode instant reveal integration (Verified).
- `src/components/battle/BattlePlayView.tsx`: Multiplayer battle compact reveal integration (Verified).
- `src/components/practice/WrongQuestionsRanking.tsx`: Wrong questions review integration (Verified).
- `src/components/practice/MockExamView.tsx`: Mock exam review integration (Verified).
- `scripts/test_explanation_parser.js`: Unit tests for explanation parser (43/43 passed).
- `scripts/test_explanation_card.js`: Component contract tests (20/20 passed).
- `scripts/audit_explanation_integration.js`: AST/callsite audit (31/31 passed).
- `package.json`: Updated test script wiring (Verified).
