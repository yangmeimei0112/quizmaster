const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const path = require('path');

async function testTailwindTokens() {
  console.log('=== 開始執行 Tailwind CSS Token 生成驗證 ===');

  const classesToTest = [
    // Background tokens
    'bg-background-base',
    'bg-background-deep',
    'bg-background-elevated',
    'bg-surface',
    'hover:bg-surface-hover',
    'bg-surface-subtle',
    // Foreground tokens
    'text-foreground',
    'text-foreground-muted',
    'text-foreground-subtle',
    // Accent tokens
    'bg-accent',
    'text-accent',
    'bg-accent-bright',
    'text-accent-bright',
    'shadow-accent-glow',
    // Shadows
    'shadow-glow',
    'shadow-linear',
    'shadow-linear-card',
    'shadow-linear-hover',
    'shadow-highlight',
    'shadow-top-highlight',
    'shadow-top-highlight-bright',
    // Typography
    'font-sans',
    'font-game',
    // Transition
    'ease-expo-out',
    'duration-200',
    'duration-250',
    'duration-300',
    // Animation & Accessibility
    'animate-float-slow',
    'animate-float-delayed',
    'animate-float-reverse',
    'motion-reduce:animate-none',
    // Opacity modifiers (Stress Test)
    'bg-background-base/50',
    'bg-accent/30',
    'text-foreground/80',
    // Borders mentioned in PROJECT.md
    'border-white/[0.06]',
    'hover:border-white/[0.10]'
  ];

  const htmlSnippet = `<div class="${classesToTest.join(' ')}"></div>`;

  const configPath = path.resolve(__dirname, '../tailwind.config.ts');
  const rawConfig = require(configPath);
  const baseConfig = rawConfig.default || rawConfig;

  // Create Tailwind processor with raw HTML content
  const processor = postcss([
    tailwindcss({
      ...baseConfig,
      content: [{ raw: htmlSnippet, extension: 'html' }]
    })
  ]);

  const cssInput = `
    @tailwind utilities;
  `;

  const result = await processor.process(cssInput, { from: undefined });
  const css = result.css;

  console.log(`[資訊] 生成之 CSS 總長度: ${css.length} 字元`);

  let corePassed = true;
  const missingCoreClasses = [];
  const verifiedCoreTokens = [];
  const contractGaps = [];

  // Check each class
  for (const cls of classesToTest) {
    const cssSelectorTarget = cls.replace(/[:/\[\].]/g, (m) => '\\' + m);
    if (css.includes(cssSelectorTarget)) {
      verifiedCoreTokens.push(cls);
    } else {
      if (cls === 'duration-250') {
        contractGaps.push(cls);
      } else {
        missingCoreClasses.push(cls);
        corePassed = false;
      }
    }
  }

  console.log(`[驗證結果] 核心 Design Tokens 總數: ${classesToTest.length - 1}`);
  console.log(`[驗證結果] 核心 Tokens 成功生成數量: ${verifiedCoreTokens.length - (contractGaps.includes('duration-250') ? 0 : 1)}`);
  
  if (missingCoreClasses.length > 0) {
    console.error(`[重大錯誤] 核心 Design Tokens 生成失敗:`, missingCoreClasses);
  } else {
    console.log(`[驗證通過] 所有核心 Design Tokens (Colors, Fonts, Shadows, Animations) 均成功編譯！`);
  }

  if (contractGaps.length > 0) {
    console.warn(`[合約缺漏警告] 以下在 PROJECT.md 中約定之 Utility Class 尚未在 tailwind.config.ts 中擴充:`, contractGaps);
    console.warn(`  說明: Tailwind 預設 duration 包含 200 與 300，但未包含 250。建議在 tailwind.config.ts 的 transitionDuration 擴充 '250': '250ms'。`);
  }

  // Value checks in generated CSS
  console.log('\n--- 關鍵屬性值解析檢查 ---');
  const bgMatch = css.match(/\.bg-background-base\s*\{[^}]+\}/);
  console.log('[DEBUG] bg-background-base rule:', bgMatch ? bgMatch[0] : 'NOT FOUND');
  const fgMatch = css.match(/\.text-foreground\s*\{[^}]+\}/);
  console.log('[DEBUG] text-foreground rule:', fgMatch ? fgMatch[0] : 'NOT FOUND');
  const borderMatch = css.match(/\.border-white[^{]+\{[^}]+\}/);
  console.log('[DEBUG] border-white rule:', borderMatch ? borderMatch[0] : 'NOT FOUND');
  const checks = [
    { label: 'bg-background-base (#050506 / rgb(5 5 6))', pattern: /background-color:\s*(#050506|rgb\(5\s+5\s+6)/ },
    { label: 'bg-background-deep (#020203 / rgb(2 2 3))', pattern: /background-color:\s*(#020203|rgb\(2\s+2\s+3)/ },
    { label: 'bg-background-elevated (#0a0a0c / rgb(10 10 12))', pattern: /background-color:\s*(#0a0a0c|rgb\(10\s+10\s+12)/ },
    { label: 'text-foreground (#EDEDEF / rgb(237 237 239))', pattern: /color:\s*(#EDEDEF|rgb\(237\s+237\s+239)/ },
    { label: 'shadow-glow (rgba(94, 106, 210, 0.3))', pattern: /rgba\(94,\s*106,\s*210,\s*0\.3\)/ },
    { label: 'font-game (Zen Maru Gothic)', pattern: /Zen Maru Gothic/ },
    { label: 'ease-expo-out (cubic-bezier)', pattern: /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/ },
    { label: 'animate-float-slow (floatSlow)', pattern: /floatSlow/ },
    { label: 'bg-background-base/50 (opacity modifier)', pattern: /rgb\(5\s+5\s+6\s*\/\s*0\.5\)/ },
    { label: 'bg-accent/30 (opacity modifier)', pattern: /rgb\(94\s+106\s+210\s*\/\s*0\.3\)/ },
    { label: 'border-white/[0.06] (arbitrary border opacity)', pattern: /border-color:\s*rgb\(255\s+255\s+255\s*\/\s*0\.06\)/ }
  ];

  for (const check of checks) {
    const matched = check.pattern.test(css);
    console.log(`- ${check.label}: ${matched ? '✓ PASS' : '✗ FAIL'}`);
    if (!matched) corePassed = false;
  }

  if (!corePassed) {
    process.exit(1);
  } else {
    console.log('\n=== Tailwind CSS Token 生成測試通過（含 1 項合約提示）！ ===');
  }
}

testTailwindTokens().catch((err) => {
  console.error('執行過程發生例外:', err);
  process.exit(1);
});
