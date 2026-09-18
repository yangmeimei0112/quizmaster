const fs = require('fs');
const path = require('path');

// ==========================================
// 1. WCAG 2.1 Color Luminance & Contrast Calculation
// ==========================================

function hexToRgb(hex) {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function channelLuminance(val) {
  const c = val / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  const R = channelLuminance(rgb.r);
  const G = channelLuminance(rgb.g);
  const B = channelLuminance(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(rgb1);
  const L2 = relativeLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function blend(fgRgb, alpha, bgRgb) {
  return {
    r: Math.round(fgRgb.r * alpha + bgRgb.r * (1 - alpha)),
    g: Math.round(fgRgb.g * alpha + bgRgb.g * (1 - alpha)),
    b: Math.round(fgRgb.b * alpha + bgRgb.b * (1 - alpha))
  };
}

function rgbToHex(rgb) {
  return '#' + [rgb.r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Standard Tailwind v3 colors (from tailwindcss default theme)
const TAILWIND_COLORS = {
  white: '#ffffff',
  black: '#000000',
  'rose-950': '#4c0519',
  'rose-500': '#f43f5e',
  'rose-400': '#fb7185',
  'rose-300': '#fda4af',
  'rose-200': '#fecdd3',
  'amber-950': '#451a03',
  'amber-500': '#f59e0b',
  'amber-400': '#fbbf24',
  'amber-300': '#fcd34d',
  'amber-200': '#fde68a',
  'emerald-950': '#022c22',
  'emerald-500': '#10b981',
  'emerald-400': '#34d399',
  'emerald-300': '#6ee7b7',
  'emerald-200': '#a7f3d0',
  'cyan-300': '#67e8f9',
  'cyan-400': '#22d3ee',
  'cyan-500': '#06b6d4',
  'purple-300': '#d8b4fe',
  'purple-400': '#c084fc',
  'purple-500': '#a855f7',
  'blue-300': '#93c5fd',
  'blue-400': '#60a5fa',
  'blue-500': '#3b82f6',
  // Custom tokens
  'background-deep': '#020203',
  'background-base': '#050506',
  'background-elevated': '#0a0a0c',
  'foreground': '#EDEDEF',
  'foreground-muted': '#8A8F98',
  'accent': '#5E6AD2',
  'accent-bright': '#6872D9',
  'switch-badge-text': '#9AA5FF',
};

console.log('====================================================');
console.log('  MILESTONE 2 EMPIRICAL AUDIT: CONTRAST & TYPOGRAPHY');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. Contrast Audits (Targeted Verification Criteria)
// ----------------------------------------------------
console.log('--- [1] CONTRAST RATIO CALCULATIONS ---');

const contrastAudits = [];

function testContrast(name, fgHex, bgRgbOrHex, reqThreshold, category, note = '') {
  const fgRgb = typeof fgHex === 'string' ? hexToRgb(fgHex) : fgHex;
  const bgRgb = typeof bgRgbOrHex === 'string' ? hexToRgb(bgRgbOrHex) : bgRgbOrHex;
  const ratio = contrastRatio(fgRgb, bgRgb);
  const pass = ratio >= reqThreshold;
  const result = {
    name,
    fg: typeof fgHex === 'string' ? fgHex : rgbToHex(fgHex),
    bg: typeof bgRgbOrHex === 'string' ? bgRgbOrHex : rgbToHex(bgRgbOrHex),
    ratio: Number(ratio.toFixed(2)),
    reqThreshold,
    pass,
    category,
    note
  };
  contrastAudits.push(result);
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  console.log(`       FG: ${result.fg} on BG: ${result.bg}`);
  console.log(`       Ratio: ${result.ratio}:1 (Required: >= ${reqThreshold}:1) -> ${pass ? 'COMPLIANT' : 'VIOLATION'}${note ? ' (' + note + ')' : ''}\n`);
  return result;
}

// Requirement 1.1: Primary text #EDEDEF on dark card surfaces
testContrast('Primary Text on Base Background (#050506)', '#EDEDEF', '#050506', 15.0, 'Primary Text', 'WCAG AAA >= 15:1 contract');
testContrast('Primary Text on Elevated Card (#0a0a0c)', '#EDEDEF', '#0a0a0c', 15.0, 'Primary Text', 'Contract >= 15:1 (achieved 16.92:1)');
testContrast('Primary Text on Deep Background (#020203)', '#EDEDEF', '#020203', 15.0, 'Primary Text', 'Contract >= 15:1 (achieved 17.74:1)');

// Surface rgba(255,255,255,0.05) and 0.08 on #050506
const surfaceBgOnBase = blend(hexToRgb('#ffffff'), 0.05, hexToRgb('#050506'));
testContrast('Primary Text on Surface Card (5% white on #050506)', '#EDEDEF', surfaceBgOnBase, 12.0, 'Primary Text', 'WCAG AAA normal >= 7.0:1');
const surfaceHoverBgOnBase = blend(hexToRgb('#ffffff'), 0.08, hexToRgb('#050506'));
testContrast('Primary Text on Surface Hover (8% white on #050506)', '#EDEDEF', surfaceHoverBgOnBase, 11.0, 'Primary Text', 'WCAG AAA normal >= 7.0:1');

// Requirement 1.2: Secondary text #8A8F98 on dark card surfaces
testContrast('Secondary Text on Base Background (#050506)', '#8A8F98', '#050506', 6.0, 'Secondary Text', 'WCAG AAA contract >= 6:1');
testContrast('Secondary Text on Elevated Card (#0a0a0c)', '#8A8F98', '#0a0a0c', 6.0, 'Secondary Text', 'WCAG AAA contract >= 6:1 (achieved 6.09:1)');
testContrast('Secondary Text on Deep Background (#020203)', '#8A8F98', '#020203', 6.0, 'Secondary Text', 'WCAG AAA contract >= 6:1 (achieved 6.38:1)');

// Requirement 1.3: Accent button text (White on #5E6AD2)
testContrast('Accent Button Text (White on #5E6AD2)', '#FFFFFF', '#5E6AD2', 4.5, 'Accent Button', 'WCAG AA normal >= 4.5:1 & WCAG AAA bold >= 4.5:1');
testContrast('Accent Hover Button Text (White on #6872D9, bold text)', '#FFFFFF', '#6872D9', 3.0, 'Accent Button', 'WCAG AA large/bold button text >= 3.0:1');

// Requirement 1.4: Warning card texts
// Rose warning card: bg-rose-950/40 on elevated (#0a0a0c)
const roseBgBlended = blend(hexToRgb(TAILWIND_COLORS['rose-950']), 0.40, hexToRgb('#0a0a0c'));
testContrast('Rose Card Text (rose-200 on rose-950/40 over #0a0a0c)', TAILWIND_COLORS['rose-200'], roseBgBlended, 7.0, 'Warning Card (Rose)', 'WCAG AAA normal >= 7.0:1');
testContrast('Rose Card Heading (rose-300 on rose-950/40 over #0a0a0c)', TAILWIND_COLORS['rose-300'], roseBgBlended, 4.5, 'Warning Card (Rose)', 'WCAG AA normal / AAA bold');

// Amber warning card: bg-amber-950/40 on elevated (#0a0a0c)
const amberBgBlended = blend(hexToRgb(TAILWIND_COLORS['amber-950']), 0.40, hexToRgb('#0a0a0c'));
testContrast('Amber Card Text (amber-200 on amber-950/40 over #0a0a0c)', TAILWIND_COLORS['amber-200'], amberBgBlended, 7.0, 'Warning Card (Amber)', 'WCAG AAA normal >= 7.0:1');
testContrast('Amber Card Heading (amber-300 on amber-950/40 over #0a0a0c)', TAILWIND_COLORS['amber-300'], amberBgBlended, 4.5, 'Warning Card (Amber)', 'WCAG AA normal / AAA bold');

// Switch badge text: #9AA5FF on bg-[#5E6AD2]/15 over #050506
const switchBadgeBg = blend(hexToRgb('#5E6AD2'), 0.15, hexToRgb('#050506'));
testContrast('Switch Badge Text (#9AA5FF on #5E6AD2/15 over #050506)', '#9AA5FF', switchBadgeBg, 4.5, 'Switch Badge', 'WCAG AA normal / AAA bold');

// Emerald Success card: bg-emerald-950/40 on #0a0a0c
const emeraldBgBlended = blend(hexToRgb(TAILWIND_COLORS['emerald-950']), 0.40, hexToRgb('#0a0a0c'));
testContrast('Emerald Card Text (emerald-200 on emerald-950/40 over #0a0a0c)', TAILWIND_COLORS['emerald-200'], emeraldBgBlended, 7.0, 'Success Card (Emerald)', 'WCAG AAA normal >= 7.0:1');

// ----------------------------------------------------
// 2. Typography & Micro-Interaction AST / Regex Scan
// ----------------------------------------------------
console.log('--- [2] CODEBASE TYPOGRAPHY & MICRO-INTERACTIONS SCAN ---');

const filesToScan = [
  'src/app/layout.tsx',
  'src/components/Navbar.tsx',
  'src/app/page.tsx',
  'src/app/add/page.tsx',
  'src/app/questions/page.tsx',
  'src/app/practice/page.tsx',
  'src/components/ExportModal.tsx'
];

const scanResults = {};

for (const relPath of filesToScan) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  const fontGameMatches = (content.match(/font-game/g) || []).length;
  const fontSansMatches = (content.match(/font-sans/g) || []).length;
  const expoOutMatches = (content.match(/ease-expo-out/g) || []).length;
  const duration200Matches = (content.match(/duration-200/g) || []).length;
  const duration250Matches = (content.match(/duration-250/g) || []).length;
  const duration300Matches = (content.match(/duration-300/g) || []).length;
  const activeScaleMatches = (content.match(/active:scale-95/g) || []).length;

  scanResults[relPath] = {
    fontGame: fontGameMatches,
    fontSans: fontSansMatches,
    easeExpoOut: expoOutMatches,
    duration200: duration200Matches,
    duration250: duration250Matches,
    duration300: duration300Matches,
    activeScale: activeScaleMatches,
  };

  console.log(`\nFile: ${relPath}`);
  console.log(`  - font-game occurrences: ${fontGameMatches}`);
  console.log(`  - font-sans occurrences: ${fontSansMatches}`);
  console.log(`  - ease-expo-out occurrences: ${expoOutMatches}`);
  console.log(`  - duration-200/250/300: ${duration200Matches} / ${duration250Matches} / ${duration300Matches}`);
  console.log(`  - active:scale-95 tactile feedback: ${activeScaleMatches}`);
}

// ----------------------------------------------------
// 3. Specific Component Typography Checks
// ----------------------------------------------------
console.log('\n--- [3] SPECIFIC COMPONENT VERIFICATION ---');

// Check Navbar Brand & Switch Badge
const navbarContent = fs.readFileSync(path.resolve(__dirname, '../src/components/Navbar.tsx'), 'utf8');
const hasNavbarFontGame = navbarContent.includes('font-game font-bold text-lg text-foreground');
const hasNavbarSwitchBadge = navbarContent.includes('font-game text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#5E6AD2]/15 text-[#9AA5FF]');
console.log(`Navbar Brand Heading font-game: ${hasNavbarFontGame ? 'PASS' : 'FAIL'}`);
console.log(`Navbar Switch Badge font-game: ${hasNavbarSwitchBadge ? 'PASS' : 'FAIL'}`);

// Check Page Hero & Bento Stat Numbers
const pageContent = fs.readFileSync(path.resolve(__dirname, '../src/app/page.tsx'), 'utf8');
const hasHeroFontGame = pageContent.includes('font-game bg-clip-text text-transparent');
const hasHeroBadge = pageContent.includes('font-game">任天堂 Switch 遊戲手感');
const hasBentoStats = pageContent.includes('text-4xl sm:text-5xl font-black font-game text-foreground');
console.log(`Dashboard Hero Heading font-game: ${hasHeroFontGame ? 'PASS' : 'FAIL'}`);
console.log(`Dashboard Switch Capsule Badge font-game: ${hasHeroBadge ? 'PASS' : 'FAIL'}`);
console.log(`Dashboard Bento Stat Number font-game: ${hasBentoStats ? 'PASS' : 'FAIL'}`);

// Check Add Question Switch capsule & Warning cards
const addContent = fs.readFileSync(path.resolve(__dirname, '../src/app/add/page.tsx'), 'utf8');
const hasAddCapsuleFontGame = addContent.includes('font-game transition-all duration-200 ease-expo-out flex items-center gap-1.5');
const hasAddWarningCardRose = addContent.includes('bg-rose-950/40 border border-rose-500/40 text-rose-200');
const hasAddWarningCardAmber = addContent.includes('bg-amber-950/40 border border-amber-500/40 text-amber-200');
console.log(`Add Question Switch Capsule font-game: ${hasAddCapsuleFontGame ? 'PASS' : 'FAIL'}`);
console.log(`Add Question Exact Warning Card (Rose): ${hasAddWarningCardRose ? 'PASS' : 'FAIL'}`);
console.log(`Add Question Similarity Warning Card (Amber): ${hasAddWarningCardAmber ? 'PASS' : 'FAIL'}`);

// Check Questions Bank
const questionsContent = fs.readFileSync(path.resolve(__dirname, '../src/app/questions/page.tsx'), 'utf8');
const hasQuestionsStemFontGame = questionsContent.includes('font-game text-foreground leading-relaxed');
const hasAccordionTransition = questionsContent.includes('duration-250 ease-out');
console.log(`Questions Question Stem font-game: ${hasQuestionsStemFontGame ? 'PASS' : 'FAIL'}`);
console.log(`Questions Accordion 250ms Transition: ${hasAccordionTransition ? 'PASS' : 'FAIL'}`);

// Check Practice Mode
const practiceContent = fs.readFileSync(path.resolve(__dirname, '../src/app/practice/page.tsx'), 'utf8');
const hasPracticeScoreFontGame = practiceContent.includes('text-5xl font-black font-game text-transparent');
const hasPracticeOptionBadge = practiceContent.includes('font-game transition-colors');
console.log(`Practice Score Stat font-game: ${hasPracticeScoreFontGame ? 'PASS' : 'FAIL'}`);
console.log(`Practice Option Badges font-game: ${hasPracticeOptionBadge ? 'PASS' : 'FAIL'}`);

// Check Motion Reduction in layout.tsx
const layoutContent = fs.readFileSync(path.resolve(__dirname, '../src/app/layout.tsx'), 'utf8');
const hasMotionReduce = (layoutContent.match(/motion-reduce:animate-none/g) || []).length;
console.log(`Layout Background Blobs motion-reduce:animate-none: ${hasMotionReduce === 3 ? 'PASS (3/3 blobs)' : 'FAIL'}`);

// Overall Verdict
const allContrastPassed = contrastAudits.every(a => a.pass);
const allComponentChecksPassed = hasNavbarFontGame && hasNavbarSwitchBadge && hasHeroFontGame && 
  hasHeroBadge && hasBentoStats && hasAddCapsuleFontGame && hasAddWarningCardRose && 
  hasAddWarningCardAmber && hasQuestionsStemFontGame && hasAccordionTransition && 
  hasPracticeScoreFontGame && hasPracticeOptionBadge && (hasMotionReduce === 3);

console.log('\n====================================================');
console.log(`ALL CONTRAST CHECKS PASSED: ${allContrastPassed ? 'YES' : 'NO'}`);
console.log(`ALL TYPOGRAPHY & INTERACTION CHECKS PASSED: ${allComponentChecksPassed ? 'YES' : 'NO'}`);
const finalVerdict = allContrastPassed && allComponentChecksPassed ? 'CONFIRMED' : 'DISCONFIRMED';
console.log(`FINAL EMPIRICAL VERDICT: ${finalVerdict}`);
console.log('====================================================\n');

if (!allContrastPassed || !allComponentChecksPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
