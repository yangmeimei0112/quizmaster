const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' SHORTCUT SYSTEM AUTOMATED TEST SUITE');
console.log(' Testing 3 Core Keyboard Shortcut Features');
console.log('====================================================\n');

const quickAddPath = path.resolve(__dirname, '../src/components/QuickAddModal.tsx');
const practicePath = path.resolve(__dirname, '../src/app/practice/page.tsx');
const questionsPath = path.resolve(__dirname, '../src/app/questions/page.tsx');

const quickAddContent = fs.readFileSync(quickAddPath, 'utf8');
const practiceContent = fs.readFileSync(practicePath, 'utf8');
const questionsContent = fs.readFileSync(questionsPath, 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// ==========================================
// FEATURE 1: QuickAddModal 左右鍵切換與 Ctrl+Enter
// ==========================================
console.log('\n--- 1. QuickAddModal 快捷鍵靜態與邏輯驗證 ---');

test('QuickAddModal: 存在 keydown 事件監聽與完整清理函式', () => {
  assert(quickAddContent.includes('window.addEventListener("keydown", handleKeyDown)'), '缺少 keydown 監聽');
  assert(quickAddContent.includes('window.removeEventListener("keydown", handleKeyDown)'), '缺少 keydown 移除清理');
});

test('QuickAddModal: 支援 ESC 鍵關閉彈窗', () => {
  assert(quickAddContent.includes('e.key === "Escape"'), '缺少 Escape 鍵判定');
  assert(quickAddContent.includes('onClose()'), 'Escape 應呼叫 onClose()');
});

test('QuickAddModal: 支援 Ctrl+Enter / Cmd+Enter 快速送出', () => {
  assert(quickAddContent.includes('(e.ctrlKey || e.metaKey) && e.key === "Enter"'), '缺少 Ctrl/Cmd+Enter 判定');
  assert(quickAddContent.includes('handleBatchSaveAll()'), '多題模式應呼叫 handleBatchSaveAll');
  assert(quickAddContent.includes('handleConfirmAndDirectSave()') || quickAddContent.includes('handleConfirmAndApply()'), '單題模式應有送出處理');
});

test('QuickAddModal: 支援左右鍵 ArrowLeft / ArrowRight 切換多題', () => {
  assert(quickAddContent.includes('e.key === "ArrowLeft"'), '缺少 ArrowLeft 判定');
  assert(quickAddContent.includes('e.key === "ArrowRight"'), '缺少 ArrowRight 判定');
  assert(quickAddContent.includes('setActiveIndex'), '左右鍵切換需呼叫 setActiveIndex');
});

test('QuickAddModal: 左右鍵具備打字隔離 (避免干擾 input/textarea 游標)', () => {
  assert(quickAddContent.includes('target.tagName === "INPUT"'), '需檢查 INPUT 標籤');
  assert(quickAddContent.includes('target.tagName === "TEXTAREA"'), '需檢查 TEXTAREA 標籤');
  assert(quickAddContent.includes('!isTyping || e.altKey'), '未打字時或搭配 Alt 鍵才切換');
});

test('QuickAddModal: 介面具備切換指示與 Ctrl+Enter 快捷鍵提示', () => {
  assert(quickAddContent.includes('Ctrl+Enter'), '送出按鈕缺少 Ctrl+Enter 提示');
  assert(quickAddContent.includes('←') && quickAddContent.includes('→'), '膠囊區缺少 ← / → 切換提示');
  assert(quickAddContent.includes('ChevronLeft') && quickAddContent.includes('ChevronRight'), '缺少左右按鈕輔助切換');
});

test('QuickAddModal: 具備 isComposing 與 keyCode === 229 輸入法防護 (防止注音/拼音 Esc 關閉彈窗丟失輸入)', () => {
  assert(quickAddContent.includes('e.isComposing || e.keyCode === 229'), 'QuickAddModal 需排除輸入法組字中狀態與 keyCode 229');
});

test('QuickAddModal: 送出中 (isBatchSubmitting / isDirectSubmitting) 防重複提交與 Esc 鎖定', () => {
  assert(quickAddContent.includes('if (isBatchSubmitting || isDirectSubmitting) return;'), '送出中應阻止重複觸發或 Esc 關閉');
  assert(quickAddContent.includes('if (isBatchSubmitting) return;'), 'handleBatchSaveAll 需防禦重複請求');
  assert(quickAddContent.includes('if (isDirectSubmitting) return;'), 'handleConfirmAndDirectSave 需防禦重複請求');
});

test('QuickAddModal: 左右切換按鈕符合 44px 觸控熱區規範', () => {
  assert(quickAddContent.includes('min-w-[44px] min-h-[44px]'), '題目切換輔助箭頭需滿足 44px 最小觸控熱區');
});

test('QuickAddModal: 左右鍵切換排除 Shift / Ctrl / Meta 修飾鍵干擾', () => {
  assert(quickAddContent.includes('!e.shiftKey && !e.ctrlKey && !e.metaKey'), '切換題目需排除 Shift/Ctrl/Meta 快捷鍵組合');
});

test('QuickAddModal: 狀態切換邏輯模擬 (3 道題目巡訪驗證)', () => {
  const parsedList = [{ id: 1 }, { id: 2 }, { id: 3 }];
  let activeIndex = 0;

  const navigate = (key) => {
    if (key === 'ArrowRight') {
      activeIndex = activeIndex < parsedList.length - 1 ? activeIndex + 1 : 0;
    } else if (key === 'ArrowLeft') {
      activeIndex = activeIndex > 0 ? activeIndex - 1 : parsedList.length - 1;
    }
  };

  navigate('ArrowRight');
  assert.strictEqual(activeIndex, 1, '第 0 題按右鍵應到第 1 題');

  navigate('ArrowRight');
  assert.strictEqual(activeIndex, 2, '第 1 題按右鍵應到第 2 題');

  navigate('ArrowRight');
  assert.strictEqual(activeIndex, 0, '最後一題按右鍵應回到第 0 題');

  navigate('ArrowLeft');
  assert.strictEqual(activeIndex, 2, '第 0 題按左鍵應回繞到第 2 題');

  navigate('ArrowLeft');
  assert.strictEqual(activeIndex, 1, '第 2 題按左鍵應到第 1 題');
});

test('QuickAddModal: 膠囊列表與選中膠囊正確掛載 tabsContainerRef 與 activeCapsuleRef', () => {
  assert(quickAddContent.includes('const tabsContainerRef = useRef<HTMLDivElement | null>(null);'), '需宣告 tabsContainerRef');
  assert(quickAddContent.includes('const activeCapsuleRef = useRef<HTMLButtonElement | null>(null);'), '需宣告 activeCapsuleRef');
  assert(quickAddContent.includes('ref={tabsContainerRef}'), '膠囊容器需掛載 tabsContainerRef');
  assert(quickAddContent.includes('ref={isActive ? activeCapsuleRef : null}'), '當前選中膠囊需掛載 activeCapsuleRef');
  assert(quickAddContent.includes('scroll-smooth'), '容器需具備平滑滾動類別 scroll-smooth');
});

test('QuickAddModal: activeIndex 變化時透過 requestAnimationFrame 與 scrollTo 實現平滑跟隨移動', () => {
  assert(quickAddContent.includes('requestAnimationFrame'), '需透過 requestAnimationFrame 確保 DOM 繪製完成後滾動');
  assert(quickAddContent.includes('container.scrollTo({'), '需呼叫 container.scrollTo 進行精確平滑滾動');
  assert(quickAddContent.includes('behavior: "smooth"'), '需設定平滑滾動 behavior: smooth');
  assert(quickAddContent.includes('Math.max(0, Math.min(maxScrollLeft, targetScrollLeft))'), '滾動計算需防禦超出邊界');
});

test('QuickAddModal: 橫向滾動目標位置計算模擬 (驗證自動居中演算法)', () => {
  // 模擬容器寬度 600px, 總滾動寬度 2000px
  const containerWidth = 600;
  const scrollWidth = 2000;
  const maxScrollLeft = scrollWidth - containerWidth; // 1400

  // 測試 1: 第 1 題在最左邊 (left: 40px, width: 120px)
  const target1 = { left: 40, width: 120 };
  const targetScrollLeft1 = target1.left - containerWidth / 2 + target1.width / 2; // 40 - 300 + 60 = -200
  const safeScroll1 = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft1));
  assert.strictEqual(safeScroll1, 0, '第 1 題應定位在最左側 0px');

  // 測試 2: 第 5 題在中間 (left: 650px, width: 120px)
  const target5 = { left: 650, width: 120 };
  const targetScrollLeft5 = target5.left - containerWidth / 2 + target5.width / 2; // 650 - 300 + 60 = 410
  const safeScroll5 = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft5));
  assert.strictEqual(safeScroll5, 410, '第 5 題應精確平滑滾動到 410px 實現居中');

  // 測試 3: 最後一題在最右側 (left: 1900px, width: 120px)
  const targetLast = { left: 1900, width: 120 };
  const targetScrollLeftLast = targetLast.left - containerWidth / 2 + targetLast.width / 2; // 1900 - 300 + 60 = 1660
  const safeScrollLast = Math.max(0, Math.min(maxScrollLeft, targetScrollLeftLast));
  assert.strictEqual(safeScrollLast, 1400, '最後一題應安全限制在 maxScrollLeft (1400px)');
});

