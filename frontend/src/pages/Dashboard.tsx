import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, LogOut, Sparkles, Trash2 } from "lucide-react";
import { api, clearToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Conversation = {
  id: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
  sandbox?: { previewUrl?: string | null; status?: string | null } | null;
};

function when(iso?: string) {
  if (!iso) return "just now";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadList() {
    const res = await api.get("/conversations");
    setConversations(res.data.conversations);
  }

  useEffect(() => {
    loadList()
      .catch(() => {
        clearToken();
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function createConversation() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await api.post("/conversations", { title: "New project" });
      navigate(`/projects/${res.data.conversation.id}`);
    } catch {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/conversations/${id}`);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto min-h-svh max-w-5xl px-5 py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-accent text-sm text-primary">promptpilot</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Your projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a canvas, or grow a new one.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createConversation} disabled={creating}>
            <FolderPlus />
            {creating ? "Opening sandbox…" : "New project"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearToken();
              navigate("/login");
            }}
          >
            <LogOut />
            Logout
          </Button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading studio…</p>
      ) : conversations.length === 0 ? (
        <Card className="border-dashed bg-card/70">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Sparkles className="size-8 text-primary" />
            <h2 className="font-display text-2xl">Nothing here yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start a project and PromptPilot will spin a live preview you can
              chat into.
            </p>
            <Button onClick={createConversation} disabled={creating}>
              Create first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((c, i) => (
            <Card
              key={c.id}
              className="group cursor-pointer overflow-hidden transition hover:-translate-y-1"
              onClick={() => navigate(`/projects/${c.id}`)}
            >
              <div
                className="h-24"
                style={{
                  background: `linear-gradient(135deg, oklch(0.9 0.08 ${320 + i * 18} / 0.9), oklch(0.93 0.06 ${200 + i * 12}))`,
                }}
              />
              <CardContent className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">
                    {c.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Updated {when(c.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(c.id).catch(() => undefined);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
