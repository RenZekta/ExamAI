/* ============================================================
   ExamAI test suite
   ------------------------------------------------------------
   Runs in the browser against a loaded ExamAI.html page.

   Usage: open ExamAI.html, open DevTools → Console, paste this
   whole file, press Enter. See tests/TESTS.md for other ways
   to run it (including headless via agent-browser).

   The suite imports the built-in sample bank and starts a poll,
   so it replaces whatever bank/state is currently loaded —
   reload the page afterwards (the bank itself is re-loadable
   with the 🧪 Load built-in sample button).
   ============================================================ */
(async function ExamAITests() {
  'use strict';

  const A = window.ExamAI;
  const results = [];

  function assert(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: cond ? '' : (detail || '') });
  }
  function eq(name, actual, expected) {
    const ok = actual === expected;
    results.push({
      name,
      ok,
      detail: ok ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    });
  }

  if (!A) {
    console.error('window.ExamAI not found — open ExamAI.html first.');
    return [];
  }

  /* ---------------------------------------------------------
     1. Built-in sample bank
     --------------------------------------------------------- */
  A.importMarkdown(A.SAMPLE_MD, 'test');
  eq('sample: 3 subjects', A.state.subjects.length, 3);
  eq('sample: 13 poll questions',
    A.state.subjects.reduce((n, s) => n + s.questions.length, 0), 13);
  eq('sample: 9 written topics',
    A.state.subjects.reduce((n, s) => n + s.topics.length, 0), 9);

  /* ---------------------------------------------------------
     2. Poll-line parsing
     --------------------------------------------------------- */
  const subs = A.parseMarkdown(
    '## T\n### Poll\n1. Q? - a {why a} - *b {why b} - c {why c} - d {why d} // summary\n');
  eq('parse: 1 subject', subs.length, 1);
  eq('parse: 1 question', subs[0].questions.length, 1);
  const q = subs[0].questions[0];
  eq('parse: 4 answers', q.answers.length, 4);
  eq('parse: * marks correct', q.answers[1].correct, true);
  eq('parse: exactly 1 correct', q.answers.filter((a) => a.correct).length, 1);
  eq('parse: comment on correct answer', q.answers[1].comment, 'why b');
  eq('parse: comment on first answer', q.answers[0].comment, 'why a');
  eq('parse: overall explanation', q.explanation, 'summary');

  /* 3. Braces containing " - " must not split an answer. */
  const subs2 = A.parseMarkdown(
    '## T\n### Poll\n1. Q? - a {see 1 - 2 examples} - *b - c - d\n');
  eq('braces: comment keeps " - "',
    subs2[0].questions[0].answers[0].comment, 'see 1 - 2 examples');
  eq('braces: still 4 answers', subs2[0].questions[0].answers.length, 4);

  /* 4. Baseline attachment (blockquote after a written topic). */
  const subs3 = A.parseMarkdown(
    '## T\n### Written\n1. Topic one.\n> Line 1\n> Line 2\n');
  eq('baseline: 1 topic', subs3[0].topics.length, 1);
  eq('baseline: joined lines', subs3[0].topics[0].baseline, 'Line 1\nLine 2');

  /* 5. Multiline poll question (options on their own lines). */
  const subs4 = A.parseMarkdown(
    '## T\n### Poll\n1. Q?\n  - a {wa}\n  - *b {wb}\n  - c {wc}\n  - d {wd}\n');
  eq('multiline: 1 question', subs4[0].questions.length, 1);
  eq('multiline: 4 answers',
    subs4[0].questions.length ? subs4[0].questions[0].answers.length : 0, 4);
  eq('multiline: correct marked',
    subs4[0].questions.length ? subs4[0].questions[0].answers[1].correct : false, true);

  /* ---------------------------------------------------------
     6. Section 2 generation
     --------------------------------------------------------- */
  A.generateWritten();
  const cards = document.querySelectorAll('#written-questions .wq');
  assert('generate: 3 cards (1 topic × 3 subjects)',
    cards.length === 3, `got ${cards.length}`);
  assert('generate: status line shown',
    document.querySelector('#written-status').textContent.trim().length > 0);

  /* ---------------------------------------------------------
     7. Notebook rendering + export
     --------------------------------------------------------- */
  const rendered = A.renderNotebookMd('**bold**\n- one\n- two');
  assert('notebook md: bold + list',
    rendered.includes('<p><strong>bold</strong></p><ul>'), rendered);
  assert('notebook md: javascript: URL neutralised',
    !A.renderNotebookMd('[x](javascript:alert(1))').includes('javascript:'),
    A.renderNotebookMd('[x](javascript:alert(1))'));
  assert('notebook md: raw HTML escaped',
    !A.renderNotebookMd('<img src=x onerror=alert(1)>').includes('<img'),
    A.renderNotebookMd('<img src=x onerror=alert(1)>'));

  const nb = A.notebookData('');
  eq('notebook: 3 subjects', nb.length, 3);
  eq('notebook: 9 topics', nb.reduce((n, s) => n + s.topics.length, 0), 9);
  const nbMd = A.notebookMarkdown(nb);
  assert('notebook md: starts with first imported subject',
    nbMd.startsWith('# ' + A.state.subjects[0].name), JSON.stringify(nbMd.slice(0, 60)));
  eq('notebook tab: 3 h1 headings',
    document.querySelectorAll('#notebook .nb-h1').length, 3);
  eq('notebook tab: 9 h2 headings',
    document.querySelectorAll('#notebook .nb-h2').length, 9);
  assert('notebook: import order preserved',
    nb.every((s, i) => s.name === A.state.subjects[i].name));
  eq('notebook filter: no match → 0 subjects',
    A.notebookData('zzz_no_match_zzz').length, 0);

  /* ---------------------------------------------------------
     7b. Topic rail (quick-jump notches on the right)
     --------------------------------------------------------- */
  const rail = document.querySelector('#nb-rail');
  assert('rail: shown for a non-empty bank', rail && !rail.hidden);
  eq('rail: one notch per topic',
    document.querySelectorAll('#nb-rail .nb-rail-item').length, 9);
  eq('rail: one group per subject',
    document.querySelectorAll('#nb-rail .nb-rail-group').length, 3);
  const notch = document.querySelector('#nb-rail .nb-rail-item');
  eq('rail: notch points at a real topic id',
    !!document.getElementById(notch.dataset.target), true);

  const scrolledTo = [];
  const origScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function () { scrolledTo.push(this.id); };
  notch.click();
  Element.prototype.scrollIntoView = origScrollIntoView;
  eq('rail: click scrolls to that topic', scrolledTo[0], notch.dataset.target);

  /* The rail mirrors whatever the filter leaves visible. */
  const filterInput = document.querySelector('#nb-filter');
  filterInput.value = 'zzz_no_match_zzz';
  A.renderNotebook();
  assert('rail: hidden when nothing matches',
    document.querySelector('#nb-rail').hidden);
  filterInput.value = '';
  A.renderNotebook();
  assert('rail: restored after clearing the filter',
    !document.querySelector('#nb-rail').hidden);

  /* ---------------------------------------------------------
     7c. Rail width (drag the handle on the rail's right edge)
     --------------------------------------------------------- */
  const railBox = document.querySelector('#nb-rail');
  const railHandle = document.querySelector('#nb-rail-resize');
  const notebookEl = document.querySelector('#notebook');
  assert('rail resize: handle present', !!railHandle);

  /* Geometry needs the tab on screen. */
  document.querySelector('.tabs button[data-tab=notebook]').click();
  localStorage.removeItem('examai.railW');
  railBox.style.width = '';

  const nbWidthBefore = Math.round(notebookEl.getBoundingClientRect().width);
  const railLeftBefore = Math.round(railBox.getBoundingClientRect().left);

  railHandle.dispatchEvent(new PointerEvent('pointerdown',
    { clientX: 600, button: 0, bubbles: true }));
  document.dispatchEvent(new PointerEvent('pointermove',
    { clientX: 610, bubbles: true }));
  document.dispatchEvent(new PointerEvent('pointerup',
    { clientX: 610, bubbles: true }));
  eq('rail resize: dragging right widens the rail', railBox.style.width, '230px');
  eq('rail resize: width persisted to localStorage',
    localStorage.getItem('examai.railW'), '230');
  eq('rail resize: notebook text block keeps its width',
    Math.round(notebookEl.getBoundingClientRect().width), nbWidthBefore);
  eq('rail resize: rail grows to the right (left edge fixed)',
    Math.round(railBox.getBoundingClientRect().left), railLeftBefore);
  assert('rail resize: no horizontal page overflow',
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    `scrollWidth=${document.documentElement.scrollWidth} ` +
    `clientWidth=${document.documentElement.clientWidth}`);

  railHandle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  eq('rail resize: double-click resets to the default',
    railBox.style.width, '');
  eq('rail resize: reset clears the saved width',
    localStorage.getItem('examai.railW'), null);

  document.querySelector('.tabs button[data-tab=poll]').click();

  /* ---------------------------------------------------------
     8. Language switching
     --------------------------------------------------------- */
  A.setLang('en');   /* start from a known state, whatever the visitor chose */
  eq('lang: setLang("ru") → true', A.setLang('ru'), true);
  eq('lang: getLang() === "ru"', A.getLang(), 'ru');
  eq('lang: <html lang="ru">', document.documentElement.lang, 'ru');
  eq('lang: UI string translated', A.t('poll.start'), '▶ Начать тест');
  eq('lang: document.title localized', document.title, 'ExamAI — подготовка к экзамену');
  assert('lang: static markup re-translated',
    document.querySelector('[data-i18n="tab.poll"]').textContent
      .includes('Тренировочный'),
    document.querySelector('[data-i18n="tab.poll"]').textContent);
  assert('lang: menu marks the active language',
    !!document.querySelector('#lang-panel button[data-lang="ru"].primary'));
  assert('lang: prompt guide switches to Russian',
    A.promptGuide() === A.PROMPT_GUIDE_RU && A.promptGuide() !== A.PROMPT_GUIDE);
  eq('lang: table key counts match',
    Object.keys(A.I18N.en).length, Object.keys(A.I18N.ru).length);
  assert('lang: same keys in both tables',
    Object.keys(A.I18N.en).every((k) => k in A.I18N.ru) &&
      Object.keys(A.I18N.ru).every((k) => k in A.I18N.en));

  eq('lang: setLang("en") → true', A.setLang('en'), true);
  eq('lang: back to English', A.t('poll.start'), '▶ Start poll');
  eq('lang: setLang("de") → false', A.setLang('de'), false);
  eq('lang: unknown code ignored', A.getLang(), 'en');

  /* ---------------------------------------------------------
     9. A language switch must not lose poll state
     --------------------------------------------------------- */
  document.querySelector('#btn-poll-start').click();
  const cardsPoll = document.querySelectorAll('#poll-questions .qcard');
  assert('poll: cards rendered', cardsPoll.length > 0, `got ${cardsPoll.length}`);

  const firstCard = document.querySelector('.qcard');
  if (firstCard) {
    firstCard.querySelectorAll('.option')[0].click();
    const answered = A.state.poll.answered;
    const explainBefore = firstCard.querySelector('.explain').innerHTML;
    assert('poll: answer recorded', answered === 1, `got ${answered}`);

    A.setLang('ru');
    const after = document.querySelector('.qcard');
    assert('poll: answered card survives language switch',
      after && !after.querySelector('.explain').hidden &&
        A.state.poll.answered === answered,
      `answered=${A.state.poll.answered}, expected ${answered}`);
    assert('poll: verdict re-rendered in the new language',
      after && after.querySelector('.explain').innerHTML !== explainBefore);
    assert('poll: score text localized',
      document.querySelector('#global-score').textContent.includes('Счёт'),
      document.querySelector('#global-score').textContent);
    A.setLang('en');
  }

  /* ---------------------------------------------------------
     Report
     --------------------------------------------------------- */
  const failed = results.filter((r) => !r.ok);
  console.log(results.map((r) =>
    `${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`).join('\n'));
  console.log(`\n${results.length - failed.length}/${results.length} passed` +
    (failed.length ? `, ${failed.length} FAILED` : ''));
  if (failed.length) console.table(failed);
  return results;
})();
