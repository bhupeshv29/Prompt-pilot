import { OpenAI } from "openai";
import { GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL } from "../config/constant";
import { AGENT_INSTRUCTIONS } from "../agents/prompt";

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_BASE_URL,
});

const tools = [
  {
    type: "function" as const,
    name: "read",
    description: "Read a project file. Path is relative, e.g. src/App.jsx",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    type: "function" as const,
    name: "write",
    description:
      "Write a full project file. Path is relative, e.g. src/App.jsx",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },

  {
    type: "function" as const,
    name: "bash",
    description:
      "Run a shell command in the project directory /home/user/project. Use for ls, npm install, etc.",
    parameters: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },

  {
    type: "function" as const,
    name: "diff_apply",
    description:
      "Apply a unified diff to an existing file. Read the file first. Use for small edits. Path is relative, e.g. src/App.jsx",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        diff: { type: "string" },
      },
      required: ["path", "diff"],
    },
  },
  {
    type: "function" as const,
    name: "question",
    description:
      "Ask the user to pick one option before continuing. Use for design choices like navbar style.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: { type: "array", items: { type: "string" } },
      },
      required: ["question", "options"],
    },
  },
];

export async function generateText(prompt: string) {
  const response = await groq.responses.create({
    model: GROQ_MODEL,
    input: prompt,
  });
  return response.output_text;
}

export async function streamTurn(
  input: unknown[],
  onDelta: (text: string) => void,
) {
  const stream = await groq.responses.create({
    model: GROQ_MODEL!,
    instructions: AGENT_INSTRUCTIONS,
    input,
    tools,
    tool_choice: "auto",
    stream: true,
  });

  let text = "";
  const functionCalls: {
    name: string;
    arguments: string;
    call_id: string;
  }[] = [];
  let output: unknown[] = [];

  for await (const event of stream) {
    if (event.type === "response.output_text.delta" && event.delta) {
      text += event.delta;
      onDelta(event.delta);
    }

    if (
      event.type === "response.output_item.done" &&
      event.item?.type === "function_call"
    ) {
      functionCalls.push({
        name: event.item.name,
        arguments: event.item.arguments,
        call_id: event.item.call_id,
      });
    }

    if (event.type === "response.completed") {
      output = event.response.output ?? [];
    }
  }

  if (functionCalls.length === 0) {
    for (const item of output as { type?: string }[]) {
      if (item.type === "function_call") {
        const call = item as {
          name: string;
          arguments: string;
          call_id: string;
        };
        functionCalls.push(call);
      }
    }
  }

  return { text, functionCalls, output };
}
