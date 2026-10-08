# ExamAI

**English** | [Russian version](README.ru.md)

A single-file, self-contained web app for exam preparation. It gives you two independent study modes plus a read-only Notebook, all backed by a Markdown question bank you build (or let an AI build for you):

1. **Practice poll** — multiple-choice drilling with instant verdicts, per-option reasoning, and a running score.
2. **Written exam** — free-form answers graded by an LLM, with streaming feedback, a supportive tone, and an optional per-topic baseline answer to compare against.
3. **Notebook** — the whole imported bank rendered as Markdown notes: every subject, every topic and its answer, in import order.

No build step, no dependencies, no server. Open the `.html` file in a browser and go.

The interface ships in English and Russian — switch it with the **🌐 Language** menu in the top bar (the choice is saved to `localStorage`), or read this documentation in [Russian](README.ru.md).

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
  ## Grade                X/10 — one-sentence verdict
  ## What's correct       Specific correct points
  ## What's wrong or imprecise  Gently explain misconceptions
  ## What could be added  Optional extras (not mandatory)
  ## Model answer         Model answer
  ## Tip                  One friendly tip
  ```

  Headings are localized with the interface — the Russian UI asks for the same six sections in Russian.

- Each card can be re-submitted independently with a new answer.

### Section 3 · Notebook

A read-only view of the imported bank, laid out like a Markdown document:

```
# Subject name

## 1. Verbatim exam topic line from your source list.
The imported baseline answer, rendered as real Markdown.
…
```

- **Import order is preserved exactly** — subjects as `#` headings, each subject's topics as `## N.` headings with their imported answer underneath. Nothing here is shuffled, sampled or scored.
- **Answers are rendered as real Markdown**, not shown as plain text: `#`–`######` (ATX) and setext headings, ordered/unordered/nested lists, blockquotes, GFM tables, fenced code blocks, `---` rules, `**bold**`, `*italic*`, `~~strikethrough~~`, `` `code` ``, links and images. Links/images are restricted to `http(s)` and `mailto:` URLs, and all source text is HTML-escaped first, so a hostile `.md` cannot inject markup.
- **Poll questions and their options are intentionally not shown** — this tab is pure study notes (topic → answer).
- The **filter box** narrows subjects, topics and answers and highlights every match; if the subject itself matches, all of its topics stay visible.
- The **topic rail** on the right lists one notch per visible topic, grouped by subject. Click one to scroll straight to that topic; the notch of the topic you are currently reading stays highlighted. Drag the handle on its right edge to stretch the rail (right = wider, left = narrower; double-click or **Enter** restores the default, **←/→** nudges it) — widening pushes the rail's right edge outward and the notebook text never reflows. The width is remembered, and the rail's scrollbar stays collapsed until you hover it. (On narrow screens the rail is hidden — use the filter box instead.)
- **📋 Copy as Markdown** puts the current (filtered) view on the clipboard as `# … / ## N. …` Markdown — the same structure the tab renders.

### Top bar

- **📥 Import questions + poll** menu:
  - **Drag-and-drop zone** — drop a `.md` file anywhere onto the dashed area, or click to open a file picker.
  - **✏️ Paste / edit .md** — paste a bank directly, no file needed.
  - **📋 Copy prompt guide** — copies a full system prompt to your clipboard that an AI can follow to produce a compatible `.md` file from a raw exam topic list.
  - **🧪 Load built-in sample** — loads a demo bank: three subjects with real exam topics and baseline answers (the built-in sample is written in Russian).
  - **🗑 Clear imported data** — wipes the bank and `localStorage`.
  - A live status line below the menu reports how many subjects/questions/topics/baselines were loaded and how many poll questions have per-option comments.

- **⚙️ API** menu — Base URL, API key, and optional model name. See [API setup](#api-setup).

- **🌐 Language** menu — switches the whole interface between **English** and **Russian**. The pick is stored in `localStorage` and applied immediately: labels, statuses, hints, placeholders, the prompt guide and the AI grading prompt. Your imported bank is data and is never translated.

---

## The `.md` question bank format

Each subject has **two independent lists** — `### Poll` (multiple-choice drill) and `### Written` (verbatim exam topics + baseline answers). Their lengths don't have to match; in fact they usually shouldn't.

```markdown
## Subject name

### Poll
1. What does this discipline study? - Wrong option {Why this option belongs to another field.} - *Correct option {Why this is exactly the right answer, naming the key term.} - Wrong option {Which concept this option actually describes.} - Wrong option {Why it is a tool, not the subject.} // One-sentence takeaway for the whole question.
2. Next question? - ... - *... - ... - ... // ...

### Written
1. Verbatim exam topic line one.
> Concise reference answer paragraph covering the key points,
> terms and structure a strong answer should touch on.
> Second paragraph of the baseline, if needed.
2. Verbatim exam topic line two.
> Its baseline answer, in the same language as the topic line.
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
2. Paste your raw exam topic list (any plain-text list of topics) at the end of the prompt, under `=== SOURCE LIST ===`.
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

Section 2 talks to any OpenAI-compatible `/chat/completions` endpoint with streaming support. The default preset targets XLM Studio/LM Studio running locally.

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

## Testing

Tests live in the [`tests/`](tests/) folder, so this README stays readable:

- [`tests/examai.test.js`](tests/examai.test.js) — the main suite (64 assertions): sample-bank counts, poll-line parsing (braces, `//`, multiline options), baseline answers, Section 2 generation, Notebook rendering/export/security, the topic rail and its resize handle, language switching, and answered poll state surviving a language switch.
- [`tests/check-keys.js`](tests/check-keys.js) — static i18n check, run with `node tests/check-keys.js`: every key referenced in the app exists in both language tables, and the EN/RU tables declare exactly the same keys.

See [`tests/TESTS.md`](tests/TESTS.md) for how to run them (browser console or headless) and what each assertion covers. For your own scripts the app exposes a `window.ExamAI` test API — `parseMarkdown`, `importMarkdown`, `state`, `t`, `setLang`, `promptGuide`, `notebookData` and the rest, listed in [Agents.md](Agents.md).

---

## License

Apache 2.0
