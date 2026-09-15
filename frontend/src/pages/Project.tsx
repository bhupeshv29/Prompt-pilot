import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Code2, Download, ExternalLink, Eye, Loader2, RefreshCw, Send } from "lucide-react";
import { api, clearToken } from "@/api/client";
import { CodeBrowser } from "@/components/CodeBrowser";
import { ToolStatus } from "@/components/ToolStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgentStream } from "@/hooks/useAgentStream";
import { toolLabel, type ToolChip } from "@/lib/tools";

type Conversation = {
  id: string;
  title: string;
  sandbox?: { previewUrl?: string | null } | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  tools?: ToolChip[];
};

type Question = {
  id: string;
  question: string;
  options: string[];
};

function isSandboxDown(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 503;
}

export default function Project() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPromptRef = useRef<string | null>(
    (location.state as { initialPrompt?: string } | null)?.initialPrompt ??
      null,
  );
  const [active, setActive] = useState<Conversation | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [tools, setTools] = useState<ToolChip[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sandboxError, setSandboxError] = useState("");
  const [sendError, setSendError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [rightView, setRightView] = useState<"preview" | "code">("preview");
  const bottomRef = useRef<HTMLDivElement>(null);

  useAgentStream(id, {
    onTextDelta: (text) => setLiveText((prev) => prev + text),
    onToolStart: (data) =>
      setTools((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          tool: data.tool,
          label: toolLabel(data.tool, data.input),
          status: "running",
        },
      ]),
    onToolResult: (data) =>
      setTools((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].tool === data.tool && next[i].status === "running") {
            next[i] = {
              ...next[i],
              status: data.success ? "ok" : "fail",
            };
            break;
          }
        }
        return next;
      }),
    onQuestion: (data) => setQuestion(data),
    onPreviewUpdated: () => setPreviewKey((k) => k + 1),
    onMessageComplete: () => {
      setAgentBusy(false);
      setSending(false);
      setLiveText((text) => {
        setTools((currentTools) => {
          if (text || currentTools.length) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: text,
                tools: currentTools,
              },
            ]);
          }
          return [];
        });
        return "";
      });
    },
    onError: (message) => {
      setSendError(message);
      setAgentBusy(false);
      setSending(false);
    },
  });

  async function pauseActive() {
    if (!id) return;
    try {
      await api.post(`/conversations/${id}/pause`);
    } catch {
      // ignore
    }
  }

  async function openConversation() {
    if (!id) return;
    setLoading(true);
    setSandboxError("");
    try {
      const res = await api.get(`/conversations/${id}`);
      const conversation = res.data.conversation as Conversation;
      setActive(conversation);
      setPreviewUrl(conversation.sandbox?.previewUrl ?? "");
      setLiveText("");
      setTools([]);
      setQuestion(null);
      const history = await api.get(`/conversations/${id}/messages`);
      setMessages(history.data.messages);
      if (history.data.messages.length === 0 && initialPromptRef.current) {
        const first = initialPromptRef.current;
        initialPromptRef.current = null;
        await send(first);
      }
    } catch (error) {
      if (isSandboxDown(error)) {
        setSandboxError("sandbox unavailable, retry");
        try {
          const list = await api.get("/conversations");
          const found = list.data.conversations.find(
            (c: Conversation) => c.id === id,
          );
          if (found) setActive(found);
          const history = await api.get(`/conversations/${id}/messages`);
          setMessages(history.data.messages);
        } catch {
          // keep empty chat
        }
      } else {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function send(contentOverride?: string) {
    const raw = contentOverride ?? input;
    if (!id || !raw.trim() || sending) return;
    const content = raw.trim();
    setInput("");
    setSending(true);
    setAgentBusy(true);
    setSendError("");
    setTools([]);
    setLiveText("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);

    try {
      await api.post(`/conversations/${id}/messages`, { content });
      const list = await api.get("/conversations");
      const updated = list.data.conversations.find(
        (c: Conversation) => c.id === id,
      );
      if (updated)
        setActive((prev) => (prev ? { ...prev, title: updated.title } : prev));
    } catch (error) {
      if (isSandboxDown(error)) {
        setSandboxError("sandbox unavailable, retry");
        setSendError(
          "Preview sandbox is asleep. Retry to wake it, then send again.",
        );
        setAgentBusy(false);
      } else if (axios.isAxiosError(error) && error.response?.status === 409) {
        setSendError("Agent is already working on this project.");
        setAgentBusy(false);
      } else {
        setSendError("Couldn’t send that prompt.");
        setAgentBusy(false);
      }
    } finally {
      setSending(false);
    }
  }

  async function answer(option: string) {
    if (!question) return;
    const qid = question.id;
    setQuestion(null);
    await api.post(`/questions/${qid}/answer`, { answer: option });
  }

  async function downloadProject() {
    if (!id || downloading) return;
    setDownloading(true);
    setSendError("");
    try {
      const res = await api.get(`/conversations/${id}/download`, {
        responseType: "blob",
      });
      const disposition = res.headers?.["content-disposition"] as
        | string
        | undefined;
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `${active?.title ?? "project"}.tar.gz`;
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/gzip" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      if (isSandboxDown(error)) {
        setSandboxError("sandbox unavailable, retry");
        setSendError("Preview sandbox is asleep. Retry to wake it, then try downloading again.");
      } else {
        setSendError("Couldn’t download code files.");
      }
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (initialPromptRef.current) window.history.replaceState({}, "");
    openConversation();
    return () => {
      pauseActive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText, tools, question]);

  const thinking =
    sending || agentBusy || liveText.length > 0 || tools.length > 0;

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await pauseActive();
              navigate("/studio");
            }}
          >
            <ArrowLeft />
            Studio
          </Button>
          <div className="min-w-0">
            <p className="font-accent text-[11px] text-primary">project</p>
            <h1 className="truncate font-display text-lg font-semibold">
              {active?.title ?? "Opening…"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(previewUrl, "_blank", "noopener,noreferrer")
            }
            disabled={!previewUrl || loading}
          >
            <ExternalLink />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadProject}
            disabled={downloading || loading}
          >
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            {downloading ? "Preparing…" : "Download"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await pauseActive();
              clearToken();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <section className="flex min-h-0 flex-col border-r border-border bg-card/50">
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
            {messages.length === 0 && !thinking && !loading && (
              <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-5">
                <p className="font-display text-lg">Say what to build</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask for a landing page, a tweak, a color shift — the preview
                  follows.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-3xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                    : "mr-4 rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm"
                }
              >
                {m.role !== "user" && (
                  <p className="font-accent mb-1 text-[11px] text-primary">
                    agent
                  </p>
                )}
                {m.content && (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {m.content}
                  </p>
                )}
                {m.tools && <ToolStatus tools={m.tools} />}
              </div>
            ))}

            {thinking && (
              <div className="mr-4 rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm">
                <p className="font-accent text-[11px] text-primary">thinking</p>
                {liveText ? (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                    {liveText}
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Sketching the next change…
                  </p>
                )}
                <ToolStatus tools={tools} />
              </div>
            )}

            {question && (
              <div className="rounded-3xl border border-primary/30 bg-accent p-4">
                <p className="font-display text-sm">{question.question}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.options.map((o) => (
                    <Button
                      key={o}
                      size="sm"
                      variant="soft"
                      onClick={() => answer(o)}
                    >
                      {o}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {sendError && (
              <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {sendError}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-border p-3"
          >
            <Textarea
              value={input}
              disabled={sending || Boolean(question)}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask to edit the site…"
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="submit"
                disabled={!input.trim() || sending || Boolean(question)}
              >
                <Send />
                Send
              </Button>
            </div>
          </form>
        </section>

        <main className="relative flex min-h-0 flex-col bg-muted/30">
          <div className="flex items-center justify-end border-b border-border bg-card/60 px-3 py-1.5">
            <div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
              <Button
                size="sm"
                variant={rightView === "preview" ? "soft" : "ghost"}
                onClick={() => setRightView("preview")}
              >
                <Eye />
                Preview
              </Button>
              <Button
                size="sm"
                variant={rightView === "code" ? "soft" : "ghost"}
                onClick={() => setRightView("code")}
              >
                <Code2 />
                Code
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {rightView === "code" ? (
              id ? (
                <CodeBrowser conversationId={id} refreshSignal={previewKey} />
              ) : null
            ) : sandboxError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="font-display text-2xl">Preview is napping</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  The sandbox couldn’t wake (503). Retry to restore from the last
                  snapshot.
                </p>
                <Button onClick={openConversation}>
                  <RefreshCw />
                  Retry sandbox
                </Button>
              </div>
            ) : loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm">Waking preview…</p>
              </div>
            ) : previewUrl ? (
              <iframe
                key={previewKey}
                src={previewUrl}
                title="preview"
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="font-display text-2xl">No preview yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open this project again once the sandbox is ready.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
