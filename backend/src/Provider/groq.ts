import { OpenAI } from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateText(prompt: string) {
  const response = await groq.responses.create({
    model: "openai/gpt-oss-120b",
    input: prompt,
  });

  return response.output_text;
}