// ==========================================
// FEATURE 2: 自測刷題 A/B/C/D 與 Enter
// ==========================================
console.log('\n--- 2. 自測刷題 (/practice) 快捷鍵靜態與邏輯驗證 ---');

test('PracticePage: 存在 keydown 事件監聽與移除清理', () => {
  assert(practiceContent.includes('window.addEventListener("keydown", handleKeyDown)'), '缺少 keydown 監聽');
  assert(practiceContent.includes('window.removeEventListener("keydown", handleKeyDown)'), '缺少 keydown 移除清理');
});

test('PracticePage: 支援 A / B / C / D 快捷鍵選取選項', () => {
  assert(practiceContent.includes('handleSelectOption(resolvedKey)'), 'A/B/C/D 需呼叫 handleSelectOption');
  assert(practiceContent.includes('["A", "B", "C", "D"].includes(resolvedKey)'), '需檢查 A, B, C, D 鍵');
});

test('PracticePage: 支援數字鍵 1 / 2 / 3 / 4 映射至 A / B / C / D', () => {
  assert(practiceContent.includes('"1": "A"') && practiceContent.includes('"2": "B"'), '數字鍵應映射至選項鍵');
});

test('PracticePage: 支援 Enter 送出答案或前往下一題', () => {
  assert(practiceContent.includes('e.key === "Enter"'), '缺少 Enter 鍵判定');
  assert(practiceContent.includes('handleSubmitAnswer()'), '作答時 Enter 呼叫 handleSubmitAnswer');
  assert(practiceContent.includes('handleNextQuestion()'), '已揭曉答案時 Enter 呼叫 handleNextQuestion');
});

