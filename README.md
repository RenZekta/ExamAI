# ExamAI

A single-file, self-contained web app for exam preparation. It gives you two independent study modes backed by a Markdown question bank you build (or let an AI build for you):

1. **Practice poll** — multiple-choice drilling with instant verdicts, per-option reasoning, and a running score.
2. **Written exam** — free-form answers graded by an LLM, with streaming feedback, a supportive tone, and an optional per-topic baseline answer to compare against.

No build step, no dependencies, no server. Open the `.html` file in a browser and go.

---

## Quick start

1. Download `examai.html` (the whole app is one file).
2. Open it in any modern browser (Chrome, Firefox, Edge, Safari).
3. Click **📥 Import questions + poll → 🧪 Load built-in sample** to explore with a demo bank, or drop your own `.md` file onto the drop zone.
4. *(For Section 2 only)* click **⚙️ API** and enter your LLM endpoint (see [API setup](#api-setup)).

That's it. Your imported bank is saved to `localStorage`, so it survives a page reload.

---

## Features

### Section 1 · Practice poll

- Filter by subject with per-subject checkboxes (each chip shows how many poll questions and written topics it contains).
- Choose how many questions to draw (`Questions` input, up to 200). They are pulled randomly from all selected subjects and shuffled.
- One click reveals:
  - ✅/❌ verdict,
  - the overall explanation (if present),
  - **a full "Why each option is right or wrong" list** — every option, with its own comment, and the correct/your-pick option highlighted.
- A `Score: N/M` counter is shown in the top bar.
- `↺ Reset answers` clears your picks without reshuffling, so you can retry the same set.

### Section 2 · Written exam (AI)

- **`🎲 Generate questions`** pulls N random topics from *every* subject (default `1` per subject). With three subjects and `N = 1`, you get three cards — one per subject.
- Each card shows:
  - the verbatim exam topic,
  - a collapsible **📖 Show reference answer** block (if a baseline exists) with an italic note: *"Reference only — this is a book summary, not a required 1:1 answer."*
  - a textarea for your answer,
  - a `Submit for AI review` button.
- On submit, the card **splits in two**: your question and answer stay on the left, the AI feedback appears on the right.
- **Streaming** — the feedback is rendered token-by-token with a blinking cursor, so you don't wait for the whole response to finish.
- If the server doesn't support SSE streaming, the app **falls back automatically** to a non-streaming request and shows a spinner while it does.
- The grading prompt instructs the model to be a **supportive tutor**, not an emotionless grading machine, and to treat the baseline as a *book summary*, not a checklist. Output structure:

  ```
  ## Оценка            X/10 — one-sentence verdict
  ## Что верно          Specific correct points
  ## Что неверно        Gently explain misconceptions
  ## Что можно добавить Optional extras (not mandatory)
  ## Образцовый ответ   Model answer
  ## Совет             One friendly tip
  ```

- Each card can be re-submitted independently with a new answer.

### Top bar

- **📥 Import questions + poll** menu:
  - **Drag-and-drop zone** — drop a `.md` file anywhere onto the dashed area, or click to open a file picker.
  - **✏️ Paste / edit .md** — paste a bank directly, no file needed.
  - **📋 Copy prompt guide** — copies a full system prompt to your clipboard that an AI can follow to produce a compatible `.md` file from a raw exam topic list.
  - **🧪 Load built-in sample** — loads the demo bank (three subjects, real exam topics from *Теория государства и права*, *Гражданское право*, *Гражданское процессуальное право*).
  - **🗑 Clear imported data** — wipes the bank and `localStorage`.
  - A live status line below the menu reports how many subjects/questions/topics/baselines were loaded and how many poll questions have per-option comments.

- **⚙️ API** menu — Base URL, API key, and optional model name. See [API setup](#api-setup).

---

## The `.md` question bank format

Each subject has **two independent lists** — `### Poll` (multiple-choice drill) and `### Written` (verbatim exam topics + baseline answers). Their lengths don't have to match; in fact they usually shouldn't.

```
## Теория государства и права

### Poll
1. Что изучает теория государства и права? - Отрасль экономики {Экономика изучает производство благ, а не правовые закономерности.} - *Общие закономерности возникновения, развития и функционирования государства и права {Именно это составляет предмет ТГП.} - Строение государственных органов {Это предмет других дисциплин.} - Правила юридической техники {Юридическая техника — инструмент правотворчества, а не предмет ТГП.} // ТГП — юридическая наука об общих закономерностях возникновения, развития и функционирования государства и права.
2. Следующий вопрос? - ... - *... - ... - ... // ...

### Written
1. Понятие, предмет, функции и методология теории государства и права.
> Теория государства и права — юридическая наука, изучающая общие закономерности возникновения, развития и функционирования государства и права.
> Предмет ТГП — общие закономерности...
> Функции ТГП: онтологическая, гносеологическая, ...
> Методология ТГП — система методов познания...
2. Понятие, признаки и сущность государства.
> Государство — политическая организация общества, обладающая суверенитетом...
> Признаки: публичная власть, суверенитет, ...
```

### Rules

| Element | Syntax |
|---|---|
| Subject heading | `## Subject name` |
| Subsection | `### Poll` and `### Written` (in this order) |
| Poll question | `N. Question text? - option - option - option - option` |
| Correct option | Prefix with `*` |
| Per-option comment | `{explain why this option is right or wrong}` after the option |
| Overall explanation | `// ...` at the end of the poll line (optional) |
| Written topic | `N. Verbatim exam topic line.` |
| Baseline answer | `> Line of the reference answer` on the following line(s). `>` alone = blank line. |

**Tips:**

- Multiline poll questions are supported: put `- option` on separate lines (see the [paste modal placeholder](#) for an example). Braces and `//` work the same way.
- Curly braces `{...}` are **reserved for per-option comments**. Don't use them inside question or option text.
- The `//` marker for the overall explanation is parsed only at the **top level** — `//` inside a `{comment}` (like a URL) won't break parsing.
- The `### Written` section is optional; subjects without it just won't appear in Section 2.

---

## Generating a bank with an AI

You don't have to write the `.md` by hand. Use the built-in prompt guide:

1. Click **📥 Import questions + poll → 📋 Copy prompt guide**. The full prompt lands on your clipboard.
2. Paste the raw exam topic list (like the ones in your `Теория государства и права.txt`) at the end of the prompt, under `=== SOURCE LIST ===`.
3. Feed the whole thing to any capable LLM (ChatGPT, Claude, Gemini, a local model — anything that can follow structured output instructions).
4. Save the model's Markdown output as a `.md` file (or paste it directly into ExamAI via **✏️ Paste / edit .md**).

The prompt guide covers:

- the exact two-subsection layout,
- the `*` marker for correct options,
- the **per-option `{comment}` requirement** — full reasoning, not just a restatement of the answer,
- that the `### Poll` list is **independent** of the `### Written` list, and should contain **as many questions as needed to cover every detail** of every topic (several per topic is normal),
- that the `### Written` list must be copied **verbatim** from the source topic list,
- that every written topic must be followed by a `>` baseline answer, treated as a **book summary**, not a 1:1 checklist,
- that the output must be Markdown only, nothing before or after.

---

## API setup

Section 2 talks to any OpenAI-compatible `/chat/completions` endpoint with streaming support. The default preset targets [LM Studio](https://lmstudio.ai/) running locally.

Open **⚙️ API** and fill in:

| Field | Default | Notes |
|---|---|---|
| **Base URL** | `http://localhost:1234/v1` | Any OpenAI-compatible server. The app calls `<base>/models` to auto-detect a model, then `<base>/chat/completions`. |
| **API key** | *(empty)* | Sent as `Authorization: Bearer <key>` if present. Leave blank for LM Studio, Ollama, llama.cpp, etc. |
| **Model** | *(empty)* | Leave blank to use the first model returned by `/models`. Fill in if you want a specific one. |

Click **Save** to persist to `localStorage`, then **Test connection** to hit `/models` and confirm the endpoint responds.

### OpenAI compatible. 

Default values for various launching methods:
- **XLM Studio** (my project) — `http://localhost:1234/v1`, no key.
- **LM Studio** — `http://localhost:1234/v1`, no key.
- **Ollama** — `http://localhost:11434/v1`, no key.
- **llama.cpp server** — `http://localhost:8080/v1`, no key.
- **OpenAI** — `https://api.openai.com/v1`, key required, model like `gpt-4o-mini`.
- **Any other OpenAI-compatible proxy** — set Base URL and key accordingly.

The app sends `temperature: 0.2` and (for streaming) `stream: true`.

---

## How streaming works

`callAIStream()` sends the request with `stream: true`, reads `response.body.getReader()`, and parses SSE lines of the form:

```
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

Each chunk's `delta.content` is appended to an accumulator, and the feedback block is re-rendered on every token with a blinking `▍` cursor. If the server returns a non-streamable body or a non-2xx status, the app falls back to a single `callAI()` request and shows a spinner in the meantime.

---

## Testing

The app exposes `window.ExamAI` for programmatic use and automated testing:

```js
window.ExamAI = {
  parseMarkdown,     // (md: string) => subjects[]
  parseAnswerPart,   // (raw: string) => { text, correct, comment }
  splitTopLevel,     // (s: string, sep: string) => string[]
  state,             // { subjects, poll, written }
  importMarkdown,    // (md: string, label: string) => boolean
  generateWritten,   // triggers Section 2 generation
  handleFile,        // (file: File) => void
  PROMPT_GUIDE,      // string
  SAMPLE_MD,         // string
};
```

A typical test script can:

```js
// 1. Load the built-in sample and assert counts.
ExamAI.importMarkdown(ExamAI.SAMPLE_MD, 'test');
console.assert(ExamAI.state.subjects.length === 3);
console.assert(ExamAI.state.subjects.reduce((n, s) => n + s.questions.length, 0) === 13);
console.assert(ExamAI.state.subjects.reduce((n, s) => n + s.topics.length, 0) === 9);

// 2. Parse a custom snippet and check per-option comments.
const subs = ExamAI.parseMarkdown(
  '## T\n### Poll\n1. Q? - a {why a} - *b {why b} - c {why c} - d {why d} // итог\n'
);
console.assert(subs[0].questions[0].answers[1].correct === true);
console.assert(subs[0].questions[0].answers[1].comment === 'why b');
console.assert(subs[0].questions[0].answers[0].comment === 'why a');

// 3. Check that braces containing " - " don't break parsing.
const subs2 = ExamAI.parseMarkdown(
  '## T\n### Poll\n1. Q? - a {см. 1 - 2 примера} - *b - c - d\n'
);
console.assert(subs2[0].questions[0].answers[0].comment === 'см. 1 - 2 примера');

// 4. Check baseline attachment.
const subs3 = ExamAI.parseMarkdown(
  '## T\n### Written\n1. Topic one.\n> Baseline line 1\n> Baseline line 2\n'
);
console.assert(subs3[0].topics[0].baseline === 'Baseline line 1\nBaseline line 2');

// 5. Trigger Section 2 generation and count cards.
ExamAI.generateWritten();
const cards = document.querySelectorAll('#written-questions .wq');
console.assert(cards.length === 3);   // 1 topic × 3 subjects with default setting
```

---

## Architecture

Everything lives in one HTML file. Roughly:

| Block | Purpose |
|---|---|
| CSS `:root` + rules | Dark theme, drop zone, poll cards, written cards, stream cursor, modal |
| `parseMarkdown()` | Splits the `.md` into subjects → `{ questions, topics }` |
| `splitTopLevel()` / `findTopLevelDoubleSlash()` / `parseAnswerPart()` | Brace-aware tokenizers for the poll-line grammar |
| `state` + `save/loadQuestions()` | In-memory + `localStorage` persistence |
| `importMarkdown()` | Parser → state → render pipeline |
| `startPoll()` / `answerPoll()` / `buildPollFeedback()` | Section 1 |
| `generateWritten()` / `submitWritten()` / `buildGradingMessages()` | Section 2 |
| `callAI()` / `callAIStream()` / `fetchFirstModel()` | OpenAI-compatible transport |
| `renderMarkdownLite()` | Tiny, safe Markdown → HTML renderer for AI feedback |
| Menus, drop zone, paste modal, API form | UI wiring |

No frameworks, no bundlers, no network calls except to the LLM endpoint you configure.

---

## License

MIT — do whatever you want with it.
