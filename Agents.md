# Agents.md

Guidance for AI agents (and reviewers) working on this repository. The whole
app is one file — `ExamAI.html` — with no build step, dependencies or server.
User-facing documentation lives in [README.md](README.md) / [README.ru.md](README.ru.md);
test instructions live in [tests/TESTS.md](tests/TESTS.md).

## Architecture

Everything lives in `ExamAI.html`. The `<script>` block is one ordered
program, split by banner comments:

| Block | Purpose |
|---|---|
| 0. `I18N` + `t()` + `setLang()` / `applyLang()` | EN/RU string tables, the **🌐 Language** menu, switch + re-render |
| CSS `:root` + rules | Dark theme, drop zone, poll cards, written cards, stream cursor, modal |
| 1. `parseMarkdown()` | Splits the `.md` into subjects → `{ questions, topics }` |
| 1. `splitTopLevel()` / `findTopLevelDoubleSlash()` / `parseAnswerPart()` | Brace-aware tokenizers for the poll-line grammar |
| 2. `state` + `saveQuestions()` / `loadQuestions()` | In-memory model + `localStorage` persistence |
| 3. `importMarkdown()` | Parser → state → render pipeline |
| 4. `startPoll()` / `answerPoll()` / `buildPollFeedback()` | Section 1 — practice poll |
| 5. `generateWritten()` / `submitWritten()` / `buildGradingMessages()` | Section 2 — written exam (the grading prompt is localized) |
| 6. `notebookData()` / `renderNotebook()` / `notebookMarkdown()` | Section 3 — filtered snapshot, tab render, Markdown export |
| 6.1 `renderNotebookMd()` / `inlineMd()` / `parseMdList()` | Safe block+inline Markdown → HTML renderer used by the notebook |
| 7. Menus, drop zone, paste modal, API form | UI wiring |
| 8. `PROMPT_GUIDE` / `PROMPT_GUIDE_RU` / `SAMPLE_MD` | Prompt guide and built-in sample bank |
| 9. Boot | Restore persisted state, render tabs, `applyLang()`, publish `window.ExamAI` |
| `callAI()` / `callAIStream()` / `fetchFirstModel()` | OpenAI-compatible transport (Section 2) |
| `renderMarkdownLite()` | Tiny, safe Markdown → HTML renderer for AI feedback |

No frameworks, no bundlers, no network calls except to the LLM endpoint the
user configures.

### Data flow

```
.md (file / paste / drag-drop / sample)
  → importMarkdown()
  → parseMarkdown() → state.subjects
  → renderTopicList / renderPoll / renderWritten / renderNotebook
```

- `state` is `{ subjects: [], poll: { items, answered, correct }, written: [] }`.
- Persistence keys: `examai.questions` (the bank), `examai.lang`,
  `examai.base`, `examai.key`, `examai.model`.
- Boot order matters: `loadQuestions()` → tab renders → `applyLang()` last, so
  the saved language is applied to already-rendered markup.

### Streaming transport

`callAIStream()` sends the request with `stream: true`, reads
`response.body.getReader()`, and parses SSE lines of the form:

```
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

Each chunk's `delta.content` is appended to an accumulator, and the feedback
block is re-rendered on every token with a blinking `▍` cursor. A body that
cannot be read as a stream, or a non-2xx status, falls back to a single
`callAI()` request, which shows a spinner while it runs.

### Invariants

- **Every user-visible string is a key in `I18N.en` and `I18N.ru`.** Markup
  carries `data-i18n` (textContent), `data-i18n-html` (inner HTML) or
  `data-i18n-ph` (placeholder). Add a key to *both* tables in the same edit;
  `node tests/check-keys.js` fails otherwise.
- Dynamic statuses are stored as descriptors `{ key, args, cls }` rather than
  rendered text, so a language switch can re-render them.
- The imported bank is data: it is never translated.
- The notebook Markdown renderer escapes all source text before building
  HTML, and restricts link/image URLs to `http(s)` and `mailto:`.
- `window.ExamAI` is the test API — see below. Anything exported there is
  asserted on by `tests/examai.test.js`; keep it in sync when renaming.

### `window.ExamAI` test API

Published at the end of boot (section 9):

| Export | Signature / shape |
|---|---|
| `parseMarkdown` | `(md: string) => subjects[]` |
| `parseAnswerPart` | `(raw: string) => { text, correct, comment }` |
| `splitTopLevel` | `(s: string, sep: string) => string[]` |
| `state` | `{ subjects, poll, written }` |
| `importMarkdown` | `(md: string, label: string) => boolean` |
| `generateWritten` | `() => void` — starts Section 2 generation |
| `renderNotebook` | `() => void` — re-renders the Notebook tab |
| `renderNotebookMd` | `(md: string, filter?: string) => html` |
| `notebookData` | `(filter: string) => subjects[]` — snapshot in import order |
| `notebookMarkdown` | `(data) => "# Subject\n\n## 1. Topic\n<answer>"` |
| `handleFile` | `(file: File) => void` |
| `PROMPT_GUIDE` / `PROMPT_GUIDE_RU` | `string` — prompt guide per language |
| `promptGuide` | `() => string` — prompt guide in the current language |
| `SAMPLE_MD` | `string` — built-in sample bank |
| `t` | `(key, ...args) => string` — current-language lookup |
| `getLang` / `setLang` / `applyLang` | `() => 'en' \| 'ru'` / `('ru') => boolean` / `() => void` |
| `I18N` | `{ en: {...}, ru: {...} }` — string tables |

## Writing comments

A comment should describe something that is true about the code *right now*
for a reader who has no access to the conversation that produced it:

- **Good**: a non-obvious invariant, an external constraint, the reason behind
  a surprising choice.
- **Bad**: history or process — what the code used to do, that a bug was
  fixed, who asked for a change, a task/ticket number. That belongs in the
  commit message, and it stops being true when the code moves on.

Explain the invariant, not the bug:

```js
// Bad:  Bug fix: previously this crashed when the user toggled X while Y was on.
// Good: X and Y are mutually exclusive; the UI enforces them as one option.
```

When an existing comment is wrong or outdated, **replace it** — one coherent
explanation per function, never a stack of old and new notes.

## Writing questions for the bank

The bank is the product. Write every question mindfully — one deliberate
question, not a template fill:

- **Poll questions**: state a single, precise claim. Four options, all the
  same shape and length; distractors must be plausible and *individually*
  wrong. Give every option its own `{comment}` that teaches (why it is right
  or wrong — never a restatement of the option), and close with a one-sentence
  `//` takeaway.
- **Coverage**: the `### Poll` list is independent of `### Written` and should
  cover every detail of every topic — several questions per topic is normal,
  missing a detail is not.
- **Written topics**: copy the exam topic line *verbatim*. Follow it with a
  complete `>` baseline: all key points, terms and structure a strong answer
  must touch, written as a study summary, not a 1:1 checklist to recite.
- **Meaningfulness**: every item should test understanding a real exam would
  test. If a question can be answered by guessing, pattern-matching the option
  lengths, or says nothing beyond its own wording, rewrite it.
- **Language**: the bank stays in the language of its source list; never
  translate imported content.
- **Syntax discipline**: no `{...}` inside question or option text (braces are
  reserved for comments); `//` is parsed only at the top level.

## Verifying a change

```bash
node tests/check-keys.js        # i18n tables in sync
```

Run the browser suite in `tests/examai.test.js` (paste into the console of a
loaded `ExamAI.html`, or headless — see [tests/TESTS.md](tests/TESTS.md)).
Syntax-check the extracted script with `node --check` after editing
`ExamAI.html`. All 49 assertions should pass before a change is considered
done.
