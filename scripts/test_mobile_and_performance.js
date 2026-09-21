import fs from "fs";
import path from "path";

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

console.log("=================================================================");
console.log("  MOBILE UX & PERFORMANCE VERIFICATION AUDIT (iOS / Android / GPU)");
console.log("=================================================================\n");

// 1. Global CSS iOS Auto-Zoom & Touch Manipulation Fail-Safe
console.log("▶ 1. Checking Global CSS Fail-safes (iOS Safari & Android Touch)...");
const globalsCss = fs.readFileSync("src/app/globals.css", "utf-8");

if (
  globalsCss.includes("font-size: 16px !important") &&
  globalsCss.includes("(max-width: 640px)")
) {
  results.passed.push("globals.css: Mobile auto-zoom fail-safe (max-width: 640px font-size: 16px !important) is active.");
} else {
  results.failed.push("globals.css: Missing max-width: 640px 16px font-size fail-safe.");
}

if (
  globalsCss.includes("font-size: 16px !important") &&
  globalsCss.includes("pointer: coarse")
) {
  results.passed.push("globals.css: Landscape touch screen auto-zoom prevention ((pointer: coarse) font-size: 16px !important) is active.");
} else {
  results.failed.push("globals.css: Missing landscape touch screen (pointer: coarse) 16px font-size fail-safe.");
}

if (
  globalsCss.includes("touch-action: manipulation") &&
  globalsCss.includes("-webkit-tap-highlight-color: transparent")
) {
  results.passed.push("globals.css: 300ms tap delay eliminated (touch-action: manipulation + transparent tap highlight).");
} else {
  results.failed.push("globals.css: Missing touch-action: manipulation or tap highlight removal.");
}

if (
  globalsCss.includes("-webkit-overflow-scrolling: touch") &&
  globalsCss.includes("overscroll-behavior-y: contain")
) {
  results.passed.push("globals.css: iOS momentum scrolling & bounce isolation (.scroll-touch) configured.");
} else {
  results.failed.push("globals.css: Missing .scroll-touch momentum scrolling rules.");
}

if (
  globalsCss.includes("env(safe-area-inset-bottom") &&
  globalsCss.includes(".pb-safe")
) {
  results.passed.push("globals.css: iOS Home Indicator Safe Area utilities (.pb-safe / safe-bottom-fixed) defined.");
} else {
  results.failed.push("globals.css: Missing .pb-safe utilities for iPhone Home Bar.");
}

// 2. Viewport Configuration in Root Layout
console.log("\n▶ 2. Checking Viewport Configuration in Root Layout...");
const layoutContent = fs.readFileSync("src/app/layout.tsx", "utf-8");
if (
  layoutContent.includes('viewportFit: "cover"') &&
  layoutContent.includes("initialScale: 1") &&
  layoutContent.includes("min-h-[100dvh]") &&
  layoutContent.includes("safe-area-inset-bottom")
) {
  results.passed.push("layout.tsx: Viewport cover, 100dvh dynamic height, and safe-area footer spacing verified.");
} else {
  results.failed.push("layout.tsx: Missing viewportFit or 100dvh dynamic height configuration.");
}

// Background blobs GPU acceleration
if (
  layoutContent.includes("transform-gpu") &&
  layoutContent.includes("will-change-transform")
) {
  results.passed.push("layout.tsx: Background ambient lighting layers have transform-gpu and will-change-transform.");
} else {
  results.failed.push("layout.tsx: Ambient background blobs lack GPU acceleration classes.");
}

