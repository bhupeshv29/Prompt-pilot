# Context Engineering — Summarisation

Branch: `fix/context-engineering-summarisation`

## Existing technique (unchanged, final safety net)

`backend/src/agents/context.ts` → `compactInput()`:

1. Strips `reasoning` items.
2. Truncates long `content` / `function_call_output` strings to
   `MAX_TOOL_OUTPUT_CHARS` (4000).
3. Walks history from newest to oldest and keeps at most
   `MAX_CHAT_MESSAGES` (16) chat messages — everything older is
   **dropped entirely**.

Problem: dropping old messages loses project context (what was built,
decisions made, pending work).

## What was added

Summarisation runs **before** `compactInput`, only once per run at run
start in `runAgent` (`backend/src/agents/loop.ts`):

```ts
const input = compactInput(await buildContextInput(chat));
```

Per-step in-loop compaction stays sync and unchanged (no added latency
mid-run).

### New files / changes

- `backend/src/agents/summarizer.ts` (new) — `summarizeMessages(older)`
  sends the older transcript (capped at `SUMMARY_MAX_INPUT_CHARS`) to the
  Groq model via `chat.completions` (low temperature, token-capped) with
  a compression prompt: project goal, files created/modified, user
  preferences/decisions, pending work. Under 400 words.
- `backend/src/agents/context.ts`
  - `splitForSummary(chat)` (pure, testable): history ≤
    `SUMMARY_KEEP_RECENT` (8) passes through untouched; otherwise oldest
    `n − 8` messages go to the summariser, newest 8 kept verbatim.
  - `buildContextInput(chat)`: prepends one
    `[Summary of earlier conversation]` assistant message to the recent
    window. On any failure (API error, empty summary) it returns the full
    history so `compactInput` applies exactly as before — the agent can
    never break from this.
- `backend/src/config/constant.ts`
  - `SUMMARY_KEEP_RECENT = 8`
  - `SUMMARY_MAX_INPUT_CHARS = 12000`
  - `SUMMARY_MAX_OUTPUT_TOKENS = 800`

### Resulting input shape (long history)

`[1 summary message] + [last 8 chat messages]` → then `compactInput`
caps/truncates as usual (well under the 16-message limit).

## Verification (via `bun`)

- 5 msgs → passthrough, zero LLM calls.
- 12 msgs → 4 older + 8 recent (tail window correct).
- 20 msgs vs live Groq → 1 recap + 8 recent, real summary returned.
- 20 msgs with dead endpoint → falls back to full 20, `compactInput`
  caps at 16 (old behaviour preserved).
- `tsc --noEmit`: no new errors (only pre-existing `groq.ts` overloads).

## Cost note

Long histories add one extra non-streamed LLM call per user message.
Watch run start latency; consider a rolling/persisted summary (e.g. a
`summary` column on `Conversation`) if this becomes noticeable.
