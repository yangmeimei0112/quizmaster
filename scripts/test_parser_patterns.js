const testCases = [
  { text: '【單選題】1. 題幹\n【附圖】：https://example.com/1.png\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/1.png' },
  { text: '1. 題幹\n【附圖：https://example.com/2.png】\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/2.png' },
  { text: '1. 題幹\n[附圖]：https://example.com/3.png\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/3.png' },
  { text: '1. 題幹\n[附圖: https://example.com/4.png]\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/4.png' },
  { text: '1. 題幹\n（附圖：https://example.com/5.png）\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/5.png' },
  { text: '1. 題幹\n(附圖：https://example.com/6.png)\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/6.png' },
  { text: '1. 題幹\n![流程圖](/uploads/7.png)\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: '/uploads/7.png' },
  { text: '1. 題幹\n題目附圖：https://example.com/8.png?v=1&q=2\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/8.png?v=1&q=2' },
  { text: '1. 題幹\n【題目附圖】/uploads/9.webp\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: '/uploads/9.webp' },
  { text: '1. 題幹\n(附圖: https://example.com/10.jpg)\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/10.jpg' },
  { text: '1. 題幹\n（附圖）https://example.com/11.jpg\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: 'https://example.com/11.jpg' },
  { text: '1. 題幹\n附圖: uploads/12.jpg\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n答案：A', expected: '/uploads/12.jpg' },
];

function extractImage(text) {
  let working = text;
  let imageUrl;

  // 1. Markdown: ![alt](url)
  const mdMatch = working.match(/!\[.*?\]\(\s*([^\s\)]+)\s*\)/i);
  if (mdMatch) {
    imageUrl = mdMatch[1].trim();
    working = working.replace(mdMatch[0], "");
  } else {
    // 2. 括號包住整段標籤與 URL: 【附圖：URL】 或 [附圖: URL] 或 (附圖: URL) 或 （附圖：URL）
    const enclosedMatch = working.match(
      /[【\[（\(]\s*(?:附圖|題目附圖|圖片|圖示|Image|Img)\s*[:：]?\s*(https?:\/\/[^\s\]】）\)\"\'\>]+|\/?uploads\/[^\s\]】）\)\"\'\>]+|data:image\/[^\s\]】）\)\"\'\>]+)\s*[】\]）\)]/i
    );
    if (enclosedMatch) {
      imageUrl = enclosedMatch[1].trim();
      working = working.replace(enclosedMatch[0], "");
    } else {
      // 3. 標籤在外或無括號: 【附圖】：URL 或 [附圖]：URL 或 附圖：URL 或 題目附圖: URL
      const standardMatch = working.match(
        /(?:[【\[（\(]?\s*(?:附圖|題目附圖|圖片|圖示|Image|Img)\s*[】\]）\)]?\s*[:：]?\s*)(https?:\/\/[^\s\)\"\'\>]+|\/?uploads\/[^\s\)\"\'\>]+|data:image\/[^\s\)\"\'\>]+)/i
      );
      if (standardMatch) {
        let rawUrl = standardMatch[1].trim();
        rawUrl = rawUrl.replace(/[】\]）\)\>]+$/, "");
        imageUrl = rawUrl;
        working = working.replace(standardMatch[0], "");
      }
    }
  }

  if (imageUrl && imageUrl.startsWith("uploads/")) {
    imageUrl = "/" + imageUrl;
  }

  return { imageUrl, cleanStem: working.trim() };
}

let allPassed = true;
testCases.forEach((tc, idx) => {
  const res = extractImage(tc.text);
  const ok = res.imageUrl === tc.expected;
  if (!ok) {
    console.error(`❌ Case ${idx + 1} failed! Expected: "${tc.expected}", got: "${res.imageUrl}"`);
    allPassed = false;
  } else {
    console.log(`✅ Case ${idx + 1} passed: ${res.imageUrl} | Stem: [${res.cleanStem.replace(/\n/g, ' ')}]`);
  }
  if (/附圖|圖片|圖示|Image|Img/i.test(res.cleanStem)) {
    console.error(`❌ Case ${idx + 1} stem has leftover tag: ${res.cleanStem}`);
    allPassed = false;
  }
  if (/[【\[（\(]\s*[】\]）\)]/.test(res.cleanStem)) {
    console.error(`❌ Case ${idx + 1} stem has empty brackets: ${res.cleanStem}`);
    allPassed = false;
  }
});

if (!allPassed) process.exit(1);
console.log("\nAll parser pattern tests passed and stems are clean!");


