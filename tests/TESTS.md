# Tests

ExamAI is a single-file browser app with no build step and no test
dependencies, so the suite is a plain script you run against a loaded
`ExamAI.html` page.

| File | What it does |
|---|---|
| [`examai.test.js`](examai.test.js) | The main suite (49 assertions): sample-bank counts, poll-line parsing (braces, `//`, multiline options), baseline answers, Section 2 generation, Notebook rendering/export/security, language switching, and poll-state survival across a language switch. |
| [`check-keys.js`](check-keys.js) | Static check, runs in Node: every i18n key referenced in `ExamAI.html` exists in both `I18N` tables, and both tables declare exactly the same keys. |

## Running the suite

### In the browser (simplest)

1. Open `ExamAI.html` in a browser.
2. Open DevTools → **Console**.
3. Paste the contents of `examai.test.js` and press Enter.

You get one `✅`/`❌` line per assertion and a `passed/total` summary.
Reload the page afterwards — the suite imports the built-in sample bank and
starts a poll, which replaces whatever bank/state was loaded.

### Headless (agent-browser)

```bash
agent-browser open "file:///A:/a/ExamAI/ExamAI.html"
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("tests/examai.test.js"))
agent-browser eval -b $b64          # returns the JSON result array
```

Filter for failures:

```bash
$r = (agent-browser eval -b $b64) | ConvertFrom-Json
$r | Where-Object { -not $_.ok }
```

## Static i18n check

```bash
node tests/check-keys.js
```

Exit code `0` means every referenced key exists in both languages and the
EN/RU tables are in sync; anything else prints the offending keys.

## What is covered

- **Sample bank** — 3 subjects, 13 poll questions, 9 written topics.
- **Parsing** — `*` marks the correct option, `{…}` per-option comments,
  `//` overall explanation, comments that contain ` - ` don't split an
  option, multiline poll questions, `>` blocks become baseline answers.
- **Section 2** — one card per subject with default settings, status line.
- **Notebook** — Markdown rendering, `javascript:` URLs neutralised, raw
  HTML escaped, import order preserved, filter narrows to zero on no match.
- **Language** — `setLang`/`getLang`, `<html lang>`, translated labels and
  `document.title`, active-language menu marker, prompt guide switch,
  identical EN/RU key sets, unknown codes rejected.
- **State** — an answered poll card keeps its verdict and re-renders in the
  new language after switching.

Not covered (needs a live LLM): the actual AI round-trip — streaming,
fallback to a non-streaming request, and grading quality.
