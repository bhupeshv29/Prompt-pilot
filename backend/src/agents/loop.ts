import type { Sandbox } from "e2b";
import { prisma } from "../../prisma";
import { emit } from "../sse/manager";
import { streamTurn } from "../Provider/groq";
import { executeTool } from "../tools/index";
import { QuestionSchema } from "../types/toolSchema";
import { createProjectSnapshot, getLiveProjectSandbox } from "../e2b/sandbox";
import { buildContextInput, compactInput } from "./context";

type PausedRun = {
  conversationId: string;
  runId: string;
  e2bSandboxId: string;
  input: unknown[];
  callId: string;
};

const pausedRuns = new Map<string, PausedRun>();

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

  const chat = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const input: unknown[] = compactInput(await buildContextInput(chat));

  return continueLoop({
    conversationId: opts.conversationId,
    runId: run.id,
    sandbox: opts.sandbox,
    input,
  });
}

export async function answerQuestion(opts: {
  questionId: string;
  answer: string;
  userId: string;
}) {
  const question = await prisma.question.findUnique({
    where: { id: opts.questionId },
    include: {
      agentRun: { include: { conversation: { include: { sandbox: true } } } },
    },
  });

  if (!question || question.agentRun.conversation.userId !== opts.userId) {
    return { error: "question not found", status: 404 as const };
  }

  if (question.status !== "pending") {
    return { error: "question already answered", status: 400 as const };
  }

  const options = question.options as string[];
  if (!options.includes(opts.answer)) {
    return { error: "invalid option", status: 400 as const };
  }

  const paused = pausedRuns.get(question.id);
  if (!paused) {
    return {
      error: "question expired, send a new message",
      status: 409 as const,
    };
  }

  pausedRuns.delete(question.id);

  await prisma.question.update({
    where: { id: question.id },
    data: {
      answer: opts.answer,
      status: "answered",
      answeredAt: new Date(),
    },
  });

  await prisma.toolCall.update({
    where: { id: question.toolCallId },
    data: {
      output: { ok: true, answer: opts.answer },
      status: "completed",
      completedAt: new Date(),
    },
  });

  await prisma.agentRun.update({
    where: { id: paused.runId },
    data: { status: "running" },
  });

  emit(paused.conversationId, "tool_result", {
    tool: "question",
    success: true,
    answer: opts.answer,
  });

  const sandboxRow = question.agentRun.conversation.sandbox;
  let live;
  try {
    live = await getLiveProjectSandbox({
      e2bSandboxId: sandboxRow?.e2bSandboxId ?? paused.e2bSandboxId,
      snapshotId: sandboxRow?.snapshotId,
    });
  } catch (error) {
    console.log(error);
    return { error: "sandbox unavailable, retry", status: 503 as const };
  }

  paused.input.push({
    type: "function_call_output",
    call_id: paused.callId,
    output: JSON.stringify({ ok: true, answer: opts.answer }),
  });

  const result = await continueLoop({
    conversationId: paused.conversationId,
    runId: paused.runId,
    sandbox: live.sandbox,
    input: paused.input,
  });

  return { status: 200 as const, result };
}

async function saveRunSnapshot(opts: {
  conversationId: string;
  sandbox: Sandbox;
}) {
  try {
    const row = await prisma.sandbox.findUnique({
      where: { conversationId: opts.conversationId },
    });
    const snapshotId = await createProjectSnapshot(
      opts.sandbox.sandboxId,
      row?.snapshotId,
    );
    await prisma.sandbox.update({
      where: { conversationId: opts.conversationId },
      data: { snapshotId, e2bSandboxId: opts.sandbox.sandboxId },
    });
  } catch (error) {
    console.log(error);
  }
}

async function continueLoop(opts: {
  conversationId: string;
  runId: string;
  sandbox: Sandbox;
  input: unknown[];
}) {
  let input = opts.input;
  let filesChanged = false;

  try {
    for (let step = 0; step < 30; step++) {
      input = compactInput(input);

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
          where: { id: opts.runId },
          data: { status: "completed", completedAt: new Date() },
        });

        if (filesChanged) {
          await saveRunSnapshot({
            conversationId: opts.conversationId,
            sandbox: opts.sandbox,
          });
        }

        emit(opts.conversationId, "message_complete", {
          messageId: assistantMessage.id,
        });
        emit(opts.conversationId, "agent_complete", {});

        return { status: "completed" as const, assistantMessage };
      }

      input = compactInput([...input, ...(turn.output as unknown[])]);

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

        if (call.name === "question") {
          const parsed = QuestionSchema.parse(args);

          const row = await prisma.toolCall.create({
            data: {
              agentRunId: opts.runId,
              toolName: "question",
              input: parsed,
              status: "waiting",
            },
          });

          const question = await prisma.question.create({
            data: {
              agentRunId: opts.runId,
              toolCallId: row.id,
              prompt: parsed.question,
              options: parsed.options,
              status: "pending",
            },
          });

          await prisma.agentRun.update({
            where: { id: opts.runId },
            data: { status: "waiting_for_user" },
          });

          pausedRuns.set(question.id, {
            conversationId: opts.conversationId,
            runId: opts.runId,
            e2bSandboxId: opts.sandbox.sandboxId,
            input,
            callId: call.call_id,
          });

          emit(opts.conversationId, "question", {
            id: question.id,
            question: parsed.question,
            options: parsed.options,
          });
          emit(opts.conversationId, "agent_status", {
            status: "waiting_for_user",
          });

          if (filesChanged) {
            await saveRunSnapshot({
              conversationId: opts.conversationId,
              sandbox: opts.sandbox,
            });
          }

          return { status: "waiting_for_user" as const, question };
        }

        const row = await prisma.toolCall.create({
          data: {
            agentRunId: opts.runId,
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
          filesChanged = true;
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
    if (filesChanged) {
      await saveRunSnapshot({
        conversationId: opts.conversationId,
        sandbox: opts.sandbox,
      });
    }
    await prisma.agentRun.update({
      where: { id: opts.runId },
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
