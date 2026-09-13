import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api/client";
import { useAgentStream } from "../hooks/useAgentStream";

type Conversation = {
  id: string;
  title: string;
  sandbox?: { previewUrl?: string | null } | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
};

type Question = {
  id: string;
  question: string;
  options: string[];
};

export default function Builder() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handlers = useRef({
    onTextDelta: (text: string) => setLiveText((prev) => prev + text),
    onToolStart: (data: { tool: string }) =>
      setTools((prev) => [...prev, `${data.tool}...`]),
    onToolResult: (data: { tool: string; success: boolean }) =>
      setTools((prev) => [
        ...prev,
        `${data.tool} ${data.success ? "ok" : "fail"}`,
      ]),
    onQuestion: (data: Question) => setQuestion(data),
    onPreviewUpdated: () => setPreviewKey((k) => k + 1),
    onMessageComplete: () => {
      setLiveText((text) => {
        if (text) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: text },
          ]);
        }
        return "";
      });
      setTools([]);
    },
  });

  useAgentStream(active?.id, handlers.current);

  async function loadList() {
    const res = await api.get("/conversations");
    setConversations(res.data.conversations);
  }

  async function pauseActive() {
    if (!active) return;
    try {
      await api.post(`/conversations/${active.id}/pause`);
    } catch {
      // ignore
    }
  }

  async function openConversation(id: string) {
    if (active && active.id !== id) {
      await pauseActive();
    }

    const res = await api.get(`/conversations/${id}`);
    const conversation = res.data.conversation;
    setActive(conversation);
    setPreviewUrl(conversation.sandbox?.previewUrl ?? "");
    setLiveText("");
    setTools([]);
    setQuestion(null);

    const history = await api.get(`/conversations/${id}/messages`);
    setMessages(history.data.messages);
  }

  async function createConversation() {
    const res = await api.post("/conversations", { title: "New project" });
    await loadList();
    await openConversation(res.data.conversation.id);
  }

  async function send() {
    if (!active || !input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);

    try {
      await api.post(`/conversations/${active.id}/messages`, { content });
      await loadList();
    } catch {
      setTools((prev) => [...prev, "send failed"]);
    } finally {
      setSending(false);
    }
  }

  async function answer(option: string) {
    if (!question) return;
    const id = question.id;
    setQuestion(null);
    await api.post(`/questions/${id}/answer`, { answer: option });
  }

  useEffect(() => {
    loadList().catch(() => {
      clearToken();
      navigate("/login");
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText, tools, question]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 220, borderRight: "1px solid #ddd", padding: 12 }}>
        <button onClick={createConversation}>New project</button>
        <button
          onClick={async () => {
            await pauseActive();
            clearToken();
            navigate("/login");
          }}
        >
          Logout
        </button>
        {conversations.map((c) => (
          <div key={c.id}>
            <button onClick={() => openConversation(c.id)}>{c.title}</button>
          </div>
        ))}
      </aside>

      <section
        style={{
          width: 380,
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {messages.map((m) => (
            <p key={m.id}>
              <b>{m.role}:</b> {m.content}
            </p>
          ))}
          {tools.map((t, i) => (
            <p key={i}>
              <i>{t}</i>
            </p>
          ))}
          {liveText && (
            <p>
              <b>assistant:</b> {liveText}
            </p>
          )}
          {question && (
            <div>
              <p>{question.question}</p>
              {question.options.map((o) => (
                <button key={o} onClick={() => answer(o)}>
                  {o}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          style={{ display: "flex", padding: 8 }}
        >
          <input
            style={{ flex: 1 }}
            value={input}
            disabled={!active || sending}
            onChange={(e) => setInput(e.target.value)}
            placeholder={active ? "Ask to edit the site..." : "Open a project"}
          />
          <button disabled={!active || sending} type="submit">
            Send
          </button>
        </form>
      </section>

      <main style={{ flex: 1 }}>
        {previewUrl ? (
          <iframe
            key={previewKey}
            src={previewUrl}
            title="preview"
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <p>Create or open a project</p>
        )}
      </main>
    </div>
  );
}
