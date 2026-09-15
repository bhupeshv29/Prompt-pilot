import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

type FileEntry = {
  name: string;
  path: string;
  type: string;
  size: number;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 503) return "sandbox unavailable, retry";
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}

export function CodeBrowser({
  conversationId,
  refreshSignal,
}: {
  conversationId: string;
  refreshSignal: number;
}) {
  const [dirPath, setDirPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dirLoading, setDirLoading] = useState(true);
  const [dirError, setDirError] = useState("");
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const liveRef = useRef({ dirPath: "", openPath: null as string | null });
  const signalRef = useRef(refreshSignal);

  async function loadDir(path: string) {
    liveRef.current = { dirPath: path, openPath: null };
    setDirPath(path);
    setOpenPath(null);
    setDirLoading(true);
    setDirError("");
    try {
      const res = await api.get(`/conversations/${conversationId}/files`, {
        params: { path },
      });
      setEntries(res.data.entries);
    } catch (error) {
      setDirError(errorMessage(error, "Couldn’t load files."));
    } finally {
      setDirLoading(false);
    }
  }

  async function loadFile(path: string) {
    liveRef.current = { ...liveRef.current, openPath: path };
    setOpenPath(path);
    setFileLoading(true);
    setFileError("");
    try {
      const res = await api.get(
        `/conversations/${conversationId}/files/content`,
        { params: { path } },
      );
      setContent(res.data.content);
    } catch (error) {
      setFileError(errorMessage(error, "Couldn’t read file."));
    } finally {
      setFileLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/conversations/${conversationId}/files`, { params: { path: "" } })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.data.entries);
        setDirLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDirError(errorMessage(error, "Couldn’t load files."));
        setDirLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (signalRef.current === refreshSignal) return;
    signalRef.current = refreshSignal;
    const { dirPath: dir, openPath: open } = liveRef.current;
    if (open) loadFile(open);
    else loadDir(dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const crumbs = dirPath ? dirPath.split("/") : [];
  const openName = openPath?.split("/").pop() ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-1 text-xs">
          {openPath ? (
            <button
              className="flex min-w-0 items-center gap-1 text-primary hover:underline"
              onClick={() => loadDir(dirPath)}
            >
              <ArrowLeft className="size-3.5 shrink-0" />
              <span className="truncate">{openName}</span>
            </button>
          ) : (
            <>
              <button
                className="shrink-0 text-primary hover:underline"
                onClick={() => loadDir("")}
              >
                files
              </button>
              {crumbs.map((c, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1">
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                  <button
                    className="truncate text-primary hover:underline"
                    onClick={() => loadDir(crumbs.slice(0, i + 1).join("/"))}
                  >
                    {c}
                  </button>
                </span>
              ))}
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            openPath ? loadFile(openPath) : loadDir(dirPath)
          }
          disabled={dirLoading || fileLoading}
        >
          <RefreshCw
            className={dirLoading || fileLoading ? "animate-spin" : ""}
          />
          Refresh
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {openPath ? (
          fileLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Reading {openName}…
            </div>
          ) : fileError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">{fileError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFile(openPath)}
              >
                <RefreshCw />
                Retry
              </Button>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all p-2 font-mono text-xs leading-relaxed">
              {content}
            </pre>
          )
        ) : dirLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading files…
          </div>
        ) : dirError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm text-muted-foreground">{dirError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDir(dirPath)}
            >
              <RefreshCw />
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Empty folder
          </p>
        ) : (
          <ul>
            {entries.map((e) => (
              <li key={e.path}>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() =>
                    e.type === "dir" ? loadDir(e.path) : loadFile(e.path)
                  }
                >
                  {e.type === "dir" ? (
                    <Folder className="size-4 shrink-0 text-primary" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{e.name}</span>
                  {e.type === "dir" ? (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatSize(e.size)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