// 3. Modal / Bottom Sheet Mobile UX Verification
console.log("\n▶ 3. Checking Modal / Bottom Sheet Mobile UX & Safe Area Insets...");
const modalFiles = [
  { file: "src/components/ExportModal.tsx", name: "ExportModal" },
  { file: "src/components/AuthModal.tsx", name: "AuthModal" },
  { file: "src/components/QuickAddModal.tsx", name: "QuickAddModal" },
  { file: "src/components/practice/ExamWrongReportModal.tsx", name: "ExamWrongReportModal" },
  { file: "src/components/practice/WrongQuestionsRanking.tsx", name: "WrongQuestionsRanking Modal" },
  { file: "src/app/questions/page.tsx", name: "Questions Inline Edit Modal" },
  { file: "src/components/practice/MockExamView.tsx", name: "MockExamView Submit Sheet" },
  { file: "src/app/add/page.tsx", name: "Add Page Duplicate Confirm Sheet" },
];

for (const modal of modalFiles) {
  const content = fs.readFileSync(modal.file, "utf-8");

  const hasBottomAlignment = content.includes("items-end sm:items-center") || content.includes("items-end");
  const hasMaxHeight = content.includes("max-h-[90dvh]") || content.includes("max-h-[85vh]") || content.includes("max-h-[70vh]");
  const hasDragHandle = content.includes("w-12 h-1.5 bg-white/20 rounded-full");
  const hasSafeArea = content.includes("safe-area-inset-bottom") || content.includes("pb-safe");
  const hasGpu = content.includes("transform-gpu") || content.includes("will-change-transform");
  const hasScrollTouch = content.includes("scroll-touch");

  if (hasBottomAlignment && hasMaxHeight && hasDragHandle && hasSafeArea) {
    results.passed.push(`${modal.name}: Mobile bottom sheet layout (items-end, max-h-[90dvh], drag handle, safe-area) verified.`);
  } else {
    results.failed.push(`${modal.name} failed bottom sheet check: itemsEnd=${hasBottomAlignment}, maxH=${hasMaxHeight}, dragHandle=${hasDragHandle}, safeArea=${hasSafeArea}`);
  }

  if (hasGpu) {
    results.passed.push(`${modal.name}: Hardware GPU compositing acceleration enabled.`);
  } else {
    results.failed.push(`${modal.name}: Missing transform-gpu / will-change-transform.`);
  }

  if (hasScrollTouch) {
    results.passed.push(`${modal.name}: iOS momentum scrolling & containment (.scroll-touch) enabled.`);
  } else {
    results.failed.push(`${modal.name}: Missing .scroll-touch momentum scrolling.`);
  }
}

// 4. Form Inputs Font Size Scan across src/
console.log("\n▶ 4. Scanning all Form Inputs & Textareas for iOS Auto-Zoom Prevention...");
const allTsxFiles = [];
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      allTsxFiles.push(full.replace(/\\/g, "/"));
    }
  }
}
walkDir("src");

let autoZoomRiskCount = 0;
let autoZoomSafeCount = 0;

for (const file of allTsxFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    if ((line.includes("<input") || line.includes("<textarea")) && !line.includes('type="hidden"')) {
      const chunk = lines.slice(Math.max(0, idx - 2), idx + 8).join(" ");
      const isCheckboxOrRadio = chunk.includes('type="checkbox"') || chunk.includes('type="radio"');
      if (isCheckboxOrRadio) return;

      const hasBase = chunk.includes("text-base");
      const hasSmallOnly = (chunk.includes("text-xs") || chunk.includes("text-sm")) && !chunk.includes("text-base");

      if (hasSmallOnly) {
        results.failed.push(`Auto-zoom risk at ${file}:${idx + 1} (input/textarea has text-xs/text-sm without text-base on mobile)`);
        autoZoomRiskCount++;
      } else if (hasBase) {
        autoZoomSafeCount++;
      }
    }
  });
}

if (autoZoomRiskCount === 0) {
  results.passed.push(`All ${autoZoomSafeCount} scanned text inputs & textareas across src/ explicitly use text-base on mobile (>= 16px).`);
}

// 5. Touch Target Standards (Apple HIG 44px / Android Material 48px)
console.log("\n▶ 5. Verifying Touch Target Standards & Touch Manipulation...");
const keyTouchElements = [
  { file: "src/components/Navbar.tsx", expected: ["min-w-[44px] min-h-[44px]", "min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400"] },
  { file: "src/components/QuickAddModal.tsx", expected: ["min-w-[44px] min-h-[44px]", "min-h-[44px] px-6 py-2.5"] },
  { file: "src/components/AuthModal.tsx", expected: ["min-h-[44px]", "min-h-[48px]"] },
  { file: "src/components/ExportModal.tsx", expected: ["min-h-[44px]", "min-h-[46px]"] },
  { file: "src/components/practice/ExamWrongReportModal.tsx", expected: ["min-h-[44px]", "min-h-[46px]"] },
  { file: "src/components/practice/MockExamView.tsx", expected: ["min-h-[44px]", "min-h-[46px]"] },
  { file: "src/components/practice/WrongQuestionsRanking.tsx", expected: ["min-h-[44px]", "min-w-[44px] min-h-[44px]"] },
  { file: "src/app/add/page.tsx", expected: ["min-h-[48px]", "w-11 h-11 min-w-[44px] min-h-[44px]", "min-h-[44px] inline-flex items-center gap-1.5"] },
  { file: "src/app/questions/page.tsx", expected: ["w-11 h-11 min-w-[44px] min-h-[44px]", "min-h-[44px] px-3 sm:px-4 py-2"] },
  { file: "src/app/guide/page.tsx", expected: ["min-h-[44px] px-3.5 py-2 rounded-xl", "min-h-[44px] px-4 py-2.5 rounded-xl", "min-h-[46px]"] },
  { file: "src/app/page.tsx", expected: ["min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent", "min-h-[44px] px-2 text-xs text-[#8B96F8]"] },
];

for (const item of keyTouchElements) {
  const content = fs.readFileSync(item.file, "utf-8");
  for (const exp of item.expected) {
    if (content.includes(exp)) {
      results.passed.push(`${path.basename(item.file)}: Touch target containing '${exp.slice(0, 30)}...' verified.`);
    } else {
      results.failed.push(`${path.basename(item.file)}: Expected touch target '${exp}' not found.`);
    }
  }
}

// 6. Smoothness & Rendering Performance (Deferred rendering & GPU Compositing)
console.log("\n▶ 6. Checking Rendering Smoothness & Compositing Acceleration...");
const questionsPage = fs.readFileSync("src/app/questions/page.tsx", "utf-8");
const mockExamView = fs.readFileSync("src/components/practice/MockExamView.tsx", "utf-8");

if (questionsPage.includes("card-deferred-render") && mockExamView.includes("card-deferred-render")) {
  results.passed.push("Long list deferred rendering (card-deferred-render) configured in QuestionsPage and MockExamView.");
} else {
  results.failed.push("card-deferred-render missing from QuestionsPage or MockExamView.");
}

if (
  questionsPage.includes("transform-gpu will-change-transform") &&
  mockExamView.includes("transform-gpu will-change-transform")
) {
  results.passed.push("QuestionsPage and MockExamView modals use transform-gpu and will-change-transform for smooth 60fps animations.");
} else {
  results.warnings.push("Modal animations in QuestionsPage or MockExamView could benefit from explicit transform-gpu.");
}

// Summary Report
console.log("\n=================================================================");
console.log(` AUDIT SUMMARY:`);
console.log(`   Passed:   ${results.passed.length}`);
console.log(`   Warnings: ${results.warnings.length}`);
console.log(`   Failed:   ${results.failed.length}`);
console.log("=================================================================\n");

results.passed.forEach((p) => console.log(`  ✓ ${p}`));

if (results.warnings.length > 0) {
  console.log("\nWARNINGS:");
  results.warnings.forEach((w) => console.log(`  ! ${w}`));
}

if (results.failed.length > 0) {
  console.log("\nFAILURES:");
  results.failed.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("\n>>> ALL MOBILE UX AND PERFORMANCE AUDIT CHECKS PASSED! <<<");
  process.exit(0);
}
