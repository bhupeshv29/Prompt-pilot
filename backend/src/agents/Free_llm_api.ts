import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  baseURL: "http://localhost:3001/v1",
  apiKey: process.env.FREELLMAPI_API_KEY!,
});

const response = await client.chat.completions.create({
  model: "auto",
  messages: [
    {
      role: "user",
      content: "How many r's are in the word strawberry?",
    },
  ],
});

console.log(response.choices[0]?.message.content);
