# Plan: QuizMaster Linear/Modern & Nintendo Switch Style Complete Overhaul

## Objectives
1. Implement Linear/Modern dark aesthetic with Deep Space #050506 base, ambient glowing blobs, micro-glassmorphism, and multi-layered shadows.
2. Setup Nintendo Switch fonts: Zen Maru Gothic + Plus Jakarta Sans.
3. Overhaul all 7 main UI touchpoints (layout/Navbar/Footer, Home, Add, Questions, Practice, ExportModal).
4. Preserve 100% functionality of 5 core features with zero regressions.
5. Standardize micro-interactions (200-300ms expo-out) and guarantee WCAG AAA contrast.
6. Verify via build checks (npm run build) and functional validation.

## Workflow Phases
- **Phase 0: Survey & Codebase Exploration**
  - Dispatch 3 parallel Explorers:
    - Explorer 1: Project structure, dependencies, fonts setup, Tailwind config, CSS globals.
    - Explorer 2: UI Pages & Components (Navbar, layout, Footer, Home, Add, Questions, Practice).
    - Explorer 3: Functional core & logic (5 features, state management, duplicate detection, export logic, build setup).
  - Synthesize findings into PROJECT.md.
- **Phase 1: Milestone R1 - Design Tokens & Switch Fonts**
  - Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate check.
  - Setup Zen Maru Gothic + Plus Jakarta Sans in Next.js.
  - Define Linear tokens in tailwind.config.ts and globals.css (#050506 base, ambient floating blobs, glow accents, borders).
- **Phase 2: Milestone R2 - Full-Site Component & Page Overhaul**
  - Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate check.
  - Navbar, layout.tsx, Footer, Hero + Bento Grid on /page.tsx.
  - /add/page.tsx, /questions/page.tsx, /practice/page.tsx, ExportModal.tsx.
  - Ensure all 5 core features remain 100% functional.
- **Phase 3: Milestone R3 - Micro-interactions & WCAG AAA Contrast**
  - Standardize 200-300ms expo-out cubic-bezier(0.16, 1, 0.3, 1).
  - Contrast check: >=15:1 main text, >=6:1 secondary text.
  - Reviewers -> Challengers -> Auditor -> Gate check.
- **Phase 4: Milestone R4 - Verification & Build Audit**
  - Build check (npm run build).
  - Functional tests for 5 core features.
  - Final Auditor review.
  - Completion notification to Sentinel.
