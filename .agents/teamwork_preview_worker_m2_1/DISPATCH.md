## 2026-09-18T18:11:58Z

You are a Worker agent (Identity: teamwork_preview_worker_m2_1).
Your working directory is: c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/teamwork_preview_worker_m2_1
The workspace directory is: c:/Users/yaco9/Documents/antigravity/lively-galileo
The user request is documented verbatim in: c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/ORIGINAL_REQUEST.md.
Also read:
- c:/Users/yaco9/Documents/antigravity/lively-galileo/PROJECT.md
- c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/teamwork_preview_explorer_survey_2/analysis.md (Exhaustive UI mapping)
- c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/teamwork_preview_explorer_survey_3/analysis.md (Core feature logic & state)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope Ownership:
You EXCLUSIVELY own:
1. `src/components/Navbar.tsx`
2. `src/app/page.tsx`
3. `src/app/add/page.tsx`
4. `src/app/questions/page.tsx`
5. `src/app/practice/page.tsx`
6. `src/components/ExportModal.tsx`
7. Minor adjustments in `tailwind.config.ts` (add `transitionDuration: { '250': '250ms' }`) and `src/app/layout.tsx` (add `motion-reduce:animate-none` to blobs).

Tasks for Milestone 2 (R2 - Full-Site Complete Overhaul):
Maintain 100% functionality of all 5 core features without regression while overhauling the visual interface into the Linear/Modern dark aesthetic + Nintendo Switch game feel:

1. `src/components/Navbar.tsx`:
   - Dark frosted glass: `bg-[#050506]/85 backdrop-blur-xl border-b border-white/[0.06]`.
   - Brand logo & Switch badge: Game-style rounded pill badge with Nintendo Switch console/Joy-Con inspired glowing accent (`#5E6AD2` / `#6872D9`), using `font-game font-bold`.
   - Navigation links: Sleek soft-glow active indicators (`bg-white/[0.08] text-foreground border border-white/[0.10] shadow-sm`), inactive `text-foreground-muted hover:text-foreground hover:bg-white/[0.04]`, smooth `ease-expo-out duration-200`.
   - Mobile navigation: Add responsive hamburger menu toggle button and collapsible/drawer mobile navigation for phone viewports (< 640px).

2. `src/app/page.tsx` (Home Dashboard):
   - Linear Hero section: Ambient glowing backdrop, modern gradient title (`bg-clip-text text-transparent bg-gradient-to-r from-white via-[#EDEDEF] to-[#8A8F98]`), primary CTA button with glowing accent (`bg-accent hover:bg-accent-bright text-white shadow-glow ease-expo-out duration-200`), secondary CTA with dark glassmorphism.
   - Asymmetric Bento Grid for statistics: Replace plain white boxes with asymmetric dark glass cards (`bg-surface hover:bg-surface-hover border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 shadow-linear-card transition-all duration-200 ease-expo-out`), featuring luminous stat numbers and subtle accent icons.
   - Recent questions list: Dark surface container with micro-dividers `divide-white/[0.04]`, glowing tag pills, and clean typography.

3. `src/app/add/page.tsx` (Manual Question Addition & Duplicate Detection):
   - Question Type Switcher: Glowing Switch capsule switcher (`SINGLE` vs `MULTIPLE`) with smooth active pill animation.
   - Form Inputs: Dark inputs (`bg-white/[0.03] border border-white/[0.08] focus:border-accent focus:ring-1 focus:ring-accent rounded-xl text-foreground placeholder-white/30`).
   - Duplicate Detection Warning Cards:
     * Exact duplicate (100% match): Standout ruby red dark card (`bg-rose-950/40 border border-rose-500/40 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.15)]`), clearly blocking submission.
     * High similarity (>= 70%): Luminous amber warning card (`bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.15)]`) with similarity percentage badges and link to existing questions.
   - Option Cards: Tactile dark cards with letter circles (`A`, `B`, `C`, `D`), glowing emerald border and ring when selected as correct.
   - Duplicate Confirmation Dialog: Dark frosted glass modal (`bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/[0.10] shadow-2xl`).
   - Preserve 100% logic: state hooks, debounced duplicate check (350ms), single vs multiple folding, submit validation, and API payload.

4. `src/app/questions/page.tsx` (Question Bank Search & Management):
   - Search & Filter bar: Dark floating panel (`bg-[#0a0a0c]/80 border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 sm:p-5`), glowing search input with search icon, type filter pill buttons, and global answer visibility toggle button (`showAnswersGlobal`).
   - Question Stream: Cards styled in `bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-200 ease-expo-out`.
   - Smooth Accordion: Explanation toggle with smooth height/opacity transition in dark tinted container (`bg-white/[0.02] border border-white/[0.04] rounded-xl p-4`).
   - Inline Edit Modal: Dark frosted glass modal (`bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/[0.10] rounded-2xl p-6 shadow-2xl`), preserving full edit & save functionality.
   - Preserve 100% logic: search debouncing (250ms), deletion with confirm, answer toggle set, inline edit PUT request.

5. `src/app/practice/page.tsx` (Gamified Practice Mode):
   - Practice Setup: Switch-styled game lobby card with question count selectors, type filters, and high-energy Start CTA.
   - Gamified Quiz Card: Nintendo Switch dialog feel (`font-game` titles, rounded geometry), progress bar with glowing gradient.
   - Option Selection Cards: Tactile options with hover glow, selected state with neon accent outline (`border-accent bg-accent/15 text-white shadow-glow`), submitted feedback revealing emerald green for correct (`border-emerald-500/80 bg-emerald-950/40 text-emerald-200`) and rose red for user error (`border-rose-500/80 bg-rose-950/40 text-rose-200`).
   - Explanation display: Smoothly appears post-submission in dark glass container.
   - Award / Settlement Screen: Celebratory Switch game completion card with glowing victory score, accuracy percentage, and action buttons.
   - Preserve 100% logic: random question shuffle, single/multiple submission grading, score accumulation.

6. `src/components/ExportModal.tsx` (Google Docs Export Dialog):
   - Dark frosted glass modal: `bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/[0.10] rounded-2xl shadow-2xl text-foreground`.
   - Option Radio Cards: Glowing dark cards for "包含解析與答案" and "不含解析（有答案，隱藏解析）".
   - Export Actions: Download .docx button, Copy Rich Text HTML button with copy feedback, Open Google Docs link in new tab.
   - Preserve 100% logic: keep docx API request, generateGoogleDocsHtml, clipboard copy with fallback. Note: the generated docx/HTML document formatting itself should remain clean black-on-white printable document formatting.

7. Verification:
   - Run `npm run build` to confirm 100% compile success with 0 errors.
   - Run `node scripts/test_suite.js` to verify all 6 integration tests pass.
   - Run `node scripts/test_export.js` to verify docx export passes.
   - Document changes, commands, and layout verification in `handoff.md` and notify parent via `send_message`.
