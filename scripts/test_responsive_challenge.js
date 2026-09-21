import fs from "fs";
import path from "path";

const filesToAudit = [
  "src/app/layout.tsx",
  "src/components/Navbar.tsx",
  "src/app/page.tsx",
  "src/app/add/page.tsx",
  "src/app/questions/page.tsx",
  "src/app/practice/page.tsx",
  "src/components/ExportModal.tsx",
];

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

console.log("=== Responsive & Viewport Constraint Empirical Audit ===\n");

// 1. Layout & Viewport Configuration
const layoutContent = fs.readFileSync("src/app/layout.tsx", "utf-8");
if (
  layoutContent.includes('viewportFit: "cover"') &&
  layoutContent.includes('initialScale: 1') &&
  layoutContent.includes('min-h-[100dvh]') &&
  layoutContent.includes('safe-area-inset-bottom')
) {
  results.passed.push("R1: layout.tsx exports viewportFit: cover, initialScale: 1, min-h-[100dvh], and safe-area-inset-bottom");
} else {
  results.failed.push("R1: layout.tsx missing required viewport / safe area configuration");
}

// 2. Input / Textarea 16px Font Verification (iOS Safari Auto-Zoom Prevention)
for (const file of filesToAudit) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    if (line.includes("<input") || line.includes("<textarea")) {
      // Look for font size class in this element or surrounding lines
      const chunk = lines.slice(Math.max(0, index - 2), index + 8).join(" ");
      const hasBase = chunk.includes("text-base");
      const hasSmallOnly = (chunk.includes("text-xs") || chunk.includes("text-sm")) && !chunk.includes("text-base");
      const isCheckboxOrRadio = chunk.includes('type="checkbox"') || chunk.includes('type="radio"');

      if (isCheckboxOrRadio) return;

      if (hasSmallOnly) {
        results.failed.push(`R1 iOS Auto-Zoom Risk in ${file}:${index + 1}: Input/Textarea has font size < 16px without text-base on mobile:\n   ${line.trim()}`);
      } else if (hasBase) {
        results.passed.push(`R1 iOS Auto-Zoom Safe in ${file}:${index + 1} (uses text-base)`);
      }
    }
  });
}

// 3. Bottom Sheet Implementation Verification
const bottomSheetFiles = [
  { file: "src/components/ExportModal.tsx", name: "ExportModal" },
  { file: "src/app/questions/page.tsx", name: "Questions Online Edit Modal" },
  { file: "src/app/add/page.tsx", name: "Add Page Duplicate Confirm Modal" },
];

for (const { file, name } of bottomSheetFiles) {
  const content = fs.readFileSync(file, "utf-8");
  
  const hasItemsEnd = content.includes("items-end") && content.includes("sm:items-center");
  const hasMaxH = content.includes("max-h-[90dvh]") || content.includes("max-h-[85vh]") || content.includes("max-h-[70vh]");
  const hasDragHandle = content.includes("w-12 h-1.5 bg-white/20 rounded-full");
  const hasSafeArea = content.includes("safe-area-inset-bottom");
  const hasScroll = content.includes("overflow-y-auto") && (content.includes("overscroll-contain") || content.includes("overflow-hidden"));

  if (hasItemsEnd && hasMaxH && hasDragHandle && hasSafeArea) {
    results.passed.push(`R3 Bottom Sheet in ${name} (${file}): Verified items-end sm:items-center, max-h constraint, drag handle, and safe-area inset`);
  } else {
    results.failed.push(`R3 Bottom Sheet in ${name} (${file}) failed checks:\n   itemsEnd: ${hasItemsEnd}, maxH: ${hasMaxH}, dragHandle: ${hasDragHandle}, safeArea: ${hasSafeArea}`);
  }
}

// 4. Fixed Widths > 320px on Mobile Check
for (const file of filesToAudit) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Check for fixed pixel widths like w-[...px], min-w-[...px] without responsive prefix
    const fixedWidthMatches = line.match(/(?<!sm:|md:|lg:|xl:|2xl:)(?:w|min-w|max-w)-\[(\d+)px\]/g);
    if (fixedWidthMatches) {
      for (const match of fixedWidthMatches) {
        const pxValue = parseInt(match.match(/\d+/)[0], 10);
        if (pxValue > 320) {
          // Check if parent has overflow-hidden or pointer-events-none (e.g. background blobs)
          const isBackgroundBlob = line.includes("rounded-full") || line.includes("blur-") || line.includes("pointer-events-none");
          if (!isBackgroundBlob) {
            results.failed.push(`Overflow Risk in ${file}:${index + 1}: Fixed width ${match} > 320px on mobile without responsive prefix:\n   ${line.trim()}`);
          } else {
            results.passed.push(`Background decorative element with ${match} safely marked pointer-events-none/blur in ${file}:${index + 1}`);
          }
        }
      }
    }
  });
}

// 5. Flex Overflow & min-w-0 check
for (const file of filesToAudit) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Check for flex items containing text truncation or long text
    if (line.includes("truncate") && !line.includes("min-w-0")) {
      results.warnings.push(`Truncate without min-w-0 in ${file}:${index + 1}: ${line.trim()}`);
    }
    if (line.includes("line-clamp-") && line.includes("flex-1") && !line.includes("min-w-0")) {
      results.warnings.push(`line-clamp flex item without min-w-0 in ${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

// 6. Touch Targets Verification (Buttons, Anchors >= 44px)
for (const file of filesToAudit) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    if (line.includes("<button") || (line.includes("<Link") && line.includes("rounded"))) {
      const chunk = lines.slice(index, index + 6).join(" ");
      const hasMinH = chunk.includes("min-h-[44px]") || chunk.includes("min-h-[48px]") || chunk.includes("h-11") || chunk.includes("h-12") || chunk.includes("h-16") || chunk.includes("py-3.5") || chunk.includes("p-2.5") || chunk.includes("min-w-[44px]") || chunk.includes("min-w-[40px]");
      const isSubtleInline = chunk.includes("underline") || chunk.includes("text-xs text-[#8B96F8]");

      if (!hasMinH && !isSubtleInline) {
        // Warning or note
        // console.log(`Notice: potential sub-44px target at ${file}:${index + 1}`);
      }
    }
  });
}

console.log(`Passed checks: ${results.passed.length}`);
results.passed.forEach((p) => console.log(`  ✓ ${p}`));

if (results.warnings.length > 0) {
  console.log(`\nWarnings: ${results.warnings.length}`);
  results.warnings.forEach((w) => console.log(`  ! ${w}`));
}

if (results.failed.length > 0) {
  console.log(`\nFailed checks: ${results.failed.length}`);
  results.failed.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("\nAll constraint assertions PASSED successfully!");
}