test('PracticePage: Enter 在大廳與結算畫面也能開始/重測', () => {
  assert(practiceContent.includes('handleStartQuiz()'), '未開始測驗時 Enter 呼叫 handleStartQuiz');
  assert(practiceContent.includes('handleRestart()'), '測驗完成時 Enter 呼叫 handleRestart');
});

test('PracticePage: 具備 isComposing 與 keyCode === 229 輸入法組字防干擾檢查', () => {
  assert(practiceContent.includes('e.isComposing || e.keyCode === 229'), '需排除輸入法組字中狀態及 keyCode 229');
});

test('PracticePage: 嚴格隔離修飾鍵 (防止 Ctrl+C 複製、Ctrl+A 全選、Cmd+C、Alt+D 被攔截為答案)', () => {
  assert(practiceContent.includes('!e.ctrlKey && !e.metaKey && !e.altKey'), '選項選取需嚴格隔離 Ctrl、Meta、Alt 修飾鍵');
});

test('PracticePage: Enter 排除修飾鍵且尊重 <a> 導覽連結與大廳按鈕原生焦點行為', () => {
  assert(practiceContent.includes('target.tagName === "A" || target.closest("a")'), 'Enter 需尊重 <a> 超連結導覽');
  assert(practiceContent.includes('data-start-btn'), '大廳按鈕需區分開始按鈕與篩選按鈕');
  assert(practiceContent.includes('data-quiz-action'), '測驗主動作按鈕需明確標記');
});

test('PracticePage: 介面具備 A/B/C/D 與 Enter 快捷鍵標籤提示', () => {
  assert(practiceContent.includes('A / B / C / D'), '頂部狀態列缺少 A/B/C/D 提示');
  assert(practiceContent.includes('確認送出答案') && practiceContent.includes('Enter'), '送出按鈕缺少 Enter 提示');
  assert(practiceContent.includes('下一題') && practiceContent.includes('Enter'), '下一題按鈕缺少 Enter 提示');
});

