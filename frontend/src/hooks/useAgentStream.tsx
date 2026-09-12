import { useEffect } from "react";
import { getToken } from "../api/client";

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
  useEffect(() => {
    if (!conversationId) return;

    const token = getToken();
    if (!token) return;

    const es = new EventSource(
      `http://localhost:3000/conversations/${conversationId}/stream?token=${token}`,
    );

    const listen = (event: string, fn: (data: any) => void) => {
      es.addEventListener(event, (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        fn(data);
      });
    };

    if (handlers.onTextDelta) {
      listen("text_delta", (d) => handlers.onTextDelta!(d.text));
    }
    if (handlers.onToolStart) listen("tool_start", handlers.onToolStart);
    if (handlers.onToolResult) listen("tool_result", handlers.onToolResult);
    if (handlers.onQuestion) listen("question", handlers.onQuestion);
    if (handlers.onPreviewUpdated) {
      listen("preview_updated", handlers.onPreviewUpdated);
    }
    if (handlers.onMessageComplete) {
      listen("message_complete", handlers.onMessageComplete);
    }
    if (handlers.onError) {
      listen("error", (d) => handlers.onError!(d.error ?? "error"));
    }

    return () => es.close();
  }, [conversationId]);
}
