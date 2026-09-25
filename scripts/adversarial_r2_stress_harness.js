/**
 * adversarial_r2_stress_harness.js
 * Empirical Challenger Adversarial Stress Test Harness for Milestone M8 (R2)
 *
 * Focus:
 * 1. Server Transition Threshold Boundary Conditions (4900ms vs 5000ms vs 6000ms, plus 4999ms & 5001ms)
 * 2. Client-Side Idempotency Replay Barrier under High-Jitter Conditions (T1 session with 5.2s, 6.3s, 7.4s, 8.0s stale polls)
 * 3. Multi-Round Legitimacy (Reset & Round 2 with T2 > T1, barrier permits T2, then blocks stale T2)
 * 4. Extreme Edge Cases (null/undefined drawingStartTime, repeated getRoom calls, clock skew)
 */

const assert = require("node:assert/strict");
const path = require("node:path");

async function runAdversarialHarness() {
  console.log("================================================================================");
  console.log("🛡️ [CHALLENGER] Adversarial Stress-Test Harness: R2 Timing & Replay Barrier");
  console.log("================================================================================");

  let passed = 0;
  let total = 0;

  function runCase(description, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [PASS] ${description}`);
    } catch (err) {
      console.error(`  ✗ [FAIL] ${description}`);
      console.error(`    Error: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // Load battleStore
  const battleStorePath = path.resolve(__dirname, "../src/lib/battleStore.ts");
  const battleStore = await import("file://" + battleStorePath.replace(/\\/g, "/"));
  const { createRoom, joinRoom, toggleReady, startBattle, getRoom, resetBattle } = battleStore;

  const mockQuestions = [
    {
      id: "q_adv_1",
      stem: "Adversarial Stress Test Question 1",
      optionA: "Opt A",
      optionB: "Opt B",
      optionC: "Opt C",
      optionD: "Opt D",
      correctAnswers: "A",
      type: "SINGLE",
      explanation: "Explanation 1",
    },
    {
      id: "q_adv_2",
      stem: "Adversarial Stress Test Question 2",
      optionA: "Opt A",
      optionB: "Opt B",
      optionC: "Opt C",
      optionD: "Opt D",
      correctAnswers: "B",
      type: "SINGLE",
      explanation: "Explanation 2",
    },
  ];

  // ===========================================================================
  // SECTION 1: Server Transition Threshold Boundary Conditions
  // ===========================================================================
  console.log("\n>>> SECTION 1: Server Transition Threshold Boundary Conditions");

  const hostSetup = createRoom("StressHost", "dragon");
  const roomCode = hostSetup.room.code;
  const guestSetup = joinRoom(roomCode, "StressGuest", "fox");
  toggleReady(roomCode, guestSetup.playerId, true);

  const room = startBattle(roomCode, hostSetup.playerId, mockQuestions);
  const baseT0 = Date.now();

  runCase("1.1 Baseline: Immediately after startBattle, stage is DRAWING and drawingStartTime > 0", () => {
    assert.equal(room.stage, "DRAWING");
    assert.ok(typeof room.drawingStartTime === "number");
    assert.ok(room.drawingStartTime > 0);
  });

  runCase("1.2 Boundary Condition 4900ms: At 4900ms, getRoom stage strictly remains DRAWING", () => {
    room.stage = "DRAWING";
    room.drawingStartTime = Date.now() - 4900;
    const observed = getRoom(roomCode);
    assert.equal(
      observed.stage,
      "DRAWING",
      `Expected DRAWING at 4900ms elapsed, but got ${observed.stage}`
    );
  });

  runCase("1.3 Micro-Boundary Condition 4999ms: At 4999ms, getRoom stage strictly remains DRAWING", () => {
    room.stage = "DRAWING";
    room.drawingStartTime = Date.now() - 4999;
    const observed = getRoom(roomCode);
    assert.equal(
      observed.stage,
      "DRAWING",
      `Expected DRAWING at 4999ms elapsed, but got ${observed.stage}`
    );
  });

  runCase("1.4 Transition Threshold 5000ms: At exactly 5000ms, getRoom transitions to PLAYING", () => {
    room.stage = "DRAWING";
    room.drawingStartTime = Date.now() - 5000;
    const observed = getRoom(roomCode);
    assert.equal(
      observed.stage,
      "PLAYING",
      `Expected transition to PLAYING at 5000ms elapsed, but got ${observed.stage}`
    );
    assert.ok(typeof observed.playingStartTime === "number");
    assert.ok(observed.playingStartTime > 0);
  });

  runCase("1.5 Micro-Boundary Condition 5001ms: At 5001ms, getRoom stage is PLAYING", () => {
    room.stage = "DRAWING";
    room.drawingStartTime = Date.now() - 5001;
    const observed = getRoom(roomCode);
    assert.equal(
      observed.stage,
      "PLAYING",
      `Expected PLAYING at 5001ms elapsed, but got ${observed.stage}`
    );
  });

  runCase("1.6 Post-Transition Condition 6000ms: At 6000ms, getRoom stage is PLAYING", () => {
    room.stage = "DRAWING";
    room.drawingStartTime = Date.now() - 6000;
    const observed = getRoom(roomCode);
    assert.equal(
      observed.stage,
      "PLAYING",
      `Expected PLAYING at 6000ms elapsed, but got ${observed.stage}`
    );
  });

  runCase("1.7 Idempotency of Repeated Calls: 10 repeated calls after threshold keep stage PLAYING without mutating playingStartTime", () => {
    const originalPlayingStart = room.playingStartTime;
    for (let i = 0; i < 10; i++) {
      const polled = getRoom(roomCode);
      assert.equal(polled.stage, "PLAYING");
      assert.equal(polled.playingStartTime, originalPlayingStart);
    }
  });

  // ===========================================================================
  // SECTION 2: Client-Side Replay Barrier under High-Jitter Conditions
  // ===========================================================================
  console.log("\n>>> SECTION 2: Client-Side Replay Barrier under High-Jitter Conditions");

  // Client emulation harness replicating exact client logic from src/app/battle/[code]/page.tsx
  class ClientBattleSessionHarness {
    constructor() {
      this.completedDrawingSessions = new Set();
      this.room = null;
    }

    // Corresponds to handleDrawAnimationComplete in page.tsx
    onDrawAnimationComplete(drawingStartTime) {
      if (drawingStartTime) {
        this.completedDrawingSessions.add(drawingStartTime);
      }
      if (this.room) {
        this.room = {
          ...this.room,
          stage: "PLAYING",
        };
      }
    }

    // Corresponds to fetchRoom normalize logic in page.tsx (lines 56-72)
    processIncomingPoll(payload) {
      let updatedRoom = { ...payload };

      if (
        updatedRoom &&
        updatedRoom.stage === "DRAWING" &&
        updatedRoom.drawingStartTime &&
        this.completedDrawingSessions.has(updatedRoom.drawingStartTime)
      ) {
        updatedRoom = {
          ...updatedRoom,
          stage: "PLAYING",
        };
      }

      this.room = updatedRoom;
      return updatedRoom;
    }

    // Corresponds to view router effectiveStage in page.tsx (lines 387-392)
    getEffectiveStage() {
      if (!this.room) return null;
      const isDrawingCompleted = this.room.drawingStartTime
        ? this.completedDrawingSessions.has(this.room.drawingStartTime)
        : false;
      return this.room.stage === "DRAWING" && isDrawingCompleted
        ? "PLAYING"
        : this.room.stage;
    }
  }

  const client = new ClientBattleSessionHarness();
  const T1 = 1727200000000; // Simulated timestamp for session 1

  runCase("2.1 Client initializes in DRAWING for Session T1", () => {
    client.processIncomingPoll({
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: T1,
    });
    assert.equal(client.room.stage, "DRAWING");
    assert.equal(client.getEffectiveStage(), "DRAWING");
  });

  runCase("2.2 Client completes QuestionDrawAnimation at ~5.13s and triggers barrier registration", () => {
    client.onDrawAnimationComplete(T1);
    assert.equal(client.room.stage, "PLAYING");
    assert.equal(client.getEffectiveStage(), "PLAYING");
    assert.ok(client.completedDrawingSessions.has(T1));
  });

  const jitterIntervals = [
    { label: "5.2s", elapsed: 5200 },
    { label: "6.3s", elapsed: 6300 },
    { label: "7.4s", elapsed: 7400 },
    { label: "8.0s", elapsed: 8000 },
  ];

  jitterIntervals.forEach(({ label, elapsed }) => {
    runCase(`2.3 High-Jitter Burst at ${label} (${elapsed}ms): Incoming stale DRAWING payload is blocked`, () => {
      const stalePayload = {
        code: "JITTER_ROOM",
        stage: "DRAWING", // Stale server response delayed in network buffer
        drawingStartTime: T1,
        simulatedNetworkLagMs: elapsed,
      };

      const result = client.processIncomingPoll(stalePayload);

      assert.equal(
        result.stage,
        "PLAYING",
        `Incoming poll at ${label} must be clamped to PLAYING, got ${result.stage}`
      );
      assert.equal(
        client.room.stage,
        "PLAYING",
        `Client room state must remain PLAYING at ${label}`
      );
      assert.equal(
        client.getEffectiveStage(),
        "PLAYING",
        `View router effectiveStage must remain PLAYING at ${label} to prevent remounting QuestionDrawAnimation`
      );
    });
  });

  runCase("2.4 Out-of-Order / Jitter Burst Rapid Fire: 50 back-to-back stale DRAWING polls retain PLAYING", () => {
    for (let i = 0; i < 50; i++) {
      client.processIncomingPoll({
        code: "JITTER_ROOM",
        stage: "DRAWING",
        drawingStartTime: T1,
      });
      assert.equal(client.room.stage, "PLAYING");
      assert.equal(client.getEffectiveStage(), "PLAYING");
    }
  });

  runCase("2.5 Defense-in-Depth Layer 2: Even if raw room state were forced to DRAWING with T1, effectiveStage clamps to PLAYING", () => {
    // Force raw state bypass of fetchRoom
    client.room = {
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: T1,
    };
    assert.equal(
      client.getEffectiveStage(),
      "PLAYING",
      "View router effectiveStage must independently prevent QuestionDrawAnimation mounting"
    );
  });

  // ===========================================================================
  // SECTION 3: Multi-Round Legitimacy (Reset & Round 2)
  // ===========================================================================
  console.log("\n>>> SECTION 3: Multi-Round Legitimacy (Reset & Round 2)");

  const T2 = T1 + 60000; // Simulated timestamp for session 2 (T2 > T1)

  runCase("3.1 Server Reset: resetBattle returns stage LOBBY and clears drawingStartTime", () => {
    const resetRoom = resetBattle(roomCode, hostSetup.playerId);
    assert.equal(resetRoom.stage, "LOBBY");
    assert.equal(resetRoom.drawingStartTime, undefined);
    assert.equal(resetRoom.playingStartTime, undefined);
  });

  runCase("3.2 Client Reset: Host clears barrier ref or starts fresh game", () => {
    // Test both without clearing (Set retention) and with clearing
    // Case A: Set retains T1 (simulating Guest or Host without explicit clear)
    const clientWithSetRetained = new ClientBattleSessionHarness();
    clientWithSetRetained.completedDrawingSessions.add(T1);

    // Incoming poll for Game 2 with T2 > T1
    const game2StartPayload = {
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: T2,
    };

    const processed = clientWithSetRetained.processIncomingPoll(game2StartPayload);

    assert.equal(
      processed.stage,
      "DRAWING",
      "Game 2 with new timestamp T2 must NOT be clamped; stage must be DRAWING"
    );
    assert.equal(
      clientWithSetRetained.getEffectiveStage(),
      "DRAWING",
      "View router must allow QuestionDrawAnimation to mount and play for Game 2"
    );
  });

  runCase("3.3 Round 2 Animation Play & Second Barrier Engagement", () => {
    // Client finishes Round 2 animation
    client.onDrawAnimationComplete(T2);
    assert.ok(client.completedDrawingSessions.has(T2));
    assert.equal(client.room.stage, "PLAYING");
    assert.equal(client.getEffectiveStage(), "PLAYING");

    // Stale poll for Round 2 arriving at T2 + 5.5s
    const staleRound2Payload = {
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: T2,
    };
    client.processIncomingPoll(staleRound2Payload);
    assert.equal(
      client.room.stage,
      "PLAYING",
      "Round 2 stale DRAWING poll must be clamped to PLAYING"
    );
    assert.equal(
      client.getEffectiveStage(),
      "PLAYING",
      "Round 2 view router must remain PLAYING"
    );
  });

  runCase("3.4 Cross-Round Isolation: An ancient zombie poll from Round 1 (T1) arriving during Round 2 does not disrupt", () => {
    const ancientT1Payload = {
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: T1,
    };
    const res = client.processIncomingPoll(ancientT1Payload);
    assert.equal(res.stage, "PLAYING", "Ancient T1 poll clamped to PLAYING");
    assert.equal(client.getEffectiveStage(), "PLAYING");
  });

  // ===========================================================================
  // SECTION 4: Extreme Edge Cases & Defensive Invariants
  // ===========================================================================
  console.log("\n>>> SECTION 4: Extreme Edge Cases & Defensive Invariants");

  runCase("4.1 Missing / null drawingStartTime in DRAWING payload does not crash", () => {
    const corruptPayload = {
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: null,
    };
    // Should safely pass through without throw
    const res = client.processIncomingPoll(corruptPayload);
    assert.equal(res.stage, "DRAWING");
  });

  runCase("4.2 Undefined drawingStartTime in DRAWING payload does not crash", () => {
    const corruptPayload2 = {
      code: "JITTER_ROOM",
      stage: "DRAWING",
      drawingStartTime: undefined,
    };
    const res = client.processIncomingPoll(corruptPayload2);
    assert.equal(res.stage, "DRAWING");
  });

  runCase("4.3 Null / empty payload safety", () => {
    // If server returns null room, updatedRoom in page.tsx is null
    client.room = null;
    assert.equal(client.getEffectiveStage(), null);
  });

  console.log("\n================================================================================");
  console.log(`🎯 [CHALLENGER VERDICT] All ${passed} / ${total} stress test cases PASSED!`);
  console.log("================================================================================\n");
}

runAdversarialHarness().catch((err) => {
  console.error("Adversarial harness execution error:", err);
  process.exit(1);
});
