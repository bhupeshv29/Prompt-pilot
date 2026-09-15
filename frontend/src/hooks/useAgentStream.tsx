import { useEffect, useRef } from "react";
import { getToken } from "@/api/client";

type Handlers = {
  onTextDelta?: (text: string) => void;
  onToolStart?: (data: { tool: string; input?: unknown }) => void;
  onToolResult?: (data: { tool: string; success: boolean }) => void;
  onQuestion?: (data: {
    id: string;
    question: string;
    options: string[];
  }) => void;
  onPreviewUpdated?: () => void;
  onMessageComplete?: () => void;
  onError?: (message: string) => void;
};

export function useAgentStream(
  conversationId: string | undefined,
  handlers: Handlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!conversationId) return;

    const token = getToken();
    if (!token) return;

    const es = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL}/conversations/${conversationId}/stream?token=${token}`,
    );

    const listen = (event: string, fn: (data: unknown) => void) => {
      es.addEventListener(event, (e) => {
        fn(JSON.parse((e as MessageEvent).data));
      });
    };

    listen("text_delta", (d) => {
      const data = d as { text?: string };
      if (data.text) handlersRef.current.onTextDelta?.(data.text);
    });
    listen("tool_start", (d) => {
      handlersRef.current.onToolStart?.(d as { tool: string; input?: unknown });
    });
    listen("tool_result", (d) => {
      handlersRef.current.onToolResult?.(
        d as { tool: string; success: boolean },
      );
    });
    listen("question", (d) => {
      handlersRef.current.onQuestion?.(
        d as { id: string; question: string; options: string[] },
      );
    });
    listen("preview_updated", () => {
      handlersRef.current.onPreviewUpdated?.();
    });
    listen("message_complete", () => {
      handlersRef.current.onMessageComplete?.();
    });
    listen("error", (d) => {
      const data = d as { error?: string };
      handlersRef.current.onError?.(data.error ?? "error");
    });

    return () => es.close();
  }, [conversationId]);
}
