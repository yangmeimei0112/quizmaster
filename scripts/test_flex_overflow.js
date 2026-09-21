import fs from "fs";

const files = [
  "src/app/layout.tsx",
  "src/components/Navbar.tsx",
  "src/app/page.tsx",
  "src/app/add/page.tsx",
  "src/app/questions/page.tsx",
  "src/app/practice/page.tsx",
  "src/components/ExportModal.tsx",
];

console.log("=== Comprehensive Flexbox & Overflow Adversarial Analysis ===\n");

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  
  console.log(`Analyzing ${file}...`);
  lines.forEach((line, idx) => {
    // Check if line contains flex container
    if (line.includes("flex") && !line.includes("flex-col") && !line.includes("hidden")) {
      // Check if line also has truncate or break-words or dynamic text
      if (line.includes("truncate") && !line.includes("min-w-0")) {
        console.log(`  [POTENTIAL RISK] Line ${idx + 1}: 'truncate' without 'min-w-0' in flex row:`);
        console.log(`    ${line.trim()}`);
      }
      if (line.includes("line-clamp") && !line.includes("min-w-0")) {
        console.log(`  [POTENTIAL RISK] Line ${idx + 1}: 'line-clamp' without 'min-w-0' in flex row:`);
        console.log(`    ${line.trim()}`);
      }
    }

    // Check for fixed pixel widths or large sizes
    const wMatch = line.match(/\bw-(\d+|\[\w+\])/g);
    if (wMatch) {
      wMatch.forEach((m) => {
        if (m.startsWith("w-[") && !line.includes("pointer-events-none") && !line.includes("blur-")) {
          const val = parseInt(m.replace("w-[", "").replace("px]", ""), 10);
          if (val > 300) {
            console.log(`  [OVERFLOW RISK] Line ${idx + 1}: Explicit width ${m} > 300px:`);
            console.log(`    ${line.trim()}`);
          }
        }
      });
    }
  });
}
console.log("\nFlexbox analysis completed.");
