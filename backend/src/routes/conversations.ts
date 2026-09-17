import { Router } from "express";
import { prisma } from "../../prisma";
import AuthMiddleware from "../middleware/auth.middleware";
import { CreateConversationSchema } from "../types/conversationSchema";
import {
  createProjectSandbox,
  deleteProjectSnapshot,
  getLiveProjectSandbox,
  killProjectSandbox,
  pauseProjectSandbox,
} from "../e2b/sandbox";

import { CreateMessageSchema } from "../types/messageSchema";
import { addClient, removeClient, emit } from "../sse/manager";
import { resolveProjectPath } from "../e2b/filesystem";

import { runAgent, stopAgent } from "../agents/loop";

const PROJECT_ROOT = "/home/user/project";
const HIDDEN_ENTRIES = new Set(["node_modules", ".git", "dist"]);

function toRelative(absPath: string) {
  if (absPath === PROJECT_ROOT) return "";
  if (absPath.startsWith(PROJECT_ROOT + "/")) {
    return absPath.slice(PROJECT_ROOT.length + 1);
  }
  return absPath;
}

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

router.post("/:id/pause", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { sandbox: true },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  const busy = await prisma.agentRun.findFirst({
    where: {
      conversationId: conversation.id,
      status: { in: ["running", "waiting_for_user"] },
    },
  });

  if (busy) {
    return res.status(409).json({ error: "agent already running" });
  }

  if (conversation.sandbox) {
    await pauseProjectSandbox(conversation.sandbox.e2bSandboxId);
    await prisma.sandbox.update({
      where: { id: conversation.sandbox.id },
      data: { status: "paused" },
    });
  }

  return res.json({ ok: true });
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

router.post("/:id/stop", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!conversation) {
    return res.status(404).json({ error: "conversation not found" });
  }

  const busy = await prisma.agentRun.findFirst({
    where: {
      conversationId: conversation.id,
      status: { in: ["running", "waiting_for_user"] },
    },
  });

  if (!busy) {
    return res.status(404).json({ error: "no running agent" });
  }

  try {
    await stopAgent(conversation.id);
    return res.json({ ok: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "failed to stop agent" });
  }
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

  const busy = await prisma.agentRun.findFirst({
    where: {
      conversationId: conversation.id,
      status: { in: ["running", "waiting_for_user"] },
    },
  });

  if (busy) {
    return res.status(409).json({ error: "agent already running" });
  }

  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: parsed.data.content,
    },
  });

  const userCount = await prisma.message.count({
    where: { conversationId: conversation.id, role: "user" },
  });

  if (userCount === 1) {
    const title = parsed.data.content.trim().replace(/\s+/g, " ");
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        title: title.length > 60 ? `${title.slice(0, 57)}...` : title || "New project",
      },
    });
  }

  emit(conversation.id, "message_start", { messageId: userMessage.id });

  try {
    let live;
    try {
      live = await getLiveProjectSandbox({
        e2bSandboxId: conversation.sandbox.e2bSandboxId,
        snapshotId: conversation.sandbox.snapshotId,
      });
    } catch (error) {
      console.log(error);
      return res.status(503).json({ error: "sandbox unavailable, retry" });
    }

    await prisma.sandbox.update({
      where: { id: conversation.sandbox.id },
      data: {
        e2bSandboxId: live.e2bSandboxId,
        previewUrl: live.previewUrl,
        status: "ready",
      },
    });

    const result = await runAgent({
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      sandbox: live.sandbox,
    });

    return res.status(201).json({ userMessage, ...result });
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
      live = await getLiveProjectSandbox({
        e2bSandboxId: conversation.sandbox.e2bSandboxId,
        snapshotId: conversation.sandbox.snapshotId,
      });
    } catch (error) {
      console.log(error);
      return res.status(503).json({ error: "sandbox unavailable, retry" });
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
    if (conversation.sandbox.snapshotId) {
      await deleteProjectSnapshot(conversation.sandbox.snapshotId);
    }
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

router.get("/:id/files", async (req, res) => {
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

  let dir: string;
  try {
    dir = resolveProjectPath(
      typeof req.query.path === "string" ? req.query.path : "",
    );
  } catch {
    return res.status(400).json({ error: "invalid path" });
  }

  let live;
  try {
    live = await getLiveProjectSandbox({
      e2bSandboxId: conversation.sandbox.e2bSandboxId,
      snapshotId: conversation.sandbox.snapshotId,
    });
  } catch (error) {
    console.log(error);
    return res.status(503).json({ error: "sandbox unavailable, retry" });
  }

  try {
    const info = await live.sandbox.files.getInfo(dir);
    if (info.type !== "dir") {
      return res.status(400).json({ error: "not a directory" });
    }
    const listed = await live.sandbox.files.list(dir);
    const entries = listed
      .filter((e) => !HIDDEN_ENTRIES.has(e.name))
      .map((e) => ({
        name: e.name,
        path: toRelative(e.path),
        type: e.type,
        size: e.size,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    return res.json({ path: toRelative(dir), entries });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "failed to list files" });
  }
});

router.get("/:id/files/content", async (req, res) => {
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

  if (typeof req.query.path !== "string" || !req.query.path.trim()) {
    return res.status(400).json({ error: "path is required" });
  }

  let file: string;
  try {
    file = resolveProjectPath(req.query.path);
  } catch {
    return res.status(400).json({ error: "invalid path" });
  }

  let live;
  try {
    live = await getLiveProjectSandbox({
      e2bSandboxId: conversation.sandbox.e2bSandboxId,
      snapshotId: conversation.sandbox.snapshotId,
    });
  } catch (error) {
    console.log(error);
    return res.status(503).json({ error: "sandbox unavailable, retry" });
  }

  try {
    const info = await live.sandbox.files.getInfo(file);
    if (info.type !== "file") {
      return res.status(400).json({ error: "not a file" });
    }
    if (info.size > 512_000) {
      return res.status(413).json({ error: "file too large to preview" });
    }
    const content = await live.sandbox.files.read(file);
    if (content.includes("\0")) {
      return res.status(415).json({ error: "binary file, download instead" });
    }
    return res.json({ path: toRelative(file), content });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "failed to read file" });
  }
});

router.get("/:id/download", async (req, res) => {
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

  let live;
  try {
    live = await getLiveProjectSandbox({
      e2bSandboxId: conversation.sandbox.e2bSandboxId,
      snapshotId: conversation.sandbox.snapshotId,
    });
  } catch (error) {
    console.log(error);
    return res.status(503).json({ error: "sandbox unavailable, retry" });
  }

  const archivePath = `/tmp/project-${conversation.id}.tar.gz`;
  try {
    const tar = await live.sandbox.commands.run(
      `tar -czf "${archivePath}" --exclude=node_modules --exclude=.git --exclude=dist -C /home/user/project .`,
      { timeoutMs: 60_000 },
    );

    if (tar.exitCode !== 0) {
      console.log(tar.stderr);
      return res.status(500).json({ error: "failed to archive project" });
    }

    const bytes = await live.sandbox.files.read(archivePath, {
      format: "bytes",
    });

    await live.sandbox.commands.run(`rm -f "${archivePath}"`, {
      timeoutMs: 10_000,
    });

    const slug =
      conversation.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "project";

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${slug}.tar.gz"`,
    );
    res.setHeader("Content-Length", bytes.length);
    return res.send(Buffer.from(bytes));
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "failed to download project" });
  }
});

export default router;
