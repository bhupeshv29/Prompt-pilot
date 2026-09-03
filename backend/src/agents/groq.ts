import { writeFile } from "node:fs/promises";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const models = {
  fast: "openai/gpt-oss-20b",
  coding: "openai/gpt-oss-120b",
  general: "llama-3.3-70b-versatile",
  cheap: "llama-3.1-8b-instant",
};

async function generateText(prompt: string) {
  const response = await client.responses.create({
    model: models.fast,
    input: prompt,
  });

  return response.output_text;
}

const fileName = "Markdown.md";
const result = await generateText(
  "can you tell me how much free usage / credits given by groq and also tell me about limitation of the groq api",
);

async function createAndWriteFiles() {
  try {
    await writeFile(fileName, result, "utf8");
    console.log(`${fileName} has been created and written successfully!`);
  } catch (error) {
    console.error("error writing to file", error);
  }
}

createAndWriteFiles()