test('PracticePage: 刷題作答流程邏輯模擬', () => {
  let isAnswerSubmitted = false;
  let selectedAnswers = [];
  let currentType = 'SINGLE';
  let score = 0;
  let currentQ = { correctAnswers: 'B' };

  function handleSelect(key) {
    if (isAnswerSubmitted) return;
    if (currentType === 'SINGLE') {
      selectedAnswers = [key];
    } else {
      selectedAnswers = selectedAnswers.includes(key)
        ? selectedAnswers.filter(k => k !== key)
        : [...selectedAnswers, key];
    }
  }

  function handleEnter() {
    if (!isAnswerSubmitted) {
      if (selectedAnswers.length === 0) return;
      if (selectedAnswers.join(',') === currentQ.correctAnswers) {
        score++;
      }
      isAnswerSubmitted = true;
    } else {
      isAnswerSubmitted = false;
      selectedAnswers = [];
      currentQ = { correctAnswers: 'A,C' };
      currentType = 'MULTIPLE';
    }
  }

  handleSelect('A');
  assert.deepStrictEqual(selectedAnswers, ['A'], '單選題按 A 應選取 A');

  handleSelect('B');
  assert.deepStrictEqual(selectedAnswers, ['B'], '單選題按 B 應切換為 B');

  handleEnter();
  assert.strictEqual(isAnswerSubmitted, true, '按 Enter 應標記為已送出');
  assert.strictEqual(score, 1, '回答正確應得 1 分');

  handleSelect('C');
  assert.deepStrictEqual(selectedAnswers, ['B'], '已送出後答案不可變更');

  handleEnter();
  assert.strictEqual(isAnswerSubmitted, false, '進入下一題應重設作答狀態');
  assert.deepStrictEqual(selectedAnswers, [], '進入下一題已選選項應清空');

  handleSelect('A');
  handleSelect('C');
  assert.deepStrictEqual(selectedAnswers, ['A', 'C'], '複選題應可多選');

  handleSelect('C');
  assert.deepStrictEqual(selectedAnswers, ['A'], '複選題再次按鍵應取消勾選');
});

test('PracticePage: 模擬 Ctrl+C / Ctrl+A 攻擊場景驗證修飾鍵隔離', () => {
  let selectedOption = null;
  let preventDefaultCalled = false;

  function simulateKeyPress(e) {
    preventDefaultCalled = false;
    if (e.isComposing || e.keyCode === 229) return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const keyUpper = e.key.toUpperCase();
      const numMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      const resolved = numMap[e.key] || keyUpper;
      if (['A', 'B', 'C', 'D'].includes(resolved)) {
        e.preventDefault();
        selectedOption = resolved;
      }
    }
  }

  // 1. 使用者按下 Ctrl+C (複製文字)
  simulateKeyPress({ key: 'c', ctrlKey: true, metaKey: false, altKey: false, preventDefault: () => { preventDefaultCalled = true; } });
  assert.strictEqual(preventDefaultCalled, false, 'Ctrl+C 不可呼叫 preventDefault');
  assert.strictEqual(selectedOption, null, 'Ctrl+C 不可選取選項 C');

  // 2. 使用者按下 Ctrl+A (全選文字)
  simulateKeyPress({ key: 'a', ctrlKey: true, metaKey: false, altKey: false, preventDefault: () => { preventDefaultCalled = true; } });
  assert.strictEqual(preventDefaultCalled, false, 'Ctrl+A 不可呼叫 preventDefault');
  assert.strictEqual(selectedOption, null, 'Ctrl+A 不可選取選項 A');

  // 3. 使用者按下 Cmd+C (Mac 複製)
  simulateKeyPress({ key: 'c', ctrlKey: false, metaKey: true, altKey: false, preventDefault: () => { preventDefaultCalled = true; } });
  assert.strictEqual(preventDefaultCalled, false, 'Cmd+C 不可呼叫 preventDefault');
  assert.strictEqual(selectedOption, null, 'Cmd+C 不可選取選項 C');

  // 4. 使用者單純按下 c 鍵
  simulateKeyPress({ key: 'c', ctrlKey: false, metaKey: false, altKey: false, preventDefault: () => { preventDefaultCalled = true; } });
  assert.strictEqual(preventDefaultCalled, true, '純 c 鍵應呼叫 preventDefault');
  assert.strictEqual(selectedOption, 'C', '純 c 鍵應選取選項 C');
});

// ==========================================
// FEATURE 3: 題目總覽 / 聚焦搜尋與 Esc
// ==========================================
console.log('\n--- 3. 題目總覽 (/questions) 快捷鍵靜態與邏輯驗證 ---');

test('QuestionsPage: 存在 keydown 事件監聽與移除清理', () => {
  assert(questionsContent.includes('window.addEventListener("keydown", handleKeyDown)'), '缺少 keydown 監聽');
  assert(questionsContent.includes('window.removeEventListener("keydown", handleKeyDown)'), '缺少 keydown 移除清理');
});

test('QuestionsPage: 支援 / 鍵聚焦關鍵字搜尋輸入框', () => {
  assert(questionsContent.includes('e.key === "/"'), '缺少 / 鍵判定');
  assert(questionsContent.includes('searchInputRef.current?.focus()'), '需呼叫 searchInputRef focus');
  assert(questionsContent.includes('searchInputRef.current?.select()'), '聚焦時全選既有內容便利替換');
});

