## 2026-09-18T17:52:16Z

You are a Worker agent (Identity: teamwork_preview_worker_m1_1).
Your working directory is: c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/teamwork_preview_worker_m1_1
The workspace directory is: c:/Users/yaco9/Documents/antigravity/lively-galileo
The user request is documented verbatim in: c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/ORIGINAL_REQUEST.md.
Also read:
- c:/Users/yaco9/Documents/antigravity/lively-galileo/PROJECT.md
- c:/Users/yaco9/Documents/antigravity/lively-galileo/.agents/teamwork_preview_explorer_survey_1/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope Ownership:
You EXCLUSIVELY own:
1. `tailwind.config.ts`
2. `src/app/globals.css`
3. `src/app/layout.tsx`

Task: Milestone 1 (R1 - Global Design Tokens, Background Atmosphere, and Switch Fonts)
1. In `tailwind.config.ts`:
   - Extend colors: `background-deep: #020203`, `background-base: #050506`, `background-elevated: #0a0a0c`, `surface: rgba(255,255,255,0.05)`, `surface-hover: rgba(255,255,255,0.08)`, `foreground: #EDEDEF`, `foreground-muted: #8A8F98`, `foreground-subtle: rgba(255,255,255,0.60)`, `accent: #5E6AD2`, `accent-bright: #6872D9`, `accent-glow: rgba(94,106,210,0.3)`.
   - Extend font families: `sans: ['var(--font-plus-jakarta)', 'var(--font-zen-maru)', 'Zen Maru Gothic', 'Plus Jakarta Sans', 'system-ui', 'sans-serif']`, `game: ['var(--font-zen-maru)', 'Zen Maru Gothic', 'var(--font-plus-jakarta)', 'sans-serif']`.
   - Extend transition timing function: `expo-out: cubic-bezier(0.16, 1, 0.3, 1)`.
   - Extend boxShadow: `linear: 0 8px 32px rgba(0, 0, 0, 0.4)`, `glow: 0 0 20px rgba(94, 106, 210, 0.3)`, `highlight: inset 0 1px 0 rgba(255, 255, 255, 0.10)`.
   - Add animations / keyframes for floating blobs (slow 12-18s continuous organic float).
2. In `src/app/globals.css`:
   - Import `Zen Maru Gothic` via Google Fonts `@import` to ensure complete Traditional Chinese & CJK glyph availability.
   - Set up CSS custom properties and standard base styling on `html`, `body`.
   - Add subtle dark grid pattern utility or class.
   - Configure dark theme scrollbars.
3. In `src/app/layout.tsx`:
   - Import `Plus_Jakarta_Sans` and `Zen_Maru_Gothic` from `next/font/google` (with `display: 'swap'`, variable definitions, and fallback).
   - Apply font variables and base classes on `<html>` and `<body>`.
   - Add the non-blocking 4-layer fixed atmospheric background container (`fixed inset-0 pointer-events-none z-0 overflow-hidden`):
     - Layer 0: Dark deep space base (`#050506`).
     - Layer 1: Top radial spotlight glow.
     - Layer 2: Subtle dark grid texture.
     - Layer 3: Multiple slow animated floating blurred blobs (`blur-[120px]` with indigo/purple/glow tones).
   - Wrap children in `<div className="relative z-10 flex flex-col min-h-screen">`.
   - Update `<footer>` with subtle border `border-white/[0.06]`, dark glassmorphism, and muted text `#8A8F98`.
4. Verification:
   - Run `npm run build` and ensure exit code 0 without any type or compilation errors.
   - Document commands, output, and layout conformance in your `handoff.md`.

When complete, write `handoff.md` in your working directory and notify the parent via `send_message`.
