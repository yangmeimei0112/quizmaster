# Project: Mistake Statistics Full Upgrade & Inline Expansion

## Architecture
- **Data Layer**: Prisma ORM with dual-database support (local SQLite `dev.db` and cloud PostgreSQL on Render synced via `scripts/sync-db-provider.js`).
  - `Question` model extended with `totalAttempts`, `correctCount`, `countA`, `countB`, `countC`, `countD`.
  - `WrongQuestionRecord` model extended with `totalAttempts`, `correctCount`.
- **Backend API Layer**: Next.js App Router route `src/app/api/wrong-questions/route.ts`:
  - `POST` handles single and batch submissions of question attempts across all game modes, calculating correctness, incrementing atomic counters, and updating personal mistake records.
  - `GET` returns enriched question items with statistics, percentage distributions, and graceful fallback for questions with 0 attempts or legacy records.
- **Client Gameplay Integration Layer**:
  - `src/app/practice/page.tsx`: Submits every question answered in real-time.
  - `src/components/practice/MockExamView.tsx`: Submits all answered questions in batch upon exam completion.
  - `src/components/battle/BattlePlayView.tsx`: Submits every question evaluated in real-time, preserving existing battle telemetry and audit tokens.
- **Client UI & Visualization Layer**:
  - `src/components/practice/WrongQuestionsRanking.tsx`:
    - Replaces popup modal with in-place downward smooth expansion below question #10.
    - Integrated real-time keyword search and question type tabs (全部 / 單選題 / 複選題).
    - Bottom collapse button with smooth scroll back to question #10 anchor.
    - Question cards display attempt count & accuracy rate (`作答總數 N 次 · 答對率 XX.X%` or `尚未有作答數據`).
    - Four options displayed with full un-truncated text, right-aligned % badges (correct: green with `✓ 正解`, wrong: red, highest %: bolded).
    - Retains >= 3 `<ExplanationCard` callsites to satisfy `audit_explanation_integration.js`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Schema Counters on Question | Add `totalAttempts`, `correctCount`, `countA`, `countB`, `countC`, `countD` to `Question` model | M1 | ORIGINAL_REQUEST R3 |
| F2 | Schema Counters on WrongRecord | Add `totalAttempts`, `correctCount` to `WrongQuestionRecord` model | M1 | ORIGINAL_REQUEST R3 |
| F3 | Dual Migration Setup | SQLite dev sync + PostgreSQL migration SQL for Render deployment | M1 | ORIGINAL_REQUEST R3 |
| F4 | TypeScript Interfaces | Update `Question` and `WrongQuestionRecordItem` types with new counters | M1 | ORIGINAL_REQUEST R3 |
| F5 | Unified Answering API Route | `POST /api/wrong-questions` accepts single & batch attempts, updates atomic counters and mistakes | M1 | ORIGINAL_REQUEST R2 & R3 |
| F6 | Practice Mode Real-time Tracking | Submit every practice answer attempt to API in real-time | M1 | ORIGINAL_REQUEST R2 |
| F7 | Mock Exam Batch Tracking | Submit all 50-exam answered questions on completion to API | M1 | ORIGINAL_REQUEST R2 |
| F8 | Battle Mode Real-time Tracking | Submit every battle answer attempt to API, preserving audit tokens | M1 | ORIGINAL_REQUEST R2 |
| F9 | Card Header Accuracy & Attempt Stats | Render `作答總數 N 次 · 答對率 XX.X%` with `尚未有作答數據` fallback | M2 | ORIGINAL_REQUEST R2 |
| F10 | Full Option Text Preservation | Render options with zero truncation (`break-words whitespace-pre-wrap`) | M2 | ORIGINAL_REQUEST R2 |
| F11 | Fixed Right-side % Badges | Position badges right-aligned (`shrink-0 ml-auto`) | M2 | ORIGINAL_REQUEST R2 |
| F12 | Correct/Wrong Badge Coloring | Green background with `✓ 正解` for correct; Red background for wrong | M2 | ORIGINAL_REQUEST R2 |
| F13 | Highest % Number Bolding | Strictly bold (`font-black font-bold`) the percentage number on the most-selected option | M2 | ORIGINAL_REQUEST R2 |
| F14 | Dual Mode Data Coverage | Seamless toggle between Personal Mistakes and Global Ranking with stats | M2 | ORIGINAL_REQUEST R2 |
| F15 | Modal Removal | Completely remove old popup modal, modal state, and escape listeners | M2 | ORIGINAL_REQUEST R1 |
| F16 | In-Place Downward Expansion | Smoothly expand questions #11+ below question #10 | M2 | ORIGINAL_REQUEST R1 |
| F17 | Search & Type Filter in Expansion | Instant keyword search and question type tabs (全部 / 單選 / 複選) | M2 | ORIGINAL_REQUEST R1 |
| F18 | Bottom Collapse with Scroll | Collapse button at list bottom smoothly scrolling to question #10 anchor | M2 | ORIGINAL_REQUEST R1 |
| F19 | E2E Test Suite & Adversarial Hardening | Comprehensive test coverage across all 4 tiers + Tier 5 adversarial verification | M3 | Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Model, Backend API & Game Modes Real-time Tracking | Schema counters, PostgreSQL migration, sync-db-provider, TypeScript types, POST/GET /api/wrong-questions, Practice/MockExam/BattlePlay answer submission | none | DONE |
| M2 | Mistake Leaderboard UI, Question Cards Analytics & Inline Expansion | Card stats header, un-truncated options, green/red right % badges, highest % bold, in-place expansion below #10, search & type filter, bottom collapse, modal removal | M1 | IN_PROGRESS |
| M3 | Final E2E Test Suite Verification & Adversarial Hardening | Pass 100% E2E test suite (Tiers 1-4) and Tier 5 adversarial coverage audit | M1, M2 | PLANNED |

---

## Interface Contracts

### 1. Database Model Additions (`Question`)
```prisma
totalAttempts  Int @default(0)
correctCount   Int @default(0)
countA         Int @default(0)
countB         Int @default(0)
countC         Int @default(0)
countD         Int @default(0)
```

### 2. Database Model Additions (`WrongQuestionRecord`)
```prisma
totalAttempts  Int @default(1)
correctCount   Int @default(0)
```

### 3. API Contract: `POST /api/wrong-questions`
- **Request Body**:
  ```ts
  // Single:
  { questionId: string, userAnswer: string, isCorrect?: boolean }
  // Or Batch:
  { items: Array<{ questionId: string, userAnswer: string, isCorrect?: boolean }> }
  ```
- **Response**:
  ```ts
  { success: true, count: number }
  ```

### 4. API Contract: `GET /api/wrong-questions`
- **Query Params**: `mode="personal" | "global"`, `limit="10" | "all" | "-1"`
- **Response**:
  ```ts
  {
    questions: Array<{
      id: string;
      stem: string;
      type: "SINGLE" | "MULTIPLE";
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswers: string;
      explanation?: string;
      category?: string;
      wrongCount: number;
      totalAttempts: number;
      correctCount: number;
      countA: number;
      countB: number;
      countC: number;
      countD: number;
      userWrongCount?: number;
      lastUserAnswer?: string;
    }>;
    total: number;
  }
  ```

---

## Code Layout
- `prisma/schema.prisma`: Data models for Question, User, WrongQuestionRecord.
- `prisma/migrations/20260926000000_add_question_stats/migration.sql`: PostgreSQL DDL for Render deployment.
- `src/types/question.ts`: TypeScript interfaces for Question and wrong question records.
- `src/app/api/wrong-questions/route.ts`: API endpoints for answering and fetching mistake rankings.
- `src/app/practice/page.tsx`: Practice mode interface & answer submission.
- `src/components/practice/MockExamView.tsx`: 50-question mock exam view & batch answer submission.
- `src/components/battle/BattlePlayView.tsx`: Multiplayer battle view & answer evaluation tracking.
- `src/components/practice/WrongQuestionsRanking.tsx`: Mistake leaderboard with in-place expansion and question card analytics.
- `scripts/test_mobile_and_performance.js`: Mobile performance audit test script.
- `tests/`: Automated test suite directory for unit, integration, and E2E tests.
