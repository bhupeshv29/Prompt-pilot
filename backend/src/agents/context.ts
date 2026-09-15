import {
  MAX_CHAT_MESSAGES,
  MAX_TOOL_OUTPUT_CHARS,
  SUMMARY_KEEP_RECENT,
} from "../config/constant";
import { summarizeMessages } from "./summarizer";

export type ChatMessage = { role: string; content: string };

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

/**
 * Split chat history into older messages (to summarize) and the most
 * recent ones (kept verbatim). Pure — safe to unit test.
 */
export function splitForSummary(chat: ChatMessage[]) {
  if (chat.length <= SUMMARY_KEEP_RECENT) {
    return { older: [] as ChatMessage[], recent: chat };
  }
  const cut = chat.length - SUMMARY_KEEP_RECENT;
  return { older: chat.slice(0, cut), recent: chat.slice(cut) };
}

/**
 * Build model input from full chat history: summarize everything older
 * than the recent window into one recap message instead of dropping it.
 * On any failure (or empty summary) returns the full history so the
 * existing compactInput truncation path applies unchanged.
 */
export async function buildContextInput(
  chat: ChatMessage[],
): Promise<unknown[]> {
  const { older, recent } = splitForSummary(chat);
  if (older.length === 0) return [...recent];

  try {
    const summary = await summarizeMessages(older);
    if (!summary) return [...chat];
    return [
      {
        role: "assistant",
        content: `[Summary of earlier conversation]\n${summary}`,
      },
      ...recent,
    ];
  } catch (error) {
    console.log("summarization failed, falling back to truncation", error);
    return [...chat];
  }
}
