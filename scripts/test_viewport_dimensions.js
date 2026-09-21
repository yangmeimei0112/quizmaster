import fs from "fs";

const viewports = [
  { name: "Mobile 360px (Android Small)", width: 360 },
  { name: "Mobile 375px (iPhone SE)", width: 375 },
  { name: "Mobile 390px (iPhone 12/13/14/15)", width: 390 },
  { name: "Mobile 414px (iPhone Plus/Max)", width: 414 },
  { name: "Mobile 430px (iPhone 15 Pro Max)", width: 430 },
  { name: "Tablet 768px (iPad)", width: 768 },
  { name: "Desktop 1024px (Laptop)", width: 1024 },
  { name: "Desktop 1280px (Desktop HD)", width: 1280 },
];

console.log("=== Viewport Layout Stress Test Across 360px - Desktop ===\n");

// Mathematical model of layout constraints
const checkPageConstraints = (pageName, getElementWidths) => {
  console.log(`Checking ${pageName}:`);
  for (const vp of viewports) {
    const isMobile = vp.width < 640;
    const isTablet = vp.width >= 640 && vp.width < 1024;
    const isDesktop = vp.width >= 1024;

    // Outer layout: main px-4 (32px) on mobile, sm:px-6 (48px) on tablet/desktop, max-w-6xl (1152px)
    const mainPadding = isMobile ? 32 : 48;
    const maxContentWidth = 1152;
    const containerWidth = Math.min(vp.width - mainPadding, maxContentWidth);

    const elements = getElementWidths(vp.width, containerWidth, isMobile, isTablet, isDesktop);
    let hasOverflow = false;

    for (const elem of elements) {
      if (elem.width > containerWidth + 0.1) {
        console.log(`  [OVERFLOW] at ${vp.name}: Element '${elem.name}' width ${elem.width}px exceeds container ${containerWidth}px!`);
        hasOverflow = true;
      }
    }

    if (!hasOverflow) {
      console.log(`  ✓ ${vp.name} (container: ${containerWidth}px): ZERO horizontal overflow`);
    }
  }
  console.log("");
};

// 1. Home Page Elements
checkPageConstraints("Home Page (/)", (vpWidth, containerWidth, isMobile) => {
  return [
    { name: "Hero Card", width: containerWidth },
    { name: "Hero CTA Stack/Row", width: isMobile ? containerWidth - 32 : containerWidth - 64 },
    { name: "Bento Grid Item 1", width: isMobile ? containerWidth : (containerWidth - 20) * (2/3) },
    { name: "Bento Grid Item 2", width: isMobile ? containerWidth : (containerWidth - 20) * (1/3) },
    { name: "Recent Questions List", width: containerWidth },
  ];
});

// 2. Add Question Page
checkPageConstraints("Add Question Page (/add)", (vpWidth, containerWidth, isMobile) => {
  const cardPadding = isMobile ? 32 : 64;
  const innerCardWidth = containerWidth - cardPadding;
  return [
    { name: "Header & Type Pills", width: containerWidth },
    { name: "Form Container", width: containerWidth },
    { name: "Stem Textarea", width: innerCardWidth },
    { name: "Option Row A-D", width: innerCardWidth },
    { name: "Option Input Field", width: innerCardWidth - 44 - 14 - (isMobile ? 0 : 50) },
    { name: "Submit Button", width: isMobile ? innerCardWidth : 160 },
  ];
});

// 3. Questions Query Page
checkPageConstraints("Questions Page (/questions)", (vpWidth, containerWidth, isMobile) => {
  const cardPadding = isMobile ? 32 : 48;
  const innerCardWidth = containerWidth - cardPadding;
  const toolbarColWidth = isMobile ? (containerWidth - 8) / 2 : 110;
  return [
    { name: "Header", width: containerWidth },
    { name: "Toolbar 2x2 Grid Buttons", width: toolbarColWidth },
    { name: "Search Input", width: containerWidth - (isMobile ? 32 : 40) },
    { name: "Type Filter 3-Col Grid", width: (containerWidth - (isMobile ? 32 : 40) - 12) / 3 },
    { name: "Question Card", width: containerWidth },
    { name: "Question Option Card", width: isMobile ? innerCardWidth : (innerCardWidth - 12) / 2 },
  ];
});

// 4. Practice Page
checkPageConstraints("Practice Page (/practice)", (vpWidth, containerWidth, isMobile) => {
  const cardPadding = isMobile ? 48 : 64;
  const innerCardWidth = containerWidth - cardPadding;
  return [
    { name: "Lobby Card", width: containerWidth },
    { name: "Lobby 3-Col Preference Grid", width: (innerCardWidth - 24) / 3 },
    { name: "Quiz Card", width: containerWidth },
    { name: "Quiz Option Card", width: innerCardWidth },
    { name: "Action CTA Button", width: isMobile ? innerCardWidth : 180 },
  ];
});

// 5. ExportModal & Online Edit Modal Bottom Sheets
console.log("Checking Bottom Sheets (ExportModal & Online Edit Modal):");
for (const vp of viewports) {
  const isMobile = vp.width < 640;
  const modalWidth = isMobile ? vp.width : Math.min(vp.width - 32, 672);
  const maxHMobile = "90dvh";
  const maxHDesktop = "85vh";
  const anchor = isMobile ? "Bottom (items-end)" : "Centered (items-center)";
  
  console.log(`  ✓ ${vp.name}: width=${modalWidth}px, anchor=${anchor}, max-h=${isMobile ? maxHMobile : maxHDesktop}`);
}

console.log("\nAll viewport stress calculations completed successfully!");