test('QuestionsPage: / 鍵具備打字隔離 (避免在一般輸入框打斜線時被攔截)', () => {
  assert(questionsContent.includes('target.tagName === "INPUT"'), '需檢查 INPUT');
  assert(questionsContent.includes('target.tagName === "TEXTAREA"'), '需檢查 TEXTAREA');
  assert(questionsContent.includes('if (!isTyping)'), '打字狀態不可攔截斜線');
});

test('QuestionsPage: 具備 isComposing 與 keyCode === 229 輸入法防護', () => {
  assert(questionsContent.includes('e.isComposing || e.keyCode === 229'), '需排除輸入法組字中與 keyCode 229');
});

test('QuestionsPage: 開啟在線編輯或匯出彈窗時，/ 鍵禁止聚焦背後搜尋欄', () => {
  assert(questionsContent.includes('editingQuestion || isExportModalOpen'), '彈窗開啟時不可奪取焦點至背後搜尋框');
});

test('QuestionsPage: / 鍵嚴格隔離修飾鍵 (Ctrl+/、Cmd+/ 等不觸發)', () => {
  assert(questionsContent.includes('!e.ctrlKey && !e.metaKey && !e.altKey'), '/ 鍵需隔離修飾鍵');
});

test('QuestionsPage: 支援 Esc 鍵取消聚焦、清空搜尋與關閉彈窗', () => {
  assert(questionsContent.includes('e.key === "Escape"'), '缺少 Escape 鍵判定');
  assert(questionsContent.includes('setEditingQuestion(null)'), '彈窗開啟時 Esc 應關閉彈窗');
  assert(questionsContent.includes('searchInputRef.current?.blur()'), '搜尋框聚焦時 Esc 應 blur');
  assert(questionsContent.includes('setSearchTerm("")'), '有搜尋字詞時 Esc 應清空');
});

test('QuestionsPage: 介面具備 / 快捷鍵指示徽章且維持無障礙規格', () => {
  assert(questionsContent.includes('title="按 / 鍵聚焦搜尋"'), '搜尋框需有提示');
  assert(questionsContent.includes('aria-label="清除搜尋關鍵字"'), '清除按鈕 aria-label 需維持');
  assert(questionsContent.includes('min-w-[44px] min-h-[44px]'), '44px 觸控熱區需維持');
  assert(questionsContent.includes('text-base sm:text-sm'), '防 iOS 自動放大需維持');
});

test('QuestionsPage: Esc 與 / 流程邏輯模擬', () => {
  let editingQuestion = null;
  let isExportModalOpen = false;
  let isSearchFocused = false;
  let searchTerm = "專案管理";

  function handleEsc() {
    if (editingQuestion) {
      editingQuestion = null;
      return "CLOSED_EDIT_MODAL";
    }
    if (isExportModalOpen) {
      isExportModalOpen = false;
      return "CLOSED_EXPORT_MODAL";
    }
    if (isSearchFocused) {
      if (searchTerm) {
        searchTerm = "";
      }
      isSearchFocused = false;
      return "CLEARED_AND_BLURRED_SEARCH";
    }
    if (searchTerm) {
      searchTerm = "";
      return "CLEARED_SEARCH_TERM";
    }
    return "NO_ACTION";
  }

  // 1. 編輯彈窗開啟時按 Esc
  editingQuestion = { id: 'q-1' };
  assert.strictEqual(handleEsc(), 'CLOSED_EDIT_MODAL');
  assert.strictEqual(editingQuestion, null);

  // 2. 匯出彈窗開啟時按 Esc
  isExportModalOpen = true;
  assert.strictEqual(handleEsc(), 'CLOSED_EXPORT_MODAL');
  assert.strictEqual(isExportModalOpen, false);

  // 3. 搜尋欄聚焦且有字時按 Esc
  searchTerm = "敏捷開發";
  isSearchFocused = true;
  assert.strictEqual(handleEsc(), 'CLEARED_AND_BLURRED_SEARCH');
  assert.strictEqual(searchTerm, "");
  assert.strictEqual(isSearchFocused, false);

  // 4. 搜尋欄未聚焦但有篩選詞時按 Esc
  searchTerm = "PMP";
  isSearchFocused = false;
  assert.strictEqual(handleEsc(), 'CLEARED_SEARCH_TERM');
  assert.strictEqual(searchTerm, "");
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log(`VERDICT: ${failedTests === 0 ? 'ALL SHORTCUT SUITES PASSED' : 'TESTS FAILED'}`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
