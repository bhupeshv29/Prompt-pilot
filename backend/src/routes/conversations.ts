import { Router } from "express";
import { prisma } from "../../prisma";
import AuthMiddleware from "../middleware/auth.middleware";
import { CreateConversationSchema } from "../types/conversationSchema";
import {
  createProjectSandbox,
  connectProjectSandbox,
  killProjectSandbox,
} from "../e2b/sandbox";

import { CreateMessageSchema } from "../types/messageSchema";
import { addClient, removeClient, emit } from "../sse/manager";

import { runAgent } from "../agents/loop";

const router = Router();

router.use(AuthMiddleware);

router.get("/", async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: req.userId },
    include: { sandbox: true },
    orderBy: { updatedAt: "desc" },
  });

  return res.json({ conversations });
});

router.post("/", async (req, res) => {
  const parsed = CreateConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid title" });
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId: req.userId!,
      title: parsed.data.title ?? "New project",
    },
  });

  try {
    const created = await createProjectSandbox();

    const sandbox = await prisma.sandbox.create({
      data: {
        conversationId: conversation.id,
        e2bSandboxId: created.e2bSandboxId,
        previewUrl: created.previewUrl,
        status: "ready",
      },
    });

    return res.status(201).json({ conversation, sandbox });
  } catch (error) {
    console.log(error);
    await prisma.conversation.delete({ where: { id: conversation.id } });
    return res.status(500).json({ error: "failed to create sandbox" });
  }
});

router.get("/:id/stream", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addClient(conversation.id, res);
  emit(conversation.id, "agent_status", { status: "connected" });

  req.on("close", () => {
    removeClient(conversation.id, res);
  });
});

router.post("/:id/messages", async (req, res) => {
  const parsed = CreateMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid message" });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { sandbox: true },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  if (!conversation.sandbox) {
    return res.status(400).json({ error: "sandbox not ready" });
  }

  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: parsed.data.content,
    },
  });

  emit(conversation.id, "message_start", { messageId: userMessage.id });

  try {
    let live;
    try {
      live = await connectProjectSandbox(conversation.sandbox.e2bSandboxId);
    } catch {
      live = await createProjectSandbox();
    }

    await prisma.sandbox.update({
      where: { id: conversation.sandbox.id },
      data: {
        e2bSandboxId: live.e2bSandboxId,
        previewUrl: live.previewUrl,
        status: "ready",
      },
    });

    const assistantMessage = await runAgent({
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      sandbox: live.sandbox,
    });

    return res.status(201).json({ userMessage, assistantMessage });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "failed to run agent" });
  }
});

router.get("/:id", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { sandbox: true },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  if (!conversation.sandbox) {
    return res.json({ conversation });
  }

  try {
    let live;
    try {
      live = await connectProjectSandbox(conversation.sandbox.e2bSandboxId);
    } catch {
      live = await createProjectSandbox();
    }

    const sandbox = await prisma.sandbox.update({
      where: { id: conversation.sandbox.id },
      data: {
        e2bSandboxId: live.e2bSandboxId,
        previewUrl: live.previewUrl,
        status: "ready",
      },
    });

    return res.json({
      conversation: { ...conversation, sandbox },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "failed to start sandbox" });
  }
});

router.delete("/:id", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { sandbox: true },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  if (conversation.sandbox) {
    await killProjectSandbox(conversation.sandbox.e2bSandboxId);
  }

  await prisma.conversation.delete({
    where: { id: conversation.id },
  });

  return res.json({ ok: true });
});

router.get("/:id/messages", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  return res.json({ messages });
});

export default router;
