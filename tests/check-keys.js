/* Static i18n check for ExamAI.html.

   Verifies that:
     - every key passed to t('…'), setImportStatus('…'),
       setApiStatus('…'), setWrittenStatus('…') or a data-i18n*
       attribute exists in BOTH language tables;
     - the EN and RU tables declare exactly the same keys;
     - reports table keys that nothing references (warning only).

   Run: node tests/check-keys.js          (exit 1 on a real problem) */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'ExamAI.html');
const html = fs.readFileSync(file, 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

const m = js.match(/const I18N = (\{[\s\S]*?\n\});\n/);
if (!m) { console.error('I18N table not found'); process.exit(1); }
const I18N = eval('(' + m[1] + ')');

const FNS = ['setImportStatus', 'setApiStatus', 'setWrittenStatus', 't'];

/* Collect the first quoted string argument of every call to one of FNS.
   A tiny scanner rather than one regex, so `f(ok ? 'a' : 'b')` works too. */
function callSites(src, fn) {
  const found = [];
  let i = 0;
  while ((i = src.indexOf(fn + '(', i)) !== -1) {
    // Don't match a longer identifier that ends in our name (e.g. `startPoll(` vs `t(`).
    const prev = i > 0 ? src[i - 1] : '';
    if (/[A-Za-z0-9_$]/.test(prev)) { i += fn.length; continue; }
    const start = i + fn.length + 1;
    let depth = 1, j = start, inStr = null;
    for (; j < src.length && depth > 0; j++) {
      const ch = src[j];
      if (inStr) {
        if (ch === '\\') { j++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === "'" || ch === '"') { inStr = ch; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const call = src.slice(start, j);
    const lit = call.match(/^\s*['"]([^'"]+)['"]/);
    if (lit) found.push(lit[1]);
    i = start;
  }
  return found;
}

const precise = new Set();
for (const fn of FNS) for (const k of callSites(js, fn)) precise.add(k);
for (const x of html.matchAll(/data-i18n(?:-ph|-html)?="([^"]+)"/g)) precise.add(x[1]);
precise.delete('key');   // appears in the `t('key', …)` doc comment only

/* Any key-shaped string literal anywhere (camelCase or dotted, one or more
   segments) — used for the unused scan, which only needs to be permissive. */
const broad = new Set();
for (const x of html.matchAll(/['"]([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+|[a-z][A-Za-z0-9]*)['"]/g)) {
  broad.add(x[1]);
}

const missingEn = [...precise].filter((k) => !(k in I18N.en));
const missingRu = [...precise].filter((k) => !(k in I18N.ru));
const unusedEn = Object.keys(I18N.en).filter((k) => !broad.has(k));
const unusedRu = Object.keys(I18N.ru).filter((k) => !broad.has(k));
const enOnly = Object.keys(I18N.en).filter((k) => !(k in I18N.ru));
const ruOnly = Object.keys(I18N.ru).filter((k) => !(k in I18N.en));

console.log(JSON.stringify({
  used: precise.size, missingEn, missingRu, unusedEn, unusedRu, enOnly, ruOnly,
}, null, 2));

const failed = missingEn.length || missingRu.length || enOnly.length || ruOnly.length;
console.log(failed ? 'FAIL' : 'i18n keys OK');
process.exit(failed ? 1 : 0);
