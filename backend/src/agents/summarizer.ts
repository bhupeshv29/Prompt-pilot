import { OpenAI } from "openai";
import {
  GROQ_API_KEY,
  GROQ_BASE_URL,
  GROQ_MODEL,
  SUMMARY_MAX_INPUT_CHARS,
  SUMMARY_MAX_OUTPUT_TOKENS,
} from "../config/constant";
import type { ChatMessage } from "./context";

const client = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_BASE_URL,
});

const SUMMARY_SYSTEM = `You compress the earlier part of a chat between a user and PromptPilot, an AI React website builder.
Write a concise summary (under 400 words) that preserves what the next turn needs:
- the project goal and what was already built or changed (files touched),
- user preferences and decisions made (design choices, answers to questions),
- anything left pending or explicitly requested next.
Use short bullet sections. No preamble, no advice, just the summary.`;

/**
 * Summarize older chat messages into a short recap.
 * Returns "" when there is nothing worth summarizing so callers
 * can fall back to the truncation path.
 */
export async function summarizeMessages(
  older: ChatMessage[],
): Promise<string> {
  const transcript = older
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n")
    .slice(0, SUMMARY_MAX_INPUT_CHARS);

  if (!transcript.trim()) return "";

  const res = await client.chat.completions.create({
    model: GROQ_MODEL!,
    temperature: 0.2,
    max_tokens: SUMMARY_MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: SUMMARY_SYSTEM },
      { role: "user", content: transcript },
    ],
  });

  return res.choices[0]?.message?.content?.trim() ?? "";
}
