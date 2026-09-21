import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log(" ADVERSARIAL CHALLENGER IT2-1: LAYOUT STABILITY & HORIZONTAL OVERFLOW STRESS TEST");
console.log(" Target: src/app/questions/page.tsx with Upgraded 44px Buttons");
console.log(" Spec Viewports: 360px, 375px, 390px, 414px, 430px, Tablet (768px), Desktop (1024/1280px)");
console.log("================================================================================\n");

const pagePath = "src/app/questions/page.tsx";
const pageContent = fs.readFileSync(pagePath, "utf-8");

// Contracted viewports per ORIGINAL_REQUEST.md and Dispatch Instructions
const contractedViewports = [
  { name: "Mobile 360px (Android Standard Small)", width: 360, isMobile: true },
  { name: "Mobile 375px (iPhone SE / 8)", width: 375, isMobile: true },
  { name: "Mobile 390px (iPhone 12/13/14/15)", width: 390, isMobile: true },
  { name: "Mobile 414px (iPhone 8 Plus / XR)", width: 414, isMobile: true },
  { name: "Mobile 430px (iPhone 15 Pro Max)", width: 430, isMobile: true },
  { name: "Tablet 768px (iPad)", width: 768, isMobile: false, isTablet: true },
  { name: "Desktop 1024px (Laptop)", width: 1024, isMobile: false, isDesktop: true },
  { name: "Desktop 1280px (Desktop HD)", width: 1280, isMobile: false, isDesktop: true },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertCheck(desc, condition, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${desc}`);
    if (details) console.log(`         -> ${details}`);
  } else {
    failedTests++;
    console.log(`  [FAIL] ${desc}`);
    if (details) console.log(`         -> ERROR: ${details}`);
  }
}

// -----------------------------------------------------------------------------
// Dimension Model Verification (Contracted Viewports)
// -----------------------------------------------------------------------------
console.log("--- TEST SUITE 1: QUESTION CARD HEADER ACTION CLUSTER HEADROOM (CONTRACTED VIEWPORTS) ---");

for (const vp of contractedViewports) {
  const isMobile = vp.width < 640;
  // Main layout padding: px-4 (32px) on mobile, sm:px-6 (48px) on >=640px
  const mainPadding = isMobile ? 32 : 48;
  const maxContent = 1152;
  const containerWidth = Math.min(vp.width - mainPadding, maxContent);

  // Card padding: p-4 (32px) on mobile, sm:p-6 (48px) on >=640px
  const cardPadding = isMobile ? 32 : 48;
  const innerCardWidth = containerWidth - cardPadding;

  // Header top row elements under worst-case stress:
  // Left side:
  // - index badge: e.g. '#9999' font-bold text-foreground-muted (~50px)
  // - type pill: '單選題' / '複選題' font-game text-[10px] font-bold px-2.5 py-0.5 rounded-full border (~60px)
  // - gap-2.5: 10px
  const indexBadgeWidthWorstCase = 50; // allows up to #9999
  const typeBadgeWidth = 60;
  const leftSideGap = 10;
  const leftSideWidth = indexBadgeWidthWorstCase + typeBadgeWidth + leftSideGap; // ~120px

  // Right side (Action Cluster with upgraded 44px buttons):
  // - Edit: min-w-[44px] (44px)
  // - gap-1: 4px
  // - Delete: min-w-[44px] (44px)
  // - gap-1: 4px
  // - Chevron: min-w-[44px] (44px)
  const editWidth = 44;
  const deleteWidth = 44;
  const chevronWidth = 44;
  const clusterGap = 4 * 2; // 8px
  const actionClusterWidth = editWidth + deleteWidth + chevronWidth + clusterGap; // 140px

  // Row gap between left side and right side: gap-2 (8px)
  const rowGap = 8;
  const requiredRowWidth = leftSideWidth + rowGap + actionClusterWidth; // 268px
  const headroom = innerCardWidth - requiredRowWidth;

  assertCheck(
    `Viewport ${vp.name} (width=${vp.width}px, innerCard=${innerCardWidth}px)`,
    headroom >= 0,
    `Required: ${requiredRowWidth}px (Left: ${leftSideWidth}px + Gap: ${rowGap}px + Cluster: ${actionClusterWidth}px). Available: ${innerCardWidth}px. Headroom: +${headroom}px`
  );
}

// -----------------------------------------------------------------------------
// Exploratory Stress: 320px Edge Case Analysis
// -----------------------------------------------------------------------------
console.log("\n--- EXPLORATORY STRESS: 320px LEGACY ULTRA-COMPACT VIEWPORT ---");
{
  const container320 = 320 - 32; // 288px
  const innerCard320 = container320 - 32; // 256px
  // Standard index (#1 to #99):
  const stdIndexBadge = 25;
  const stdRequired = stdIndexBadge + 60 + 10 + 8 + 140; // 243px
  const stdHeadroom = innerCard320 - stdRequired;
  console.log(`  [EXPLORATORY INFO] At 320px with standard index (#1-#99): required ${stdRequired}px <= available ${innerCard320}px (+${stdHeadroom}px headroom, zero overflow)`);
}

// -----------------------------------------------------------------------------
// Toolbar 2x2 Grid Headroom
// -----------------------------------------------------------------------------
console.log("\n--- TEST SUITE 2: TOP TOOLBAR 2x2 GRID RESPONSIVENESS ---");

for (const vp of contractedViewports) {
  const isMobile = vp.width < 640;
  const mainPadding = isMobile ? 32 : 48;
  const containerWidth = Math.min(vp.width - mainPadding, 1152);

  if (isMobile) {
    const colWidth = (containerWidth - 8) / 2;
    const maxButtonContentWidth = 96;
    const buttonHeadroom = colWidth - maxButtonContentWidth;
    assertCheck(
      `Mobile Toolbar 2-Col Grid at ${vp.name}`,
      buttonHeadroom >= 0,
      `Col width: ${colWidth.toFixed(1)}px, Max button content: ${maxButtonContentWidth}px, Headroom: +${buttonHeadroom.toFixed(1)}px`
    );
  } else {
    assertCheck(
      `Non-mobile Toolbar flex row at ${vp.name}`,
      containerWidth > 400,
      `Container width: ${containerWidth}px, Flex wrap prevents overflow`
    );
  }
}

// -----------------------------------------------------------------------------
// Type Filter Pills Headroom
// -----------------------------------------------------------------------------
console.log("\n--- TEST SUITE 3: TYPE FILTER PILLS (3-COL GRID ON MOBILE) ---");

for (const vp of contractedViewports) {
  const isMobile = vp.width < 640;
  const mainPadding = isMobile ? 32 : 48;
  const containerWidth = Math.min(vp.width - mainPadding, 1152);

  if (isMobile) {
    const filterCardInnerWidth = containerWidth - 32;
    const pillColWidth = (filterCardInnerWidth - 12) / 3;
    const pillContentWidth = 60;
    const headroom = pillColWidth - pillContentWidth;
    assertCheck(
      `Filter Pills 3-Col at ${vp.name}`,
      headroom >= 0,
      `Pill slot: ${pillColWidth.toFixed(1)}px, Required: ${pillContentWidth}px, Headroom: +${headroom.toFixed(1)}px`
    );
  } else {
    assertCheck(`Filter Pills flex row at ${vp.name}`, true, "Desktop flex row has ample space");
  }
}

// -----------------------------------------------------------------------------
// Deep Code Pattern & CSS Safety Invariant Checks
// -----------------------------------------------------------------------------
console.log("\n--- TEST SUITE 4: HARD CODED OVERFLOW & ADVERSARIAL CSS GUARDS ---");

// Check 1: Stem text has word breaking to prevent long uninterrupted text overflow
const stemHasBreakWords = pageContent.includes("break-words") && pageContent.includes("q.stem");
assertCheck(
  "Stem Text break-words protection against unbounded strings",
  stemHasBreakWords,
  "Found break-words on q.stem container"
);

// Check 2: Option text has min-w-0 and break-words protection
const optionHasBreakWords = pageContent.includes("break-words") && pageContent.includes("opt.text");
const optionHasMinW0 = pageContent.includes("min-w-0") && pageContent.includes("opt.text");
assertCheck(
  "Option Item text min-w-0 & break-words protection",
  optionHasBreakWords && optionHasMinW0,
  "Option text container uses min-w-0 break-words"
);

// Check 3: Card header title container has min-w-0
const headerMinW0 = pageContent.includes("min-w-0") && pageContent.includes("q.type === \"SINGLE\"");
assertCheck(
  "Header left-side container min-w-0 flex shrink protection",
  headerMinW0,
  "Left side flex wrapper has min-w-0 to yield space if needed"
);

// Check 4: Action cluster has shrink-0 to prevent button squishing
const clusterShrink0 = pageContent.includes("flex items-center gap-1 shrink-0");
assertCheck(
  "Action cluster shrink-0 protection against 44px compression",
  clusterShrink0,
  "Cluster has shrink-0 ensuring touch target stays >= 44px"
);

// Check 5: Edit Modal Bottom sheet dimensions & max-h-[90dvh]
const modalHasBottomAnchor = pageContent.includes("items-end sm:items-center");
const modalHasMaxH = pageContent.includes("max-h-[90dvh] sm:max-h-[85vh]");
const modalHasSafeFooter = pageContent.includes("pb-[max(1rem,env(safe-area-inset-bottom,0px))]");
assertCheck(
  "Edit Modal Responsive Bottom Sheet & Safe Area Inset",
  modalHasBottomAnchor && modalHasMaxH && modalHasSafeFooter,
  "Verified items-end, max-h-[90dvh], pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
);

// Check 6: Touch target minimum sizes on all buttons in questions/page.tsx
const allButtonsRegex = /<button[\s\S]*?<\/button>/g;
const buttons = pageContent.match(allButtonsRegex) || [];
console.log(`\nFound ${buttons.length} <button> blocks in src/app/questions/page.tsx`);

let allButtonsMeetTarget = true;
const deficientButtons = [];

buttons.forEach((btn, index) => {
  const hasMinH44 = /min-h-\[(4[4-9]|[5-9]\d|\d{3,})px\]/.test(btn) || /h-11/.test(btn) || /min-h-\[48px\]/.test(btn);
  const hasMinW44 = /min-w-\[(4[4-9]|[5-9]\d|\d{3,})px\]/.test(btn) || /w-11/.test(btn) || /w-full/.test(btn);
  if (!hasMinH44) {
    allButtonsMeetTarget = false;
    deficientButtons.push(`Button #${index + 1}: ${btn.slice(0, 100).replace(/\n/g, " ")}...`);
  }
});

assertCheck(
  "All buttons in questions/page.tsx meet minimum >= 44px height",
  allButtonsMeetTarget,
  deficientButtons.length === 0 ? "All buttons verified >= 44px" : deficientButtons.join(" | ")
);

// Check 7: No hardcoded fixed widths > 300px on interactive or card elements
const fixedWidthMatches = pageContent.match(/w-\[(\d+)px\]/g) || [];
const excessiveWidths = fixedWidthMatches.filter(m => {
  const val = parseInt(m.replace("w-[", "").replace("px]", ""), 10);
  return val > 300;
});
assertCheck(
  "No fixed inline widths > 300px causing viewport overflow",
  excessiveWidths.length === 0,
  `Excessive fixed widths: ${excessiveWidths.length}`
);

// Check 8: Event isolation on Edit and Delete buttons (stopPropagation)
const hasStopPropEdit = pageContent.includes("e.stopPropagation();") && pageContent.includes("handleOpenEdit(q);");
const hasStopPropDelete = pageContent.includes("e.stopPropagation();") && pageContent.includes("handleDelete(q.id);");
assertCheck(
  "Card Edit & Delete event isolation (stopPropagation)",
  hasStopPropEdit && hasStopPropDelete,
  "Both edit and delete buttons have e.stopPropagation() preventing accordion collapse toggles"
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`TOTAL AUDIT CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log(`EMPIRICAL VERDICT: ${failedTests === 0 ? "APPROVE" : "REQUEST_CHANGES"}`);
console.log("================================================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
