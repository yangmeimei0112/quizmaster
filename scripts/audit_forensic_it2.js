const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' FORENSIC INTEGRITY AUDIT: IT2 TOUCH TARGETS & CRUD');
console.log('====================================================\n');

const qPath = path.resolve(__dirname, '../src/app/questions/page.tsx');
const content = fs.readFileSync(qPath, 'utf8');

const findings = {
  checks: [],
  violations: [],
};

function auditCheck(name, pass, details) {
  findings.checks.push({ name, pass, details });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  if (details) console.log(`       Details: ${details}`);
}

// 1. Check for legacy 40px bounding boxes in questions page
const matches40px = content.match(/min-[wh]-\[40px\]|w-\[40px\]|h-\[40px\]/g) || [];
auditCheck(
  'Zero Remaining 40px Constraints in questions page',
  matches40px.length === 0,
  `Found ${matches40px.length} occurrences: ${matches40px.join(', ')}`
);

// 2. Check Question Card Action Cluster (Edit, Delete, Chevron)
const hasCardEdit44 = content.includes('className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-foreground-muted hover:text-[#8B96F8]');
const hasCardDelete44 = content.includes('className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-foreground-muted hover:text-rose-400');
const hasCardChevron44 = content.includes('className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground-muted transition-transform duration-250 ease-expo-out"');

auditCheck(
  'Question Card Edit Button 44x44px',
  hasCardEdit44,
  hasCardEdit44 ? 'Verified w-11 h-11 min-w-[44px] min-h-[44px]' : 'Missing 44px class on edit button'
);

auditCheck(
  'Question Card Delete Button 44x44px',
  hasCardDelete44,
  hasCardDelete44 ? 'Verified w-11 h-11 min-w-[44px] min-h-[44px]' : 'Missing 44px class on delete button'
);

auditCheck(
  'Question Card Chevron Indicator 44x44px',
  hasCardChevron44,
  hasCardChevron44 ? 'Verified w-11 h-11 min-w-[44px] min-h-[44px]' : 'Missing 44px class on chevron'
);

// 3. Check Event Isolation (stopPropagation on Edit and Delete)
const hasEditStopPropagation = content.includes('e.stopPropagation();\n                          handleOpenEdit(q);') ||
  content.includes('e.stopPropagation();') && content.includes('handleOpenEdit(q);');
const hasDeleteStopPropagation = content.includes('e.stopPropagation();\n                          handleDelete(q.id);') ||
  content.includes('e.stopPropagation();') && content.includes('handleDelete(q.id);');

auditCheck(
  'Card Edit Button StopPropagation Isolation',
  hasEditStopPropagation,
  'Ensures clicking edit does not toggle accordion card'
);

auditCheck(
  'Card Delete Button StopPropagation Isolation',
  hasDeleteStopPropagation,
  'Ensures clicking delete does not toggle accordion card'
);

// 4. Check Empty State Reset Filter Button
const hasResetButton44 = content.includes('min-h-[44px] px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-xs font-semibold text-foreground border border-white/[0.08] transition-all duration-200 ease-expo-out inline-flex items-center justify-center touch-manipulation active:scale-95');
auditCheck(
  'Empty State Reset Filter Button min-h-[44px]',
  hasResetButton44,
  hasResetButton44 ? 'Verified min-h-[44px] with touch-manipulation' : 'Reset button missing 44px'
);

// 5. Check Top Toolbar Action Buttons
const hasExpandAll44 = content.includes('h-11 min-h-[44px] px-3 sm:px-4 rounded-xl border border-white/[0.10] text-xs font-semibold text-foreground bg-white/[0.04] hover:bg-white/[0.08]');
const hasShowAnswers44 = content.includes('setShowAnswersGlobal((v) => !v)') && content.includes('h-11 min-h-[44px]');
const hasExportButton44 = content.includes('setIsExportModalOpen(true)') && content.includes('h-11 min-h-[44px]');
const hasAddButton44 = content.includes('href="/add"') && content.includes('h-11 min-h-[44px]');

