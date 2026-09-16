**Why 429s happen:** Groq counts **everything** in `input`: old user/assistant messages **and** every `function_call` / `function_call_output` (full `read` file bodies). Dropping `reasoning` helped; long chats still grow without a cap.

**What we will not do yet:** a second Groq “summarize the thread” call. That can 429 too. Cap + truncate is enough.

Postgres stays full. Only the **payload to Groq** is smaller.

---

### 1. `backend/src/config/constant.ts`

Add:

```ts
export const MAX_CHAT_MESSAGES = 16;
export const MAX_TOOL_OUTPUT_CHARS = 4000;
```

16 chat messages ≈ last 8 user/assistant turns. Raise later if you want more memory.

---

### 2. New file `backend/src/agents/context.ts`

```ts
import { MAX_CHAT_MESSAGES, MAX_TOOL_OUTPUT_CHARS } from "../config/constant";

function isReasoning(item: unknown) {
  return (
    !!item &&
    typeof item === "object" &&
    "type" in item &&
    (item as { type?: string }).type === "reasoning"
  );
}

function isChat(item: unknown) {
  if (!item || typeof item !== "object" || !("role" in item)) return false;
  const role = (item as { role?: string }).role;
  return role === "user" || role === "assistant";
}

function truncate(item: unknown): unknown {
  if (!item || typeof item !== "object") return item;
  const row = item as {
    type?: string;
    output?: string;
    content?: string;
  };

  if (
    row.type === "function_call_output" &&
    typeof row.output === "string" &&
    row.output.length > MAX_TOOL_OUTPUT_CHARS
  ) {
    return {
      ...row,
      output: row.output.slice(0, MAX_TOOL_OUTPUT_CHARS) + "\n...[truncated]",
    };
  }

  if (
    typeof row.content === "string" &&
    row.content.length > MAX_TOOL_OUTPUT_CHARS
  ) {
    return {
      ...row,
      content: row.content.slice(0, MAX_TOOL_OUTPUT_CHARS) + "\n...[truncated]",
    };
  }

  return item;
}

export function compactInput(input: unknown[]) {
  const cleaned = input.filter((item) => !isReasoning(item)).map(truncate);

  const kept: unknown[] = [];
  let chatCount = 0;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    const item = cleaned[i];
    if (isChat(item)) {
      if (chatCount >= MAX_CHAT_MESSAGES) break;
      chatCount += 1;
    }
    kept.push(item);
  }

  return kept.reverse();
}
```

Walks from the **newest** item. After 16 chat messages it **stops**, so older messages **and** their tool calls are dropped together. Latest user prompt is always kept.

---

### 3. `backend/src/agents/loop.ts`

Import:

```ts
import { compactInput } from "./context";
```

**Start of a run** (replace the `history.map` input):

```ts
const input: unknown[] = compactInput(
  history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content })),
);
```

**Inside `continueLoop`**, replace the reasoning `filter` before `streamTurn` with:

```ts
input = compactInput(input);

const turn = await streamTurn(input, (text) => {
  emit(opts.conversationId, "text_delta", { text });
});
```

You can delete the old `input.filter(… reasoning …)` block; `compactInput` already drops reasoning.

After appending tool output, compact again:

```ts
input = compactInput([...input, ...(turn.output as unknown[])]);
```

(Replace the current `[...input, ...turn.output.filter(reasoning)]`.)

Question resume already reuses `paused.input` through `continueLoop`, so it gets capped on the next turn.

---

### 4. What you should see

- Chat UI / DB: **full** history.
- Server logs of `input` before Groq: at most 16 `role: user|assistant` items; `read` outputs cut at 4000 chars; no `reasoning`.
- Long threads: old “change the heading…” turns disappear from the model. It should `read` the file again instead of relying on ancient tool results. That’s intended.

If 429s remain, lower `MAX_CHAT_MESSAGES` to `8` or `MAX_TOOL_OUTPUT_CHARS` to `2000`. Summarization is the step after that, not this one.

# explanation

Wired `compactInput` into `loop.ts`.

- Start of a run: history is compacted before the loop.
- Each Groq turn: `input = compactInput(input)` instead of the old reasoning-only filter.
- After tools: `input = compactInput([...input, ...turn.output])`.

`context.ts` and the MAX constants were already there. Full chat still lives in Postgres; only the Groq payload is capped.

How it works alongside the current technique — the existing compactInput (strip reasoning → truncate long outputs → drop all but last 16 messages) is untouched as the final safety net. Summarization runs before it, only at run start in runAgent:

- backend/src/agents/summarizer.ts (new) — summarizeMessages() sends the older transcript (capped at 12k chars) to the Groq model with a compression prompt (goal, files touched, decisions, pending work; <400 words, low temperature).
- backend/src/agents/context.ts — new splitForSummary() (pure: history ≤ 8 passes through; otherwise oldest n−8 → summarize, newest 8 kept verbatim) and buildContextInput() which prepends one [Summary of earlier conversation] message. Any failure or empty summary returns the full history, so compactInput applies exactly as before — the agent can never break from this.
- backend/src/agents/loop.ts — one-line change: compactInput(await buildContextInput(chat)). Per-step in-loop compaction stays sync and unchanged (no added latency mid-run).
- backend/src/config/constant.ts — SUMMARY_KEEP_RECENT=8, SUMMARY_MAX_INPUT_CHARS=12000, SUMMARY_MAX_OUTPUT_TOKENS=800.
  Verified with bun:
