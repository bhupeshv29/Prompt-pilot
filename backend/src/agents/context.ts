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