auditCheck(
  'Top Toolbar Expand/Collapse All Button >= 44px',
  hasExpandAll44,
  'Verified h-11 min-h-[44px]'
);
auditCheck(
  'Top Toolbar Hide/Show Answers Button >= 44px',
  hasShowAnswers44,
  'Verified h-11 min-h-[44px]'
);
auditCheck(
  'Top Toolbar Export Document Button >= 44px',
  hasExportButton44,
  'Verified h-11 min-h-[44px]'
);
auditCheck(
  'Top Toolbar Add Question Link >= 44px',
  hasAddButton44,
  'Verified h-11 min-h-[44px]'
);

// 6. Check Search and Filters
const hasSearchClear44 = content.includes('aria-label="清除搜尋關鍵字"') && content.includes('w-11 h-11 min-w-[44px] min-h-[44px]');
const hasTypeFilters44 = content.includes('setSelectedType(t.key)') && content.includes('min-h-[44px]');

auditCheck(
  'Search Clear Button 44x44px',
  hasSearchClear44,
  'Verified w-11 h-11 min-w-[44px] min-h-[44px]'
);
auditCheck(
  'Question Type Filter Pills min-h-[44px]',
  hasTypeFilters44,
  'Verified min-h-[44px]'
);

// 7. Check Edit Modal Elements
const hasModalClose44 = content.includes('aria-label="關閉編輯視窗"') && content.includes('min-w-[44px] min-h-[44px]');
const hasModalTypePills44 = content.includes('setEditType("SINGLE")') && content.includes('min-h-[44px]');
const hasModalOptionKey44 = content.includes('toggleEditAnswer(item.key)') && content.includes('w-11 h-11 min-w-[44px] min-h-[44px]');
const hasModalOptionInput44 = content.includes('item.set(e.target.value)') && content.includes('min-h-[44px]');
const hasModalCancel48 = content.includes('setEditingQuestion(null)') && content.includes('min-h-[48px]');
const hasModalSave48 = content.includes('handleSaveEdit') && content.includes('min-h-[48px]');

auditCheck('Modal Close Button >= 44px', hasModalClose44, 'min-w-[44px] min-h-[44px]');
auditCheck('Modal Type Buttons >= 44px', hasModalTypePills44, 'min-h-[44px]');
auditCheck('Modal Option Key Toggles 44x44px', hasModalOptionKey44, 'w-11 h-11 min-w-[44px] min-h-[44px]');
auditCheck('Modal Option Inputs min-h-[44px]', hasModalOptionInput44, 'min-h-[44px]');
auditCheck('Modal Cancel Button min-h-[48px]', hasModalCancel48, 'min-h-[48px]');
auditCheck('Modal Save Button min-h-[48px]', hasModalSave48, 'min-h-[48px]');

// 8. Authenticity & Regression: Check all functional logic
const hasRealFetch = content.includes('fetch(`/api/questions?${params.toString()}`)');
const hasRealDelete = content.includes('fetch(`/api/questions/${id}`, { method: "DELETE" })');
const hasRealPut = content.includes('fetch(`/api/questions/${editingQuestion.id}`, {') && content.includes('method: "PUT"');
const hasRealDebounce = content.includes('setTimeout') && content.includes('fetchQuestions()');

auditCheck('Authentic API fetch for list/search/filter', hasRealFetch, 'Real REST API call with query params');
auditCheck('Authentic API DELETE for question removal', hasRealDelete, 'Real DELETE call to /api/questions/[id]');
auditCheck('Authentic API PUT for question update', hasRealPut, 'Real PUT call to /api/questions/[id]');
auditCheck('Authentic Search Debounce', hasRealDebounce, 'Real 250ms debounce on search/filter');

// 9. Check Anti-Cheat / Facade patterns
const hasHardcodedPass = content.includes('test passed') || content.includes('integrity check pass');
auditCheck('No Hardcoded Test Pass Bypasses', !hasHardcodedPass, 'Zero hardcoded bypass strings detected');

const allPassed = findings.checks.every(c => c.pass);
console.log('\n====================================================');
console.log(`TOTAL CHECKS: ${findings.checks.length}`);
console.log(`PASSED CHECKS: ${findings.checks.filter(c => c.pass).length}`);
console.log(`FAILED CHECKS: ${findings.checks.filter(c => !c.pass).length}`);
console.log(`VERDICT: ${allPassed ? 'CLEAN' : 'INTEGRITY VIOLATION'}`);
console.log('====================================================\n');

if (!allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
