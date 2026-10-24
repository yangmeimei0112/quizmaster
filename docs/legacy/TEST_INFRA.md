# E2E Test Infra: Mistake Statistics Full Upgrade & Inline Expansion

## Test Philosophy
- Opaque-box, requirement-driven. Derived from ORIGINAL_REQUEST.md (2026-09-26T08:15:11Z).
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (BVA/Corner) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|-------------|:-----------------:|:-------------------:|:----------------------:|:-------------------:|
| F1 | Question Model Counters | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ | ✓ |
| F2 | WrongQuestionRecord Counters | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ | ✓ |
| F3 | Dual Migration Setup | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ | ✓ |
| F4 | TypeScript Interfaces | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ | ✓ |
| F5 | POST /api/wrong-questions | ORIGINAL_REQUEST R2 & R3 | 5 | 5 | ✓ | ✓ |
| F6 | Practice Mode Tracking | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F7 | Mock Exam Batch Tracking | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F8 | Battle Mode Tracking | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F9 | Card Header Accuracy & Attempt Stats | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F10 | Full Option Text Preservation | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F11 | Fixed Right-side % Badges | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F12 | Correct/Wrong Badge Coloring | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F13 | Highest % Number Bolding | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F14 | Dual Mode Data Coverage | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ | ✓ |
| F15 | Modal Removal | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| F16 | In-Place Downward Expansion | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| F17 | Search & Type Filter in Expansion | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| F18 | Bottom Collapse with Scroll | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Node.js test runner via `npm test` (or dedicated test script `node scripts/test_mistake_stats_and_expansion.js`).
- **Test Invariants**:
  1. All 18 features verified independently.
  2. Preserves all existing 13 test suites (including mobile performance and explanation card audit).
  3. Clean zero-division handling when `totalAttempts === 0`.
- **Pass/Fail Semantics**: All test suites must exit with code 0.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Student Practice Session: 10 questions answered (mixed correct & wrong) -> Open Leaderboard -> Verify accurate stats, un-truncated option text, correct % badges & bolding | F5, F6, F9, F10, F11, F12, F13, F14 | High |
| 2 | 50-Question Mock Exam Submission: Answer 50 questions, submit -> Batch recorded -> Leaderboard shows updated stats for all 50 questions | F5, F7, F9, F11, F12, F13 | High |
| 3 | Multiplayer Battle Match: 5 questions evaluated in real time -> Room progress and question stats updated without corrupting battle telemetry | F5, F8, F9, F12 | High |
| 4 | Long Leaderboard In-Place Expansion: 25 mistake questions -> Click expand below #10 -> Instant search filter by keyword -> Filter by "單選題" -> Click collapse -> Smooth scroll to #10 anchor | F15, F16, F17, F18 | High |
| 5 | Cold Start & Backward Compatibility: Zero-attempt questions displayed alongside legacy wrong-only questions -> No division by zero, graceful `尚未有作答數據` fallback | F1, F2, F9, F13, F14 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 boundary & corner tests (0 attempts, max attempts, all same options, 100% correct, 100% wrong)
- Tier 3: Pairwise coverage across mode transitions (Practice -> Mock Exam -> Battle -> Leaderboard)
- Tier 4: ≥5 realistic end-to-end user workflows
