import { OpenAI } from "openai";
import { GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL } from "../config/constant";

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_BASE_URL,
});

export async function generateText(prompt: string) {
  const response = await groq.responses.create({
    model: GROQ_MODEL,
    input: prompt,
  });

  return response.output_text;
}

export async function streamText(
  input: { role: "user" | "assistant"; content: string }[],
  onDelta: (text: string) => void,
) {
  const stream = await groq.responses.create({
    model: GROQ_MODEL!,
    instructions:
      "You are PromptPilot, a React website builder. Reply briefly. You cannot edit files yet.",
    input,
    stream: true,
  });

  let full = "";

  for await (const event of stream) {
    if (event.type === "response.output_text.delta" && event.delta) {
      full += event.delta;
      onDelta(event.delta);
    }
  }

  return full;
}
