import type { Sandbox } from "e2b";
import { prisma } from "../../prisma";
import { emit } from "../sse/manager";
import { streamTurn } from "../Provider/groq";
import { executeTool } from "../tools/index";

export async function runAgent(opts: {
  conversationId: string;
  userMessageId: string;
  sandbox: Sandbox;
}) {
  const run = await prisma.agentRun.create({
    data: {
      conversationId: opts.conversationId,
      messageId: opts.userMessageId,
      status: "running",
    },
  });

  const history = await prisma.message.findMany({
    where: { conversationId: opts.conversationId },
    orderBy: { createdAt: "asc" },
  });

  let input: unknown[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    for (let step = 0; step < 12; step++) {
      const turn = await streamTurn(input, (text) => {
        emit(opts.conversationId, "text_delta", { text });
      });

      if (turn.functionCalls.length === 0) {
        const assistantMessage = await prisma.message.create({
          data: {
            conversationId: opts.conversationId,
            role: "assistant",
            content: turn.text,
          },
        });

        await prisma.agentRun.update({
          where: { id: run.id },
          data: { status: "completed", completedAt: new Date() },
        });

        emit(opts.conversationId, "message_complete", {
          messageId: assistantMessage.id,
        });
        emit(opts.conversationId, "agent_complete", {});

        return assistantMessage;
      }

      input = [...input, ...turn.output];

      for (const call of turn.functionCalls) {
        let args: unknown = {};
        try {
          args = JSON.parse(call.arguments || "{}");
        } catch {
          args = {};
        }

        emit(opts.conversationId, "tool_start", {
          tool: call.name,
          input: args,
        });

        const row = await prisma.toolCall.create({
          data: {
            agentRunId: run.id,
            toolName: call.name,
            input: args as object,
            status: "running",
          },
        });

        const result = await executeTool(opts.sandbox, call.name, args);

        await prisma.toolCall.update({
          where: { id: row.id },
          data: {
            output: result,
            status: result.ok ? "completed" : "failed",
            completedAt: new Date(),
          },
        });

        emit(opts.conversationId, "tool_result", {
          tool: call.name,
          success: result.ok,
        });

        if (
          (call.name === "write" || call.name === "diff_apply") &&
          result.ok
        ) {
          emit(opts.conversationId, "preview_updated", {});
        }
        
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    throw new Error("too many tool steps");
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : "agent failed",
      },
    });
    emit(opts.conversationId, "error", { error: "agent failed" });
    throw error;
  }
}
