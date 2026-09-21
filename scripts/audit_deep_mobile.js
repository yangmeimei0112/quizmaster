const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("./src");

console.log("=========================================");
console.log("DEEP MOBILE UX & PERFORMANCE AUDIT REPORT");
console.log("=========================================\n");

// 1. Check all buttons for height / width touch target
console.log("--- 1. Scanning <button> elements ---");
let buttonCount = 0;
let problematicButtons = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  // Regex to capture button tags and their className
  const buttonRegex = /<button\b([^>]*?)>/gs;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    buttonCount++;
    const buttonAttrs = match[1];
    const classMatch = buttonAttrs.match(/className=(?:\{`([^`]+)`\}|"([^"]+)")/);
    const classes = classMatch ? (classMatch[1] || classMatch[2] || "") : "";
    
    // Check if touch target is >= 44px
    const hasMinH44 = /min-h-\[(?:4[4-9]|[5-9][0-9])px\]/.test(classes) || /min-h-(?:11|12|14|16|20)/.test(classes);
    const hasH44 = /(?:^|\s)(?:w-11\s+h-11|w-12\s+h-12|h-11|h-12|h-14|h-16)/.test(classes) || /h-\[(?:4[4-9]|[5-9][0-9])px\]/.test(classes);
    const hasMinW44 = /min-w-\[(?:4[4-9]|[5-9][0-9])px\]/.test(classes);
    const hasPyPadding = /py-(?:2\.5|3|3\.5|4|5|6)/.test(classes);
    const hasP25OrMore = /p-(?:2\.5|3|3\.5|4|5|6)/.test(classes);

    // If it has explicit smaller height
    const hasSmallH = /min-h-\[(?:[0-3][0-9]|4[0-3])px\]/.test(classes) || /(?:^|\s)(?:h-6|h-7|h-8|h-9|h-10)(?:\s|$)/.test(classes);
    const hasSmallW = /min-w-\[(?:[0-3][0-9]|4[0-3])px\]/.test(classes) || /(?:^|\s)(?:w-6|w-7|w-8|w-9|w-10)(?:\s|$)/.test(classes);
    const hasSmallP = /(?:^|\s)(?:p-1|p-1\.5|p-2)(?:\s|$)/.test(classes);

    const relPath = path.relative(".", file).replace(/\\/g, "/");
    
    // Find line number
    const lineNo = content.slice(0, match.index).split("\n").length;

    if (hasSmallH && !hasMinH44) {
      problematicButtons.push({
        file: relPath,
        line: lineNo,
        reason: "Explicit height/min-height < 44px",
        classes
      });
    } else if (hasSmallP && !hasMinH44 && !hasH44 && !hasMinW44) {
      problematicButtons.push({
        file: relPath,
        line: lineNo,
        reason: "Small padding (p-1 or p-1.5 or p-2) without min-h-[44px] or min-w-[44px]",
        classes
      });
    }
  }
});

console.log(`Audited ${buttonCount} buttons.`);
console.log(`Found ${problematicButtons.length} potentially small buttons:`);
problematicButtons.forEach((b) => {
  console.log(`  [${b.file}:${b.line}] ${b.reason}\n    classes: "${b.classes}"`);
});

// 2. Check all <a> and <Link> elements
console.log("\n--- 2. Scanning <a> and <Link> elements ---");
let linkCount = 0;
let problematicLinks = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const linkRegex = /<(?:a|Link)\b([^>]*?)>/gs;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    linkCount++;
    const linkAttrs = match[1];
    const classMatch = linkAttrs.match(/className=(?:\{`([^`]+)`\}|"([^"]+)")/);
    const classes = classMatch ? (classMatch[1] || classMatch[2] || "") : "";

    const hasMinH = /min-h-/.test(classes);
    const hasH = /(?:^|\s)h-/.test(classes);
    const hasPy = /py-/.test(classes);
    const relPath = path.relative(".", file).replace(/\\/g, "/");
    const lineNo = content.slice(0, match.index).split("\n").length;

    if (!hasMinH && !hasH && !hasPy && classes.includes("text-")) {
      problematicLinks.push({
        file: relPath,
        line: lineNo,
        reason: "Link without height or vertical padding",
        classes
      });
    }
  }
});
console.log(`Audited ${linkCount} links.`);
console.log(`Found ${problematicLinks.length} potentially small links:`);
problematicLinks.slice(0, 15).forEach((l) => {
  console.log(`  [${l.file}:${l.line}] ${l.reason}\n    classes: "${l.classes}"`);
});

// 3. Check scroll-touch and overscroll-contain in modals
console.log("\n--- 3. Scanning modals for scroll-touch, overscroll-contain, and safe areas ---");
const modalFiles = [
  "src/components/ExportModal.tsx",
  "src/components/AuthModal.tsx",
  "src/components/QuickAddModal.tsx",
  "src/components/practice/ExamWrongReportModal.tsx",
  "src/components/practice/WrongQuestionsRanking.tsx",
  "src/app/questions/page.tsx",
  "src/app/add/page.tsx",
  "src/components/practice/MockExamView.tsx"
];

modalFiles.forEach((f) => {
  const content = fs.readFileSync(f, "utf8");
  const hasScrollTouch = content.includes("scroll-touch");
  const hasOverscroll = content.includes("overscroll-contain");
  const hasTransformGpu = content.includes("transform-gpu");
  const hasPbSafe = content.includes("pb-safe") || content.includes("safe-area-inset-bottom");
  console.log(`  ${f}:`);
  console.log(`    scroll-touch: ${hasScrollTouch ? "YES" : "MISSING ❌"}`);
  console.log(`    overscroll-contain: ${hasOverscroll ? "YES" : "MISSING ❌"}`);
  console.log(`    transform-gpu: ${hasTransformGpu ? "YES" : "MISSING ❌"}`);
  console.log(`    safe-area-bottom: ${hasPbSafe ? "YES" : "MISSING ❌"}`);
});
